/**
 * Cache behaviour, verified against a real in-memory Redis.
 *
 * Two properties matter and neither is provable by inspection:
 *   1. Without REDIS_URL the app still works — every cache call is a no-op.
 *   2. With Redis, a write invalidates the cached read rather than leaving
 *      customers looking at a stale menu.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { RedisMemoryServer } from 'redis-memory-server';
import { createApp } from '../app.js';
import { createAdmin, createMenuItem } from './factories.js';

const app = createApp();

describe('without Redis configured', () => {
  it('serves the menu and treats the cache as a miss', async () => {
    expect(process.env.REDIS_URL).toBeUndefined();

    await createMenuItem({ name: 'Uncached Espresso', description: 'Short and sharp' });

    const first = await request(app).get('/api/menu').expect(200);
    const second = await request(app).get('/api/menu').expect(200);

    expect(first.body).toHaveLength(1);
    expect(second.body).toHaveLength(1);
  });

  it('still reflects writes immediately', async () => {
    const { token } = await createAdmin(app);

    await request(app)
      .post('/api/menu')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Fresh Item',
        description: 'Added just now',
        price: 100,
        image: 'x.png',
        category: 'coffee',
      })
      .expect(201);

    const res = await request(app).get('/api/menu').expect(200);
    expect(res.body.map((i: { name: string }) => i.name)).toContain('Fresh Item');
  });
});

describe('with Redis configured', () => {
  let redisServer: RedisMemoryServer;

  beforeAll(async () => {
    redisServer = new RedisMemoryServer();
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();
    process.env.REDIS_URL = `redis://${host}:${port}`;

    // config/redis.ts caches its client at module scope, so the modules that
    // read it are re-imported after the URL is set.
    const { getRedis } = await import('../config/redis.js');
    await getRedis()?.ping();
  }, 120000);

  afterAll(async () => {
    const { closeRedis } = await import('../config/redis.js');
    await closeRedis();
    await redisServer?.stop();
    delete process.env.REDIS_URL;
  });

  beforeEach(async () => {
    const { getRedis } = await import('../config/redis.js');
    await getRedis()?.flushall();
  });

  it('serves a repeated read from cache', async () => {
    await createMenuItem({ name: 'Cached Latte', description: 'Milky' });

    const first = await request(app).get('/api/menu').expect(200);
    expect(first.body).toHaveLength(1);

    // Deleting behind the cache's back: a cached response still shows it.
    const MenuItem = (await import('../models/MenuItem.js')).default;
    await MenuItem.deleteMany({});

    const second = await request(app).get('/api/menu').expect(200);
    expect(second.body).toHaveLength(1);
    expect(second.body[0].name).toBe('Cached Latte');
  });

  it('invalidates the cache when an admin adds an item', async () => {
    await createMenuItem({ name: 'Original', description: 'First' });
    const { token } = await createAdmin(app);

    // Warm the cache.
    const before = await request(app).get('/api/menu').expect(200);
    expect(before.body).toHaveLength(1);

    await request(app)
      .post('/api/menu')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Brand New',
        description: 'Second',
        price: 120,
        image: 'y.png',
        category: 'coffee',
      })
      .expect(201);

    // Stale data here would mean customers cannot see a new item for a minute.
    const after = await request(app).get('/api/menu').expect(200);
    expect(after.body).toHaveLength(2);
  });

  it('invalidates when an item is taken off the menu', async () => {
    const item = await createMenuItem({ name: 'Sold Out Soon', description: 'Going' });
    const { token } = await createAdmin(app);

    await request(app).get('/api/menu').expect(200);

    await request(app)
      .delete(`/api/menu/${item._id.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const after = await request(app).get('/api/menu').expect(200);
    expect(after.body).toHaveLength(0);
  });

  it('keys separate filters separately', async () => {
    await createMenuItem({ name: 'Coffee One', description: 'A', category: 'coffee' });
    await createMenuItem({ name: 'Tea One', description: 'B', category: 'tea' });

    const coffee = await request(app).get('/api/menu?category=coffee').expect(200);
    const tea = await request(app).get('/api/menu?category=tea').expect(200);

    // A shared key would hand the tea request the cached coffee response.
    expect(coffee.body).toHaveLength(1);
    expect(coffee.body[0].name).toBe('Coffee One');
    expect(tea.body).toHaveLength(1);
    expect(tea.body[0].name).toBe('Tea One');
  });
});
