import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToastContext } from '../context/toast.js';
import { cx } from '../utils/format.js';
import Icon from './Icon.jsx';

let toastSequence = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);

    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message, variant = 'success') => {
      toastSequence += 1;
      const id = toastSequence;

      setToasts((current) => [...current, { id, message, variant }]);

      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        timers.current.delete(id);
      }, 4500);

      timers.current.set(id, timer);
    },
    [],
  );

  useEffect(() => {
    const activeTimers = timers.current;

    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-4 bottom-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div
            className="flex items-center gap-2.5 rounded-xl border bg-card p-3 text-xs shadow-lg"
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
          >
            <Icon
              name={toast.variant === 'error' ? 'alert' : 'check'}
              size={16}
              className={cx('shrink-0', toast.variant === 'error' ? 'text-red-500' : 'text-emerald-500')}
            />
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button
              className="icon-button size-6"
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
