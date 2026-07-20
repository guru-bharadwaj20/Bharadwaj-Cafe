import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createUser, createAdmin, createMenuItem } from './factories.js';

const app = createApp();

describe('GET /api/menu', () => {
  beforeEach(async () => {
    // Descriptions must be distinct: search covers name, description AND tags,
    // so sharing the factory's default description would make every item match
    // every query.
    await createMenuItem({
      name: 'Espresso',
      description: 'A short, sharp shot',
      price: 100,
      category: 'coffee',
      tags: ['strong'],
    });
    await createMenuItem({
      name: 'Green Tea',
      description: 'Delicate leaves, gently steeped',
      price: 90,
      category: 'tea',
      dietary: ['Vegan'],
    });
    await createMenuItem({
      name: 'Croissant',
      description: 'Buttery and flaky',
      price: 200,
      category: 'pastries',
    });
    await createMenuItem({
      name: 'Hidden Item',
      description: 'Not for sale',
      price: 50,
      available: false,
    });
  });

  it('is public and hides unavailable items', async () => {
    const res = await request(app).get('/api/menu').expect(200);

    expect(res.body).toHaveLength(3);
    expect(res.body.map((i) => i.name)).not.toContain('Hidden Item');
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/menu?category=tea').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Green Tea');
  });

  it('filters by dietary preference', async () => {
    const res = await request(app).get('/api/menu?dietary=Vegan').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Green Tea');
  });

  it('filters by price range', async () => {
    const res = await request(app).get('/api/menu?minPrice=95&maxPrice=150').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Espresso');
  });

  it('searches name, description and tags', async () => {
    expect((await request(app).get('/api/menu?search=espre')).body).toHaveLength(1);
    expect((await request(app).get('/api/menu?search=strong')).body).toHaveLength(1);
    expect((await request(app).get('/api/menu?search=zzzz')).body).toHaveLength(0);
  });

  it('sorts by price ascending and descending', async () => {
    const low = await request(app).get('/api/menu?sortBy=price-low').expect(200);
    expect(low.body[0].name).toBe('Green Tea');

    const high = await request(app).get('/api/menu?sortBy=price-high').expect(200);
    expect(high.body[0].name).toBe('Croissant');
  });
});

describe('Menu writes', () => {
  const payload = {
    name: 'New Latte',
    description: 'Creamy',
    price: 175,
    image: 'img/latte.png',
    category: 'coffee',
  };

  it('requires admin for create, update and delete', async () => {
    const { token } = await createUser(app);
    const item = await createMenuItem();

    await request(app).post('/api/menu').send(payload).expect(401);
    await request(app)
      .post('/api/menu')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(403);
    await request(app)
      .put(`/api/menu/${item._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 1 })
      .expect(403);
    await request(app)
      .delete(`/api/menu/${item._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('lets an admin create, update and delete', async () => {
    const { token } = await createAdmin(app);

    const created = await request(app)
      .post('/api/menu')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    const updated = await request(app)
      .put(`/api/menu/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 200, available: false })
      .expect(200);

    expect(updated.body.price).toBe(200);
    expect(updated.body.available).toBe(false);

    await request(app)
      .delete(`/api/menu/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app).get(`/api/menu/${created.body._id}`).expect(404);
  });
});

describe('Reviews', () => {
  it('requires auth to write and is public to read', async () => {
    const item = await createMenuItem();

    await request(app).post('/api/reviews').send({ menuItem: item._id }).expect(401);
    await request(app).get(`/api/reviews/menu/${item._id}`).expect(200);
  });

  it('recalculates the menu item rating as reviews arrive', async () => {
    const item = await createMenuItem();
    const { token: a } = await createUser(app);
    const { token: b } = await createUser(app);

    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${a}`)
      .send({ menuItem: item._id, rating: 5, comment: 'Excellent' })
      .expect(201);

    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${b}`)
      .send({ menuItem: item._id, rating: 3, comment: 'Fine' })
      .expect(201);

    const menu = await request(app).get(`/api/menu/${item._id}`).expect(200);
    expect(menu.body.rating).toBe(4); // (5 + 3) / 2
    expect(menu.body.reviewCount).toBe(2);
  });

  it('allows only one review per user per item', async () => {
    const item = await createMenuItem();
    const { token } = await createUser(app);

    const review = { menuItem: item._id, rating: 5, comment: 'Great' };
    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send(review)
      .expect(201);

    await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send(review)
      .expect(400);
  });

  it("refuses to let one user edit or delete another's review", async () => {
    const item = await createMenuItem();
    const { token: owner } = await createUser(app);
    const { token: stranger } = await createUser(app);

    const created = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${owner}`)
      .send({ menuItem: item._id, rating: 5, comment: 'Mine' })
      .expect(201);

    await request(app)
      .put(`/api/reviews/${created.body._id}`)
      .set('Authorization', `Bearer ${stranger}`)
      .send({ rating: 1 })
      .expect(401);

    await request(app)
      .delete(`/api/reviews/${created.body._id}`)
      .set('Authorization', `Bearer ${stranger}`)
      .expect(401);
  });

  it('lets an admin delete any review', async () => {
    const item = await createMenuItem();
    const { token: owner } = await createUser(app);
    const { token: adminToken } = await createAdmin(app);

    const created = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${owner}`)
      .send({ menuItem: item._id, rating: 5, comment: 'Mine' })
      .expect(201);

    await request(app)
      .delete(`/api/reviews/${created.body._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('toggles the helpful marker', async () => {
    const item = await createMenuItem();
    const { token: owner } = await createUser(app);
    const { token: other } = await createUser(app);

    const created = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${owner}`)
      .send({ menuItem: item._id, rating: 4, comment: 'Good' })
      .expect(201);

    const on = await request(app)
      .put(`/api/reviews/${created.body._id}/helpful`)
      .set('Authorization', `Bearer ${other}`)
      .expect(200);
    expect(on.body.helpful).toBe(1);

    const off = await request(app)
      .put(`/api/reviews/${created.body._id}/helpful`)
      .set('Authorization', `Bearer ${other}`)
      .expect(200);
    expect(off.body.helpful).toBe(0);
  });
});
