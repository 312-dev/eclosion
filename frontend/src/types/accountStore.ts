/**
 * Account Store Types
 *
 * Normalized account data store for shared account metadata across features.
 * All features derive their account data from this shared cache.
 */

/**
 * Single account metadata (normalized)
 */
export interface AccountMetadata {
  id: string;
  name: string;
  balance: number;
  /** Account type from Monarch (checking, savings, credit, etc.) */
  accountType: string;
  /** Whether the account is enabled/visible */
  isEnabled: boolean;
  /** Institution logo URL from Monarch */
  logoUrl: string | null;
  /** Account icon identifier from Monarch */
  icon: string | null;
}

/**
 * Normalized account store
 */
export interface AccountStore {
  /** Accounts indexed by ID */
  accounts: Record<string, AccountMetadata>;
  /** Preserve account ordering from API */
  accountOrder: string[];
}
