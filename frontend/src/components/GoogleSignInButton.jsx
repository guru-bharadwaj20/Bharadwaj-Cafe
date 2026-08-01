import { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

/**
 * Loads Google's Identity Services script once per page.
 *
 * Both auth pages can mount this button, and React 18's StrictMode mounts
 * every effect twice in development, so the guard against a second <script>
 * tag is doing real work rather than being defensive for its own sake.
 */
const loadGsi = () => {
  if (window.google?.accounts?.id) return Promise.resolve();

  const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', () => reject(new Error('Google script failed to load')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Google script failed to load'));
    document.head.appendChild(script);
  });
};

/**
 * "Sign in with Google".
 *
 * Renders nothing at all unless the server reports Google sign-in as
 * configured — so a deployment without a GOOGLE_CLIENT_ID shows the ordinary
 * email form and no broken button.
 *
 * `onSuccess` receives the session the API returned, in the same shape the
 * password login returns, so callers can treat the two identically.
 */
const GoogleSignInButton = ({ onSuccess, onError, text = 'signin_with' }) => {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Kept in a ref so the GSI callback — registered once, at initialise time —
  // always calls the current handlers rather than the ones captured on the
  // first render. Assigned in an effect rather than during render, which would
  // be a side effect in the render phase.
  const handlers = useRef({ onSuccess, onError });
  useEffect(() => {
    handlers.current = { onSuccess, onError };
  });

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { enabled, clientId } = await api.getGoogleConfig();
        if (cancelled || !enabled || !clientId) return;

        await loadGsi();
        if (cancelled || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }) => {
            try {
              const session = await api.googleLogin(credential);
              handlers.current.onSuccess?.(session);
            } catch (err) {
              handlers.current.onError?.(err.message || 'Google sign-in failed');
            }
          },
        });

        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text,
          width: 320,
        });

        setReady(true);
      } catch {
        // A missing config endpoint or a blocked script is not worth an error
        // in the user's face: the email form beside it still works.
        if (!cancelled) setReady(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <div
      className="google-signin"
      style={{ display: ready ? 'flex' : 'none' }}
      data-testid="google-signin"
    >
      <div ref={containerRef}></div>
    </div>
  );
};

export default GoogleSignInButton;
