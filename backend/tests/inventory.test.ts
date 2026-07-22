/**
 * Inventory reservation.
 *
 * The test that matters is the concurrency one: firing simultaneous orders
 * for the last unit and asserting that exactly one succeeds. A read-then-write
 * implementation passes every sequential test here and fails that one.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import MenuItem from '../models/MenuItem.js';
import { getLowStockItems } from '../config/inventory.js';
import { createUser, createAdmin, createMenuItem, placeOrder, expectFound } from './factories.js';

const app = createApp();

describe('stock-tracked items', () => {
  it('decrements stock when an order is placed', async () => {
    const { token } = await createUser(app);
    const item = await createMenuItem({ stock: 10 });

    await placeOrder(app, token, [{ menuItem: item._id, quantity: 3 }]).expect(201);

    const after = expectFound(await MenuItem.findById(item._id));
    expect(after.stock).toBe(7);
  });

  it('refuses an order larger than the stock on hand', async () => {
    const { token } = await createUser(app);
    const item = await createMenuItem({ stock: 2, name: 'Last Croissants' });

    const res = await placeOrder(app, token, [{ menuItem: item._id, quantity: 5 }]);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/only 2 .* left/i);

    // A rejected order must not have consumed anything.
    const after = expectFound(await MenuItem.findById(item._id));
    expect(after.stock).toBe(2);
  });

  it('reports an out-of-stock item clearly', async () => {
    const { token } = await createUser(app);
    const item = await createMenuItem({ stock: 0, name: 'Sold Out Scone' });

    const res = await placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/sold out scone is out of stock/i);
  });

  it('leaves untracked items alone', async () => {
    const { token } = await createUser(app);
    // stock: null means "not counted" — an espresso is limited by time, not
    // by a countable inventory.
    const item = await createMenuItem({ stock: null });

    // 50 is the per-line cap enforced by priceOrder; the point is that no
    // stock check applies at all to an untracked item.
    await placeOrder(app, token, [{ menuItem: item._id, quantity: 50 }]).expect(201);

    const after = expectFound(await MenuItem.findById(item._id));
    expect(after.stock).toBeNull();
  });
});

describe('concurrency', () => {
  it('never sells the same last unit twice', async () => {
    const item = await createMenuItem({ stock: 1, name: 'The Last Croissant' });

    // Ten separate customers, all reaching for the same single unit at once.
    const customers = await Promise.all(Array.from({ length: 10 }, () => createUser(app)));

    const responses = await Promise.all(
      customers.map(({ token }) => placeOrder(app, token, [{ menuItem: item._id, quantity: 1 }]))
    );

    const created = responses.filter((res) => res.status === 201);
    const rejected = responses.filter((res) => res.status === 409);

    expect(created).toHaveLength(1);
    expect(rejected).toHaveLength(9);

    // Stock must land exactly at zero — never negative.
    const after = expectFound(await MenuItem.findById(item._id));
    expect(after.stock).toBe(0);
  });

  it('keeps the total conserved under concurrent partial orders', async () => {
    const item = await createMenuItem({ stock: 20 });
    const customers = await Promise.all(Array.from({ length: 12 }, () => createUser(app)));

    const responses = await Promise.all(
      customers.map(({ token }) => placeOrder(app, token, [{ menuItem: item._id, quantity: 2 }]))
    );

    const succeeded = responses.filter((res) => res.status === 201).length;

    const after = expectFound(await MenuItem.findById(item._id));
    // Whatever the interleaving, sold + remaining must equal what we started
    // with. A lost update would break this even when no order oversells.
    expect(succeeded * 2 + (after.stock ?? 0)).toBe(20);
    expect(after.stock).toBeGreaterThanOrEqual(0);
  });
});

describe('multi-item orders are all-or-nothing', () => {
  it('does not consume the first item when a later one is short', async () => {
    const { token } = await createUser(app);
    const plentiful = await createMenuItem({ stock: 50, name: 'Plenty' });
    const scarce = await createMenuItem({ stock: 1, name: 'Scarce' });

    const res = await placeOrder(app, token, [
      { menuItem: plentiful._id, quantity: 5 },
      { menuItem: scarce._id, quantity: 4 },
    ]);

    expect(res.status).toBe(409);

    // The first reservation has to be rolled back, or a failed order quietly
    // eats stock nobody bought.
    const first = expectFound(await MenuItem.findById(plentiful._id));
    const second = expectFound(await MenuItem.findById(scarce._id));
    expect(first.stock).toBe(50);
    expect(second.stock).toBe(1);
  });

  it('reserves every item when all are available', async () => {
    const { token } = await createUser(app);
    const coffee = await createMenuItem({ stock: 10 });
    const pastry = await createMenuItem({ stock: 8 });

    await placeOrder(app, token, [
      { menuItem: coffee._id, quantity: 2 },
      { menuItem: pastry._id, quantity: 3 },
    ]).expect(201);

    expect(expectFound(await MenuItem.findById(coffee._id)).stock).toBe(8);
    expect(expectFound(await MenuItem.findById(pastry._id)).stock).toBe(5);
  });
});

describe('cancellation', () => {
  it('returns stock to the shelf', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem({ stock: 10 });

    const { body: order } = await placeOrder(app, token, [
      { menuItem: item._id, quantity: 4 },
    ]).expect(201);
    expect(expectFound(await MenuItem.findById(item._id)).stock).toBe(6);

    await request(app)
      .put(`/api/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'cancelled' })
      .expect(200);

    expect(expectFound(await MenuItem.findById(item._id)).stock).toBe(10);
  });

  it('does not inflate stock when cancelled twice', async () => {
    const { token: adminToken } = await createAdmin(app);
    const { token } = await createUser(app);
    const item = await createMenuItem({ stock: 10 });

    const { body: order } = await placeOrder(app, token, [{ menuItem: item._id, quantity: 4 }]);

    const cancel = () =>
      request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

    await cancel();
    await cancel();
    await cancel();

    // Releasing on every cancel would conjure inventory out of nothing.
    expect(expectFound(await MenuItem.findById(item._id)).stock).toBe(10);
  });
});

describe('low stock reporting', () => {
  it('lists only items at or below their threshold', async () => {
    await createMenuItem({ name: 'Running Low', stock: 3, lowStockThreshold: 5 });
    await createMenuItem({ name: 'Exactly At', stock: 5, lowStockThreshold: 5 });
    await createMenuItem({ name: 'Comfortable', stock: 50, lowStockThreshold: 5 });
    await createMenuItem({ name: 'Untracked', stock: null });

    const low = await getLowStockItems();
    const names = low.map((item) => item.name);

    expect(names).toContain('Running Low');
    expect(names).toContain('Exactly At');
    expect(names).not.toContain('Comfortable');
    expect(names).not.toContain('Untracked');
  });

  it('sorts the most urgent first', async () => {
    await createMenuItem({ name: 'Two Left', stock: 2, lowStockThreshold: 10 });
    await createMenuItem({ name: 'None Left', stock: 0, lowStockThreshold: 10 });

    const low = await getLowStockItems();
    expect(low[0]?.name).toBe('None Left');
  });
});
