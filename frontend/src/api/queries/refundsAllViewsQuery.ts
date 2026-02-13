/**
 * All-views transaction query for the Refunds "All" tab.
 *
 * Queries each included view independently and merges/deduplicates results.
 * This correctly handles views with tags-only, categories-only, or both.
 */

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { RefundsSavedView, Transaction } from '../../types/refunds';

export function useRefundsAllViewsTransactionsQuery(
  views: RefundsSavedView[],
  startDate: string | null,
  endDate: string | null,
  enabled: boolean
): { data: Transaction[]; isLoading: boolean } {
  const isDemo = useDemo();
  const queries = useQueries({
    queries: views.map((view) => ({
      queryKey: [
        ...getQueryKey(queryKeys.refundsTransactions, isDemo),
        view.tagIds,
        startDate,
        endDate,
        view.categoryIds,
      ],
      queryFn: async (): Promise<Transaction[]> => {
        if (isDemo) {
          return await demoApi.getRefundsTransactions(
            view.tagIds,
            startDate,
            endDate,
            view.categoryIds
          );
        }
        return await api.getRefundsTransactions(view.tagIds, startDate, endDate, view.categoryIds);
      },
      enabled:
        enabled &&
        (view.tagIds.length > 0 || (view.categoryIds != null && view.categoryIds.length > 0)),
      staleTime: 2 * 60 * 1000,
    })),
  });

  const data = useMemo(() => {
    const seen = new Set<string>();
    const merged: Transaction[] = [];
    for (const query of queries) {
      if (!query.data) continue;
      for (const txn of query.data) {
        if (!seen.has(txn.id)) {
          seen.add(txn.id);
          merged.push(txn);
        }
      }
    }
    return merged;
  }, [queries]);

  return { data, isLoading: queries.some((q) => q.isLoading) };
}
