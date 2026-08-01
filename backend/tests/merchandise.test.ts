/**
 * The merchandise shelf.
 *
 * Merch and drinks share one collection so that both are priced by the same
 * server-side lookup at checkout. The properties worth proving are that the
 * two never bleed into each other's listing, and — the actual reported bug —
 * that a merch item can be bought at all.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createUser, createMenuItem, expectFound } from './factories.js';
import Order from '../models/Order.js';

const app = createApp();

const createMerch = (overrides = {}) =>
  createMenuItem({
    name: 'Cafe Tote Bag',
    description: 'Heavy canvas tote',
    price: 449,
    image: 'img/merch/tote.svg',
    category: 'accessories',
    kind: 'merch',
    ...overrides,
  });

const names = (body: { name: string }[]) => body.map((item) => item.name);

describe('listing', () => {
  it('keeps merchandise off the drinks menu', async () => {
    await createMenuItem({ name: 'House Latte' });
    await createMerch();

    const res = await request(app).get('/api/menu').expect(200);

    expect(names(res.body)).toEqual(['House Latte']);
  });

  it('returns only merchandise when asked for it', async () => {
    await createMenuItem({ name: 'House Latte' });
    await createMerch();

    const res = await request(app).get('/api/menu?kind=merch').expect(200);

    expect(names(res.body)).toEqual(['Cafe Tote Bag']);
  });

  it('treats an unrecognised kind as drinks rather than returning everything', async () => {
    await createMenuItem({ name: 'House Latte' });
    await createMerch();

    const res = await request(app).get('/api/menu?kind=anything-else').expect(200);

    expect(names(res.body)).toEqual(['House Latte']);
  });

  it('defaults an item with no kind to a drink', async () => {
    // Documents written before `kind` existed must not vanish from the menu.
    await createMenuItem({ name: 'Legacy Item', kind: undefined });

    const res = await request(app).get('/api/menu').expect(200);

    expect(names(res.body)).toEqual(['Legacy Item']);
  });
});

describe('buying merchandise', () => {
  it('accepts an order for a merch item', async () => {
    const { token } = await createUser(app);
    const tote = await createMerch();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ menuItem: tote._id.toString(), quantity: 2 }],
        customerPhone: '9999999999',
        orderType: 'takeaway',
      })
      .expect(201);

    // Priced from the database, not from anything the client sent.
    expect(res.body.subtotal).toBe(898);
  });

  it('accepts a basket mixing merchandise and drinks', async () => {
    const { token } = await createUser(app);
    const tote = await createMerch();
    const latte = await createMenuItem({ name: 'House Latte', price: 150 });

    // The reported bug: one merch item used to fail the whole checkout,
    // because its id came from a hardcoded array and matched no document.
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [
          { menuItem: tote._id.toString(), quantity: 2 },
          { menuItem: latte._id.toString(), quantity: 1 },
        ],
        customerPhone: '9999999999',
        orderType: 'takeaway',
      })
      .expect(201);

    expect(res.body.subtotal).toBe(1048);

    const order = expectFound(await Order.findById(res.body._id));
    expect(order.items).toHaveLength(2);
  });

  it('still rejects an id that belongs to no item', async () => {
    const { token } = await createUser(app);

    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [{ menuItem: 'merch-1', quantity: 1 }],
        customerPhone: '9999999999',
        orderType: 'takeaway',
      })
      .expect(400);
  });
});
