/**
 * Settings Mutations
 *
 * Mutations for settings, config, and import/export operations.
 * Uses smart invalidation from the dependency registry for consistent cache management.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import { useSmartInvalidate } from '../../hooks/useSmartInvalidate';
import type { AutoSyncStatus } from '../../types';

/**
 * Update settings (auto-sync, threshold, auto-update targets, auto-categorize, show category group)
 */
export function useUpdateSettingsMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (settings: {
      auto_sync_new?: boolean;
      auto_track_threshold?: number | null;
      auto_update_targets?: boolean;
      auto_categorize_enabled?: boolean;
      show_category_group?: boolean;
    }) =>
      isDemo
        ? demoApi.updateSettings(settings)
        : api.updateSettings(settings),
    onSuccess: () => {
      smartInvalidate('updateSettings');
    },
  });
}

/**
 * Set initial config (target group)
 */
export function useSetConfigMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: ({ groupId, groupName }: { groupId: string; groupName: string }) =>
      isDemo
        ? demoApi.setConfig(groupId, groupName)
        : api.setConfig(groupId, groupName),
    onSuccess: () => {
      smartInvalidate('updateSettings'); // Same effect
    },
  });
}

/**
 * Export settings to a portable format
 */
export function useExportSettingsMutation() {
  const isDemo = useDemo();
  return useMutation({
    mutationFn: () => (isDemo ? demoApi.exportSettings() : api.exportSettings()),
  });
}

/**
 * Import settings from a backup file
 */
export function useImportSettingsMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: ({ data, options }: { data: Parameters<typeof api.importSettings>[0]; options?: Parameters<typeof api.importSettings>[1] }) =>
      isDemo
        ? demoApi.importSettings(data, options)
        : api.importSettings(data, options),
    onSuccess: () => {
      smartInvalidate('importSettings');
    },
  });
}

/**
 * Preview what an import file contains
 */
export function usePreviewImportMutation() {
  const isDemo = useDemo();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.previewImport>[0]) =>
      isDemo ? demoApi.previewImport(data) : api.previewImport(data),
  });
}

/**
 * Query auto-sync status (scheduler-based background sync)
 *
 * Returns current auto-sync configuration including:
 * - enabled: Whether auto-sync is active
 * - interval_minutes: Current sync interval (5 min foreground, 60 min background)
 * - next_run: When the next sync is scheduled
 * - is_foreground: Whether app is in foreground mode
 */
export function useAutoSyncStatusQuery() {
  const isDemo = useDemo();
  return useQuery<AutoSyncStatus>({
    queryKey: getQueryKey(queryKeys.autoSyncStatus, isDemo),
    queryFn: () => (isDemo ? demoApi.getAutoSyncStatus() : api.getAutoSyncStatus()),
    // Refetch periodically to keep next_run accurate
    refetchInterval: 60000, // 1 minute
    // Don't refetch on window focus - we handle visibility separately
    refetchOnWindowFocus: false,
  });
}
