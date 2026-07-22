import type { RequestHandler } from 'express';
import User, { hashToken } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { enqueueDetached } from '../jobs/enqueue.js';
import { childLogger } from '../utils/logger.js';

const log = childLogger({ module: 'auth' });

const verificationRequired = (): boolean => process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser: RequestHandler = async (req, res) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    // Validate input
    if (!name || !email || !password) {
      res.status(400).json({ message: 'Please provide all required fields' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Build the document first so the verification token is persisted by the
    // same save() that creates the user.
    const user = new User({ name, email, password });
    const rawVerificationToken = user.createVerificationToken();
    await user.save();

    // Queued rather than awaited: a slow or failing SMTP server must not
    // delay — or fail — a successful registration.
    enqueueDetached('verification-email', { email, token: rawVerificationToken });

    // Deliberately no auth token here: handing one out at registration would
    // let an unverified account straight past the verification gate.
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      message: 'Registration successful! Please check your email to verify your account.',
    });
  } catch (error) {
    log.error({ err: error }, 'Registration error');
    res.status(400).json({
      message: errorMessage(error, 'Failed to register user'),
      error: error instanceof Error ? error.name : 'Error',
    });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    // Validate input
    if (!email || !password) {
      res.status(400).json({ message: 'Please provide email and password' });
      return;
    }

    const user = await User.findOne({ email });

    // Single generic failure message for both branches, so the response does
    // not reveal whether an account exists.
    if (!user || !(await user.matchPassword(password))) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    if (verificationRequired() && !user.isVerified) {
      res.status(403).json({
        message: 'Please verify your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
      return;
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      token: generateToken(user._id),
    });
  } catch (error) {
    log.error({ err: error }, 'Login error');
    res.status(400).json({ message: errorMessage(error, 'Login failed') });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile: RequestHandler = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to load profile') });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile: RequestHandler = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const { name, email } = req.body as { name?: string; email?: string };

    user.name = name || user.name;

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        res.status(400).json({ message: 'Email already in use' });
        return;
      }
      user.email = email;
      // A new address is unproven until it is confirmed.
      user.isVerified = false;
      const rawVerificationToken = user.createVerificationToken();
      await user.save();
      enqueueDetached('verification-email', { email: user.email, token: rawVerificationToken });
    } else {
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to update profile') });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/password
// @access  Private
export const changePassword: RequestHandler = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Please provide current and new password' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters' });
      return;
    }

    const user = await User.findById(req.userId);

    if (user && (await user.matchPassword(currentPassword))) {
      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(401).json({ message: 'Current password is incorrect' });
    }
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to change password') });
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/account
// @access  Private
export const deleteAccount: RequestHandler = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (user) {
      await user.deleteOne();
      res.json({ message: 'Account deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to delete account') });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify/:token
// @access  Public
export const verifyEmail: RequestHandler = async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: hashToken(req.params.token as string),
      verificationTokenExpire: { $gt: new Date() },
    }).select('+verificationToken +verificationTokenExpire');

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired verification token' });
      return;
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to verify email') });
  }
};

// @desc    Resend the verification email
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerification: RequestHandler = async (req, res) => {
  // Always the same response, so this cannot be used to probe for accounts.
  const genericResponse = {
    message: 'If that account exists and is unverified, a new verification link has been sent.',
  };

  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({ message: 'Please provide an email address' });
      return;
    }

    const user = await User.findOne({ email });

    if (!user || user.isVerified) {
      res.json(genericResponse);
      return;
    }

    const rawVerificationToken = user.createVerificationToken();
    await user.save();

    enqueueDetached('verification-email', { email: user.email, token: rawVerificationToken });

    res.json(genericResponse);
  } catch (error) {
    log.error({ err: error }, 'Resend verification error');
    res.json(genericResponse);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword: RequestHandler = async (req, res) => {
  // Identical response whether or not the account exists, so an attacker
  // cannot enumerate registered email addresses.
  const genericResponse = {
    message: 'If an account exists for that email, a password reset link has been sent.',
  };

  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({ message: 'Please provide an email address' });
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.json(genericResponse);
      return;
    }

    const rawResetToken = user.createPasswordResetToken();
    await user.save();

    // Queued with retries. The token stays valid for its full hour either
    // way, so a transient SMTP failure no longer forces a rollback that
    // would leave the user unable to reset at all.
    enqueueDetached('password-reset-email', { email, token: rawResetToken });

    res.json(genericResponse);
  } catch (error) {
    log.error({ err: error }, 'Forgot password error');
    res.json(genericResponse);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const { password } = req.body as { password?: string };

    if (!password || password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' });
      return;
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(req.params.token as string),
      resetPasswordExpire: { $gt: new Date() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Password reset successful! You can now login with your new password.' });
  } catch (error) {
    res.status(500).json({ message: errorMessage(error, 'Failed to reset password') });
  }
};
