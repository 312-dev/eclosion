/**
 * Card Component
 *
 * A consistent card container with variants and padding options.
 * Features:
 * - Multiple visual variants
 * - Configurable padding
 * - Optional header and footer sections
 * - Fully accessible
 */

import type { ReactNode, HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant of the card */
  variant?: 'default' | 'bordered' | 'elevated' | 'ghost';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Card content */
  children: ReactNode;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Header content */
  children: ReactNode;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Body content */
  children: ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Footer content */
  children: ReactNode;
}

const VARIANT_STYLES = {
  default: {
    background: 'var(--monarch-bg-card)',
    border: '1px solid var(--monarch-border)',
    shadow: 'none',
  },
  bordered: {
    background: 'var(--monarch-bg-card)',
    border: '2px solid var(--monarch-border)',
    shadow: 'none',
  },
  elevated: {
    background: 'var(--monarch-bg-card)',
    border: '1px solid var(--monarch-border)',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  ghost: {
    background: 'transparent',
    border: 'none',
    shadow: 'none',
  },
};

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * A consistent card container component.
 *
 * @example
 * ```tsx
 * <Card variant="default" padding="md">
 *   <Card.Header>Title</Card.Header>
 *   <Card.Body>Content here</Card.Body>
 *   <Card.Footer>Footer actions</Card.Footer>
 * </Card>
 * ```
 */
export function Card({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  style,
  ...props
}: CardProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const paddingClass = PADDING_CLASSES[padding];

  return (
    <div
      className={`rounded-lg ${paddingClass} ${className}`}
      style={{
        backgroundColor: variantStyle.background,
        border: variantStyle.border,
        boxShadow: variantStyle.shadow,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card header section with bottom border.
 */
function CardHeader({ children, className = '', style, ...props }: CardHeaderProps) {
  return (
    <div
      className={`pb-3 mb-3 border-b ${className}`}
      style={{
        borderColor: 'var(--monarch-border)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card body section for main content.
 */
function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

/**
 * Card footer section with top border.
 */
function CardFooter({ children, className = '', style, ...props }: CardFooterProps) {
  return (
    <div
      className={`pt-3 mt-3 border-t ${className}`}
      style={{
        borderColor: 'var(--monarch-border)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// Attach sub-components to Card
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
