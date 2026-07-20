/**
 * Shared test data builders.
 *
 * Every factory produces a valid document with sensible defaults so that a
 * test only has to state the fields it actually cares about.
 */
import mongoose from 'mongoose';
import request from 'supertest';
import User from '../models/User.js';
import MenuItem from '../models/MenuItem.js';

export const DEFAULT_PASSWORD = 'correct-horse-battery';

const uniqueSuffix = () => new mongoose.Types.ObjectId().toString();

/**
 * Creates a verified user and logs them in.
 * @returns {Promise<{user: object, token: string, password: string}>}
 */
export const createUser = async (app, overrides = {}) => {
  const password = overrides.password || DEFAULT_PASSWORD;

  const user = await User.create({
    name: 'Test User',
    email: `user-${uniqueSuffix()}@example.com`,
    isVerified: true,
    ...overrides,
    password,
  });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password });

  if (!res.body.token) {
    throw new Error(`Login failed in factory: ${JSON.stringify(res.body)}`);
  }

  return { user, token: res.body.token, password };
};

export const createAdmin = (app, overrides = {}) =>
  createUser(app, { role: 'admin', name: 'Test Admin', ...overrides });

export const createMenuItem = (overrides = {}) =>
  MenuItem.create({
    name: `Cappuccino ${uniqueSuffix().slice(-6)}`,
    description: 'Espresso with steamed milk foam',
    price: 150,
    image: 'img/cappuccino.png',
    category: 'coffee',
    ...overrides,
  });

/** Places an order through the real HTTP endpoint. */
export const placeOrder = async (app, token, items, overrides = {}) => {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: items.map((entry) =>
        entry.menuItem
          ? entry
          : { menuItem: entry._id, quantity: entry.quantity || 1 }
      ),
      customerPhone: '9999999999',
      ...overrides,
    });

  return res;
};

/** Convenience wrapper for authenticated requests. */
export const auth = (req, token) => req.set('Authorization', `Bearer ${token}`);
