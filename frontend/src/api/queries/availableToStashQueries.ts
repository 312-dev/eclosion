/**
 * Available to Stash Queries
 *
 * Queries for fetching and calculating available-to-stash amounts.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import {
  calculateAvailableToStash,
  formatAvailableAmount,
  getAvailableStatus,
  getAvailableStatusColor,
} from '../../utils/availableToStash';
import type { AvailableToStashData, AvailableToStashResult } from '../../types';

/**
 * Fetch raw data needed for Available to Stash calculation.
 */
export function useAvailableToStashDataQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.availableToStash, isDemo),
    queryFn: async (): Promise<AvailableToStashData> => {
      return isDemo ? demoApi.getAvailableToStashData() : api.getAvailableToStashData();
    },
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    ...options,
  });
}

/**
 * Calculate Available to Stash with options.
 *
 * This hook fetches the raw data and computes the available amount.
 * It memoizes the calculation to avoid recomputing on every render.
 *
 * @param options.includeExpectedIncome - Include expected income in calculation
 * @param options.enabled - Whether to fetch data
 */
export function useAvailableToStash(options?: {
  includeExpectedIncome?: boolean;
  enabled?: boolean;
}): {
  data: AvailableToStashResult | undefined;
  rawData: AvailableToStashData | undefined;
  isLoading: boolean;
  error: Error | null;
  /** Formatted available amount (e.g., "$1,234") */
  formattedAmount: string;
  /** Status indicator for UI styling */
  status: 'healthy' | 'low' | 'zero' | 'negative';
  /** Color for the status */
  statusColor: string;
} {
  const { includeExpectedIncome = false, enabled = true } = options ?? {};

  const { data: rawData, isLoading, error } = useAvailableToStashDataQuery({ enabled });

  // Memoize calculation to avoid recomputing on every render
  const calculatedData = useMemo(() => {
    if (!rawData) return undefined;
    return calculateAvailableToStash(rawData, { includeExpectedIncome });
  }, [rawData, includeExpectedIncome]);

  // Derive display values
  const formattedAmount = calculatedData ? formatAvailableAmount(calculatedData.available) : '$0';
  const status = calculatedData ? getAvailableStatus(calculatedData.available) : 'zero';
  const statusColor = getAvailableStatusColor(status);

  return {
    data: calculatedData,
    rawData,
    isLoading,
    error: error as Error | null,
    formattedAmount,
    status,
    statusColor,
  };
}

/**
 * Get just the available amount (convenience hook).
 */
export function useAvailableAmount(options?: {
  includeExpectedIncome?: boolean;
}): number | undefined {
  const { data } = useAvailableToStash(options);
  return data?.available;
}
