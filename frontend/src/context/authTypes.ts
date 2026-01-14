/**
 * Auth Context Types
 *
 * Type definitions for the authentication context.
 */

import type {
  LoginResult,
  SetPassphraseResult,
  UnlockResult,
  UpdateCredentialsResult,
  ResetAppResult,
} from '../types';
import type { ReauthResult } from '../api/client';

/** Reason why the app was locked */
export type LockReason = 'manual' | 'system-lock' | 'idle' | null;

/** Data for MFA re-authentication prompt (desktop mode) */
export interface MfaRequiredData {
  email: string;
  mfaMode: 'secret' | 'code';
}

export interface AuthState {
  /** Whether user is authenticated (null = loading) */
  authenticated: boolean | null;
  /** Whether encrypted credentials exist but need passphrase */
  needsUnlock: boolean;
  /** Whether initial auth check is in progress */
  loading: boolean;
  /** Connection/API error if auth check failed */
  error: string | null;
  /** Reason the app was locked (null = app startup, not a lock event) */
  lockReason: LockReason;
  /** Whether re-authentication is needed (for 6-digit code mode users) */
  needsReauth: boolean;
  /** Whether sync is blocked due to auth issues */
  syncBlocked: boolean;
  /** MFA required data for desktop mode (email and mode) */
  mfaRequiredData: MfaRequiredData | null;
  /** Whether session expired overlay should be shown */
  showSessionExpiredOverlay: boolean;
}

export interface AuthActions {
  /** Login with email/password/mfa */
  login: (email: string, password: string, mfaSecret?: string) => Promise<LoginResult>;
  /** Lock app and return to unlock screen (preserves credentials) */
  lock: () => void;
  /** Logout and clear credentials */
  logout: () => Promise<void>;
  /** Set passphrase to encrypt credentials */
  setPassphrase: (passphrase: string) => Promise<SetPassphraseResult>;
  /** Unlock encrypted credentials with passphrase (validates against Monarch by default) */
  unlockCredentials: (passphrase: string) => Promise<UnlockResult>;
  /** Update Monarch credentials with same passphrase (used when existing creds are invalid) */
  updateCredentials: (
    email: string,
    password: string,
    passphrase: string,
    mfaSecret?: string
  ) => Promise<UpdateCredentialsResult>;
  /** Reset app - clear credentials only, preserve preferences */
  resetApp: () => Promise<ResetAppResult>;
  /** Re-check auth status */
  checkAuth: () => Promise<boolean>;
  /** Mark as authenticated (after successful login flow) */
  setAuthenticated: (value: boolean) => void;
  /** Mark as needing unlock */
  setNeedsUnlock: (value: boolean) => void;
  /** Re-authenticate with a 6-digit MFA code (for code mode users) */
  reauthenticate: (mfaCode: string) => Promise<ReauthResult>;
  /** Trigger re-auth flow (sets needsReauth = true) */
  triggerReauth: () => void;
  /** Clear sync blocked state */
  clearSyncBlocked: () => void;
  /** Clear MFA required state (after successful re-auth or user cancels) */
  clearMfaRequired: () => void;
  /** Dismiss the session expired overlay after successful re-auth */
  dismissSessionExpiredOverlay: () => void;
}

export interface AuthContextValue extends AuthState, AuthActions {}
