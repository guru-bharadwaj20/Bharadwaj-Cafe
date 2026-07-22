import { cacheInvalidate, cacheKey } from './cache.js';

/**
 * The menu cache contract, in one place.
 *
 * Menu items are mutated from three controllers (menu, admin, and review —
 * which recomputes the cached rating). Centralising the prefix and the
 * invalidation call means adding a fourth write path cannot silently serve
 * stale data.
 */

export const MENU_CACHE_PREFIX = 'menu';

// Short enough that a missed invalidation self-heals within a minute.
export const MENU_CACHE_TTL_SECONDS = 60;

export const menuCacheKey = (...parts: (string | number)[]): string =>
  cacheKey(MENU_CACHE_PREFIX, ...parts);

export const invalidateMenuCache = (): Promise<void> => cacheInvalidate(MENU_CACHE_PREFIX);
