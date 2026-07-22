import { Redis } from 'ioredis';

/**
 * Redis connection management.
 *
 * Redis is *optional*. Without REDIS_URL the app runs exactly as before:
 * caching becomes a pass-through, rate limits live in process memory, and
 * Socket.io stays single-instance. That keeps `git clone && npm run dev`
 * working with no extra services, while production gains a shared cache and
 * horizontal scaling by setting one variable.
 */

export const redisEnabled = (): boolean => Boolean(process.env.REDIS_URL);

let client: Redis | null = null;
let unavailableLogged = false;

const build = (label: string): Redis => {
  const redis = new Redis(process.env.REDIS_URL as string, {
    // Bounded retries so a Redis outage surfaces as a cache miss quickly
    // rather than stalling the request. The offline queue is left enabled
    // (the default) so commands issued during the initial connect are held
    // rather than rejected — disabling it makes the first request after boot
    // fail even when Redis is perfectly healthy.
    maxRetriesPerRequest: 3,
    lazyConnect: false,
    connectionName: `bharadwaj-cafe:${label}`,
    retryStrategy: (times: number) => Math.min(times * 200, 5000),
  });

  redis.on('error', (error: Error) => {
    // One line per outage, not per failed command.
    if (!unavailableLogged) {
      console.error(`[redis:${label}] connection error:`, error.message);
      unavailableLogged = true;
    }
  });

  redis.on('ready', () => {
    unavailableLogged = false;
    console.log(`[redis:${label}] connected`);
  });

  return redis;
};

/** The shared client used for caching and rate limiting. */
export const getRedis = (): Redis | null => {
  if (!redisEnabled()) return null;
  client ??= build('main');
  return client;
};

/**
 * Socket.io's adapter needs two dedicated connections: a subscriber cannot
 * issue ordinary commands, so it cannot share the cache client.
 */
export const createPubSubPair = (): { pubClient: Redis; subClient: Redis } | null => {
  if (!redisEnabled()) return null;
  const pubClient = build('pub');
  return { pubClient, subClient: pubClient.duplicate() };
};

export const closeRedis = async (): Promise<void> => {
  await client?.quit();
  client = null;
};
