import React, { createContext, useCallback, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button.jsx';

export const ToastContext = createContext({
  push: () => {},
  success: () => {},
  error: () => {}
});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`;
    const t = { id, type: 'info', title: '', message: '', ...toast };
    setToasts((prev) => [t, ...prev].slice(0, 5));
    // auto dismiss
    const ttl = toast.ttl ?? 5000;
    if (ttl) setTimeout(() => remove(id), ttl);
    return id;
  }, [remove]);

  const api = useMemo(
    () => ({
      push,
      success: (message, title = 'Success') => push({ type: 'success', title, message }),
      error: (message, title = 'Error') => push({ type: 'error', title, message })
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              'w-96 max-w-[calc(100vw-2rem)] rounded-lg border bg-white p-3 shadow-lg ' +
              (t.type === 'success'
                ? 'border-emerald-200'
                : t.type === 'error'
                  ? 'border-red-200'
                  : 'border-slate-200')
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                <div className="mt-1 text-sm text-slate-700">{t.message}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(t.id)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}
