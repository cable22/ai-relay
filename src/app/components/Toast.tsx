'use client';

// ============================================================
// AI API Relay — Toast Notification Component
// ============================================================
//
// DESIGN-SPEC.md §3.2 compliant:
// - Position: top-right (desktop) / top-center (mobile)
// - Max-width: 380px, min-height: 48px
// - Entry: slide-in + fade (200ms ease-out)
// - Exit: fade-out + slide-up (150ms ease-in)
// - z-index: 9999
// - Left border 3px: danger/warning/success

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

type ToastSeverity = 'error' | 'warning' | 'success';

interface Toast {
  id: string;
  message: string;
  severity: ToastSeverity;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, severity?: ToastSeverity, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const SEVERITY_STYLES: Record<ToastSeverity, { border: string; bg: string; icon: string }> = {
  error: { border: '#ef4444', bg: '#1a0a0a', icon: '✕' },
  warning: { border: '#f59e0b', bg: '#1a1500', icon: '⚠' },
  success: { border: '#22c55e', bg: '#0a1a0a', icon: '✓' },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const style = SEVERITY_STYLES[toast.severity];

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 150);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        minWidth: '280px',
        maxWidth: '380px',
        minHeight: '48px',
        background: style.bg,
        borderLeft: `3px solid ${style.border}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,.4)',
        transform: exiting ? 'translateY(-8px)' : visible ? 'translateX(0)' : 'translateX(100%)',
        opacity: exiting ? 0 : visible ? 1 : 0,
        transition: exiting
          ? 'all 150ms ease-in'
          : 'all 200ms ease-out',
        cursor: 'pointer',
        fontSize: '0.875rem',
        color: '#e0e0e0',
      }}
      onClick={() => {
        setExiting(true);
        setTimeout(() => onRemove(toast.id), 150);
      }}
    >
      <span style={{
        fontSize: '1rem',
        color: style.border,
        flexShrink: 0,
        width: '20px',
        textAlign: 'center',
      }}>
        {style.icon}
      </span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, severity: ToastSeverity = 'error', duration = 4000) => {
    const id = `toast_${++counterRef.current}_${Date.now()}`;
    setToasts(prev => [...prev, { id, message, severity, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — top-right on desktop, top-center on mobile */}
      <div
        className="toast-container"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: toasts.length > 0 ? 'auto' : 'none',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 640px) {
            .toast-container {
              left: 1rem !important;
              right: 1rem !important;
            }
            .toast-container > div {
              max-width: 100% !important;
            }
          }
        `}} />
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
