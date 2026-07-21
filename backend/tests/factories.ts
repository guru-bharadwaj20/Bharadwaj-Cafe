/**
 * Shared test data builders.
 *
 * Every factory produces a valid document with sensible defaults so that a
 * test only has to state the fields it actually cares about.
 */
import mongoose from 'mongoose';
import request from 'supertest';
import type { Express } from 'express';
import User, { type HydratedUser, type IUser } from '../models/User.js';
import MenuItem, { type HydratedMenuItem, type IMenuItem } from '../models/MenuItem.js';

export const DEFAULT_PASSWORD = 'correct-horse-battery';

const uniqueSuffix = (): string => new mongoose.Types.ObjectId().toString();

/**
 * Asserts a query actually found something, and narrows away the `| null`.
 *
 * Tests reload documents constantly; without this every one needs a `!`,
 * which silently turns a genuine "not found" bug into a confusing property
 * access on null. This fails loudly at the point of the lookup instead.
 */
// NonNullable on the return type is load-bearing: with a plain `T`, inference
// happily picks `T = Document | null` and the null survives the call.
export const expectFound = <T>(value: T, what = 'document'): NonNullable<T> => {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${what} to exist, but the query returned nothing`);
  }
  return value;
};

export interface CreatedUser {
  user: HydratedUser;
  token: string;
  password: string;
}

/** Creates a verified user and logs them in. */
export const createUser = async (
  app: Express,
  overrides: Partial<IUser> = {}
): Promise<CreatedUser> => {
  const password = overrides.password ?? DEFAULT_PASSWORD;

  const user = await User.create({
    name: 'Test User',
    email: `user-${uniqueSuffix()}@example.com`,
    isVerified: true,
    ...overrides,
    password,
  });

  const res = await request(app).post('/api/auth/login').send({ email: user.email, password });

  if (!res.body.token) {
    throw new Error(`Login failed in factory: ${JSON.stringify(res.body)}`);
  }

  return { user, token: res.body.token as string, password };
};

export const createAdmin = (app: Express, overrides: Partial<IUser> = {}): Promise<CreatedUser> =>
  createUser(app, { role: 'admin', name: 'Test Admin', ...overrides });

export const createMenuItem = (overrides: Partial<IMenuItem> = {}): Promise<HydratedMenuItem> =>
  MenuItem.create({
    name: `Cappuccino ${uniqueSuffix().slice(-6)}`,
    description: 'Espresso with steamed milk foam',
    price: 150,
    image: 'img/cappuccino.png',
    category: 'coffee',
    ...overrides,
  });

export interface OrderLine {
  menuItem?: unknown;
  _id?: unknown;
  quantity?: number;
}

/** Places an order through the real HTTP endpoint. */
export const placeOrder = (
  app: Express,
  token: string,
  items: OrderLine[],
  overrides: Record<string, unknown> = {}
): request.Test =>
  request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send({
      items: items.map((entry) =>
        entry.menuItem ? entry : { menuItem: entry._id, quantity: entry.quantity ?? 1 }
      ),
      customerPhone: '9999999999',
      ...overrides,
    });
