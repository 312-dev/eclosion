/**
 * Updates State Hook
 *
 * Manages read/unread state for updates using server-side storage.
 * Tracks install date to filter relevant updates and provides
 * reactive state via the config store (React Query).
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useConfig, useUpdateConfigInCache } from '../api/queries/configStoreQueries';
import { useUpdateAcknowledgementsMutation } from '../api/queries/settingsMutations';
import { useUpdatesQuery, type UpdateEntry } from '../api/queries/updatesQueries';
import { useDemo } from '../context/DemoContext';

// localStorage key preserved for migration hook reference
export const UPDATES_STATE_KEY = 'eclosion-updates-state';

export interface UseUpdatesStateReturn {
  /** All updates relevant to this user (since install or latest) */
  allUpdates: UpdateEntry[];
  /** All fetched updates regardless of install date (for browsing) */
  allFetchedUpdates: UpdateEntry[];
  /** Updates not yet marked as read */
  unreadUpdates: UpdateEntry[];
  /** Count of unread updates */
  unreadCount: number;
  /** Current update to display (first unread) */
  currentUpdate: UpdateEntry | null;
  /** Loading state from query */
  isLoading: boolean;
  /** Error from query */
  error: Error | null;
  /** Mark a specific update as read */
  markAsRead: (id: string) => void;
  /** Mark all updates as read */
  markAllAsRead: () => void;
}

export function useUpdatesState(): UseUpdatesStateReturn {
  const { data: allUpdates = [], isLoading, error } = useUpdatesQuery();
  const { config } = useConfig();
  const updateConfigInCache = useUpdateConfigInCache();
  const updateAck = useUpdateAcknowledgementsMutation();
  const isDemo = useDemo();
  const installDateInitialized = useRef(false);

  const readIds = useMemo(() => config?.read_update_ids ?? [], [config?.read_update_ids]);
  const installDate = config?.updates_install_date ?? null;

  // Initialize install date on first load if not set
  useEffect(() => {
    if (installDateInitialized.current) return;
    if (!config) return; // Wait for config to load

    installDateInitialized.current = true;
    if (installDate) return;

    const now = new Date().toISOString();
    updateConfigInCache({ updates_install_date: now });
    if (!isDemo) {
      updateAck.mutate({ updates_install_date: now });
    }
  }, [config, installDate, updateConfigInCache, updateAck, isDemo]);

  // Filter updates to only those since install date
  // OR if no updates since install, show just the latest one
  const relevantUpdates = useMemo((): UpdateEntry[] => {
    if (!installDate) return [];
    const installDateObj = new Date(installDate);
    const sinceInstall = allUpdates.filter((u) => new Date(u.date) >= installDateObj);

    if (sinceInstall.length === 0 && allUpdates.length > 0) {
      // No updates since install - show just the latest
      const latest = allUpdates[0];
      return latest ? [latest] : [];
    }

    return sinceInstall;
  }, [allUpdates, installDate]);

  // Unread = relevant updates not in readIds
  const unreadUpdates = useMemo(() => {
    return relevantUpdates.filter((u) => !readIds.includes(u.id));
  }, [relevantUpdates, readIds]);

  const unreadCount = unreadUpdates.length;
  const currentUpdate = unreadUpdates[0] || null;

  const markAsRead = useCallback(
    (id: string) => {
      if (readIds.includes(id)) return;

      const newReadIds = [...readIds, id];
      const now = new Date().toISOString();
      updateConfigInCache({
        read_update_ids: newReadIds,
        updates_last_viewed_at: now,
      });
      updateAck.mutate({
        read_update_ids: newReadIds,
        updates_last_viewed_at: now,
      });
    },
    [readIds, updateConfigInCache, updateAck]
  );

  const markAllAsRead = useCallback(() => {
    const allIds = relevantUpdates.map((u) => u.id);
    const newReadIds = [...new Set([...readIds, ...allIds])];
    const now = new Date().toISOString();
    updateConfigInCache({
      read_update_ids: newReadIds,
      updates_last_viewed_at: now,
    });
    updateAck.mutate({
      read_update_ids: newReadIds,
      updates_last_viewed_at: now,
    });
  }, [relevantUpdates, readIds, updateConfigInCache, updateAck]);

  return {
    allUpdates: relevantUpdates,
    allFetchedUpdates: allUpdates,
    unreadUpdates,
    unreadCount,
    currentUpdate,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  };
}
