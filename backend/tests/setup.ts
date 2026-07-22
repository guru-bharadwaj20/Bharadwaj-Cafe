import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set before any application module is imported, since several read these at
// module-evaluation time.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';
process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.CLIENT_URL = 'http://localhost:5173';

// There is no SMTP server in tests. Without this the mailer throws and
// handlers take their error paths, masking what is under test.
vi.mock('../utils/email.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderStatusEmail: vi.fn().mockResolvedValue(undefined),
}));

let mongoServer: MongoMemoryServer | undefined;

beforeAll(async () => {
  // CI supplies a MongoDB service container, which avoids downloading a
  // ~780MB mongod binary on every run. Locally we fall back to an in-memory
  // instance so `npm test` needs no setup at all.
  if (process.env.MONGO_URI_TEST) {
    await mongoose.connect(process.env.MONGO_URI_TEST);
    return;
  }

  // The first local run extracts the mongod binary, which takes well over the
  // library's 10s default on a cold cache.
  mongoServer = await MongoMemoryServer.create({
    instance: { launchTimeout: 120000 },
  });
  await mongoose.connect(mongoServer.getUri());
}, 180000);

afterEach(async () => {
  // Isolate tests from one another without paying to restart the server.
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});
