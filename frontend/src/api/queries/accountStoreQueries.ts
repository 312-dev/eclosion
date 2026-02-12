/**
 * Account Store Queries
 *
 * Normalized account cache for cross-feature account data.
 * Single source of truth for all account metadata (dropdowns, selectors, etc.).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { AccountStore, AccountMetadata } from '../../types/accountStore';
import { isCashAccount, isCreditCardAccount, isDebtAccount } from '../../types/availableToStash';

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize raw API response (array) into store shape
 */
function normalizeAccounts(raw: AccountMetadata[]): AccountStore {
  const accounts: Record<string, AccountMetadata> = {};
  const accountOrder: string[] = [];

  for (const account of raw) {
    accountOrder.push(account.id);
    accounts[account.id] = account;
  }

  return { accounts, accountOrder };
}

// ============================================================================
// Main Query
// ============================================================================

/**
 * Main query - fetches and normalizes all accounts.
 *
 * This is the single source of truth for account metadata.
 * All features should derive their account data from this store.
 */
export function useAccountStore() {
  const isDemo = useDemo();

  return useQuery({
    queryKey: getQueryKey(queryKeys.accountStore, isDemo),
    queryFn: async () => {
      const raw = isDemo ? await demoApi.getAccounts() : await api.getAccounts();
      return normalizeAccounts(raw);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// Selectors (derived data from store)
// ============================================================================

/**
 * Get a single account by ID.
 */
export function useAccount(id: string): AccountMetadata | undefined {
  const { data } = useAccountStore();
  return data?.accounts[id];
}

/**
 * Get all accounts as a flat array (preserving order).
 */
export function useAllAccounts(): {
  data: AccountMetadata[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useAccountStore();

  const accounts = useMemo(() => {
    if (!data) return [];
    return data.accountOrder
      .map((id) => data.accounts[id])
      .filter((acc): acc is AccountMetadata => acc !== undefined);
  }, [data]);

  return { data: accounts, isLoading, error: error as Error | null };
}

/**
 * Get only cash accounts (checking, savings, etc.).
 */
export function useCashAccounts(): AccountMetadata[] {
  const { data } = useAllAccounts();
  return useMemo(
    () => data.filter((acc) => acc.isEnabled && isCashAccount(acc.accountType)),
    [data]
  );
}

/**
 * Get only credit card accounts.
 */
export function useCreditCardAccounts(): AccountMetadata[] {
  const { data } = useAllAccounts();
  return useMemo(
    () => data.filter((acc) => acc.isEnabled && isCreditCardAccount(acc.accountType)),
    [data]
  );
}

/**
 * Get only debt accounts (credit cards, loans, etc.).
 */
export function useDebtAccounts(): AccountMetadata[] {
  const { data } = useAllAccounts();
  return useMemo(
    () => data.filter((acc) => acc.isEnabled && isDebtAccount(acc.accountType)),
    [data]
  );
}

// ============================================================================
// Cache Mutation Utilities
// ============================================================================

/**
 * Get current value from cache (for lookups outside React).
 */
export function useGetAccountFromCache() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (accountId: string): AccountMetadata | undefined => {
      const store = queryClient.getQueryData<AccountStore>(
        getQueryKey(queryKeys.accountStore, isDemo)
      );
      return store?.accounts[accountId];
    },
    [queryClient, isDemo]
  );
}

/**
 * Full refresh - called by sync.
 */
export function useRefreshAccountStore() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.accountStore, isDemo),
    });
  }, [queryClient, isDemo]);
}

/**
 * Invalidate account store (alias for refresh).
 */
export function useInvalidateAccountStore() {
  return useRefreshAccountStore();
}
