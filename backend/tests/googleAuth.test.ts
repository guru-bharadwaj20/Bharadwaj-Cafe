/**
 * Google sign-in.
 *
 * The properties worth proving: a token is only trusted once Google's library
 * has verified it *for this application*, an unverified Google address can
 * never claim an account, and linking an existing account to Google does not
 * hand out a way around the password.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import User from '../models/User.js';
import { DEFAULT_PASSWORD, expectFound } from './factories.js';

// Stubbed at the library boundary: these tests are about our account handling,
// not about Google's signature verification.
const verifyIdToken = vi.fn();
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdToken;
  },
}));

const app = createApp();

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

/** A verified Google identity, as `getPayload()` would return it. */
const googlePayload = (over: Record<string, unknown> = {}) => ({
  sub: 'google-subject-1234',
  email: 'someone@gmail.com',
  email_verified: true,
  name: 'Someone Google',
  ...over,
});

const resolveWith = (payload: Record<string, unknown> | undefined) =>
  verifyIdToken.mockResolvedValue({ getPayload: () => payload });

const signIn = (credential = 'a.google.idtoken') =>
  request(app).post('/api/auth/google').send({ credential });

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
});

afterAll(() => {
  delete process.env.GOOGLE_CLIENT_ID;
});

beforeEach(() => {
  verifyIdToken.mockReset();
});

describe('configuration', () => {
  it('advertises the client id so the browser can render the button', async () => {
    const res = await request(app).get('/api/auth/google/config').expect(200);

    expect(res.body).toEqual({ enabled: true, clientId: CLIENT_ID });
  });

  // Both spellings of "not configured": an absent variable, and the blank
  // `GOOGLE_CLIENT_ID=` line that a copied .env.example actually produces.
  it.each([
    ['unset', undefined],
    ['blank', ''],
  ])('reports itself disabled when the client id is %s', async (_label, value) => {
    if (value === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = value;

    try {
      const res = await request(app).get('/api/auth/google/config').expect(200);

      expect(res.body.enabled).toBe(false);
      expect(res.body.clientId).toBeNull();
    } finally {
      process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    }
  });

  it('refuses to sign anyone in when it is not configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    try {
      resolveWith(googlePayload());

      await signIn().expect(503);

      // The token must not even be examined before the feature is turned on.
      expect(verifyIdToken).not.toHaveBeenCalled();
    } finally {
      process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    }
  });
});

describe('verifying the token', () => {
  it('checks the token was issued for this application', async () => {
    resolveWith(googlePayload());

    await signIn('the-credential').expect(200);

    // Without the audience, a token minted for any other Google app would
    // verify here perfectly happily.
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'the-credential',
      audience: CLIENT_ID,
    });
  });

  it('rejects a token Google will not vouch for', async () => {
    verifyIdToken.mockRejectedValue(new Error('Invalid token signature'));

    const res = await signIn().expect(401);

    expect(await User.countDocuments()).toBe(0);
    // The upstream error describes a token we do not control; it must not be
    // echoed back.
    expect(res.body.message).not.toContain('signature');
  });

  it('rejects an unverified Google email address', async () => {
    resolveWith(googlePayload({ email_verified: false }));

    await signIn().expect(401);

    // This is the account-takeover path: accounts are matched by email, so an
    // address Google has not confirmed must never reach the lookup.
    expect(await User.countDocuments()).toBe(0);
  });

  it('rejects a payload with no email at all', async () => {
    resolveWith(googlePayload({ email: undefined }));

    await signIn().expect(401);
    expect(await User.countDocuments()).toBe(0);
  });

  it('requires a credential in the body', async () => {
    await request(app).post('/api/auth/google').send({}).expect(400);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});

