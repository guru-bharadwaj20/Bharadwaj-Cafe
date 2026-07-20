import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { createUser, createAdmin, createMenuItem, placeOrder } from './factories.js';

const app = createApp();

describe('POST /api/orders', () => {
  let token;
  let coffee;
  let pastry;

  beforeEach(async () => {
    ({ token } = await createUser(app));
    coffee = await createMenuItem({ price: 150 });
    pastry = await createMenuItem({ price: 80, category: 'pastries' });
  });

  it('requires authentication', async () => {
    await request(app)
      .post('/api/orders')
      .send({ items: [{ menuItem: coffee._id, quantity: 1 }], customerPhone: '9' })
      .expect(401);
  });

  it('prices a multi-item order from the menu', async () => {
    const res = await placeOrder(app, token, [
      { menuItem: coffee._id, quantity: 2 }, // 2 x 150 = 300
      { menuItem: pastry._id, quantity: 3 }, // 3 x  80 = 240
    ]);

    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(540);
    expect(res.body.tax).toBe(27); // 5%
    expect(res.body.totalAmount).toBe(567);
  });

  it('merges duplicate line items for the same product', async () => {
    const res = await placeOrder(app, token, [
      { menuItem: coffee._id, quantity: 1 },
      { menuItem: coffee._id, quantity: 2 },
    ]);

    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(3);
    expect(res.body.subtotal).toBe(450);
  });

  it('captures a snapshot of name and price at time of order', async () => {
    const res = await placeOrder(app, token, [{ menuItem: coffee._id, quantity: 1 }]);
    expect(res.body.items[0].name).toBe(coffee.name);
    expect(res.body.items[0].price).toBe(150);

    // A later menu price change must not rewrite history.
    coffee.price = 999;
    await coffee.save();

    const stored = await Order.findById(res.body._id);
    expect(stored.items[0].price).toBe(150);
    expect(stored.totalAmount).toBe(158);
  });

  it('rejects an empty or missing item list', async () => {
    await placeOrder(app, token, []).then((res) => expect(res.status).toBe(400));

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerPhone: '9' })
      .expect(400);
  });

  it('requires a contact phone number', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ menuItem: coffee._id, quantity: 1 }] });

    expect(res.status).toBe(400);
  });

  it('requires an address for delivery orders only', async () => {
    const missing = await placeOrder(app, token, [{ menuItem: coffee._id, quantity: 1 }], {
      orderType: 'delivery',
    });
    expect(missing.status).toBe(400);

    const provided = await placeOrder(app, token, [{ menuItem: coffee._id, quantity: 1 }], {
      orderType: 'delivery',
      deliveryAddress: '1 Test Street',
    });
    expect(provided.status).toBe(201);

    const takeaway = await placeOrder(app, token, [{ menuItem: coffee._id, quantity: 1 }], {
      orderType: 'takeaway',
    });
    expect(takeaway.status).toBe(201);
  });

  it('rejects invalid order types and payment methods', async () => {
    const badType = await placeOrder(app, token, [{ menuItem: coffee._id, quantity: 1 }], {
      orderType: 'teleport',
    });
    expect(badType.status).toBe(400);

    const badPayment = await placeOrder(app, token, [{ menuItem: coffee._id, quantity: 1 }], {
      paymentMethod: 'goats',
    });
    expect(badPayment.status).toBe(400);
  });

  it('defaults to a takeaway, card, unpaid order', async () => {
    const res = await placeOrder(app, token, [{ menuItem: coffee._id, quantity: 1 }]);

    expect(res.body.orderType).toBe('takeaway');
    expect(res.body.paymentMethod).toBe('card');
    expect(res.body.paymentStatus).toBe('pending');
    expect(res.body.status).toBe('pending');
  });
});

describe('GET /api/orders/myorders', () => {
  it("returns only the caller's own orders, newest first", async () => {
    const { token: mine } = await createUser(app);
    const { token: theirs } = await createUser(app);
    const item = await createMenuItem();

    await placeOrder(app, mine, [{ menuItem: item._id, quantity: 1 }]);
    await placeOrder(app, mine, [{ menuItem: item._id, quantity: 2 }]);
    await placeOrder(app, theirs, [{ menuItem: item._id, quantity: 5 }]);

    const res = await request(app)
      .get('/api/orders/myorders')
      .set('Authorization', `Bearer ${mine}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(new Date(res.body[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(res.body[1].createdAt).getTime()
    );
  });

  it('requires authentication', async () => {
    await request(app).get('/api/orders/myorders').expect(401);
  });

  it('is not shadowed by the /:id route', async () => {
    const { token } = await createUser(app);

    // 'myorders' must not be parsed as an order id and 500 on a cast error.
    const res = await request(app)
      .get('/api/orders/myorders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/orders (admin list)', () => {
  it('is admin-only', async () => {
    const { token } = await createUser(app);
    await request(app).get('/api/orders').expect(401);
    await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`).expect(403);
  });

  it('returns every order for an admin', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token: a } = await createUser(app);
    const { token: b } = await createUser(app);
    const item = await createMenuItem();

    await placeOrder(app, a, [{ menuItem: item._id, quantity: 1 }]);
    await placeOrder(app, b, [{ menuItem: item._id, quantity: 1 }]);

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
  });
});

describe('Order status transitions', () => {
  let adminToken;
  let customerToken;
  let order;

  beforeEach(async () => {
    ({ token: adminToken } = await createAdmin(app));
    ({ token: customerToken } = await createUser(app));
    const item = await createMenuItem({ price: 1000 });
    const res = await placeOrder(app, customerToken, [{ menuItem: item._id, quantity: 1 }]);
    order = res.body;
  });

  it('is refused for non-admins', async () => {
    await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'delivered' })
      .expect(403);
  });

  it('accepts every documented status', async () => {
    for (const status of ['confirmed', 'preparing', 'ready', 'delivered', 'cancelled']) {
      await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status })
        .expect(200);
    }
  });

  it('rejects an unknown status and a missing status', async () => {
    await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'exploded' })
      .expect(400);

    await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);
  });

  it('awards loyalty points exactly once on delivery', async () => {
    const deliver = () =>
      request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delivered' })
        .expect(200);

    await deliver();
    const afterFirst = await User.findById(order.user);

    // 1050 total -> 105 points, tier still Silver at 1050 spent
    expect(afterFirst.loyaltyPoints).toBe(105);
    expect(afterFirst.totalSpent).toBe(1050);
    expect(afterFirst.loyaltyTier).toBe('Silver');

    // Re-sending 'delivered' must not award a second time.
    await deliver();
    const afterSecond = await User.findById(order.user);
    expect(afterSecond.loyaltyPoints).toBe(105);
  });

  it('returns 404 for an unknown order id', async () => {
    await request(app)
      .put('/api/orders/507f1f77bcf86cd799439011/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ready' })
      .expect(404);
  });
});
