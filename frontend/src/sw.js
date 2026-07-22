/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

/**
 * Service worker.
 *
 * Two jobs: keep the menu readable without a connection, and deliver push
 * notifications when the tab is closed.
 */

// The build injects the precache manifest here.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

/**
 * Menu reads: network first, cache as fallback.
 *
 * Deliberately not cache-first — a stale price is worse than a slow one.
 * The cache only answers when the network genuinely cannot.
 */
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/menu'),
  new NetworkFirst({
    cacheName: 'menu-api',
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 })],
  })
);

// Menu photography changes rarely and is large; cache-first is right here.
registerRoute(
  ({ request, url }) => request.destination === 'image' && !url.pathname.startsWith('/api/'),
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

/**
 * Everything else authenticated is deliberately NOT cached. Orders, chat and
 * loyalty are per-user and change constantly; serving them from a shared
 * device cache would show one person another's data after a logout.
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Bharadwaj's Cafe", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Bharadwaj's Cafe", {
      body: payload.body ?? '',
      icon: '/img/logo.png',
      badge: '/img/logo.png',
      // Same tag replaces an earlier notification rather than stacking.
      tag: payload.tag,
      data: { url: payload.url ?? '/' },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? '/';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Focus an existing tab rather than opening a duplicate.
      for (const client of clientList) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target);
          return;
        }
      }

      await self.clients.openWindow(target);
    })()
  );
});

// Lets a new version take over without the user closing every tab.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
