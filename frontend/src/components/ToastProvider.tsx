import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * Lightweight toast notifications.
 *
 * Deliberately dependency-free and styled with the app's existing CSS tokens so
 * the look stays consistent with the rest of Bharat Quest.
 */

export type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside a <ToastProvider>');
  return ctx;
}

const KIND_STYLES: Record<ToastKind, { icon: string; border: string; accent: string }> = {
  success: { icon: '✅', border: 'rgba(16,185,129,0.45)', accent: '#34d399' },
  error: { icon: '⚠️', border: 'rgba(239,68,68,0.45)', accent: '#f87171' },
  info: { icon: 'ℹ️', border: 'rgba(6,182,212,0.45)', accent: 'var(--color-cyan)' },
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      // Errors linger a little longer so they are not missed.
      window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (m: string) => toast(m, 'success'),
      error: (m: string) => toast(m, 'error'),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 100000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const s = KIND_STYLES[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              onClick={() => dismiss(t.id)}
              className="anim-pop-in"
              style={{
                pointerEvents: 'auto',
                cursor: 'pointer',
                minWidth: 260,
                maxWidth: 380,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                background: 'linear-gradient(145deg, #1d2136 0%, #151828 100%)',
                border: `1.5px solid ${s.border}`,
                borderLeft: `4px solid ${s.accent}`,
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
                color: 'var(--color-text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.45,
              }}
            >
              <span style={{ flexShrink: 0 }}>{s.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
