import { getRedis } from '../config/redis.js';

/**
 * A small read-through cache.
 *
 * Every operation degrades to a miss if Redis is absent or unhealthy: a cache
 * outage should slow the API down, never break it. That is why each method
 * swallows its own errors rather than propagating them.
 */

const PREFIX = 'cache:';

export const cacheKey = (...parts: (string | number)[]): string => parts.join(':');

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(PREFIX + key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Losing a cache write is not worth failing the request over.
  }
};

/**
 * Drops every key under a prefix.
 *
 * Uses SCAN rather than KEYS: KEYS blocks the whole Redis instance while it
 * walks the keyspace, which is fine on a laptop and dangerous in production.
 */
export const cacheInvalidate = async (prefix: string): Promise<void> => {
  const redis = getRedis();
  if (!redis) return;

  try {
    const pattern = `${PREFIX}${prefix}*`;
    let cursor = '0';

    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // A failed invalidation means stale reads until the TTL expires, which is
    // preferable to a failed write request.
  }
};

/**
 * Read-through helper: return the cached value, or compute, store and return.
 */
export const cached = async <T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> => {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;

  const value = await compute();
  await cacheSet(key, value, ttlSeconds);
  return value;
};
