import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/errors.js';
import { PricingError } from '../config/pricing.js';
import { PaymentError } from '../config/payments.js';

/**
 * Wraps an async handler so a rejected promise reaches Express.
 *
 * Express 4 does not await handlers, so an unhandled rejection in one is
 * silently swallowed and the request hangs until it times out. This is what
 * makes `throw` usable inside async controllers.
 */
export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };

/** 404 for anything that reached the end of the router chain. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl}` });
};

interface ErrorResponse {
  message: string;
  code?: string;
  requestId?: string;
  errors?: Record<string, string>;
}

/**
 * Translates a thrown error into a response.
 *
 * The rule: only messages we chose are shown to clients. An unexpected error
 * yields a generic message plus a request id, because raw messages leak
 * schema details, file paths and query fragments.
 */
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  // Required for Express to recognise this as an error handler.
  _next: NextFunction
) => {
  const requestId = req.id as string | undefined;
  const log = req.log ?? console;

  // Errors we raised deliberately.
  if (error instanceof AppError) {
    log.warn({ err: error, status: error.status }, 'request failed');
    const body: ErrorResponse = { message: error.message, requestId };
    if (error.code) body.code = error.code;
    res.status(error.status).json(body);
    return;
  }

  // Domain errors from modules that predate AppError.
  if (error instanceof PricingError) {
    log.warn({ err: error }, 'pricing rejected the request');
    res.status(400).json({ message: error.message, requestId });
    return;
  }

  if (error instanceof PaymentError) {
    log.warn({ err: error }, 'payment unavailable');
    res.status(503).json({ message: error.message, requestId });
    return;
  }

  // Mongoose validation: field-level messages are safe and useful.
  if (error instanceof mongoose.Error.ValidationError) {
    const errors: Record<string, string> = {};
    for (const [field, detail] of Object.entries(error.errors)) {
      errors[field] = detail.message;
    }
    log.warn({ errors }, 'validation failed');
    res.status(400).json({ message: 'Validation failed', errors, requestId });
    return;
  }

  // A malformed ObjectId is a client mistake, not a server fault. Reported as
  // 404 so probing with junk ids cannot distinguish "invalid" from "absent".
  if (error instanceof mongoose.Error.CastError) {
    log.warn({ path: error.path }, 'malformed identifier');
    res.status(404).json({ message: 'Not found', requestId });
    return;
  }

  // Duplicate key: the index name would reveal schema internals, so it is
  // logged but not returned.
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: number }).code === 11000
  ) {
    log.warn({ err: error }, 'duplicate key');
    res.status(409).json({ message: 'That value is already in use', requestId });
    return;
  }

  // Anything else is a bug. Log it in full, tell the client nothing.
  log.error({ err: error }, 'unhandled error');
  res.status(500).json({
    message: 'Something went wrong on our end. Please try again.',
    requestId,
  });
};
