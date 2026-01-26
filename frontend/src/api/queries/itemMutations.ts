/**
 * Item Mutations
 *
 * Mutations for recurring item operations: toggle, allocate, recreate, refresh, change group.
 * Uses smart invalidation from the dependency registry for consistent cache management.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { useSmartInvalidate } from '../../hooks/useSmartInvalidate';
import { queryKeys, getQueryKey } from './keys';
import type { DashboardData } from '../../types';

/**
 * Toggle item tracking with optimistic updates for instant UI feedback
 */
export function useToggleItemMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: ({ recurringId, enabled }: { recurringId: string; enabled: boolean }) =>
      isDemo
        ? demoApi.toggleItemTracking(recurringId, enabled)
        : api.toggleItemTracking(recurringId, enabled),

    onMutate: async ({ recurringId, enabled }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<DashboardData>(queryKey);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<DashboardData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === recurringId ? { ...item, is_enabled: enabled } : item
            ),
          };
        });
      }

      return { previousData };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      smartInvalidate('toggleItem');
    },
  });
}

/**
 * Allocate funds to a category with optimistic updates for instant UI feedback
 * Also adjusts ready_to_assign by the budget delta for immediate "Left to Budget" feedback
 */
export function useAllocateFundsMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: ({ recurringId, amount }: { recurringId: string; amount: number }) =>
      isDemo ? demoApi.allocateFunds(recurringId, amount) : api.allocateFunds(recurringId, amount),

    onMutate: async ({ recurringId, amount }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<DashboardData>(queryKey);

      // Optimistically update the cache
      if (previousData) {
        // Find the item to get the old budget value
        const item = previousData.items.find((i) => i.id === recurringId);
        const oldBudget = item?.planned_budget ?? 0;
        const budgetDelta = amount - oldBudget;

        queryClient.setQueryData<DashboardData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((i) =>
              i.id === recurringId ? { ...i, planned_budget: amount } : i
            ),
            // Adjust ready_to_assign: budgeting more = less left to budget
            ready_to_assign: {
              ...old.ready_to_assign,
              ready_to_assign: old.ready_to_assign.ready_to_assign - budgetDelta,
            },
          };
        });
      }

      // Return context with previous data for rollback
      return { previousData };
    },

    onError: (_err, _variables, context) => {
      // Rollback to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      // Always refetch after error or success to ensure server sync
      smartInvalidate('allocateFunds');
    },
  });
}

/**
 * Recreate a missing category
 */
export function useRecreateCategoryMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (recurringId: string) =>
      isDemo ? demoApi.recreateCategory(recurringId) : api.recreateCategory(recurringId),
    onSuccess: () => {
      smartInvalidate('recreateCategory');
    },
  });
}

/**
 * Refresh/recalculate item target
 */
export function useRefreshItemMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (recurringId: string) =>
      isDemo ? demoApi.refreshItem(recurringId) : api.refreshItem(recurringId),
    onSuccess: () => {
      smartInvalidate('refreshItem');
    },
  });
}

/**
 * Change category group with optimistic updates for instant UI feedback
 */
export function useChangeCategoryGroupMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: ({
      recurringId,
      groupId,
      groupName,
    }: {
      recurringId: string;
      groupId: string;
      groupName: string;
    }) =>
      isDemo
        ? demoApi.changeCategoryGroup(recurringId, groupId, groupName)
        : api.changeCategoryGroup(recurringId, groupId, groupName),

    onMutate: async ({ recurringId, groupId, groupName }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<DashboardData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<DashboardData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === recurringId ? { ...item, group_id: groupId, group_name: groupName } : item
            ),
          };
        });
      }

      return { previousData };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },

    onSettled: () => {
      smartInvalidate('updateCategoryGroup');
    },
  });
}
