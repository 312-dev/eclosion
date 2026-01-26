/**
 * Category Mutations
 *
 * Mutations for category operations: emoji, name, and linking.
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
 * Update category emoji with optimistic updates for instant UI feedback
 *
 * Updates the emoji/icon on the Monarch category. Invalidates both the
 * dashboard (for recurring tab) and category store (for notes tab).
 */
export function useUpdateCategoryEmojiMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: ({ recurringId, emoji }: { recurringId: string; emoji: string }) =>
      isDemo
        ? demoApi.updateCategoryEmoji(recurringId, emoji)
        : api.updateCategoryEmoji(recurringId, emoji),

    onMutate: async ({ recurringId, emoji }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<DashboardData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<DashboardData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) => (item.id === recurringId ? { ...item, emoji } : item)),
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
      smartInvalidate('updateCategoryEmoji');
    },
  });
}

/**
 * Update category name with optimistic updates for instant UI feedback
 *
 * Updates the name on the Monarch category. Invalidates both the
 * dashboard (for recurring tab) and category store (for notes tab).
 */
export function useUpdateCategoryNameMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: ({ recurringId, name }: { recurringId: string; name: string }) =>
      isDemo
        ? demoApi.updateCategoryName(recurringId, name)
        : api.updateCategoryName(recurringId, name),

    onMutate: async ({ recurringId, name }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<DashboardData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<DashboardData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === recurringId ? { ...item, category_name: name } : item
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
      smartInvalidate('updateCategoryName');
    },
  });
}

/**
 * Link item to existing category with optimistic updates
 */
export function useLinkToCategoryMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: ({
      recurringId,
      categoryId,
      syncName,
    }: {
      recurringId: string;
      categoryId: string;
      syncName: boolean;
    }) =>
      isDemo
        ? demoApi.linkToCategory(recurringId, categoryId, syncName)
        : api.linkToCategory(recurringId, categoryId, syncName),

    onMutate: async ({ recurringId, categoryId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<DashboardData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<DashboardData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === recurringId
                ? { ...item, category_id: categoryId, has_category: true }
                : item
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
      smartInvalidate('linkCategory');
    },
  });
}
