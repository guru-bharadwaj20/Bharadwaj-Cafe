import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * In-page notifications, replacing `window.alert`.
 *
 * The browser dialog was wrong for this in three ways: it is modal, so it
 * blocks the page for something as small as "added to wishlist"; it is styled
 * by the browser and says "localhost:5173 says" above the message; and it has
 * to be dismissed by hand. These announce themselves, stack, and leave.
 *
 * Errors stay twice as long as confirmations, because a failure is worth
 * reading and a success usually is not.
 */

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

const LIFETIME = { success: 3500, info: 4000, error: 7000 };

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      if (!message) return;
      const id = ++nextId.current;
      setToasts((current) => [...current, { id, type, message }]);
      setTimeout(() => dismiss(id), LIFETIME[type] ?? LIFETIME.info);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push]
  );

  const value = useMemo(() => ({ toast, toasts, dismiss }), [toast, toasts, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};
