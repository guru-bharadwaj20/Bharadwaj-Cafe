import express, { type Express } from 'express';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'crypto';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
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
import paymentRoutes from './routes/paymentRoutes.js';
import { handleWebhook } from './controllers/paymentController.js';

export interface CreateAppOptions {
  corsOptions?: CorsOptions;
}

/**
 * Builds the Express app. Deliberately free of side effects — no database
 * connection, no listening socket — so tests can mount it directly.
 */
export const createApp = ({ corsOptions }: CreateAppOptions = {}): Express => {
  const app = express();

  // Request logging first, so even a rejected request is recorded. Every log
  // line downstream inherits the same requestId, which is what makes a single
  // request traceable through handlers, jobs and errors.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        const id = typeof existing === 'string' ? existing : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      // 4xx is the client's problem, not an error on our side.
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      autoLogging: {
        // Health checks would otherwise dominate the log volume.
        ignore: (req) => req.url === '/api/health',
      },
    })
  );

  app.use(helmet());
  if (corsOptions) {
    app.use(cors(corsOptions));
  }

  // Mounted before express.json(): the webhook signature is computed over the
  // exact bytes Razorpay sent, and parsing to an object then re-serialising
  // would not reproduce them.
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json', limit: '100kb' }),
    handleWebhook
  );

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
  app.use('/api/payments', paymentRoutes);

  // Liveness: is the process up? Used by container restart policies, so it
  // must not depend on anything external — a database blip should not cause
  // a restart loop.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', message: 'Server is running', uptime: process.uptime() });
  });

  // Readiness: can this instance actually serve traffic? Checks the
  // dependencies, so a load balancer stops routing to an instance that has
  // lost its database rather than serving 500s from it.
  app.get('/api/health/ready', (_req, res) => {
    void (async () => {
      const mongoose = (await import('mongoose')).default;
      const { getRedis, redisEnabled } = await import('./config/redis.js');

      const checks: Record<string, string> = {
        database:
          mongoose.connection.readyState === mongoose.ConnectionStates.connected ? 'up' : 'down',
      };

      if (redisEnabled()) {
        try {
          await getRedis()?.ping();
          checks.redis = 'up';
        } catch {
          // Redis is a cache, not a hard dependency: the app still serves.
          checks.redis = 'degraded';
        }
      }

      const healthy = checks.database === 'up';
      res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ready' : 'not ready',
        checks,
      });
    })();
  });

  // Order matters: unmatched routes first, then the error translator last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
