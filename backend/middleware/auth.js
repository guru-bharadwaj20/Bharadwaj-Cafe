import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Verifies a bearer token and loads the user onto the request.
 * Every downstream handler can assume `req.user` is a real, current user.
 */
export const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists' });
    }

    req.user = user;
    req.userId = user._id; // kept for handlers that still read req.userId
    return next();
  } catch {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/**
 * Must run after `protect`. Reuses the user already loaded rather than
 * issuing a second database query for the same document.
 */
export const admin = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Not authorized as admin' });
};

/**
 * Blocks actions that require a confirmed email address. Opt out in local
 * development by setting REQUIRE_EMAIL_VERIFICATION=false.
 */
export const requireVerified = (req, res, next) => {
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'false') {
    return next();
  }
  if (!req.user?.isVerified) {
    return res.status(403).json({
      message: 'Please verify your email address before continuing.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  return next();
};

/**
 * Socket.io handshake authentication. Rejects unauthenticated sockets and
 * pins the identity to the token, so a client cannot claim another user's id.
 */
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id name role');

    if (!user) {
      return next(new Error('Authentication failed'));
    }

    socket.userId = user._id.toString();
    socket.userRole = user.role;
    return next();
  } catch {
    return next(new Error('Authentication failed'));
  }
};
