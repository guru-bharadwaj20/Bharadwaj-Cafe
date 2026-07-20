import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import { createApp } from './app.js';
import { authenticateSocket } from './middleware/auth.js';
import { ADMIN_ROOM, userRoom } from './utils/realtime.js';

dotenv.config();

// Fail at boot rather than at the first request that needs them.
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('Copy .env.example to .env and fill these in before starting the server.');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters. Generate one with:');
  console.error("  node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
  process.exit(1);
}

// Allow a comma-separated list so preview and production origins can coexist.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

const app = createApp({ corsOptions });
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });

connectDB();

// Make io accessible to route handlers via req.app.get('io').
app.set('io', io);

// Every socket must present a valid JWT before it can join anything.
io.use(authenticateSocket);

io.on('connection', (socket) => {
  // Rooms are derived from the verified token, never from client input, so a
  // client cannot subscribe to another user's stream by guessing an id.
  socket.join(userRoom(socket.userId));
  if (socket.userRole === 'admin') {
    socket.join(ADMIN_ROOM);
  }

  console.log(`Socket connected: ${socket.id} (user ${socket.userId})`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Note: clients no longer emit 'orderPlaced' / 'sendMessage' / 'adminMessage'.
// Those handlers let anyone forge events and broadcast to every connected
// client. Real-time updates are now emitted server-side, from the REST
// handlers that persist the change, and addressed to specific rooms.

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, io };
