import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import User from '../models/User.js';
import Address from '../models/Address.js';
import { createUser, createAdmin, createMenuItem, placeOrder, expectFound } from './factories.js';

const app = createApp();

const addressPayload = {
  label: 'Home',
  fullName: 'Test User',
  phone: '9999999999',
  addressLine1: '1 Test Street',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
};

describe('Addresses', () => {
  it('requires authentication on every route', async () => {
    await request(app).get('/api/addresses').expect(401);
    await request(app).post('/api/addresses').send(addressPayload).expect(401);
  });

  it('scopes the list to the calling user', async () => {
    const { token: mine } = await createUser(app);
    const { token: theirs } = await createUser(app);

    await request(app)
      .post('/api/addresses')
      .set('Authorization', `Bearer ${mine}`)
      .send(addressPayload)
      .expect(201);

    const res = await request(app)
      .get('/api/addresses')
      .set('Authorization', `Bearer ${theirs}`)
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it("refuses to update or delete another user's address", async () => {
    const { token: owner } = await createUser(app);
    const { token: stranger } = await createUser(app);

    const created = await request(app)
      .post('/api/addresses')
      .set('Authorization', `Bearer ${owner}`)
      .send(addressPayload)
      .expect(201);

    await request(app)
      .put(`/api/addresses/${created.body._id}`)
      .set('Authorization', `Bearer ${stranger}`)
      .send({ city: 'Hacked' })
      .expect(401);

    await request(app)
      .delete(`/api/addresses/${created.body._id}`)
      .set('Authorization', `Bearer ${stranger}`)
      .expect(401);
  });

  it('keeps exactly one default address per user', async () => {
    const { user, token } = await createUser(app);

    const first = await request(app)
      .post('/api/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...addressPayload, isDefault: true })
      .expect(201);

    const second = await request(app)
      .post('/api/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...addressPayload, label: 'Work', isDefault: true })
      .expect(201);

    const defaults = await Address.find({ user: user._id, isDefault: true });
    expect(defaults).toHaveLength(1);
    expect(expectFound(defaults[0])._id.toString()).toBe(second.body._id);

    // Explicitly switching back also leaves a single default.
    await request(app)
      .put(`/api/addresses/${first.body._id}/default`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const afterSwitch = await Address.find({ user: user._id, isDefault: true });
    expect(afterSwitch).toHaveLength(1);
    expect(expectFound(afterSwitch[0])._id.toString()).toBe(first.body._id);
  });
});

describe('Wishlist', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/wishlist').expect(401);
  });

  it('creates an empty wishlist on first read', async () => {
    const { token } = await createUser(app);

    const res = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.items).toEqual([]);
  });

  it('adds, rejects duplicates, removes and clears', async () => {
    const { token } = await createUser(app);
    const item = await createMenuItem();

    await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: item._id })
      .expect(200);

    await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: item._id })
      .expect(400);

    const afterRemove = await request(app)
      .delete(`/api/wishlist/${item._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(afterRemove.body.items).toHaveLength(0);

    await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ menuItemId: item._id })
      .expect(200);

    await request(app).delete('/api/wishlist').set('Authorization', `Bearer ${token}`).expect(200);

    const finalState = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(finalState.body.items).toHaveLength(0);
  });

  it('keeps wishlists separate between users', async () => {
    const { token: mine } = await createUser(app);
    const { token: theirs } = await createUser(app);
    const item = await createMenuItem();

    await request(app)
      .post('/api/wishlist')
      .set('Authorization', `Bearer ${mine}`)
      .send({ menuItemId: item._id })
      .expect(200);

    const res = await request(app)
      .get('/api/wishlist')
      .set('Authorization', `Bearer ${theirs}`)
      .expect(200);

    expect(res.body.items).toHaveLength(0);
  });
});

describe('Loyalty', () => {
  it('requires authentication', async () => {
    await request(app).get('/api/loyalty').expect(401);
    await request(app).get('/api/loyalty/rewards').expect(401);
  });

  it('starts a new customer at Bronze with zero points', async () => {
    const { token } = await createUser(app);

    const res = await request(app)
      .get('/api/loyalty')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.points).toBe(0);
    expect(res.body.tier).toBe('Bronze');
    expect(res.body.nextTier).toBe('Silver');
  });

  it('promotes through tiers as spend accumulates', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { user, token } = await createUser(app);
    const item = await createMenuItem({ price: 6000 });

    const order = await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);
    await request(app)
      .put(`/api/orders/${order.body._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'delivered' })
      .expect(200);

    // 6000 + 5% tax = 6300 -> Gold (>= 5000), 630 points
    const updated = expectFound(await User.findById(user._id));
    expect(updated.totalSpent).toBe(6300);
    expect(updated.loyaltyTier).toBe('Gold');
    expect(updated.loyaltyPoints).toBe(630);
  });

  it('redeems points and refuses to overdraw', async () => {
    const { user, token } = await createUser(app);

    await User.findByIdAndUpdate(user._id, { loyaltyPoints: 500 });

    const res = await request(app)
      .post('/api/loyalty/redeem')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 200 })
      .expect(200);

    expect(res.body.discount).toBe(20); // 100 points = Rs.10
    expect(res.body.remainingPoints).toBe(300);

    await request(app)
      .post('/api/loyalty/redeem')
      .set('Authorization', `Bearer ${token}`)
      .send({ points: 5000 })
      .expect(400);
  });

  it('returns the rewards catalogue', async () => {
    const { token } = await createUser(app);

    const res = await request(app)
      .get('/api/loyalty/rewards')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('points');
  });
});

describe('Contact form', () => {
  it('accepts a public submission and validates required fields', async () => {
    await request(app)
      .post('/api/contact')
      .send({ name: 'A', email: 'a@example.com', message: 'Hello' })
      .expect(201);

    await request(app).post('/api/contact').send({ name: 'A' }).expect(400);
  });

  it('restricts reading submissions to admins', async () => {
    const { token } = await createUser(app);

    await request(app).get('/api/contact').expect(401);
    await request(app).get('/api/contact').set('Authorization', `Bearer ${token}`).expect(403);

    const { token: adminToken } = await createAdmin(app);
    await request(app).get('/api/contact').set('Authorization', `Bearer ${adminToken}`).expect(200);
  });
});

describe('Admin dashboard', () => {
  it('reports counts and revenue, excluding cancelled orders', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem({ price: 1000 });

    const keep = await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);
    const cancel = await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);

    await request(app)
      .put(`/api/orders/${cancel.body._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' })
      .expect(200);

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.totalOrders).toBe(2);
    expect(res.body.totalRevenue).toBe(keep.body.totalAmount); // cancelled excluded
    expect(res.body.totalUsers).toBe(2);
    expect(res.body.totalMenuItems).toBe(1);
  });

  it('refuses to delete an admin account', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { user: otherAdmin } = await createAdmin(app);

    await request(app)
      .delete(`/api/admin/users/${otherAdmin._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('deletes a customer and changes roles', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { user } = await createUser(app);

    const promoted = await request(app)
      .put(`/api/admin/users/${user._id}/role`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'admin' })
      .expect(200);
    expect(promoted.body.role).toBe('admin');

    const { user: doomed } = await createUser(app);
    await request(app)
      .delete(`/api/admin/users/${doomed._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(await User.findById(doomed._id)).toBeNull();
  });

  it('never leaks password hashes in the user list', async () => {
    const { token: adminToken } = await createAdmin(app);
    await createUser(app);

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    for (const user of res.body) {
      expect(user.password).toBeUndefined();
    }
  });
});

describe('Health check', () => {
  it('responds without authentication', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('OK');
  });
});
