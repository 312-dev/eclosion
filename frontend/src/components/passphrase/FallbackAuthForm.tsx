/**
 * Fallback Authentication Form
 *
 * Shown when biometric auth (Touch ID/Windows Hello) fails or user requests
 * credential fallback. Validates password against stored credentials (works offline).
 */

import { useState } from 'react';
import { EyeIcon, EyeOffIcon, SpinnerIcon, LockIcon } from '../icons';

interface FallbackAuthFormProps {
  /** Called when user wants to go back to biometric */
  onCancel: () => void;
  /** Optional error from previous attempts */
  initialError?: string | null;
  /** Auth state setter - sets authenticated to true */
  setAuthenticated?: (value: boolean) => void;
  /** Auth state setter - sets needsUnlock to false */
  setNeedsUnlock?: (value: boolean) => void;
  /** Display name for biometric (e.g., "Touch ID" or "Windows Hello") */
  biometricDisplayName?: string;
  /** Whether biometric is enrolled - hides retry button if false */
  biometricEnrolled?: boolean;
}

export function FallbackAuthForm({
  onCancel,
  initialError,
  setAuthenticated,
  setNeedsUnlock,
  biometricDisplayName = 'biometric',
  biometricEnrolled = false,
}: Readonly<FallbackAuthFormProps>) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await globalThis.electron?.biometric.validateFallback(password);

      if (result?.success) {
        // Update auth state - useEffect in UnlockPage will handle navigation
        // Don't call onSuccess() directly as React state updates are async
        setAuthenticated?.(true);
        setNeedsUnlock?.(false);
      } else {
        setError(result?.error ?? 'Invalid credentials');
      }
    } catch {
      setError('Failed to validate credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Locked header with icon */}
      <div className="flex flex-col items-center mb-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: 'var(--monarch-orange-bg)' }}
        >
          <LockIcon size={24} color="var(--monarch-orange)" />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Eclosion is Locked
        </h2>
        <p className="text-sm text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          Enter your Monarch password to unlock
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password field */}
        <div>
          <label
            htmlFor="fallback-password"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Password
          </label>
          <div className="relative">
            <LockIcon
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--monarch-text-muted)' }}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              id="fallback-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              autoFocus
              className="w-full rounded-lg pl-10 pr-10 py-2"
              style={{
                border: '1px solid var(--monarch-border)',
                backgroundColor: 'var(--monarch-bg-card)',
              }}
              placeholder="Your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
              style={{ color: 'var(--monarch-text-muted)' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--monarch-error-bg, rgba(239, 68, 68, 0.1))',
              color: 'var(--monarch-error)',
            }}
          >
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--monarch-primary)',
            color: 'white',
            opacity: loading || !password ? 0.6 : 1,
          }}
        >
          {loading ? (
            <>
              <SpinnerIcon size={20} className="animate-spin" />
              Verifying...
            </>
          ) : (
            'Unlock'
          )}
        </button>

        {/* Cancel link - only show if biometric is enrolled */}
        {biometricEnrolled && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Try {biometricDisplayName} again
          </button>
        )}
      </form>

      {/* Info note */}
      <p className="text-xs text-center mt-6" style={{ color: 'var(--monarch-text-muted)' }}>
        This is the password you last used to sign into Eclosion.
      </p>
    </div>
  );
}
