/**
 * DeleteViewConfirmModal
 *
 * Confirmation modal for deleting a saved refunds view.
 */

import { Modal } from '../ui/Modal';
import { ModalFooter } from '../ui/ModalButtons';
import { Icons } from '../icons';
import type { RefundsSavedView } from '../../types/refunds';

interface DeleteViewConfirmModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => Promise<void>;
  readonly view: RefundsSavedView | null;
  readonly isDeleting: boolean;
}

export function DeleteViewConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  view,
  isDeleting,
}: DeleteViewConfirmModalProps) {
  if (!view) return null;

  const footer = (
    <ModalFooter
      onCancel={onClose}
      onSubmit={onConfirm}
      submitLabel="Delete"
      submitLoadingLabel="Deleting..."
      isSubmitting={isDeleting}
      variant="destructive"
    />
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete View" footer={footer} maxWidth="sm">
      <div
        className="flex items-start gap-3 p-3 rounded-lg"
        style={{
          backgroundColor: 'var(--monarch-error-light, rgba(239, 68, 68, 0.1))',
          border: '1px solid var(--monarch-error)',
        }}
      >
        <Icons.Warning
          size={20}
          className="shrink-0 mt-0.5"
          style={{ color: 'var(--monarch-error)' }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--monarch-error)' }}>
            This action cannot be undone
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
            The view &quot;{view.name}&quot; will be permanently deleted.
          </p>
        </div>
      </div>
    </Modal>
  );
}
