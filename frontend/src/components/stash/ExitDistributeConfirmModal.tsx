/**
 * ExitDistributeConfirmModal
 *
 * Confirmation modal when exiting distribute mode with unsaved allocations.
 * Unlike hypothesize mode, distribute mode changes are saved via the "Apply" button
 * in the banner, so this modal only offers Cancel or Discard options.
 */

import { Modal } from '../ui/Modal';
import { CancelButton, DestructiveButton } from '../ui/ModalButtons';
import { Icons } from '../icons';
import { useDistributionMode } from '../../context/DistributionModeContext';

interface ExitDistributeConfirmModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  /** Called after user confirms exit (discard). Used for navigation blocking. */
  readonly onConfirmExit?: () => void;
}

export function ExitDistributeConfirmModal({
  isOpen,
  onClose,
  onConfirmExit,
}: ExitDistributeConfirmModalProps) {
  const { exitMode } = useDistributionMode();

  const handleDiscard = () => {
    exitMode(true);
    onClose();
    onConfirmExit?.();
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <CancelButton onClick={onClose}>Cancel</CancelButton>
      <DestructiveButton onClick={handleDiscard}>Discard</DestructiveButton>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Unsaved Allocations"
      footer={footer}
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--monarch-success) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--monarch-success) 30%, transparent)',
          }}
        >
          <Icons.Split
            size={20}
            className="shrink-0 mt-0.5"
            style={{ color: 'var(--monarch-success)' }}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              You have unsaved allocations
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Use the <strong>Apply</strong> button in the banner to save your changes, or discard
              them to exit.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
