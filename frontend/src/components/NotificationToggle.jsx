import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { pushSupported, getSubscription, enablePush, disablePush } from '../utils/push';

/**
 * Opt-in control for order notifications.
 *
 * Rendered only when the server has push configured and the browser supports
 * it — an control that cannot work is worse than no control.
 */
const NotificationToggle = () => {
  const { user } = useAuth();
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!pushSupported()) return;

      try {
        const config = await api.getPushConfig();
        if (cancelled || !config.enabled) return;

        setAvailable(true);
        const subscription = await getSubscription();
        if (!cancelled) setEnabled(Boolean(subscription));
      } catch {
        // Push being unavailable is not an error worth showing anyone.
      }
    };

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available || !user) return null;

  const toggle = async () => {
    setBusy(true);
    setError('');

    try {
      if (enabled) {
        await disablePush(user.token);
        setEnabled(false);
      } else {
        // Permission is requested here, inside a click — never on load.
        await enablePush(user.token);
        setEnabled(true);
      }
    } catch (err) {
      setError(err.message || 'Could not change notification settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="notification-toggle">
      <div>
        <strong>Order notifications</strong>
        <p>Get told when your order is ready, even with this tab closed.</p>
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={enabled}
        className={enabled ? 'enabled' : ''}
      >
        {busy ? 'Working…' : enabled ? 'Turn off' : 'Turn on'}
      </button>

      {error && (
        <p className="notification-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default NotificationToggle;
