/**
 * Button Component
 *
 * A consistent button component with multiple variants.
 * Replaces inconsistent inline button styling throughout the app.
 */

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether button shows loading state */
  loading?: boolean;
  /** Whether button takes full width */
  fullWidth?: boolean;
  /** Button content */
  children: React.ReactNode;
}

const VARIANT_STYLES = {
  primary: {
    bg: 'var(--monarch-primary)',
    color: 'white',
    hoverBg: 'var(--monarch-primary-hover)',
    border: 'transparent',
  },
  secondary: {
    bg: 'var(--monarch-bg-page)',
    color: 'var(--monarch-text)',
    hoverBg: 'var(--monarch-bg-hover)',
    border: 'var(--monarch-border)',
  },
  ghost: {
    bg: 'transparent',
    color: 'var(--monarch-text-muted)',
    hoverBg: 'var(--monarch-bg-hover)',
    border: 'transparent',
  },
  danger: {
    bg: 'var(--monarch-error)',
    color: 'white',
    hoverBg: 'var(--monarch-error)',
    border: 'transparent',
  },
};

const SIZE_CLASSES = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

/**
 * A consistent button component.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeClass = SIZE_CLASSES[size];
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-md font-medium
        transition-colors duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClass}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      style={{
        backgroundColor: variantStyle.bg,
        color: variantStyle.color,
        border: `1px solid ${variantStyle.border}`,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.backgroundColor = variantStyle.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = variantStyle.bg;
      }}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
