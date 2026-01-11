/**
 * ReauthModal - Modal for re-authenticating with a 6-digit MFA code
 *
 * Shown when a user's Monarch session expires and they're using 6-digit code mode.
 * They need to enter a new code to continue syncing.
 */

import { useState } from 'react';
import { Modal } from './ui/Modal';
import { reauthenticate } from '../api/client';
import { getErrorMessage } from '../utils';

interface ReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReauthModal({ isOpen, onClose, onSuccess }: ReauthModalProps) {
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await reauthenticate(mfaCode);
      if (result.success) {
        setMfaCode('');
        onSuccess();
      } else {
        setError(result.error || 'Re-authentication failed');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMfaCode('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Re-authentication Required"
    >
      <div className="space-y-4">
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--monarch-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              <p className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Your Monarch session has expired
              </p>
              <p className="mt-1">
                Since you're using 6-digit code authentication, you'll need to enter a new code to continue syncing.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div
            className="p-3 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="reauth-mfa-code"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              MFA Code
            </label>
            <input
              type="text"
              id="reauth-mfa-code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              className="w-full rounded-lg px-3 py-2 font-mono text-center text-lg tracking-widest"
              style={{ border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
              placeholder="123456"
              autoFocus
            />
            <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg transition-colors"
              style={{ border: '1px solid var(--monarch-border)', color: 'var(--monarch-text-dark)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              style={{
                backgroundColor: loading || mfaCode.length !== 6
                  ? 'var(--monarch-orange-disabled)'
                  : 'var(--monarch-orange)',
              }}
            >
              {loading ? 'Authenticating...' : 'Re-authenticate'}
            </button>
          </div>
        </form>

        <div className="pt-2 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
          <p className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            <strong>Tip:</strong> To avoid manual re-authentication, you can update your credentials with your MFA secret key instead.
            Go to Settings to update your credentials.
          </p>
        </div>
      </div>
    </Modal>
  );
}
