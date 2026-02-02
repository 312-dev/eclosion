/**
 * Stash Pending Bookmarks Queries
 *
 * Queries and mutations for pending bookmark review functionality.
 */

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import { useSmartInvalidate } from '../../hooks/useSmartInvalidate';
import { batchFetchFavicons, getUnfetchedDomains } from '../../utils/faviconService';
import type { PendingBookmark, ImportBookmark } from '../../types';

/**
 * Pending bookmarks query - fetches bookmarks awaiting review.
 * Automatically fetches missing favicons on first load (migration).
 */
export function usePendingBookmarksQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: getQueryKey(queryKeys.pendingBookmarks, isDemo),
    queryFn: async (): Promise<PendingBookmark[]> => {
      const response = isDemo
        ? await demoApi.getPendingBookmarks()
        : await api.getPendingBookmarks();
      return response.bookmarks;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });

  // Trigger favicon migration when data loads
  useFaviconMigration(query.data, isDemo, queryClient);

  return query;
}

/**
 * Apply fetched favicons to bookmarks in cache.
 */
function applyFaviconsToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  isDemo: boolean,
  faviconResults: Map<string, string | null>
) {
  queryClient.setQueryData<PendingBookmark[]>(
    getQueryKey(queryKeys.pendingBookmarks, isDemo),
    (old) => {
      if (!old) return old;
      return old.map((bm) => updateBookmarkWithFavicon(bm, faviconResults));
    }
  );
}

/**
 * Update a single bookmark with its favicon if available.
 */
function updateBookmarkWithFavicon(
  bm: PendingBookmark,
  faviconResults: Map<string, string | null>
): PendingBookmark {
  if (bm.logo_url) return bm; // Already has favicon
  const favicon = faviconResults.get(bm.url);
  if (!favicon) return bm;
  return { ...bm, logo_url: favicon };
}

/**
 * Fetch favicons for bookmarks missing them.
 */
async function fetchMissingFavicons(
  bookmarks: PendingBookmark[],
  isDemo: boolean
): Promise<Map<string, string | null>> {
  const urls = bookmarks.filter((bm) => !bm.logo_url).map((bm) => bm.url);
  return batchFetchFavicons(urls, isDemo);
}

/**
 * Persist fetched favicons to the backend database.
 * This ensures favicons survive page reloads and React Query cache invalidations.
 */
async function persistFaviconsToBackend(
  bookmarks: PendingBookmark[],
  faviconResults: Map<string, string | null>,
  isDemo: boolean
): Promise<void> {
  // Don't persist in demo mode (no backend)
  if (isDemo) return;

  // Build list of updates for bookmarks that got favicons
  const updates: Array<{ id: string; logo_url: string }> = [];
  for (const bm of bookmarks) {
    if (bm.logo_url) continue; // Already had favicon
    const favicon = faviconResults.get(bm.url);
    if (favicon) {
      updates.push({ id: bm.id, logo_url: favicon });
    }
  }

  if (updates.length === 0) return;

  // Fire and forget - don't block UI for persistence
  api.updateBookmarkFavicons(updates).catch(() => {
    // Silently ignore errors - favicons are still in cache
  });
}

/**
 * Hook to fetch missing favicons and update cache.
 * Runs once when bookmarks load with missing favicons.
 * Also persists fetched favicons to the backend for durability.
 */
function useFaviconMigration(
  bookmarks: PendingBookmark[] | undefined,
  isDemo: boolean,
  queryClient: ReturnType<typeof useQueryClient>
) {
  // Track if we've already triggered migration for this data
  const hasFetchedRef = useRef(false);
  const bookmarkCountRef = useRef(0);

  useEffect(() => {
    if (!bookmarks || bookmarks.length === 0) return;

    // Reset if bookmark count changes (new data loaded)
    if (bookmarks.length !== bookmarkCountRef.current) {
      hasFetchedRef.current = false;
      bookmarkCountRef.current = bookmarks.length;
    }

    // Only fetch once per data load
    if (hasFetchedRef.current) return;

    // Find domains that need fetching
    const unfetchedDomains = getUnfetchedDomains(bookmarks);
    if (unfetchedDomains.length === 0) return;

    hasFetchedRef.current = true;

    // Fetch favicons asynchronously (don't block render)
    fetchMissingFavicons(bookmarks, isDemo).then((results) => {
      // Update React Query cache for immediate UI update
      applyFaviconsToCache(queryClient, isDemo, results);
      // Persist to backend so favicons survive cache invalidations
      persistFaviconsToBackend(bookmarks, results, isDemo);
    });
  }, [bookmarks, isDemo, queryClient]);
}

/**
 * Pending bookmarks count query - for banner display
 */
