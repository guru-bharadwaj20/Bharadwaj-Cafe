/**
 * Application errors.
 *
 * A handler throws one of these; the error middleware turns it into a
 * response. That keeps status-code decisions next to the business rule that
 * made them, instead of duplicated in every catch block.
 */

export class AppError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  /** Expected errors are safe to show a user; unexpected ones are not. */
  readonly expected: boolean;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.expected = true;
    Error.captureStackTrace(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code?: string) {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized', code?: string) {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code?: string) {
    super(message, 403, code);
  }
}

/**
 * Also used deliberately in place of 403 when merely knowing a resource
 * exists would leak information — an order id is not a capability.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Not found', code?: string) {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code?: string) {
    super(message, 409, code);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', code?: string) {
    super(message, 503, code);
  }
}
