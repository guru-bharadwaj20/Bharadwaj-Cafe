import pino from 'pino';

/**
 * Structured logging.
 *
 * JSON in production so a log aggregator can filter and alert on fields
 * rather than grep strings; human-readable in development. Every log line
 * from a request carries the same requestId, which is what makes an incident
 * traceable across the handler, the database call and the job it queued.
 */

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isTest ? 'silent' : isProduction ? 'info' : 'debug'),

  // Never let a credential reach the logs. Redaction happens inside pino, so
  // it applies even to objects logged by accident.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.newPassword',
      'req.body.currentPassword',
      'req.body.token',
      'password',
      'token',
      'signature',
      '*.password',
      '*.token',
      'RAZORPAY_KEY_SECRET',
      'JWT_SECRET',
    ],
    censor: '[redacted]',
  },

  base: { service: 'bharadwaj-cafe-api' },

  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
      },
});

/** A child logger tagged with a subsystem, e.g. logger.child({ module: 'jobs' }). */
export const childLogger = (bindings: Record<string, unknown>) => logger.child(bindings);
