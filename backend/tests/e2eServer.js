/**
 * Disposable backend for end-to-end runs.
 *
 * Boots the real Express app and Socket.io server against a throwaway
 * in-memory MongoDB, then seeds a known admin and menu. Nothing here touches
 * a developer's real database, so `npm run test:e2e` is safe to run anywhere.
 *
 * Started automatically by playwright.config.js.
 */
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
process.env.JWT_SECRET = 'e2e-secret-that-is-at-least-32-characters-long';
// No SMTP in CI, so accounts are usable immediately after registering.
process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4173';

const PORT = Number(process.env.E2E_PORT || 5050);

export const E2E_ADMIN = {
  name: 'E2E Admin',
  email: 'e2e-admin@example.com',
  password: 'e2e-admin-password',
};

const MENU = [
  {
    name: 'Cappuccino',
    description: 'Espresso with steamed milk foam',
    price: 150,
    image: '/img/cappuccino.png',
    category: 'coffee',
  },
  {
    name: 'Filter Coffee',
    description: 'Traditional South Indian filter coffee',
    price: 100,
    image: '/img/filter.png',
    category: 'coffee',
  },
];

const start = async () => {
  const mongoServer = await MongoMemoryServer.create({
    instance: { launchTimeout: 120000 },
  });
  await mongoose.connect(mongoServer.getUri());

  const { createApp } = await import('../app.js');
  const { authenticateSocket } = await import('../middleware/auth.js');
  const { ADMIN_ROOM, userRoom } = await import('../utils/realtime.js');
  const { default: User } = await import('../models/User.js');
  const { default: MenuItem } = await import('../models/MenuItem.js');

  await User.create({ ...E2E_ADMIN, role: 'admin', isVerified: true });
  await MenuItem.insertMany(MENU);

  const corsOptions = { origin: process.env.CLIENT_URL.split(','), credentials: true };
  const app = createApp({ corsOptions });
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: corsOptions });

  app.set('io', io);
  io.use(authenticateSocket);
  io.on('connection', (socket) => {
    socket.join(userRoom(socket.userId));
    if (socket.userRole === 'admin') socket.join(ADMIN_ROOM);
  });

  httpServer.listen(PORT, () => {
    // Playwright waits for this port to accept connections.
    console.log(`E2E backend listening on ${PORT}`);
  });

  const shutdown = async () => {
    httpServer.close();
    await mongoose.disconnect();
    await mongoServer.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

start().catch((error) => {
  console.error('E2E backend failed to start:', error);
  process.exit(1);
});
