/**
 * MFA Input Section
 *
 * Handles MFA secret/code input with format detection and guidance.
 */

import type { MfaInputFormat } from './loginUtils';

interface MfaInputSectionProps {
  mfaSecret: string;
  onMfaSecretChange: (value: string) => void;
  mfaMode: 'secret' | 'code';
  mfaFormat: MfaInputFormat;
  onShowCodeCaveats: () => void;
}

export function MfaInputSection({
  mfaSecret,
  onMfaSecretChange,
  mfaMode,
  mfaFormat,
  onShowCodeCaveats,
}: MfaInputSectionProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor="mfaSecret"
        className="block text-sm font-medium mb-1"
        style={{ color: 'var(--monarch-text-dark)' }}
      >
        {mfaMode === 'code' ? 'MFA Code' : 'MFA Secret Key'}
      </label>
      <input
        type="text"
        id="mfaSecret"
        name="mfaSecret"
        value={mfaSecret}
        onChange={(e) => onMfaSecretChange(e.target.value)}
        autoComplete="one-time-code"
        aria-describedby="mfa-help"
        className="w-full rounded-lg px-3 py-2 font-mono"
        style={{ border: '1px solid var(--monarch-border)', backgroundColor: 'var(--monarch-bg-card)' }}
        placeholder={mfaMode === 'code' ? '123456' : 'JBSWY3DPEHPK3PXP'}
      />

      {/* Format feedback */}
      {mfaMode === 'secret' && mfaFormat === 'six_digit_code' && (
        <div className="mt-2 p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
          <p className="font-medium">This looks like a 6-digit verification code.</p>
          <p className="mt-1">We need the secret key your password manager uses to generate these codes, not the code itself.</p>
          <button
            type="button"
            onClick={onShowCodeCaveats}
            className="mt-2 font-medium hover:underline"
            style={{ color: 'var(--monarch-orange)' }}
          >
            I insist on 6-digit
          </button>
        </div>
      )}

      {mfaMode === 'secret' && mfaFormat === 'otpauth_uri' && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--monarch-success)' }}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          otpauth:// URI detected - we'll extract the secret automatically
        </p>
      )}

      {mfaMode === 'secret' && mfaFormat === 'base32_secret' && (
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--monarch-success)' }}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Secret key format detected
        </p>
      )}

      {mfaMode === 'secret' && (mfaFormat === 'empty' || mfaFormat === 'unknown') && (
        <p id="mfa-help" className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
          The base32 secret key from your authenticator app setup.
        </p>
      )}

      {mfaMode === 'code' && (
        <p id="mfa-help" className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
          Enter the 6-digit code from your authenticator app.
        </p>
      )}

      {/* How to find secret key - collapsible */}
      {mfaMode === 'secret' && (
        <details className="mt-3">
          <summary className="text-xs cursor-pointer" style={{ color: 'var(--monarch-text-muted)' }}>
            How to find your secret key
          </summary>
          <div className="mt-2 space-y-2 text-xs p-2 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)', color: 'var(--monarch-text-muted)' }}>
            <div><strong>1Password:</strong> Edit entry → One-Time Password field → copy secret or otpauth:// URI</div>
            <div><strong>Bitwarden:</strong> Edit item → Authenticator key field</div>
            <div><strong>Google Authenticator:</strong> Secret must be saved when first setting up MFA (no export available)</div>
            <div><strong>Apple Passwords:</strong> No export available - must disable and re-enable 2FA to get new secret</div>
            <div><strong>Authy:</strong> No official export - requires third-party tools</div>
          </div>
        </details>
      )}
    </div>
  );
}
