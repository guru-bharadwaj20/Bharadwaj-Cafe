/**
 * Error handling and observability.
 *
 * The security-relevant property: an unexpected failure must not leak schema
 * details, file paths or query fragments to the client.
 */
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import { errorHandler, asyncHandler, notFoundHandler } from '../middleware/errorHandler.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors.js';
import { createUser, createAdmin } from './factories.js';

const app = createApp();

/** A tiny app that throws whatever a test needs, then runs the real handler. */
const appThatThrows = (thrower: () => unknown) => {
  const test = express();
  test.get(
    '/boom',
    asyncHandler(async () => {
      await Promise.resolve();
      throw thrower();
    })
  );
  test.use(notFoundHandler);
  test.use(errorHandler);
  return test;
};

describe('deliberate application errors', () => {
  it('uses the status and message it was given', async () => {
    const res = await request(appThatThrows(() => new BadRequestError('Quantity must be positive')))
      .get('/boom')
      .expect(400);

    expect(res.body.message).toBe('Quantity must be positive');
  });

  it('passes a machine-readable code through when present', async () => {
    const res = await request(
      appThatThrows(() => new ConflictError('Already paid', 'ALREADY_PAID'))
    )
      .get('/boom')
      .expect(409);

    expect(res.body.code).toBe('ALREADY_PAID');
  });

  it('maps NotFoundError to 404', async () => {
    await request(appThatThrows(() => new NotFoundError()))
      .get('/boom')
      .expect(404);
  });
});

describe('unexpected errors', () => {
  it('never leaks the underlying message', async () => {
    const leaky = new Error(
      'MongoServerError: E11000 duplicate key at /app/src/models/User.ts:42 db=prod'
    );

    const res = await request(appThatThrows(() => leaky))
      .get('/boom')
      .expect(500);

    expect(res.body.message).toBe('Something went wrong on our end. Please try again.');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('MongoServerError');
    expect(body).not.toContain('/app/src');
    expect(body).not.toContain('db=prod');
  });

  it('never returns a stack trace', async () => {
    const res = await request(appThatThrows(() => new Error('kaboom')))
      .get('/boom')
      .expect(500);

    expect(res.body.stack).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('at ');
  });

  it('includes a request id so a report can be traced to a log line', async () => {
    const res = await request(app).get('/api/does-not-exist').expect(404);
    expect(res.headers['x-request-id']).toBeTruthy();
  });
});

describe('database errors', () => {
  it('reports validation failures per field', async () => {
    const error = new mongoose.Error.ValidationError();
    error.addError('price', new mongoose.Error.ValidatorError({ message: 'Price is required' }));

    const res = await request(appThatThrows(() => error))
      .get('/boom')
      .expect(400);

    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors.price).toBe('Price is required');
  });

  it('treats a malformed id as not found rather than a server error', async () => {
    const { token } = await createUser(app);

    // Junk ids must not be distinguishable from absent ones, or an attacker
    // can tell which ids are well-formed.
    const res = await request(app)
      .get('/api/orders/not-a-valid-object-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('hides index names on duplicate keys', async () => {
    const duplicate = Object.assign(new Error('E11000 dup key: { email_1: "a@b.c" }'), {
      code: 11000,
    });

    const res = await request(appThatThrows(() => duplicate))
      .get('/boom')
      .expect(409);

    expect(res.body.message).toBe('That value is already in use');
    expect(JSON.stringify(res.body)).not.toContain('email_1');
  });
});

describe('routing', () => {
  it('returns a helpful 404 for an unknown route', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.message).toContain('/api/nope');
  });
});

describe('health endpoints', () => {
  it('liveness does not depend on the database', async () => {
    const res = await request(app).get('/api/health').expect(200);

    expect(res.body.status).toBe('OK');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('readiness reports dependency state', async () => {
    const res = await request(app).get('/api/health/ready').expect(200);

    expect(res.body.status).toBe('ready');
    expect(res.body.checks.database).toBe('up');
  });

  it('needs no authentication', async () => {
    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/health/ready').expect(200);
  });
});

describe('request correlation', () => {
  it('echoes a caller-supplied request id', async () => {
    const res = await request(app)
      .get('/api/health/ready')
      .set('x-request-id', 'trace-me-12345')
      .expect(200);

    expect(res.headers['x-request-id']).toBe('trace-me-12345');
  });

  it('generates one when the caller does not send it', async () => {
    const first = await request(app).get('/api/menu').expect(200);
    const second = await request(app).get('/api/menu').expect(200);

    expect(first.headers['x-request-id']).toBeTruthy();
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });
});

describe('log redaction', () => {
  it('does not echo credentials back in error responses', async () => {
    const { user } = await createUser(app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' })
      .expect(401);

    expect(JSON.stringify(res.body)).not.toContain('wrong-password');
  });

  it('keeps admin-only failures generic', async () => {
    const { token } = await createUser(app);
    await createAdmin(app);

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.message).toBe('Not authorized as admin');
  });
});
