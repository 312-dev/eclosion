/**
 * Stash History Queries
 *
 * Queries for stash history data used in the Reports tab.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { StashHistoryResponse, StashReportTimeRange } from '../../types';
import { timeRangeToMonths } from '../../types';

/**
 * Fetch stash history data.
 *
 * Only fetches when enabled (lazy loading for Reports tab).
 * Uses long cache times since historical data rarely changes.
 *
 * @param timeRange - Time range to fetch (3mo, 6mo, 12mo, all)
 * @param options - Query options including enabled flag
 */
export function useStashHistoryQuery(
  timeRange: StashReportTimeRange,
  options?: { enabled?: boolean }
) {
  const isDemo = useDemo();
  const months = timeRangeToMonths(timeRange);

  return useQuery({
    queryKey: [...getQueryKey(queryKeys.stashHistory, isDemo), timeRange],
    queryFn: async (): Promise<StashHistoryResponse> => {
      return isDemo ? await demoApi.getStashHistory(months) : await api.getStashHistory(months);
    },
    // Long cache times - historical data doesn't change
    staleTime: 60 * 60 * 1000, // Consider fresh for 1 hour
    gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
    enabled: options?.enabled ?? true,
  });
}

/**
 * Invalidate stash history queries.
 *
 * Called after stash sync to refresh history data.
 */
export function useInvalidateStashHistory() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.stashHistory, isDemo),
    });
  };
}
