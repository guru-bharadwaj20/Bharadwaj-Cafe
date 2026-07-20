import jwt from 'jsonwebtoken';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Socket } from 'socket.io';
import type { Types } from 'mongoose';
import User from '../models/User.js';

/** Shape of the payload we sign; anything else in a token is not ours. */
interface TokenPayload {
  id: string;
}

const jwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
};

export const generateToken = (id: Types.ObjectId | string): string =>
  jwt.sign({ id: id.toString() } satisfies TokenPayload, jwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  } as jwt.SignOptions);

/**
 * Verifies a bearer token and loads the user onto the request.
 * Every downstream handler can assume `req.user` is a real, current user.
 */
export const protect: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  try {
    const token = header.split(' ')[1] as string;
    const decoded = jwt.verify(token, jwtSecret()) as TokenPayload;
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({ message: 'Not authorized, user no longer exists' });
      return;
    }

    req.user = user;
    req.userId = user._id.toString(); // kept for handlers that still read req.userId
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/**
 * Must run after `protect`. Reuses the user already loaded rather than
 * issuing a second database query for the same document.
 */
export const admin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role === 'admin') {
    next();
    return;
  }
  res.status(403).json({ message: 'Not authorized as admin' });
};

/**
 * Blocks actions that require a confirmed email address. Opt out in local
 * development by setting REQUIRE_EMAIL_VERIFICATION=false.
 */
export const requireVerified = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.REQUIRE_EMAIL_VERIFICATION === 'false') {
    next();
    return;
  }
  if (!req.user?.isVerified) {
    res.status(403).json({
      message: 'Please verify your email address before continuing.',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }
  next();
};

/**
 * Socket.io handshake authentication. Rejects unauthenticated sockets and
 * pins the identity to the token, so a client cannot claim another user's id.
 */
export const authenticateSocket = async (
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    const decoded = jwt.verify(token, jwtSecret()) as TokenPayload;
    const user = await User.findById(decoded.id).select('_id name role');

    if (!user) {
      next(new Error('Authentication failed'));
      return;
    }

    socket.userId = user._id.toString();
    socket.userRole = user.role;
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
};
