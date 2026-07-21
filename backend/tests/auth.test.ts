import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import User, { hashToken } from '../models/User.js';
import { createUser, DEFAULT_PASSWORD, expectFound } from './factories.js';

const app = createApp();

const register = (overrides: Record<string, unknown> = {}) =>
  request(app)
    .post('/api/auth/register')
    .send({
      name: 'New User',
      email: 'new-user@example.com',
      password: 'password123',
      ...overrides,
    });

describe('POST /api/auth/register', () => {
  it('creates an unverified account', async () => {
    const res = await register().expect(201);

    expect(res.body.email).toBe('new-user@example.com');
    expect(res.body.isVerified).toBe(false);
    expect(res.body.password).toBeUndefined();

    const stored = expectFound(await User.findOne({ email: 'new-user@example.com' }));
    expect(stored).toBeTruthy();
    expect(stored.role).toBe('customer');
  });

  it('stores the password hashed, never in plaintext', async () => {
    await register().expect(201);

    const stored = expectFound(await User.findOne({ email: 'new-user@example.com' }));
    expect(stored.password).not.toBe('password123');
    expect(stored.password).toMatch(/^\$2[aby]\$/); // bcrypt
  });

  it('rejects missing fields', async () => {
    await register({ name: undefined }).expect(400);
    await register({ email: undefined }).expect(400);
    await register({ password: undefined }).expect(400);
  });

  it('rejects a password shorter than six characters', async () => {
    await register({ password: 'abc' }).expect(400);
  });

  it('rejects a duplicate email', async () => {
    await register().expect(201);
    await register().expect(400);
  });

  it('normalises the email to lowercase', async () => {
    await register({ email: 'MiXeD@Example.COM' }).expect(201);
    expect(await User.findOne({ email: 'mixed@example.com' })).toBeTruthy();
  });
});

describe('POST /api/auth/login', () => {
  it('returns a usable token for valid credentials', async () => {
    const { user } = await createUser(app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: DEFAULT_PASSWORD })
      .expect(200);

    expect(res.body.token).toBeTruthy();

    await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${res.body.token}`)
      .expect(200);
  });

  it('rejects a wrong password', async () => {
    const { user } = await createUser(app);

    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects an unknown account with the same message as a wrong password', async () => {
    const { user } = await createUser(app);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' });

    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });

    expect(unknownUser.status).toBe(wrongPassword.status);
    expect(unknownUser.body).toEqual(wrongPassword.body);
  });

  it('rejects missing credentials', async () => {
    await request(app).post('/api/auth/login').send({}).expect(400);
  });

  it('never returns the password hash', async () => {
    const { user } = await createUser(app);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: DEFAULT_PASSWORD })
      .expect(200);

    expect(res.body.password).toBeUndefined();
  });
});

describe('Profile management', () => {
  it('requires a token', async () => {
    await request(app).get('/api/auth/profile').expect(401);
    await request(app).put('/api/auth/profile').send({ name: 'x' }).expect(401);
    await request(app).delete('/api/auth/account').expect(401);
  });

  it('rejects a malformed authorization header', async () => {
    await request(app).get('/api/auth/profile').set('Authorization', 'NotBearer abc').expect(401);
  });

  it('updates the display name', async () => {
    const { token } = await createUser(app);

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' })
      .expect(200);

    expect(res.body.name).toBe('Updated Name');
  });

  it('requires re-verification when the email changes', async () => {
    const { token } = await createUser(app);

    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'changed@example.com' })
      .expect(200);

    expect(res.body.email).toBe('changed@example.com');
    expect(res.body.isVerified).toBe(false);
  });

  it('refuses to take an email already in use', async () => {
    const { user: existing } = await createUser(app);
    const { token } = await createUser(app);

    await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: existing.email })
      .expect(400);
  });

  it('deletes the account', async () => {
    const { user, token } = await createUser(app);

    await request(app)
      .delete('/api/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(await User.findById(user._id)).toBeNull();
  });
});

describe('Password change', () => {
  it('rejects a wrong current password', async () => {
    const { token } = await createUser(app);

    await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'nope', newPassword: 'new-password-123' })
      .expect(401);
  });

  it('rejects a too-short new password', async () => {
    const { token } = await createUser(app);

    await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'abc' })
      .expect(400);
  });
});

describe('Email verification', () => {
  it('verifies with a valid token and rejects reuse', async () => {
    await register().expect(201);

    const stored = expectFound(
      await User.findOne({ email: 'new-user@example.com' }).select('+verificationToken')
    );

    // Reconstruct the raw token by brute-force is impossible; instead assert
    // the stored form and drive verification through a known raw token.
    expect(stored.verificationToken).toMatch(/^[a-f0-9]{64}$/);

    const raw = 'a'.repeat(64);
    stored.verificationToken = hashToken(raw);
    stored.verificationTokenExpire = new Date(Date.now() + 60000);
    await stored.save();

    await request(app).get(`/api/auth/verify/${raw}`).expect(200);

    const verified = expectFound(await User.findById(stored._id));
    expect(verified.isVerified).toBe(true);

    // Single use: the token is cleared on success.
    await request(app).get(`/api/auth/verify/${raw}`).expect(400);
  });

  it('rejects an expired verification token', async () => {
    const { user } = await createUser(app, { isVerified: false });
    const raw = 'b'.repeat(64);

    const doc = expectFound(await User.findById(user._id).select('+verificationToken'));
    doc.verificationToken = hashToken(raw);
    doc.verificationTokenExpire = new Date(Date.now() - 1000); // already expired
    await doc.save();

    await request(app).get(`/api/auth/verify/${raw}`).expect(400);
  });

  it('rejects a garbage token', async () => {
    await request(app).get('/api/auth/verify/not-a-token').expect(400);
  });
});

describe('Password reset', () => {
  it('resets the password with a valid token and invalidates the old one', async () => {
    const { user } = await createUser(app);
    const raw = 'c'.repeat(64);

    const doc = expectFound(await User.findById(user._id).select('+resetPasswordToken'));
    doc.resetPasswordToken = hashToken(raw);
    doc.resetPasswordExpire = new Date(Date.now() + 60000);
    await doc.save();

    await request(app)
      .post(`/api/auth/reset-password/${raw}`)
      .send({ password: 'brand-new-password' })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'brand-new-password' })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: DEFAULT_PASSWORD })
      .expect(401);
  });

  it('rejects an expired reset token', async () => {
    const { user } = await createUser(app);
    const raw = 'd'.repeat(64);

    const doc = expectFound(await User.findById(user._id).select('+resetPasswordToken'));
    doc.resetPasswordToken = hashToken(raw);
    doc.resetPasswordExpire = new Date(Date.now() - 1000);
    await doc.save();

    await request(app)
      .post(`/api/auth/reset-password/${raw}`)
      .send({ password: 'brand-new-password' })
      .expect(400);
  });

  it('rejects a too-short replacement password', async () => {
    await request(app)
      .post('/api/auth/reset-password/whatever')
      .send({ password: 'abc' })
      .expect(400);
  });
});
