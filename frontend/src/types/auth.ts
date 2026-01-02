/**
 * Authentication Types
 *
 * Types for authentication, security, and credentials.
 */

export interface AuthStatus {
  authenticated: boolean;
  has_stored_credentials?: boolean;
  needs_unlock?: boolean;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  needs_passphrase?: boolean;
  message?: string;
  error?: string;
}

export interface SetPassphraseResult {
  success: boolean;
  message?: string;
  error?: string;
  requirements?: string[];
}

export interface UnlockResult {
  success: boolean;
  unlock_success?: boolean;
  validation_success?: boolean;
  needs_credential_update?: boolean;
  message?: string;
  error?: string;
}

export interface UpdateCredentialsResult {
  success: boolean;
  needs_mfa?: boolean;
  message?: string;
  error?: string;
}

export interface SecurityStatus {
  encryption_enabled: boolean;
  encryption_algorithm: string;
  key_derivation: string;
  file_permissions: string;
  passphrase_requirements: {
    min_length: number;
    requires_uppercase: boolean;
    requires_lowercase: boolean;
    requires_number: boolean;
    requires_special: boolean;
  };
}
