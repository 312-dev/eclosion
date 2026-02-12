/**
 * RefundablesModals
 *
 * All modal dialogs for the Refundables tab, extracted to reduce main component size.
 */

import { ViewConfigModal } from './ViewConfigModal';
import { DeleteViewConfirmModal } from './DeleteViewConfirmModal';
import { RefundMatchModal } from './RefundMatchModal';
import { ToolSettingsModal } from '../ui/ToolSettingsModal';
import type { useRefundablesViewActions } from './useRefundablesViewActions';
import type { MatchActionParams } from './useRefundablesMatchHandlers';
import type {
  Transaction,
  TransactionTag,
  RefundablesMatch,
  RefundablesConfig,
} from '../../types/refundables';

interface RefundablesModalsProps {
  readonly viewActions: ReturnType<typeof useRefundablesViewActions>;
  readonly tags: TransactionTag[];
  readonly tagsLoading: boolean;
  readonly matchingTransaction: Transaction | null;
  readonly onCloseMatch: () => void;
  readonly config: RefundablesConfig | undefined;
  readonly existingMatch: RefundablesMatch | undefined;
  readonly onMatch: (params: MatchActionParams) => Promise<void>;
  readonly onSkip: () => Promise<void>;
  readonly onUnmatch: () => Promise<void>;
  readonly matchPending: boolean;
  readonly batchCount: number;
  readonly batchAmount: number;
  readonly batchTransactions: Transaction[];
  readonly showSettingsModal: boolean;
  readonly onCloseSettings: () => void;
}

export function RefundablesModals({
  viewActions,
  tags,
  tagsLoading,
  matchingTransaction,
  onCloseMatch,
  config,
  existingMatch,
  onMatch,
  onSkip,
  onUnmatch,
  matchPending,
  batchCount,
  batchAmount,
  batchTransactions,
  showSettingsModal,
  onCloseSettings,
}: RefundablesModalsProps): React.JSX.Element {
  return (
    <>
      {viewActions.showCreateModal && (
        <ViewConfigModal
          isOpen={viewActions.showCreateModal}
          onClose={() => viewActions.setShowCreateModal(false)}
          onSave={viewActions.handleCreateView}
          tags={tags}
          tagsLoading={tagsLoading}
          saving={viewActions.createPending}
        />
      )}
      {viewActions.editingView && (
        <ViewConfigModal
          isOpen={true}
          onClose={() => viewActions.setEditingView(null)}
          onSave={viewActions.handleUpdateView}
          tags={tags}
          tagsLoading={tagsLoading}
          saving={viewActions.updatePending}
          existingView={viewActions.editingView}
          onDelete={() => {
            const view = viewActions.editingView;
            viewActions.setEditingView(null);
            if (view) viewActions.handleDeleteView(view.id);
          }}
        />
      )}
      {matchingTransaction && (
        <RefundMatchModal
          isOpen={true}
          onClose={onCloseMatch}
          transaction={matchingTransaction}
          config={config}
          existingMatch={existingMatch}
          onMatch={onMatch}
          onSkip={onSkip}
          onUnmatch={onUnmatch}
          matching={matchPending}
          batchCount={batchCount}
          batchAmount={batchAmount}
          batchTransactions={batchTransactions}
        />
      )}
      <DeleteViewConfirmModal
        isOpen={viewActions.deletingView !== null}
        onClose={viewActions.cancelDeleteView}
        onConfirm={viewActions.confirmDeleteView}
        view={viewActions.deletingView}
        isDeleting={viewActions.deletePending}
      />
      {showSettingsModal && (
        <ToolSettingsModal isOpen={true} onClose={onCloseSettings} tool="refundables" />
      )}
    </>
  );
}
