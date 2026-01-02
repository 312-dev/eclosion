/**
 * Toast Context
 *
 * Global toast notification system for the app.
 * Provides a useToast hook for showing success/error/warning messages.
 */

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { Icons } from '../components/icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration = DEFAULT_DURATION) => {
    const id = `toast-${++toastIdRef.current}`;
    const toast: Toast = { id, message, type, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const toast = {
    success: (message: string, duration?: number) => addToast(message, 'success', duration),
    error: (message: string, duration?: number) => addToast(message, 'error', duration ?? 5000), // Errors stay longer
    warning: (message: string, duration?: number) => addToast(message, 'warning', duration ?? 4000),
    info: (message: string, duration?: number) => addToast(message, 'info', duration),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}

// Icons for each toast type
function ToastIcon({ type }: { type: ToastType }) {
  const iconProps = { size: 16, className: 'shrink-0' };
  switch (type) {
    case 'success':
      return <Icons.CheckSimple {...iconProps} strokeWidth={2.5} />;
    case 'error':
      return <Icons.X {...iconProps} />;
    case 'warning':
      return <Icons.Warning {...iconProps} />;
    case 'info':
      return <Icons.AlertCircle {...iconProps} />;
  }
}

// Get styles for each toast type
function getToastStyles(type: ToastType): { bg: string; color: string; border: string } {
  switch (type) {
    case 'success':
      return {
        bg: 'var(--monarch-success-bg)',
        color: 'var(--monarch-success)',
        border: 'var(--monarch-success)',
      };
    case 'error':
      return {
        bg: 'var(--monarch-error-bg)',
        color: 'var(--monarch-error)',
        border: 'var(--monarch-error)',
      };
    case 'warning':
      return {
        bg: 'var(--monarch-warning-bg)',
        color: 'var(--monarch-warning)',
        border: 'var(--monarch-warning)',
      };
    case 'info':
      return {
        bg: 'var(--monarch-bg-card)',
        color: 'var(--monarch-text-dark)',
        border: 'var(--monarch-border)',
      };
  }
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const styles = getToastStyles(toast.type);
        return (
          <div
            key={toast.id}
            className="toast-item"
            data-type={toast.type}
            style={{
              backgroundColor: styles.bg,
              color: styles.color,
              borderLeft: `3px solid ${styles.border}`,
            }}
          >
            <ToastIcon type={toast.type} />
            <span className="toast-message">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              className="toast-close"
              style={{ color: styles.color }}
            >
              <Icons.X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
