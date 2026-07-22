import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../app.js';
import Order from '../models/Order.js';
import { createUser, createMenuItem, placeOrder, expectFound } from './factories.js';

const KEY_ID = 'rzp_test_key';
const KEY_SECRET = 'rzp_test_secret';
const WEBHOOK_SECRET = 'whsec_test';

// The Razorpay SDK is stubbed: these tests are about our signature checks,
// idempotency and authorisation, not about the provider's own API.
const ordersCreate = vi.fn();
vi.mock('razorpay', () => ({
  default: class {
    orders = { create: ordersCreate };
  },
}));

const app = createApp();

const sign = (payload: string, secret: string): string =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

beforeAll(() => {
  process.env.RAZORPAY_KEY_ID = KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

afterAll(() => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
});

beforeEach(() => {
  ordersCreate.mockReset();
  ordersCreate.mockImplementation((opts: { amount: number }) =>
    Promise.resolve({ id: 'order_provider_1', amount: opts.amount, currency: 'INR' })
  );
});

/** Places a real order and returns it with its owner's token. */
const seedOrder = async (price = 500) => {
  const { token, user } = await createUser(app);
  const item = await createMenuItem({ price });
  const res = await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);
  return { token, user, order: res.body as { _id: string; totalAmount: number } };
};

describe('GET /api/payments/config', () => {
  it('advertises availability and only the publishable key', async () => {
    const res = await request(app).get('/api/payments/config').expect(200);

    expect(res.body.enabled).toBe(true);
    expect(res.body.keyId).toBe(KEY_ID);
    // The secret must never reach a client.
    expect(JSON.stringify(res.body)).not.toContain(KEY_SECRET);
  });
});

describe('POST /api/payments/orders/:orderId', () => {
  it('charges the server-computed total, not anything the client sends', async () => {
    const { token, order } = await seedOrder(500);

    await request(app)
      .post(`/api/payments/orders/${order._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1 }) // attacker-supplied
      .expect(201);

    // 500 + 5% tax = 525 -> 52500 paise. The body's `amount` is ignored.
    expect(ordersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 52500, currency: 'INR' })
    );
  });

  it("requires authentication and refuses another user's order", async () => {
    const { order } = await seedOrder();
    const { token: stranger } = await createUser(app);

    await request(app).post(`/api/payments/orders/${order._id}`).expect(401);

    await request(app)
      .post(`/api/payments/orders/${order._id}`)
      .set('Authorization', `Bearer ${stranger}`)
      .expect(404);
  });

  it('refuses to re-open payment on an order already paid', async () => {
    const { token, order } = await seedOrder();
    await Order.findByIdAndUpdate(order._id, { paymentStatus: 'completed' });

    await request(app)
      .post(`/api/payments/orders/${order._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
  });
});

describe('POST /api/payments/verify', () => {
  const openPayment = async () => {
    const seeded = await seedOrder();
    await request(app)
      .post(`/api/payments/orders/${seeded.order._id}`)
      .set('Authorization', `Bearer ${seeded.token}`)
      .expect(201);
    return seeded;
  };

  it('marks the order paid when the signature is valid', async () => {
    const { token, order } = await openPayment();
    const signature = sign('order_provider_1|pay_1', KEY_SECRET);

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ providerOrderId: 'order_provider_1', paymentId: 'pay_1', signature })
      .expect(200);

    expect(res.body.paymentStatus).toBe('completed');
    expect(res.body.status).toBe('confirmed');

    const stored = expectFound(await Order.findById(order._id));
    expect(stored.paidAt).toBeInstanceOf(Date);
  });

  it('rejects a forged signature and leaves the order unpaid', async () => {
    const { token, order } = await openPayment();

    await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({
        providerOrderId: 'order_provider_1',
        paymentId: 'pay_free_coffee',
        signature: 'not-a-real-signature',
      })
      .expect(400);

    const stored = expectFound(await Order.findById(order._id));
    expect(stored.paymentStatus).toBe('pending');
    expect(stored.paidAt).toBeUndefined();
  });

  it('rejects a signature that is valid for a different payment id', async () => {
    const { token } = await openPayment();
    // Correctly signed, but for another payment.
    const signature = sign('order_provider_1|pay_OTHER', KEY_SECRET);

    await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ providerOrderId: 'order_provider_1', paymentId: 'pay_1', signature })
      .expect(400);
  });

  it('requires all three fields', async () => {
    const { token } = await openPayment();

    await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ providerOrderId: 'order_provider_1' })
      .expect(400);
  });
});

describe('POST /api/payments/webhook', () => {
  const deliver = (event: unknown, secret = WEBHOOK_SECRET) => {
    const raw = JSON.stringify(event);
    return request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', sign(raw, secret))
      .send(raw);
  };

  const captured = (orderId = 'order_provider_1', paymentId = 'pay_hook') => ({
    event: 'payment.captured',
    payload: { payment: { entity: { id: paymentId, order_id: orderId } } },
  });

  const openPayment = async () => {
    const seeded = await seedOrder();
    await request(app)
      .post(`/api/payments/orders/${seeded.order._id}`)
      .set('Authorization', `Bearer ${seeded.token}`)
      .expect(201);
    return seeded;
  };

  it('confirms payment without any user session', async () => {
    const { order } = await openPayment();

    await deliver(captured()).expect(200);

    const stored = expectFound(await Order.findById(order._id));
    expect(stored.paymentStatus).toBe('completed');
    expect(stored.paymentId).toBe('pay_hook');
    expect(stored.status).toBe('confirmed');
  });

  it('rejects an unsigned or wrongly-signed delivery', async () => {
    const { order } = await openPayment();

    await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(captured()))
      .expect(400);

    await deliver(captured(), 'wrong-secret').expect(400);

    const stored = expectFound(await Order.findById(order._id));
    expect(stored.paymentStatus).toBe('pending');
  });

  it('is idempotent across retries', async () => {
    const { order } = await openPayment();

    await deliver(captured()).expect(200);
    const first = expectFound(await Order.findById(order._id));
    const firstPaidAt = first.paidAt?.getTime();

    // Razorpay retries until it sees a 2xx; a repeat must change nothing.
    await deliver(captured()).expect(200);
    await deliver(captured()).expect(200);

    const after = expectFound(await Order.findById(order._id));
    expect(after.paidAt?.getTime()).toBe(firstPaidAt);
    expect(after.paymentStatus).toBe('completed');
  });

  it('never walks a paid order back to failed', async () => {
    const { order } = await openPayment();

    await deliver(captured()).expect(200);
    await deliver({
      event: 'payment.failed',
      payload: { payment: { entity: { id: 'pay_x', order_id: 'order_provider_1' } } },
    }).expect(200);

    const stored = expectFound(await Order.findById(order._id));
    expect(stored.paymentStatus).toBe('completed');
  });

  it('does not advance an order that has moved past confirmed', async () => {
    const { order } = await openPayment();
    await Order.findByIdAndUpdate(order._id, { status: 'preparing' });

    await deliver(captured()).expect(200);

    const stored = expectFound(await Order.findById(order._id));
    expect(stored.status).toBe('preparing'); // not reset to 'confirmed'
    expect(stored.paymentStatus).toBe('completed');
  });

  it('acknowledges events it does not act on', async () => {
    await deliver({ event: 'payment.authorized', payload: {} }).expect(200);
  });
});