describe('first sign-in', () => {
  it('creates an account and returns a session', async () => {
    resolveWith(googlePayload());

    const res = await signIn().expect(200);

    expect(res.body.email).toBe('someone@gmail.com');
    expect(res.body.name).toBe('Someone Google');
    expect(res.body.token).toBeTruthy();
    // Google proved the address, so there is nothing left to confirm.
    expect(res.body.isVerified).toBe(true);
    expect(res.body.role).toBe('customer');
  });

  it('never returns a password hash or the google id', async () => {
    resolveWith(googlePayload());

    const res = await signIn().expect(200);

    expect(res.body.password).toBeUndefined();
    expect(res.body.googleId).toBeUndefined();
  });

  it('stores no password, so the account cannot be logged into with one', async () => {
    resolveWith(googlePayload());
    await signIn().expect(200);

    const user = expectFound(await User.findOne({ email: 'someone@gmail.com' }));
    expect(user.password).toBeUndefined();
    expect(user.googleId).toBe('google-subject-1234');

    // Password login must fail rather than throw: bcrypt.compare against an
    // undefined hash would 500, which both leaks that the account exists and
    // is a rejection by accident rather than by rule.
    for (const password of ['password123', 'undefined', 'null']) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'someone@gmail.com', password })
        .expect(401);
    }

    // A missing password is rejected earlier, by the required-fields guard.
    const empty = await request(app)
      .post('/api/auth/login')
      .send({ email: 'someone@gmail.com', password: '' });
    expect(empty.status).toBe(400);
    expect(empty.body.token).toBeUndefined();
  });

  it('falls back to the local part when Google sends no name', async () => {
    resolveWith(googlePayload({ name: undefined }));

    const res = await signIn().expect(200);

    // `name` is required on the model, so a missing one would 500 instead.
    expect(res.body.name).toBe('someone');
  });

  it('issues a token that works on a protected route', async () => {
    resolveWith(googlePayload());
    const { body } = await signIn().expect(200);

    const profile = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${body.token as string}`)
      .expect(200);

    expect(profile.body.email).toBe('someone@gmail.com');
  });
});

describe('returning users', () => {
  it('reuses the same account on a second sign-in', async () => {
    resolveWith(googlePayload());

    const first = await signIn().expect(200);
    const second = await signIn().expect(200);

    expect(second.body._id).toBe(first.body._id);
    expect(await User.countDocuments()).toBe(1);
  });

  it('follows the google id when the address changes', async () => {
    resolveWith(googlePayload());
    const first = await signIn().expect(200);

    // Same person, new address on the Google side.
    resolveWith(googlePayload({ email: 'renamed@gmail.com' }));
    const second = await signIn().expect(200);

    // Matching on the subject id, not the email, keeps this one account.
    expect(second.body._id).toBe(first.body._id);
    expect(await User.countDocuments()).toBe(1);
  });
});

describe('linking to an existing password account', () => {
  it('links rather than creating a duplicate, and keeps the password working', async () => {
    const existing = await User.create({
      name: 'Already Registered',
      email: 'someone@gmail.com',
      password: DEFAULT_PASSWORD,
      isVerified: true,
    });

    resolveWith(googlePayload());
    const res = await signIn().expect(200);

    expect(res.body._id).toBe(existing._id.toString());
    expect(await User.countDocuments()).toBe(1);

    // The original password must survive the linking.
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'someone@gmail.com', password: DEFAULT_PASSWORD })
      .expect(200);
  });

  it('does not let Google sign-in overwrite an existing name', async () => {
    await User.create({
      name: 'Already Registered',
      email: 'someone@gmail.com',
      password: DEFAULT_PASSWORD,
      isVerified: true,
    });

    resolveWith(googlePayload({ name: 'Someone Google' }));
    const res = await signIn().expect(200);

    expect(res.body.name).toBe('Already Registered');
  });

  it('verifies an account that had never confirmed its email', async () => {
    await User.create({
      name: 'Never Confirmed',
      email: 'someone@gmail.com',
      password: DEFAULT_PASSWORD,
      isVerified: false,
    });

    resolveWith(googlePayload());
    const res = await signIn().expect(200);

    // Google confirming the address is as good as our own email round-trip,
    // so this account stops being stuck behind the verification gate.
    expect(res.body.isVerified).toBe(true);

    const user = expectFound(await User.findOne({ email: 'someone@gmail.com' }));
    expect(user.isVerified).toBe(true);
  });

  it('does not promote anyone to admin', async () => {
    resolveWith(googlePayload());
    const res = await signIn().expect(200);

    expect(res.body.role).toBe('customer');

    const user = expectFound(await User.findOne({ email: 'someone@gmail.com' }));
    expect(user.role).toBe('customer');
  });
});
