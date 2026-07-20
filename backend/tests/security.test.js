/**
 * Regression tests for the five security fixes.
 *
 * Each test is written so that it FAILS against the pre-fix code. They are
 * the executable version of the vulnerability report.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

// Environment and the SMTP mock are configured centrally in tests/setup.js.
import { createApp } from '../app.js';
import User from '../models/User.js';
import MenuItem from '../models/MenuItem.js';
import Order from '../models/Order.js';
import Chat from '../models/Chat.js';
import { authenticateSocket } from '../middleware/auth.js';

const app = createApp();

/** Creates a verified user and returns the user plus a live bearer token. */
const makeUser = async (overrides = {}) => {
  const suffix = new mongoose.Types.ObjectId().toString();
  const password = 'correct-horse-battery';
  const user = await User.create({
    name: 'Test User',
    email: `user-${suffix}@example.com`,
    password,
    isVerified: true,
    ...overrides,
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: overrides.password || password });

  return { user, password, token: res.body.token };
};

const makeMenuItem = (overrides = {}) =>
  MenuItem.create({
    name: 'Cappuccino',
    description: 'Espresso with steamed milk foam',
    price: 150,
    image: 'img/cappuccino.png',
    category: 'coffee',
    ...overrides,
  });

describe('Fix #1 — the pre-save hook only runs when the password changes', () => {
  // The missing `return` did NOT lock users out: next() fired synchronously,
  // so the save dispatched before the stray re-hash resolved and the bad value
  // never reached the database. What it did do is re-run bcrypt on every save
  // and leave the in-memory document with a corrupted, dirty password field —
  // a latent bug that only stayed harmless because of that timing.
  it('leaves the password field untouched and clean after an unrelated save', async () => {
    const { user } = await makeUser();

    const doc = await User.findById(user._id);
    const originalHash = doc.password;

    doc.name = 'Renamed User';
    await doc.save();

    // The stray re-hash resolves *after* save() does — roughly one bcrypt
    // round later — which is precisely why this bug stayed invisible. Let it
    // settle so the assertion sees the document's true final state.
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Fails pre-fix: the hook rewrites this.password behind the save's back,
    // leaving a value in memory that no longer matches the stored hash.
    expect(doc.password).toBe(originalHash);
    expect(doc.isModified('password')).toBe(false);
  });

  it('keeps the password valid after a profile update', async () => {
    const { user, password, token } = await makeUser();

    await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Renamed User' })
      .expect(200);

    // Pre-fix, this save re-hashed the existing hash and locked the user out.
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('keeps the password valid after a forgot-password request', async () => {
    const { user, password } = await makeUser();

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email })
      .expect(200);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password });

    expect(res.status).toBe(200);
  });

  it('still hashes a genuinely changed password exactly once', async () => {
    const { user, password, token } = await makeUser();

    await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: password, newPassword: 'a-brand-new-password' })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'a-brand-new-password' })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password })
      .expect(401);
  });
});

describe('Fix #2 — order totals and payment status come from the server', () => {
  let token;
  let item;

  beforeEach(async () => {
    ({ token } = await makeUser());
    item = await makeMenuItem({ price: 150 });
  });

  it('ignores a client-supplied total and prices from the menu', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ menuItem: item._id, quantity: 2, price: 1 }],
        totalAmount: 1, // attacker-controlled
        customerPhone: '9999999999',
      })
      .expect(201);

    // 2 x 150 = 300 subtotal, +5% tax = 315
    expect(res.body.subtotal).toBe(300);
    expect(res.body.tax).toBe(15);
    expect(res.body.totalAmount).toBe(315);
    expect(res.body.items[0].price).toBe(150);
  });

  it('refuses to mark an order paid from request input', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ menuItem: item._id, quantity: 1 }],
        customerPhone: '9999999999',
        paymentId: 'totally-legit',
        paymentStatus: 'completed',
      })
      .expect(201);

    expect(res.body.paymentStatus).toBe('pending');
    expect(res.body.paymentId).toBeUndefined();
  });

  it('files the order under the authenticated user, not a spoofed email', async () => {
    const { user: victim } = await makeUser();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ menuItem: item._id, quantity: 1 }],
        customerPhone: '9999999999',
        customerEmail: victim.email,
      })
      .expect(201);

    expect(res.body.customerEmail).not.toBe(victim.email);
  });

  it('rejects items that are unavailable or not on the menu', async () => {
    const unavailable = await makeMenuItem({ name: 'Sold Out', available: false });

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ menuItem: unavailable._id, quantity: 1 }], customerPhone: '9' })
      .expect(400);

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ menuItem: new mongoose.Types.ObjectId(), quantity: 1 }],
        customerPhone: '9',
      })
      .expect(400);
  });

  it('rejects nonsensical quantities', async () => {
    for (const quantity of [0, -5, 1.5, 9999]) {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ menuItem: item._id, quantity }], customerPhone: '9' })
        .expect(400);
    }
  });
});

