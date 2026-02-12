/**
 * ClearExpectedConfirmModal
 *
 * Confirmation modal for clearing expected refund status from transactions.
 */

import { Modal } from '../ui/Modal';
import { ModalFooter } from '../ui/ModalButtons';
import { Icons } from '../icons';

interface ClearExpectedConfirmModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => Promise<void>;
  readonly count: number;
  readonly isClearing: boolean;
}

export function ClearExpectedConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  isClearing,
}: ClearExpectedConfirmModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const plural = count === 1 ? '' : 's';

  const footer = (
    <ModalFooter
      onCancel={onClose}
      onSubmit={onConfirm}
      submitLabel={count > 1 ? `Clear ${count} Expected` : 'Clear Expected'}
      submitLoadingLabel="Clearing..."
      isSubmitting={isClearing}
      variant="warning"
    />
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clear Expected Refund"
      footer={footer}
      maxWidth="sm"
    >
      <div
        className="flex items-start gap-3 p-3 rounded-lg"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--monarch-accent) 10%, transparent)',
          border: '1px solid var(--monarch-accent)',
        }}
      >
        <Icons.Warning
          size={20}
          className="shrink-0 mt-0.5"
          style={{ color: 'var(--monarch-accent)' }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--monarch-accent)' }}>
            Remove expected refund status
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
            {count === 1
              ? 'The expected refund will be cleared and the transaction will return to unmatched.'
              : `Expected refund status will be cleared from ${count} transaction${plural}. They will return to unmatched.`}
          </p>
        </div>
      </div>
    </Modal>
  );
}
