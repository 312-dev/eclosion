/**
 * Modal Component
 *
 * A reusable modal/dialog component.
 * Consolidates modal patterns from LinkCategoryModal and UninstallModal.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Optional footer content (buttons, etc.) */
  footer?: React.ReactNode;
  /** Whether clicking backdrop closes modal */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape closes modal */
  closeOnEscape?: boolean;
  /** Maximum width of modal */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const MAX_WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

/**
 * A reusable modal component.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  closeOnBackdrop = true,
  closeOnEscape = true,
  maxWidth = 'md',
}: ModalProps) {
  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={`w-full ${MAX_WIDTH_CLASSES[maxWidth]} rounded-lg shadow-xl`}
        style={{ backgroundColor: 'var(--monarch-bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--monarch-text)' }}
            >
              {title}
            </h2>
            {description && (
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--monarch-text-muted)"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-end gap-2 p-4 border-t"
            style={{ borderColor: 'var(--monarch-border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
