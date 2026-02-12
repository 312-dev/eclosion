/**
 * useRefundsViewActions
 *
 * Encapsulates view CRUD mutation handlers for the Refunds feature.
 */

import { useState, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import {
  useCreateRefundsViewMutation,
  useUpdateRefundsViewMutation,
  useDeleteRefundsViewMutation,
} from '../../api/queries/refundsQueries';
import type { RefundsSavedView } from '../../types/refunds';

interface UseRefundsViewActionsOptions {
  views: RefundsSavedView[];
  effectiveViewId: string | null;
  onViewDeleted: (viewId: string) => void;
}

interface ViewActions {
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  editingView: RefundsSavedView | null;
  setEditingView: (view: RefundsSavedView | null) => void;
  deletingView: RefundsSavedView | null;
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

export function useRefundsViewActions({
  views,
  effectiveViewId,
  onViewDeleted,
}: UseRefundsViewActionsOptions): ViewActions {
  const toast = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingView, setEditingView] = useState<RefundsSavedView | null>(null);
  const [deletingView, setDeletingView] = useState<RefundsSavedView | null>(null);

  const createViewMutation = useCreateRefundsViewMutation();
  const updateViewMutation = useUpdateRefundsViewMutation();
  const deleteViewMutation = useDeleteRefundsViewMutation();

  const handleCreateView = useCallback(
    async (name: string, tagIds: string[], categoryIds: string[] | null) => {
      try {
        await createViewMutation.mutateAsync({ name, tagIds, categoryIds });
        setShowCreateModal(false);
        toast.success('View created');
      } catch (err) {
        toast.error(handleApiError(err, 'Refunds'));
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
        toast.error(handleApiError(err, 'Refunds'));
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
      toast.error(handleApiError(err, 'Refunds'));
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
