/**
 * LoadingSpinner Component
 *
 * A consistent loading spinner.
 * Replaces inline SVG spinners throughout the app.
 */

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Color of the spinner */
  color?: string;
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

/**
 * A consistent loading spinner component.
 */
export function LoadingSpinner({
  size = 'md',
  color = 'currentColor',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <svg
      className={`animate-spin ${SIZE_CLASSES[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      style={{ color }}
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
  );
}

/**
 * A full-screen loading overlay.
 */
export function LoadingOverlay({
  message = 'Loading...',
}: {
  message?: string;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div
        className="flex flex-col items-center gap-3 p-6 rounded-lg"
        style={{ backgroundColor: 'var(--monarch-bg-card)' }}
      >
        <LoadingSpinner size="lg" color="var(--monarch-primary)" />
        <span style={{ color: 'var(--monarch-text)' }}>{message}</span>
      </div>
    </div>
  );
}
