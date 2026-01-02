/**
 * MerchantIcon Component
 *
 * Displays a merchant logo with fallback icon.
 * Replaces duplicated MerchantIconWithFallback in RecurringList and RollupZone.
 */

import { useState } from 'react';

export interface MerchantIconProps {
  /** URL of the merchant logo */
  logoUrl: string | null;
  /** Size of the icon */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Alt text for the image */
  alt?: string;
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const ICON_SIZES = {
  sm: 14,
  md: 20,
  lg: 24,
};

/**
 * Merchant icon with automatic fallback to placeholder.
 */
export function MerchantIcon({
  logoUrl,
  size = 'md',
  className = '',
  alt = '',
}: MerchantIconProps) {
  const [hasError, setHasError] = useState(false);

  const sizeClass = SIZE_CLASSES[size];
  const iconSize = ICON_SIZES[size];
  const showFallback = !logoUrl || hasError;

  return (
    <div className={`relative shrink-0 ${className}`}>
      {logoUrl && !hasError && (
        <img
          src={logoUrl}
          alt={alt}
          className={`${sizeClass} rounded-full object-cover bg-white`}
          onError={() => setHasError(true)}
        />
      )}
      {showFallback && (
        <div
          className={`${sizeClass} rounded-full flex items-center justify-center`}
          style={{ backgroundColor: 'var(--monarch-bg-page)' }}
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--monarch-text-muted)"
            strokeWidth="1.5"
          >
            <path d="M4 4h16v16H4zM4 8h16M8 4v4" />
          </svg>
        </div>
      )}
    </div>
  );
}
