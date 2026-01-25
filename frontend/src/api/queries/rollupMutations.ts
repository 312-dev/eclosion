/**
 * Rollup Mutations
 *
 * Mutations for rollup category operations.
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
 * Add item to rollup
 */
export function useAddToRollupMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (recurringId: string) =>
      isDemo
        ? demoApi.addToRollup(recurringId)
        : api.addToRollup(recurringId),
    onSuccess: () => {
      smartInvalidate('removeFromRollup'); // Same effect as remove (dashboard only)
    },
  });
}

/**
 * Remove item from rollup
 */
export function useRemoveFromRollupMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (recurringId: string) =>
      isDemo
        ? demoApi.removeFromRollup(recurringId)
        : api.removeFromRollup(recurringId),
    onSuccess: () => {
      smartInvalidate('removeFromRollup');
    },
  });
}

/**
 * Set rollup budget with optimistic updates for instant UI feedback
 */
export function useSetRollupBudgetMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: (amount: number) =>
      isDemo ? demoApi.setRollupBudget(amount) : api.setRollupBudget(amount),

    onMutate: async (amount) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<DashboardData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<DashboardData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            rollup: { ...old.rollup, budgeted: amount },
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
      smartInvalidate('setRollupBudget');
    },
  });
}

/**
 * Update rollup emoji with optimistic updates for instant UI feedback
 */
export function useUpdateRollupEmojiMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: (emoji: string) =>
      isDemo ? demoApi.updateRollupEmoji(emoji) : api.updateRollupEmoji(emoji),

    onMutate: async (emoji) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<DashboardData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<DashboardData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            rollup: { ...old.rollup, emoji },
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
      smartInvalidate('updateRollupEmoji');
    },
  });
}

/**
 * Update rollup category name with optimistic updates for instant UI feedback
 */
export function useUpdateRollupNameMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  const queryKey = getQueryKey(queryKeys.dashboard, isDemo);

  return useMutation({
    mutationFn: (name: string) =>
      isDemo ? demoApi.updateRollupCategoryName(name) : api.updateRollupCategoryName(name),

    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<DashboardData>(queryKey);

      if (previousData) {
        queryClient.setQueryData<DashboardData>(queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            rollup: { ...old.rollup, category_name: name },
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
      smartInvalidate('updateRollupName');
    },
  });
}
