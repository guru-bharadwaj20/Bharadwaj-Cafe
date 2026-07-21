import express, { type Express } from 'express';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import { apiLimiter } from './middleware/rateLimit.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import blogRoutes from './routes/blogRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import loyaltyRoutes from './routes/loyaltyRoutes.js';

export interface CreateAppOptions {
  corsOptions?: CorsOptions;
}

/**
 * Builds the Express app. Deliberately free of side effects — no database
 * connection, no listening socket — so tests can mount it directly.
 */
export const createApp = ({ corsOptions }: CreateAppOptions = {}): Express => {
  const app = express();

  app.use(helmet());
  if (corsOptions) {
    app.use(cors(corsOptions));
  }
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Rate limiting distorts test runs that fire many requests in a tight loop.
  if (process.env.NODE_ENV !== 'test') {
    app.use('/api', apiLimiter);
  }

  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/addresses', addressRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/blogs', blogRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/loyalty', loyaltyRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
  });

  return app;
};

export default createApp;
