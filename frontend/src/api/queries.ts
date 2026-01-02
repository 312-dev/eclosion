/**
 * TanStack Query hooks for API data fetching and caching
 *
 * All tabs share the same cached data through these hooks.
 * Mutations automatically invalidate relevant caches.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './client';

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  categoryGroups: ['categoryGroups'] as const,
  unmappedCategories: ['unmappedCategories'] as const,
  deletableCategories: ['deletableCategories'] as const,
  securityStatus: ['securityStatus'] as const,
  deploymentInfo: ['deploymentInfo'] as const,
  version: ['version'] as const,
  changelog: ['changelog'] as const,
  versionCheck: ['versionCheck'] as const,
  changelogStatus: ['changelogStatus'] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Dashboard data - the main data source shared across all tabs
 * Contains: items, summary, config, ready_to_assign, rollup, last_sync
 */
export function useDashboardQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: api.getDashboard,
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    gcTime: 10 * 60 * 1000,   // Keep in cache for 10 minutes
    ...options,
  });
}

/**
 * Category groups for dropdown selections
 */
export function useCategoryGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.categoryGroups,
    queryFn: api.getCategoryGroups,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Unmapped categories for linking
 */
export function useUnmappedCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.unmappedCategories,
    queryFn: api.getUnmappedCategories,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Deletable categories for uninstall flow
 */
export function useDeletableCategoriesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.deletableCategories,
    queryFn: api.getDeletableCategories,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Security status
 */
export function useSecurityStatusQuery() {
  return useQuery({
    queryKey: queryKeys.securityStatus,
    queryFn: api.getSecurityStatus,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Deployment info
 */
export function useDeploymentInfoQuery() {
  return useQuery({
    queryKey: queryKeys.deploymentInfo,
    queryFn: api.getDeploymentInfo,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Trigger full sync - invalidates dashboard cache on success
 */
export function useSyncMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.triggerSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Toggle item tracking
 */
export function useToggleItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, enabled }: { recurringId: string; enabled: boolean }) =>
      api.toggleItemTracking(recurringId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Allocate funds to a category
 */
export function useAllocateFundsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, amount }: { recurringId: string; amount: number }) =>
      api.allocateFunds(recurringId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Recreate a missing category
 */
export function useRecreateCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) => api.recreateCategory(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Refresh/recalculate item target
 */
export function useRefreshItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) => api.refreshItem(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Change category group
 */
export function useChangeCategoryGroupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, groupId, groupName }: { recurringId: string; groupId: string; groupName: string }) =>
      api.changeCategoryGroup(recurringId, groupId, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.categoryGroups });
    },
  });
}

/**
 * Update settings (auto-sync, threshold)
 */
export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: { auto_sync_new?: boolean; auto_track_threshold?: number | null }) =>
      api.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Set initial config (target group)
 */
export function useSetConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, groupName }: { groupId: string; groupName: string }) =>
      api.setConfig(groupId, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ============================================================================
// Rollup Mutations
// ============================================================================

/**
 * Add item to rollup
 */
export function useAddToRollupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) => api.addToRollup(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Remove item from rollup
 */
export function useRemoveFromRollupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recurringId: string) => api.removeFromRollup(recurringId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Set rollup budget
 */
export function useSetRollupBudgetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => api.setRollupBudget(amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Update rollup emoji
 */
export function useUpdateRollupEmojiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (emoji: string) => api.updateRollupEmoji(emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Update rollup category name
 */
export function useUpdateRollupNameMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.updateRollupCategoryName(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ============================================================================
// Category Mutations
// ============================================================================

/**
 * Update category emoji
 */
export function useUpdateCategoryEmojiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, emoji }: { recurringId: string; emoji: string }) =>
      api.updateCategoryEmoji(recurringId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Update category name
 */
export function useUpdateCategoryNameMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, name }: { recurringId: string; name: string }) =>
      api.updateCategoryName(recurringId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * Link item to existing category
 */
export function useLinkToCategoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recurringId, categoryId, syncName }: { recurringId: string; categoryId: string; syncName: boolean }) =>
      api.linkToCategory(recurringId, categoryId, syncName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.unmappedCategories });
    },
  });
}

// ============================================================================
// Uninstall Mutations
// ============================================================================

/**
 * Delete all categories (uninstall)
 */
export function useDeleteAllCategoriesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAllCategories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: queryKeys.deletableCategories });
    },
  });
}

/**
 * Cancel subscription (nuclear option)
 */
export function useCancelSubscriptionMutation() {
  return useMutation({
    mutationFn: api.cancelSubscription,
  });
}

// ============================================================================
// Helper: Invalidate all dashboard-related data
// ============================================================================

export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

// ============================================================================
// Version Queries
// ============================================================================

/**
 * Get server version info
 */
export function useVersionQuery() {
  return useQuery({
    queryKey: queryKeys.version,
    queryFn: api.getVersion,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get changelog entries
 */
export function useChangelogQuery(limit?: number) {
  return useQuery({
    queryKey: [...queryKeys.changelog, limit],
    queryFn: () => api.getChangelog(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Check for version updates
 */
export function useVersionCheckQuery(clientVersion: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...queryKeys.versionCheck, clientVersion],
    queryFn: () => api.checkVersion(clientVersion),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000, // Check every 30 minutes
    ...options,
  });
}

/**
 * Get changelog read status (has unread entries)
 */
export function useChangelogStatusQuery() {
  return useQuery({
    queryKey: queryKeys.changelogStatus,
    queryFn: api.getChangelogStatus,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mark changelog as read
 */
export function useMarkChangelogReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.markChangelogRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.changelogStatus });
    },
  });
}
