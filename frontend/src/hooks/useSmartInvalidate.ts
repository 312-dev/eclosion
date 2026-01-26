/**
 * Smart Invalidation Hook
 *
 * Provides registry-based query invalidation for mutations.
 * Uses the dependency registry to determine which queries to
 * invalidate (immediate refetch) vs mark stale (lazy refetch).
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../context/DemoContext';
import { queryKeys, getQueryKey } from '../api/queries/keys';
import {
  type MutationType,
  type QueryKeyName,
  getInvalidationTargets,
  getStaleTargets,
} from '../api/queries/dependencies';

/**
 * Hook that provides smart query invalidation based on mutation type.
 *
 * Uses the dependency registry to:
 * - Invalidate queries that need immediate refetch
 * - Mark queries as stale for lazy refetch on next access
 *
 * @example
 * ```tsx
 * const smartInvalidate = useSmartInvalidate();
 *
 * const mutation = useMutation({
 *   mutationFn: api.createStash,
 *   onSuccess: () => {
 *     smartInvalidate('createStash');
 *   },
 * });
 * ```
 */
export function useSmartInvalidate() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (mutationType: MutationType) => {
      // Get queries to invalidate (triggers immediate refetch)
      const toInvalidate = getInvalidationTargets(mutationType);

      // Get queries to mark stale (refetch on next access)
      const toMarkStale = getStaleTargets(mutationType);

      // Invalidate queries - triggers refetch for active queries
      toInvalidate.forEach((key) => {
        const queryKeyArray = queryKeys[key as keyof typeof queryKeys];
        if (queryKeyArray) {
          queryClient.invalidateQueries({
            queryKey: getQueryKey(queryKeyArray, isDemo),
          });
        }
      });

      // Mark queries as stale - will refetch on next access
      // This is done by setting a very short staleTime via invalidation
      // with refetchType: 'none' to mark stale without immediate refetch
      toMarkStale.forEach((key) => {
        const queryKeyArray = queryKeys[key as keyof typeof queryKeys];
        if (queryKeyArray) {
          queryClient.invalidateQueries({
            queryKey: getQueryKey(queryKeyArray, isDemo),
            refetchType: 'none', // Don't refetch now, just mark stale
          });
        }
      });
    },
    [queryClient, isDemo]
  );
}

/**
 * Hook that provides targeted invalidation for specific query keys.
 * Use this when you need more control than mutation-based invalidation.
 *
 * @example
 * ```tsx
 * const invalidateQueries = useInvalidateQueries();
 *
 * // Invalidate specific queries
 * invalidateQueries(['dashboard', 'stash']);
 *
 * // Mark specific queries as stale (lazy refetch)
 * invalidateQueries(['availableToStash'], { lazy: true });
 * ```
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (keys: QueryKeyName[], options?: { lazy?: boolean }) => {
      const refetchType = options?.lazy ? 'none' : 'active';

      keys.forEach((key) => {
        const queryKeyArray = queryKeys[key as keyof typeof queryKeys];
        if (queryKeyArray) {
          queryClient.invalidateQueries({
            queryKey: getQueryKey(queryKeyArray, isDemo),
            refetchType,
          });
        }
      });
    },
    [queryClient, isDemo]
  );
}

/**
 * Hook that provides a way to prefetch queries for anticipated navigation.
 * Useful for improving perceived performance when user is likely to navigate.
 *
 * @example
 * ```tsx
 * const prefetchQueries = usePrefetchQueries();
 *
 * // Prefetch stash data when user hovers over stash tab
 * onMouseEnter={() => prefetchQueries(['stash', 'stashConfig'])}
 * ```
 */
export function usePrefetchQueries() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();

  return useCallback(
    (keys: QueryKeyName[]) => {
      keys.forEach((key) => {
        const queryKeyArray = queryKeys[key as keyof typeof queryKeys];
        if (queryKeyArray) {
          // Check if query is stale before prefetching
          const queryState = queryClient.getQueryState(getQueryKey(queryKeyArray, isDemo));

          // Only prefetch if stale or not in cache
          if (!queryState || queryState.isInvalidated || queryState.dataUpdateCount === 0) {
            // Note: Actual prefetch would need the queryFn
            // This just ensures the query key is ready for the next fetch
            queryClient.invalidateQueries({
              queryKey: getQueryKey(queryKeyArray, isDemo),
              refetchType: 'none',
            });
          }
        }
      });
    },
    [queryClient, isDemo]
  );
}
