import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { pushSupported, getSubscription, enablePush, disablePush } from '../utils/push';

/**
 * Opt-in control for order notifications.
 *
 * Rendered only when the server has push configured and the browser supports
 * it — an control that cannot work is worse than no control.
 *
 * Migrated from profile.css, where this block had been written for a dark
 * surface: a 6%-white panel, and an "on" button of white text on transparent
 * inside a 40%-white border. It renders on the account page, which is
 * --light-pink-color, so the panel was invisible and so was the button once you
 * turned notifications on. The panel is now a tinted card with a visible edge
 * and the "on" state is outlined in the brand maroon. Everything else --
 * spacing, radius, the amber "off" state -- is profile.css's own.
 */

const panel =
  'my-5 flex flex-wrap items-center justify-between gap-4 rounded-s border border-solid border-[rgba(59,20,28,0.12)] bg-white p-4';

const description = 'mb-0 mt-1 text-[0.85rem] opacity-80';

const buttonBox =
  'cursor-pointer rounded-md px-[18px] py-2 font-sans text-n disabled:cursor-not-allowed disabled:opacity-60';

const buttonOff = `${buttonBox} border-none bg-secondary text-primary`;
const buttonOn = `${buttonBox} border border-solid border-primary bg-transparent text-primary`;

const errorText = 'basis-full text-[0.85rem] text-[#f44336]';
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
    <div className={panel}>
      <div>
        <strong>Order notifications</strong>
        <p className={description}>Get told when your order is ready, even with this tab closed.</p>
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={enabled}
        className={enabled ? buttonOn : buttonOff}
      >
        {busy ? 'Working…' : enabled ? 'Turn off' : 'Turn on'}
      </button>

      {error && (
        <p className={errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default NotificationToggle;
