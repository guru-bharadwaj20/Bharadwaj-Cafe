import type { HydratedUser } from '../models/User.js';

/**
 * Declaration merging so `req.user` is a typed User everywhere downstream of
 * the `protect` middleware, instead of `any`.
 *
 * It is intentionally optional: handlers mounted without `protect` genuinely
 * have no user, and the compiler should force those to say so.
 */
declare global {
  namespace Express {
    interface Request {
      user?: HydratedUser;
      userId?: string;
    }
  }
}

export {};
