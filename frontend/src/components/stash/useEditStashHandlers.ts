/**
 * useEditStashHandlers Hook
 *
 * Custom hook that encapsulates mutation handlers for the EditStashModal.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUpdateStashMutation,
  useArchiveStashMutation,
  useUnarchiveStashMutation,
  useDeleteStashMutation,
  useLinkStashCategoryMutation,
  useCompleteStashMutation,
  useUncompleteStashMutation,
} from '../../api/queries';
import { queryKeys, getQueryKey } from '../../api/queries/keys';
import { useDemo } from '../../context/DemoContext';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import type { CategorySelection } from './StashCategoryModal';

interface StashUpdates {
  name: string;
  amount: number;
  target_date: string;
  emoji: string;
  source_url: string | null;
  custom_image_path: string | null;
}

interface UseEditStashHandlersParams {
  itemId: string | null;
  isArchived: boolean;
  buildUpdates: () => StashUpdates;
  validateForm: () => boolean;
  onCategoryMissing: (itemId: string) => void;
  onSuccess?: (() => void) | undefined;
  onClose: () => void;
}

export function useEditStashHandlers({
  itemId,
  isArchived,
  buildUpdates,
  validateForm,
  onCategoryMissing,
  onSuccess,
  onClose,
}: UseEditStashHandlersParams) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isDemo = useDemo();
  const updateMutation = useUpdateStashMutation();
  const archiveMutation = useArchiveStashMutation();
  const unarchiveMutation = useUnarchiveStashMutation();
  const deleteMutation = useDeleteStashMutation();
  const linkCategoryMutation = useLinkStashCategoryMutation();
  const completeMutation = useCompleteStashMutation();
  const uncompleteMutation = useUncompleteStashMutation();

  const refetchAndClose = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: getQueryKey(queryKeys.stash, isDemo) });
    onSuccess?.();
    onClose();
  }, [queryClient, isDemo, onSuccess, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!itemId || !validateForm()) return;
    try {
      await updateMutation.mutateAsync({ id: itemId, updates: buildUpdates() });
      toast.success('Stash updated');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Updating stash'));
    }
  }, [itemId, validateForm, buildUpdates, updateMutation, toast, onSuccess, onClose]);

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
      await updateMutation.mutateAsync({ id: itemId, updates: buildUpdates() });
      const success = await handleUnarchiveItem();
      if (!success) return;
      await refetchAndClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Restoring stash'));
    }
  }, [
    itemId,
    validateForm,
    buildUpdates,
    updateMutation,
    handleUnarchiveItem,
    refetchAndClose,
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
      await refetchAndClose();
    } catch (err) {
      toast.error(handleApiError(err, isArchived ? 'Restoring' : 'Archiving'));
    }
  }, [itemId, isArchived, handleUnarchiveItem, archiveMutation, toast, refetchAndClose]);

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
        toast.success(
          deleteCategory ? 'Stash and category deleted' : 'Stash deleted'
        );
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
        await refetchAndClose();
      } catch (err) {
        toast.error(handleApiError(err, 'Completing stash'));
      }
    },
    [itemId, completeMutation, toast, refetchAndClose]
  );

  const handleUncomplete = useCallback(async () => {
    if (!itemId) return;
    try {
      await uncompleteMutation.mutateAsync(itemId);
      toast.success('Goal restored to active');
      await refetchAndClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Restoring stash'));
    }
  }, [itemId, uncompleteMutation, toast, refetchAndClose]);

  const isSubmitting =
    updateMutation.isPending ||
    archiveMutation.isPending ||
    unarchiveMutation.isPending ||
    deleteMutation.isPending ||
    linkCategoryMutation.isPending ||
    completeMutation.isPending ||
    uncompleteMutation.isPending;

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
