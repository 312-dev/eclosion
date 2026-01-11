/**
 * Login Utilities
 *
 * Helper functions for login flow logic.
 */

import { hasAcceptedTerms } from '../ui/TermsModal';
import { hasAcknowledgedBetaWarning } from '../ui/BetaWarningModal';
import { isBetaEnvironment } from '../../utils/environment';

export type LoginStage = 'terms' | 'betaWarning' | 'credentials' | 'passphrase';
export type MfaInputFormat = 'empty' | 'six_digit_code' | 'otpauth_uri' | 'base32_secret' | 'unknown';

/**
 * Detect the format of MFA input for validation feedback.
 */
export function detectMfaFormat(input: string): MfaInputFormat {
  const trimmed = input.trim();
  if (!trimmed) return 'empty';

  // Detect 6-digit code (common mistake)
  if (/^\d{6}$/.test(trimmed)) return 'six_digit_code';

  // Detect otpauth:// URI
  if (trimmed.toLowerCase().startsWith('otpauth://')) return 'otpauth_uri';

  // Detect valid base32 (A-Z, 2-7, spaces allowed, min 16 chars)
  const cleaned = trimmed.replaceAll(/\s/g, '').toUpperCase();
  if (/^[A-Z2-7]+$/.test(cleaned) && cleaned.length >= 16) {
    return 'base32_secret';
  }

  return 'unknown';
}

/**
 * Determine the initial login stage based on accepted terms and beta acknowledgment.
 */
export function getInitialStage(): LoginStage {
  if (!hasAcceptedTerms()) {
    return 'terms';
  }
  // On beta builds, require explicit acknowledgment of beta risks after terms
  if (isBetaEnvironment() && !hasAcknowledgedBetaWarning()) {
    return 'betaWarning';
  }
  return 'credentials';
}
