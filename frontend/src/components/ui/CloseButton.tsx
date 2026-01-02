/**
 * CloseButton Component
 *
 * A consistent, accessible close button for modals, dialogs, and dismissible elements.
 * Features:
 * - Built-in accessibility (ARIA attributes)
 * - Size variants
 * - Keyboard support
 */

import type { ButtonHTMLAttributes } from 'react';
import { XIcon } from '../icons';

export interface CloseButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Size of the close button */
  size?: 'sm' | 'md' | 'lg';
  /** Custom aria-label (defaults to "Close") */
  'aria-label'?: string;
}

const SIZE_CONFIG = {
  sm: {
    button: 'p-1',
    icon: 16,
  },
  md: {
    button: 'p-1.5',
    icon: 20,
  },
  lg: {
    button: 'p-2',
    icon: 24,
  },
};

/**
 * A consistent, accessible close button component.
 *
 * @example
 * ```tsx
 * <CloseButton onClick={onClose} size="sm" />
 * ```
 */
export function CloseButton({
  size = 'md',
  'aria-label': ariaLabel = 'Close',
  className = '',
  ...props
}: CloseButtonProps) {
  const config = SIZE_CONFIG[size];

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`
        inline-flex items-center justify-center
        rounded-md
        transition-colors duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-2
        hover:bg-gray-100 dark:hover:bg-gray-700
        ${config.button}
        ${className}
      `}
      {...props}
    >
      <XIcon
        size={config.icon}
        color="var(--monarch-text-muted)"
        aria-hidden="true"
      />
    </button>
  );
}
