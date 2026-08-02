import { useToast } from '../context/ToastContext';
import { glassMenu } from '../styles/glass';

/**
 * Where the notifications appear.
 *
 * Top centre, which is clear of both the cart bubble in the top-right corner
 * and the docked nav and cart toast along the bottom. `aria-live="polite"`
 * announces each one without interrupting whatever a screen reader is already
 * saying — the modal dialog these replace interrupted everything by design.
 */

const TONE = {
  success: { icon: 'fa-circle-check', accent: 'text-[#4caf50]' },
  error: { icon: 'fa-circle-exclamation', accent: 'text-[#f44336]' },
  info: { icon: 'fa-circle-info', accent: 'text-secondary' },
};

const ToastHost = () => {
  const { toasts, dismiss } = useToast();

  if (!toasts.length) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-4 z-[999] flex w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 flex-col gap-2"
    >
      {toasts.map(({ id, type, message }) => {
        const tone = TONE[type] ?? TONE.info;
        return (
          <div
            key={id}
            className={`pointer-events-auto flex items-start gap-3 rounded-[14px] p-3.5 ${glassMenu}`}
          >
            <i
              className={`fa-solid ${tone.icon} mt-0.5 text-[16px] ${tone.accent}`}
              aria-hidden="true"
            ></i>
            <p className="flex-1 text-s leading-snug text-white">{message}</p>
            <button
              type="button"
              onClick={() => dismiss(id)}
              aria-label="Dismiss notification"
              className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-circle border-none bg-transparent text-[13px] text-[rgba(255,255,255,0.5)] transition-colors duration-200 hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
            >
              <i className="fas fa-times" aria-hidden="true"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastHost;