export function usePendingCountQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.pendingBookmarksCount, isDemo),
    queryFn: async (): Promise<number> => {
      const response = isDemo ? await demoApi.getPendingCount() : await api.getPendingCount();
      return response.count;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Skipped/ignored bookmarks query - for Ignored Bookmarks section
 */
export function useSkippedBookmarksQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.skippedBookmarks, isDemo),
    queryFn: async (): Promise<PendingBookmark[]> => {
      const response = isDemo
        ? await demoApi.getSkippedBookmarks()
        : await api.getSkippedBookmarks();
      return response.bookmarks;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Skip pending bookmark mutation with optimistic updates
 */
export function useSkipPendingMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const pendingKey = getQueryKey(queryKeys.pendingBookmarks, isDemo);
  const countKey = getQueryKey(queryKeys.pendingBookmarksCount, isDemo);
  const skippedKey = getQueryKey(queryKeys.skippedBookmarks, isDemo);

  return useMutation({
    mutationFn: (id: string) =>
      isDemo ? demoApi.skipPendingBookmark(id) : api.skipPendingBookmark(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: pendingKey });
      await queryClient.cancelQueries({ queryKey: countKey });
      await queryClient.cancelQueries({ queryKey: skippedKey });

      const previousPending = queryClient.getQueryData<PendingBookmark[]>(pendingKey);
      const previousCount = queryClient.getQueryData<number>(countKey);
      const previousSkipped = queryClient.getQueryData<PendingBookmark[]>(skippedKey);

      // Find the bookmark to move
      const bookmarkToSkip = previousPending?.find((b) => b.id === id);

      if (previousPending) {
        queryClient.setQueryData<PendingBookmark[]>(pendingKey, (old) =>
          old ? old.filter((b) => b.id !== id) : old
        );
      }

      if (previousCount !== undefined) {
        queryClient.setQueryData<number>(countKey, Math.max(0, previousCount - 1));
      }

      if (previousSkipped && bookmarkToSkip) {
        queryClient.setQueryData<PendingBookmark[]>(skippedKey, (old) =>
          old ? [...old, { ...bookmarkToSkip, is_skipped: true }] : old
        );
      }

      return { previousPending, previousCount, previousSkipped };
    },

    onError: (_err, _id, context) => {
      if (context?.previousPending) {
        queryClient.setQueryData(pendingKey, context.previousPending);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(countKey, context.previousCount);
      }
      if (context?.previousSkipped) {
        queryClient.setQueryData(skippedKey, context.previousSkipped);
      }
    },

    onSettled: () => {
      smartInvalidate('skipPending');
    },
  });
}

/**
 * Convert pending bookmark mutation with optimistic updates
 */
export function useConvertPendingMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const pendingKey = getQueryKey(queryKeys.pendingBookmarks, isDemo);
  const countKey = getQueryKey(queryKeys.pendingBookmarksCount, isDemo);

  return useMutation({
    mutationFn: (id: string) =>
      isDemo ? demoApi.convertPendingBookmark(id) : api.convertPendingBookmark(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: pendingKey });
      await queryClient.cancelQueries({ queryKey: countKey });

      const previousPending = queryClient.getQueryData<PendingBookmark[]>(pendingKey);
      const previousCount = queryClient.getQueryData<number>(countKey);

      if (previousPending) {
        queryClient.setQueryData<PendingBookmark[]>(pendingKey, (old) =>
          old ? old.filter((b) => b.id !== id) : old
        );
      }

      if (previousCount !== undefined) {
        queryClient.setQueryData<number>(countKey, Math.max(0, previousCount - 1));
      }

      return { previousPending, previousCount };
    },

    onError: (_err, _id, context) => {
      if (context?.previousPending) {
        queryClient.setQueryData(pendingKey, context.previousPending);
      }
      if (context?.previousCount !== undefined) {
        queryClient.setQueryData(countKey, context.previousCount);
      }
    },

    onSettled: () => {
      smartInvalidate('convertPending');
    },
  });
}

/**
 * Import bookmarks mutation.
 * Favicons are fetched automatically by useFaviconMigration when the
 * pending bookmarks query refetches after import.
 */
export function useImportBookmarksMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();

  return useMutation({
    mutationFn: (bookmarks: ImportBookmark[]) =>
      isDemo ? demoApi.importBookmarks(bookmarks) : api.importBookmarks(bookmarks),
    onSuccess: () => {
      // Invalidate triggers refetch → useFaviconMigration handles favicon fetching
      smartInvalidate('importBookmarks');
    },
  });
}

/**
 * Clear unconverted pending bookmarks mutation
 */
export function useClearUnconvertedBookmarksMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: () =>
      isDemo ? demoApi.clearUnconvertedBookmarks() : api.clearUnconvertedBookmarks(),
    onSuccess: () => {
      smartInvalidate('clearUnconvertedBookmarks');
    },
  });
}

/**
 * Helper: Invalidate pending bookmarks data
 */
export function useInvalidatePendingBookmarks() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.pendingBookmarks, isDemo) });
    queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.pendingBookmarksCount, isDemo),
    });
  };
}
