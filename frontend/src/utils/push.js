import { api } from './api';

/**
 * Web Push registration.
 *
 * Notification permission is deliberately never requested on page load — a
 * cold permission prompt is the fastest way to get permanently blocked.
 * These are only called from an explicit user action.
 */

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** The VAPID key must be a Uint8Array; the server sends it base64url-encoded. */
const decodeKey = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalised);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
};

export const getSubscription = async () => {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

/**
 * Asks for permission and registers this device.
 * @returns true if notifications are now enabled.
 */
export const enablePush = async (token) => {
  if (!pushSupported()) {
    throw new Error('This browser does not support notifications.');
  }

  const config = await api.getPushConfig();
  if (!config.enabled) {
    throw new Error('Notifications are not configured on the server.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    // 'denied' is sticky — the browser will not ask again, so say so plainly.
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked. Enable them in your browser settings for this site.'
        : 'Notification permission was dismissed.'
    );
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    // Required by browsers: every push must show a visible notification.
    userVisibleOnly: true,
    applicationServerKey: decodeKey(config.publicKey),
  });

  await api.subscribeToPush(subscription.toJSON(), token);
  return true;
};

export const disablePush = async (token) => {
  const subscription = await getSubscription();
  if (!subscription) return;

  await api.unsubscribeFromPush(subscription.endpoint, token);
  await subscription.unsubscribe();
};
