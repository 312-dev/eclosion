/**
 * useEditStashHandlers Hook
 *
 * Custom hook that encapsulates mutation handlers for the EditStashModal.
 */

import { useCallback } from 'react';
import {
  useUpdateStashMutation,
  useArchiveStashMutation,
  useUnarchiveStashMutation,
  useDeleteStashMutation,
  useLinkStashCategoryMutation,
  useCompleteStashMutation,
  useUncompleteStashMutation,
  useUpdateCategoryRolloverMutation,
  useUpdateGroupRolloverMutation,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import type { CategorySelection } from './StashCategoryModal';

interface StashUpdates {
  name: string;
  amount: number | null; // null for open-ended goals
  target_date: string | null; // null for no-deadline goals
  emoji: string;
  source_url: string | null;
  custom_image_path: string | null;
  image_attribution: string | null;
  goal_type: import('../../types').StashGoalType;
  /** Change in starting balance (delta from original) */
  starting_balance_delta?: number;
}

interface UseEditStashHandlersParams {
  itemId: string | null;
  isArchived: boolean;
  /** Category ID for rollover balance updates (mutually exclusive with flexibleGroupId) */
  categoryId?: string | null;
  /** Flexible group ID for group-level rollover updates */
  flexibleGroupId?: string | null;
  buildUpdates: () => StashUpdates;
  validateForm: () => boolean;
  onCategoryMissing: (itemId: string) => void;
  onSuccess?: (() => void) | undefined;
  onClose: () => void;
}

export function useEditStashHandlers({
  itemId,
  isArchived,
  categoryId,
  flexibleGroupId,
  buildUpdates,
  validateForm,
  onCategoryMissing,
  onSuccess,
  onClose,
}: UseEditStashHandlersParams) {
  const toast = useToast();
  const updateMutation = useUpdateStashMutation();
  const archiveMutation = useArchiveStashMutation();
  const unarchiveMutation = useUnarchiveStashMutation();
  const deleteMutation = useDeleteStashMutation();
  const linkCategoryMutation = useLinkStashCategoryMutation();
  const completeMutation = useCompleteStashMutation();
  const uncompleteMutation = useUncompleteStashMutation();
  const updateCategoryRolloverMutation = useUpdateCategoryRolloverMutation();
  const updateGroupRolloverMutation = useUpdateGroupRolloverMutation();

  // Close immediately - mutations already invalidate the query for background refetch
  const closeImmediately = useCallback(() => {
    onSuccess?.();
    onClose();
  }, [onSuccess, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!itemId || !validateForm()) return;
    try {
      const updates = buildUpdates();
      const { starting_balance_delta, ...stashUpdates } = updates;

      // IMPORTANT: Update rollover FIRST, then stash metadata
      // The stash metadata update invalidates and refetches the stash query.
      // If we updated rollover second, the refetch would race with and overwrite
      // the rollover mutation's optimistic update. By updating rollover first,
      // the subsequent refetch will fetch data with the rollover already committed.
      if (starting_balance_delta && starting_balance_delta !== 0) {
        if (flexibleGroupId) {
          // Group-level rollover for flexible groups
          await updateGroupRolloverMutation.mutateAsync({
            groupId: flexibleGroupId,
            amount: starting_balance_delta,
          });
        } else if (categoryId) {
          // Category-level rollover
          await updateCategoryRolloverMutation.mutateAsync({
            categoryId,
            amount: starting_balance_delta,
          });
        }
      }

      // Update the stash item metadata (this invalidates and refetches)
      await updateMutation.mutateAsync({ id: itemId, updates: stashUpdates });

      toast.success('Stash updated');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Updating stash'));
    }
  }, [
    itemId,
    validateForm,
    buildUpdates,
    updateMutation,
    categoryId,
    flexibleGroupId,
    updateCategoryRolloverMutation,
    updateGroupRolloverMutation,
    toast,
    onSuccess,
    onClose,
  ]);

  const handleUnarchiveItem = useCallback(async (): Promise<boolean> => {
    if (!itemId) return false;
    const result = await unarchiveMutation.mutateAsync(itemId);
    if (result.category_missing) {
      onCategoryMissing(itemId);
      return false;
    }
    toast.success('Stash restored');
    return true;
  }, [itemId, unarchiveMutation, onCategoryMissing, toast]);

  const handleSaveAndRestore = useCallback(async () => {
    if (!itemId || !validateForm()) return;
    try {
      const updates = buildUpdates();
      const { starting_balance_delta, ...stashUpdates } = updates;

      // Update rollover first to avoid race condition (see handleSubmit comment)
      if (starting_balance_delta && starting_balance_delta !== 0) {
        if (flexibleGroupId) {
          await updateGroupRolloverMutation.mutateAsync({
            groupId: flexibleGroupId,
            amount: starting_balance_delta,
          });
        } else if (categoryId) {
          await updateCategoryRolloverMutation.mutateAsync({
            categoryId,
            amount: starting_balance_delta,
          });
        }
      }

      await updateMutation.mutateAsync({ id: itemId, updates: stashUpdates });

      const success = await handleUnarchiveItem();
      if (!success) return;
      closeImmediately();
    } catch (err) {
      toast.error(handleApiError(err, 'Restoring stash'));
    }
  }, [
    itemId,
    validateForm,
    buildUpdates,
    updateMutation,
    categoryId,
    flexibleGroupId,
    updateCategoryRolloverMutation,
    updateGroupRolloverMutation,
    handleUnarchiveItem,
    closeImmediately,
    toast,
  ]);

  const handleArchive = useCallback(async () => {
    if (!itemId) return;
    try {
      if (isArchived) {
        const success = await handleUnarchiveItem();
        if (!success) return;
      } else {
        await archiveMutation.mutateAsync(itemId);
        toast.success('Stash archived');
      }
      closeImmediately();
    } catch (err) {
      toast.error(handleApiError(err, isArchived ? 'Restoring' : 'Archiving'));
    }
  }, [itemId, isArchived, handleUnarchiveItem, archiveMutation, toast, closeImmediately]);

  const handleCategorySelection = useCallback(
    async (selection: CategorySelection, categoryMissingItemId: string | null) => {
      if (!categoryMissingItemId) return;
      let params;
      if (selection.type === 'create_new') {
        params = { id: categoryMissingItemId, categoryGroupId: selection.categoryGroupId };
      } else if (selection.type === 'use_existing') {
        params = { id: categoryMissingItemId, existingCategoryId: selection.categoryId };
      } else {
        // use_flexible_group - link to the group directly
        params = { id: categoryMissingItemId, flexibleGroupId: selection.groupId };
      }
      try {
        await linkCategoryMutation.mutateAsync(params);
        toast.success('Category linked successfully');
        onSuccess?.();
        onClose();
      } catch (err) {
        toast.error(handleApiError(err, 'Linking category'));
      }
    },
    [linkCategoryMutation, toast, onSuccess, onClose]
  );

  const handleDelete = useCallback(
    async (deleteCategory: boolean) => {
      if (!itemId) return;
      try {
        await deleteMutation.mutateAsync({ id: itemId, deleteCategory });
        toast.success(deleteCategory ? 'Stash and category deleted' : 'Stash deleted');
        onSuccess?.();
        onClose();
      } catch (err) {
        toast.error(handleApiError(err, 'Deleting stash'));
      }
    },
    [itemId, deleteMutation, toast, onSuccess, onClose]
  );

  const handleComplete = useCallback(
    async (releaseFunds = false) => {
      if (!itemId) return;
      try {
        await completeMutation.mutateAsync({ id: itemId, releaseFunds });
        toast.success('Goal marked as completed!');
        closeImmediately();
      } catch (err) {
        toast.error(handleApiError(err, 'Completing stash'));
      }
    },
    [itemId, completeMutation, toast, closeImmediately]
  );

  const handleUncomplete = useCallback(async () => {
    if (!itemId) return;
    try {
      await uncompleteMutation.mutateAsync(itemId);
      toast.success('Goal restored to active');
      closeImmediately();
    } catch (err) {
      toast.error(handleApiError(err, 'Restoring stash'));
    }
  }, [itemId, uncompleteMutation, toast, closeImmediately]);

  const isSubmitting =
    updateMutation.isPending ||
    archiveMutation.isPending ||
    unarchiveMutation.isPending ||
    deleteMutation.isPending ||
    linkCategoryMutation.isPending ||
    completeMutation.isPending ||
    uncompleteMutation.isPending ||
    updateCategoryRolloverMutation.isPending ||
    updateGroupRolloverMutation.isPending;

  return {
    handleSubmit,
    handleSaveAndRestore,
    handleArchive,
    handleCategorySelection,
    handleDelete,
    handleComplete,
    handleUncomplete,
    isSubmitting,
    isLinkingCategory: linkCategoryMutation.isPending,
    isDeletingItem: deleteMutation.isPending,
    isCompletingItem: completeMutation.isPending,
  };
}
