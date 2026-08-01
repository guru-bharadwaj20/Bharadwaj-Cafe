import type { RequestHandler } from 'express';
import User, { hashToken, type HydratedUser } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { enqueueDetached } from '../jobs/enqueue.js';
import { childLogger } from '../utils/logger.js';
import {
  googleAuthEnabled,
  googleClientId,
  verifyGoogleIdToken,
} from '../config/googleAuth.js';
import { AppError } from '../utils/errors.js';

const log = childLogger({ module: 'auth' });

const verificationRequired = (): boolean => process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/**
 * The body every successful sign-in returns. Password and Google logins hand
 * back exactly the same thing, so the client never needs to know which was
 * used. Note what is absent: the password hash and both token columns.
 */
const session = (user: HydratedUser) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  token: generateToken(user._id),
});

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

    res.json(session(user));
  } catch (error) {
    log.error({ err: error }, 'Login error');
    res.status(400).json({ message: errorMessage(error, 'Login failed') });
  }
};

// @desc    Whether Google sign-in is available, and the id the button needs
// @route   GET /api/auth/google/config
// @access  Public
export const getGoogleConfig: RequestHandler = (_req, res) => {
  // Lets the client decide whether to render the button at all, so the only
  // place Google has to be configured is the server's environment.
  res.json({ enabled: googleAuthEnabled(), clientId: googleClientId() });
};

// @desc    Sign in (or sign up) with a Google ID token
// @route   POST /api/auth/google
// @access  Public
export const googleLogin: RequestHandler = async (req, res) => {
  try {
    if (!googleAuthEnabled()) {
      res.status(503).json({ message: 'Google sign-in is not configured' });
      return;
    }

    const { credential } = req.body as { credential?: string };

    if (!credential || typeof credential !== 'string') {
      res.status(400).json({ message: 'Missing Google credential' });
      return;
    }

    const identity = await verifyGoogleIdToken(credential);

    // Match on the Google subject id first. It is stable for the life of the
    // account, whereas an email address can be changed or reassigned.
    let user = await User.findOne({ googleId: identity.googleId });

    if (!user) {
      const existing = await User.findOne({ email: identity.email });

      if (existing) {
        // Someone who registered with a password is now signing in with
        // Google. Link the two rather than failing on the unique email index
        // or creating a second account. Safe because Google asserted
        // email_verified, so they demonstrably control this address.
        existing.googleId = identity.googleId;
        // That same proof settles our own verification question.
        existing.isVerified = true;
        await existing.save();
        user = existing;
        log.info({ userId: existing._id.toString() }, 'linked Google to existing account');
      } else {
        // A brand new account, with no password at all: it can only ever be
        // signed into through Google unless the owner sets one via the
        // password-reset flow.
        user = await User.create({
          name: identity.name,
          email: identity.email,
          googleId: identity.googleId,
          isVerified: true,
        });
        log.info({ userId: user._id.toString() }, 'created account from Google sign-in');
      }
    }

    // Deliberately no verification gate here. Google proved the address, so
    // requiring a second confirmation email would be asking the user to prove
    // something already proven.
    res.json(session(user));
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.status).json({ message: error.message });
      return;
    }
    log.error({ err: error }, 'Google login error');
    res.status(400).json({ message: errorMessage(error, 'Google sign-in failed') });
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