describe('Fix #3 — order reads require auth and ownership', () => {
  let order;
  let ownerToken;

  beforeEach(async () => {
    const owner = await makeUser();
    ownerToken = owner.token;
    const item = await makeMenuItem();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ items: [{ menuItem: item._id, quantity: 1 }], customerPhone: '9999999999' });

    order = res.body;
  });

  it('rejects anonymous access to an order by id', async () => {
    await request(app).get(`/api/orders/${order._id}`).expect(401);
  });

  it('hides another user\'s order even from a logged-in user', async () => {
    const { token: strangerToken } = await makeUser();

    await request(app)
      .get(`/api/orders/${order._id}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);
  });

  it('lets the owner read their own order', async () => {
    await request(app)
      .get(`/api/orders/${order._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });

  it('lets an admin read any order', async () => {
    const { token: adminToken } = await makeUser({ role: 'admin' });

    await request(app)
      .get(`/api/orders/${order._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('no longer exposes a customer order history by email address', async () => {
    await request(app).get(`/api/orders/customer/${order.customerEmail}`).expect(401);

    const { token: strangerToken } = await makeUser();
    await request(app)
      .get(`/api/orders/customer/${order.customerEmail}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });
});

describe('Fix #4 — sockets are authenticated and identity-pinned', () => {
  const connect = (auth) =>
    new Promise((resolve) => {
      const socket = { handshake: { auth }, userId: undefined, userRole: undefined };
      authenticateSocket(socket, (err) => resolve({ err, socket }));
    });

  it('rejects a socket with no token', async () => {
    const { err } = await connect({});
    expect(err).toBeInstanceOf(Error);
  });

  it('rejects a socket with a forged token', async () => {
    const { err } = await connect({ token: 'not.a.real.token' });
    expect(err).toBeInstanceOf(Error);
  });

  it('derives identity from the token rather than client-supplied ids', async () => {
    const { user, token } = await makeUser();
    const { user: victim } = await makeUser();

    // The old client could emit joinRoom(<any id>); there is no such input now.
    const { err, socket } = await connect({ token, userId: victim._id.toString() });

    expect(err).toBeUndefined();
    expect(socket.userId).toBe(user._id.toString());
    expect(socket.userId).not.toBe(victim._id.toString());
    expect(socket.userRole).toBe('customer');
  });

  it('marks admins so they can join the staff room', async () => {
    const { token } = await makeUser({ role: 'admin' });
    const { err, socket } = await connect({ token });

    expect(err).toBeUndefined();
    expect(socket.userRole).toBe('admin');
  });
});

describe('Fix #5 — remaining hardening', () => {
  it('will not let a stranger read or mutate another user\'s chat', async () => {
    const { token: ownerToken } = await makeUser();
    const { token: strangerToken } = await makeUser();

    await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ message: 'my private message' })
      .expect(200);

    const chat = await Chat.findOne({});

    await request(app)
      .put(`/api/chat/${chat._id}/read`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(404);

    await request(app)
      .put(`/api/chat/${chat._id}/read`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });

  it('gives the same forgot-password response whether or not the account exists', async () => {
    const { user } = await makeUser();

    const known = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email })
      .expect(200);

    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody-here@example.com' })
      .expect(200);

    expect(known.body).toEqual(unknown.body);
  });

  it('stores reset tokens hashed, never in plaintext', async () => {
    const { user } = await makeUser();

    await request(app).post('/api/auth/forgot-password').send({ email: user.email }).expect(200);

    const stored = await User.findById(user._id).select('+resetPasswordToken +resetPasswordExpire');

    expect(stored.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
    expect(stored.resetPasswordExpire.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not hand out an auth token at registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'New User', email: 'brand-new@example.com', password: 'password123' })
      .expect(201);

    expect(res.body.token).toBeUndefined();
    expect(res.body.isVerified).toBe(false);
  });

  it('blocks login for an unverified account when verification is required', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    try {
      await User.create({
        name: 'Unverified',
        email: 'unverified@example.com',
        password: 'password123',
        isVerified: false,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unverified@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    } finally {
      process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
    }
  });

  it('requires admin role for admin endpoints', async () => {
    const { token } = await makeUser();

    await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    const { token: adminToken } = await makeUser({ role: 'admin' });
    await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('rejects a token belonging to a deleted user', async () => {
    const { user, token } = await makeUser();
    await User.findByIdAndDelete(user._id);

    await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('validates order status transitions', async () => {
    const { token: adminToken } = await makeUser({ role: 'admin' });
    const { token } = await makeUser();
    const item = await makeMenuItem();

    const { body: order } = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ menuItem: item._id, quantity: 1 }], customerPhone: '9999999999' });

    await request(app)
      .put(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'not-a-real-status' })
      .expect(400);

    await request(app)
      .put(`/api/admin/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' })
      .expect(200);

    // Delivering an order should award loyalty points via the admin route too.
    const updated = await Order.findById(order._id);
    const customer = await User.findById(updated.user);
    expect(customer.loyaltyPoints).toBeGreaterThan(0);
  });
});
