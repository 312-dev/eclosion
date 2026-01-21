/**
 * Stash Configuration Queries
 *
 * Queries and mutations for stash configuration and category groups.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { StashConfig } from '../../types';

/**
 * Transform backend config (snake_case) to frontend format (camelCase).
 */
function transformStashConfig(raw: Record<string, unknown>): StashConfig {
  return {
    isConfigured: Boolean(raw['is_configured']),
    defaultCategoryGroupId: (raw['default_category_group_id'] as string) ?? null,
    defaultCategoryGroupName: (raw['default_category_group_name'] as string) ?? null,
    selectedBrowser: (raw['selected_browser'] as StashConfig['selectedBrowser']) ?? null,
    selectedFolderIds: (raw['selected_folder_ids'] as string[]) ?? [],
    selectedFolderNames: (raw['selected_folder_names'] as string[]) ?? [],
    autoArchiveOnBookmarkDelete: Boolean(raw['auto_archive_on_bookmark_delete']),
    autoArchiveOnGoalMet: Boolean(raw['auto_archive_on_goal_met']),
  };
}

/**
 * Stash config query - fetches configuration settings
 */
export function useStashConfigQuery(options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.stashConfig, isDemo),
    queryFn: async (): Promise<StashConfig> => {
      const raw = isDemo ? await demoApi.getStashConfig() : await api.getStashConfig();
      return transformStashConfig(raw as unknown as Record<string, unknown>);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    ...options,
  });
}

/**
 * Update stash config mutation
 */
export function useUpdateStashConfigMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<StashConfig>) =>
      isDemo ? demoApi.updateStashConfig(updates) : api.updateStashConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.stashConfig, isDemo) });
    },
  });
}

/**
 * Helper: Check if stash is configured
 */
export function useIsStashConfigured(): boolean {
  const { data } = useStashConfigQuery();
  return data?.isConfigured ?? false;
}

/**
 * Stash category groups query - fetches groups for dropdown selections
 */
export function useStashCategoryGroupsQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.stashCategoryGroups, isDemo),
    queryFn: async () => {
      return isDemo
        ? await demoApi.getStashCategoryGroups()
        : await api.getStashCategoryGroups();
    },
    staleTime: 5 * 60 * 1000,
  });
}
