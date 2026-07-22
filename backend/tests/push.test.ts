/**
 * Web Push subscription handling.
 *
 * A subscription is a capability: whoever holds it can push to that device.
 * These tests cover the consequences — subscriptions are never returned to a
 * client, one customer cannot unsubscribe another's device, and a dead
 * subscription is pruned rather than retried forever.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import PushSubscription from '../models/PushSubscription.js';
import { sendToUser } from '../config/push.js';
import { createUser, createAdmin, createMenuItem, placeOrder, expectFound } from './factories.js';

const sendNotification = vi.fn();
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]): unknown => sendNotification(...args) as unknown,
  },
}));

const app = createApp();

// A well-formed subscription as a browser would produce it.
const subscriptionFor = (id: string) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
  keys: { p256dh: 'BN'.padEnd(87, 'x'), auth: 'auth'.padEnd(22, 'y') },
});

beforeAll(() => {
  process.env.VAPID_PUBLIC_KEY = 'test-public-key';
  process.env.VAPID_PRIVATE_KEY = 'test-private-key';
});

afterAll(() => {
  delete process.env.VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
});

beforeEach(() => {
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({ statusCode: 201 });
});

describe('GET /api/push/config', () => {
  it('publishes only the public key', async () => {
    const res = await request(app).get('/api/push/config').expect(200);

    expect(res.body.enabled).toBe(true);
    expect(res.body.publicKey).toBe('test-public-key');
    // The private key must never leave the server.
    expect(JSON.stringify(res.body)).not.toContain('test-private-key');
  });
});

describe('subscribing', () => {
  it('requires authentication', async () => {
    await request(app).post('/api/push/subscribe').send(subscriptionFor('a')).expect(401);
  });

  it('registers a device against the caller', async () => {
    const { user, token } = await createUser(app);

    await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(subscriptionFor('device-1'))
      .expect(201);

    const stored = expectFound(await PushSubscription.findOne({}));
    expect(stored.user.toString()).toBe(user._id.toString());
  });

  it('rejects an incomplete subscription', async () => {
    const { token } = await createUser(app);

    await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint: 'https://example.com/push' }) // no keys
      .expect(400);
  });

  it('re-points a shared device at whoever subscribed last', async () => {
    const { token: first } = await createUser(app);
    const { user: second, token: secondToken } = await createUser(app);
    const device = subscriptionFor('shared-browser');

    await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${first}`)
      .send(device)
      .expect(201);

    await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${secondToken}`)
      .send(device)
      .expect(201);

    // One row, owned by the current user — otherwise a shared browser would
    // keep pushing one person's order updates to the next person.
    const all = await PushSubscription.find({});
    expect(all).toHaveLength(1);
    expect(expectFound(all[0]).user.toString()).toBe(second._id.toString());
  });
});

describe('unsubscribing', () => {
  it("removes only the caller's own device", async () => {
    const { token: mine } = await createUser(app);
    const { token: theirs } = await createUser(app);

    await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${theirs}`)
      .send(subscriptionFor('their-device'))
      .expect(201);

    // Knowing an endpoint must not be enough to disable someone else's
    // notifications.
    await request(app)
      .delete('/api/push/subscribe')
      .set('Authorization', `Bearer ${mine}`)
      .send({ endpoint: subscriptionFor('their-device').endpoint })
      .expect(200);

    expect(await PushSubscription.countDocuments()).toBe(1);
  });
});

describe('delivery', () => {
  it('sends to every device a customer registered', async () => {
    const { user, token } = await createUser(app);

    for (const id of ['phone', 'laptop']) {
      await request(app)
        .post('/api/push/subscribe')
        .set('Authorization', `Bearer ${token}`)
        .send(subscriptionFor(id))
        .expect(201);
    }

    const delivered = await sendToUser(user._id, { title: 'Hi', body: 'Test' });

    expect(delivered).toBe(2);
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it('prunes a subscription the browser has discarded', async () => {
    const { user, token } = await createUser(app);

    await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(subscriptionFor('expired'))
      .expect(201);

    // 410 Gone means it will never work again; retrying forever is pointless.
    sendNotification.mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 }));

    const delivered = await sendToUser(user._id, { title: 'Hi', body: 'Test' });

    expect(delivered).toBe(0);
    expect(await PushSubscription.countDocuments()).toBe(0);
  });

  it('keeps a subscription after a transient failure', async () => {
    const { user, token } = await createUser(app);

    await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(subscriptionFor('flaky'))
      .expect(201);

    // A 500 from the push service says nothing about the subscription.
    sendNotification.mockRejectedValue(
      Object.assign(new Error('Server error'), {
        statusCode: 500,
      })
    );

    await sendToUser(user._id, { title: 'Hi', body: 'Test' });

    expect(await PushSubscription.countDocuments()).toBe(1);
  });

  it('does nothing when the customer has no devices', async () => {
    const { user } = await createUser(app);

    const delivered = await sendToUser(user._id, { title: 'Hi', body: 'Test' });

    expect(delivered).toBe(0);
    expect(sendNotification).not.toHaveBeenCalled();
  });
});

describe('order notifications', () => {
  it('pushes when an order becomes ready, but not on every step', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem();

    await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(subscriptionFor('customer-phone'))
      .expect(201);

    const { body: order } = await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);

    const setStatus = (status: string) =>
      request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status })
        .expect(200);

    // Intermediate states are deliberately silent — a push per step trains
    // people to switch notifications off.
    await setStatus('confirmed');
    await setStatus('preparing');
    expect(sendNotification).not.toHaveBeenCalled();

    await setStatus('ready');
    await vi.waitFor(() => expect(sendNotification).toHaveBeenCalledTimes(1));

    const payload = JSON.parse(sendNotification.mock.calls[0]?.[1] as string) as {
      title: string;
      tag: string;
    };
    expect(payload.title).toMatch(/ready/i);
    // Tagged per order so a later update replaces rather than stacks.
    expect(payload.tag).toContain('order-');
  });
});
