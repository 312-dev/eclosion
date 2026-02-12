/**
 * Accounts API Functions
 *
 * Fetches the full list of non-hidden Monarch accounts.
 */

import type { AccountMetadata } from '../../types/accountStore';
import { fetchApi } from './fetchApi';

/**
 * Get all non-hidden Monarch accounts.
 *
 * Returns the unfiltered account list for the account store.
 * Account selection filtering is applied on the frontend.
 */
export async function getAccounts(): Promise<AccountMetadata[]> {
  return fetchApi<AccountMetadata[]>('/stash/accounts');
}
