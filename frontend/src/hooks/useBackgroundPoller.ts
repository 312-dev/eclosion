/**
 * Background Poller
 *
 * Provides background polling to keep data fresh while the app is visible.
 * Respects rate limits and pauses when the app is in the background.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../context/DemoContext';
import { useIsRateLimited } from '../context/RateLimitContext';
import { queryKeys, getQueryKey } from '../api/queries/keys';
import { pollingConfig, queryConfig, type QueryKeyName } from '../api/queries/dependencies';

interface UseBackgroundPollerOptions {
  /** Override the default poll interval (ms) */
  pollInterval?: number;
  /** Whether polling is enabled */
  enabled?: boolean;
}

/**
 * Hook that polls stale queries in the background while the app is visible.
 *
 * Features:
 * - Only polls queries marked as pollable in the dependency registry
 * - Pauses when the app is in the background (visibility-aware)
 * - Pauses when rate limited
 * - Configurable poll interval
 *
 * @example
 * ```tsx
 * function AppShell() {
 *   // Start background polling when app loads
 *   useBackgroundPoller();
 *
 *   return <App />;
 * }
 * ```
 */
export function useBackgroundPoller(options: UseBackgroundPollerOptions = {}) {
  const { pollInterval = pollingConfig.pollInterval, enabled = true } = options;

  const queryClient = useQueryClient();
  const isDemo = useDemo();
  const isRateLimited = useIsRateLimited();

  // Track visibility state
  const isVisibleRef = useRef(
    typeof document !== 'undefined' && document.visibilityState === 'visible'
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Function to check and refetch stale queries
  const pollStaleQueries = useCallback(() => {
    // Don't poll if rate limited
    if (isRateLimited) {
      return;
    }

    // Don't poll if not visible (shouldn't happen but double-check)
    if (!isVisibleRef.current) {
      return;
    }

    // Check each pollable query
    pollingConfig.pollableQueries.forEach((key) => {
      const queryKeyArray = queryKeys[key as keyof typeof queryKeys];
      if (!queryKeyArray) return;

      const fullKey = getQueryKey(queryKeyArray, isDemo);
      const queryState = queryClient.getQueryState(fullKey);

      if (!queryState) return;

      // Get stale time for this query
      const staleTime = queryConfig[key as QueryKeyName]?.staleTime ?? 0;
      const now = Date.now();
      const dataAge = queryState.dataUpdatedAt ? now - queryState.dataUpdatedAt : Infinity;

      // If data is stale and not currently fetching, invalidate
      if (dataAge > staleTime && !queryState.fetchStatus.includes('fetching')) {
        queryClient.invalidateQueries({
          queryKey: fullKey,
          refetchType: 'active', // Only refetch if there are active observers
        });
      }
    });
  }, [queryClient, isDemo, isRateLimited]);

  // Start/stop polling based on visibility
  const startPolling = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start new interval
    intervalRef.current = setInterval(pollStaleQueries, pollInterval);

    // Also poll immediately when visibility changes
    pollStaleQueries();
  }, [pollStaleQueries, pollInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle visibility changes
  useEffect(() => {
    if (!enabled) {
      stopPolling();
      return;
    }

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';

      if (isVisibleRef.current) {
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Initialize based on current visibility
    if (typeof document !== 'undefined') {
      isVisibleRef.current = document.visibilityState === 'visible';

      if (isVisibleRef.current) {
        startPolling();
      }

      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [enabled, startPolling, stopPolling]);

  // Restart polling when rate limit clears
  useEffect(() => {
    if (!isRateLimited && isVisibleRef.current && enabled) {
      // Poll immediately when rate limit clears
      pollStaleQueries();
    }
  }, [isRateLimited, enabled, pollStaleQueries]);
}

/**
 * Hook that triggers a refresh when the app becomes visible after being hidden.
 * This is lighter weight than full background polling - it only refreshes
 * when the user returns to the app.
 *
 * @example
 * ```tsx
 * function StashTab() {
 *   // Refresh stash data when user returns to the app
 *   useVisibilityRefresh(['stash', 'availableToStash']);
 *
 *   return <StashContent />;
 * }
 * ```
 */
export function useVisibilityRefresh(queryKeysToRefresh: QueryKeyName[]) {
  const queryClient = useQueryClient();
  const isDemo = useDemo();
  const isRateLimited = useIsRateLimited();

  // Track if we were hidden
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';

      if (isVisible && wasHiddenRef.current && !isRateLimited) {
        // App became visible after being hidden - refresh queries
        queryKeysToRefresh.forEach((key) => {
          const queryKeyArray = queryKeys[key as keyof typeof queryKeys];
          if (queryKeyArray) {
            queryClient.invalidateQueries({
              queryKey: getQueryKey(queryKeyArray, isDemo),
              refetchType: 'active',
            });
          }
        });
      }

      wasHiddenRef.current = !isVisible;
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [queryClient, isDemo, isRateLimited, queryKeysToRefresh]);
}

/**
 * Hook that provides manual control over polling.
 * Useful for testing or advanced scenarios.
 *
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const { pause, resume, pollNow, isPaused } = usePollingControl();
 *
 *   return (
 *     <div>
 *       <button onClick={isPaused ? resume : pause}>
 *         {isPaused ? 'Resume' : 'Pause'} Polling
 *       </button>
 *       <button onClick={pollNow}>Poll Now</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePollingControl() {
  const queryClient = useQueryClient();
  const isDemo = useDemo();
  const [isPaused, setIsPaused] = useState(false);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const pollNow = useCallback(() => {
    pollingConfig.pollableQueries.forEach((key) => {
      const queryKeyArray = queryKeys[key as keyof typeof queryKeys];
      if (queryKeyArray) {
        queryClient.invalidateQueries({
          queryKey: getQueryKey(queryKeyArray, isDemo),
          refetchType: 'active',
        });
      }
    });
  }, [queryClient, isDemo]);

  return {
    pause,
    resume,
    pollNow,
    isPaused,
  };
}
