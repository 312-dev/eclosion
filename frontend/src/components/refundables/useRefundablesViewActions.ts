/**
 * useRefundablesViewActions
 *
 * Encapsulates view CRUD mutation handlers for the Refundables feature.
 */

import { useState, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import {
  useCreateRefundablesViewMutation,
  useUpdateRefundablesViewMutation,
  useDeleteRefundablesViewMutation,
} from '../../api/queries/refundablesQueries';
import type { RefundablesSavedView } from '../../types/refundables';

interface UseRefundablesViewActionsOptions {
  views: RefundablesSavedView[];
  effectiveViewId: string | null;
  onViewDeleted: (viewId: string) => void;
}

interface ViewActions {
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  editingView: RefundablesSavedView | null;
  setEditingView: (view: RefundablesSavedView | null) => void;
  deletingView: RefundablesSavedView | null;
  handleCreateView: (name: string, tagIds: string[], categoryIds: string[] | null) => Promise<void>;
  handleUpdateView: (name: string, tagIds: string[], categoryIds: string[] | null) => Promise<void>;
  handleEditView: (viewId: string) => void;
  handleDeleteView: (viewId: string) => void;
  confirmDeleteView: () => Promise<void>;
  cancelDeleteView: () => void;
  createPending: boolean;
  updatePending: boolean;
  deletePending: boolean;
}

export function useRefundablesViewActions({
  views,
  effectiveViewId,
  onViewDeleted,
}: UseRefundablesViewActionsOptions): ViewActions {
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingView, setEditingView] = useState<RefundablesSavedView | null>(null);
  const [deletingView, setDeletingView] = useState<RefundablesSavedView | null>(null);

  const createViewMutation = useCreateRefundablesViewMutation();
  const updateViewMutation = useUpdateRefundablesViewMutation();
  const deleteViewMutation = useDeleteRefundablesViewMutation();

  const handleCreateView = useCallback(
    async (name: string, tagIds: string[], categoryIds: string[] | null) => {
      try {
        await createViewMutation.mutateAsync({ name, tagIds, categoryIds });
        setShowCreateModal(false);
        toast.success('View created');
      } catch (err) {
        toast.error(handleApiError(err, 'Refundables'));
      }
    },
    [createViewMutation, toast]
  );

  const handleUpdateView = useCallback(
    async (name: string, tagIds: string[], categoryIds: string[] | null) => {
      if (!editingView) return;
      try {
        await updateViewMutation.mutateAsync({
          viewId: editingView.id,
          updates: { name, tagIds, categoryIds },
        });
        setEditingView(null);
        toast.success('View updated');
      } catch (err) {
        toast.error(handleApiError(err, 'Refundables'));
      }
    },
    [editingView, updateViewMutation, toast]
  );

  const handleEditView = useCallback(
    (viewId: string) => {
      const view = views.find((v) => v.id === viewId);
      if (view) setEditingView(view);
    },
    [views]
  );

  const handleDeleteView = useCallback(
    (viewId: string) => {
      const view = views.find((v) => v.id === viewId);
      if (view) setDeletingView(view);
    },
    [views]
  );

  const confirmDeleteView = useCallback(async () => {
    if (!deletingView) return;
    try {
      await deleteViewMutation.mutateAsync(deletingView.id);
      if (effectiveViewId === deletingView.id) onViewDeleted(deletingView.id);
      setDeletingView(null);
      toast.success('View deleted');
    } catch (err) {
      toast.error(handleApiError(err, 'Refundables'));
    }
  }, [deletingView, deleteViewMutation, effectiveViewId, onViewDeleted, toast]);

  const cancelDeleteView = useCallback(() => {
    setDeletingView(null);
  }, []);

  return {
    showCreateModal,
    setShowCreateModal,
    editingView,
    setEditingView,
    deletingView,
    handleCreateView,
    handleUpdateView,
    handleEditView,
    handleDeleteView,
    confirmDeleteView,
    cancelDeleteView,
    createPending: createViewMutation.isPending,
    updatePending: updateViewMutation.isPending,
    deletePending: deleteViewMutation.isPending,
  };
}
