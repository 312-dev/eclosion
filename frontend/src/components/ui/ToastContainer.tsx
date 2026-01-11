/**
 * Toast Container
 *
 * Renders toast notifications from the ToastContext.
 * Separated from context to keep UI rendering in the components layer.
 */

import { Icons } from '../icons';
import type { Toast, ToastType } from '../../context/ToastContext';

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

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
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
