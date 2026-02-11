/**
 * Selection-derived state and batch action handlers for the Refundables feature.
 * Extracted from RefundablesTab to keep component under 300-line limit.
 *
 * Selection ID state (useState) is owned by the parent; this hook computes
 * derived values and action handlers from it.
 */

import { useMemo, useCallback } from 'react';
import type { Transaction, RefundablesMatch } from '../../types/refundables';

export type SelectionState = 'unmatched' | 'matched' | 'skipped' | 'mixed';

interface SelectionParams {
  readonly selectedIds: Set<string>;
  readonly setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  readonly activeTransactions: Transaction[];
  readonly skippedTransactions: Transaction[];
  readonly matches: RefundablesMatch[];
  readonly handleDirectSkip: (transaction: Transaction) => Promise<void>;
  readonly handleDirectUnmatch: (transaction: Transaction) => Promise<void>;
  readonly handleRestore: (transaction: Transaction) => Promise<void>;
}

interface SelectionActions {
  selectedAmount: number;
  selectionState: SelectionState;
  handleToggleSelect: (transaction: Transaction) => void;
  handleBatchSkip: () => Promise<void>;
  handleBatchUnmatch: () => Promise<void>;
  handleBatchRestore: () => Promise<void>;
  clearSelection: () => void;
}

export function useRefundablesSelection({
  selectedIds,
  setSelectedIds,
  activeTransactions,
  skippedTransactions,
  matches,
  handleDirectSkip,
  handleDirectUnmatch,
  handleRestore,
}: SelectionParams): SelectionActions {
  const allVisibleTransactions = useMemo(
    () => [...activeTransactions, ...skippedTransactions],
    [activeTransactions, skippedTransactions]
  );

  const selectedAmount = useMemo(() => {
    let sum = 0;
    for (const txn of allVisibleTransactions) {
      if (selectedIds.has(txn.id)) sum += Math.abs(txn.amount);
    }
    return sum;
  }, [allVisibleTransactions, selectedIds]);

  const selectionState: SelectionState = useMemo(() => {
    if (selectedIds.size === 0) return 'unmatched';
    let hasUnmatched = false;
    let hasMatched = false;
    let hasSkipped = false;
    for (const txn of activeTransactions) {
      if (!selectedIds.has(txn.id)) continue;
      const match = matches.find((m) => m.originalTransactionId === txn.id);
      if (match && !match.skipped) {
        hasMatched = true;
      } else {
        hasUnmatched = true;
      }
    }
    for (const txn of skippedTransactions) {
      if (!selectedIds.has(txn.id)) continue;
      hasSkipped = true;
    }
    const stateCount = [hasUnmatched, hasMatched, hasSkipped].filter(Boolean).length;
    if (stateCount > 1) return 'mixed';
    if (hasMatched) return 'matched';
    if (hasSkipped) return 'skipped';
    return 'unmatched';
  }, [selectedIds, activeTransactions, skippedTransactions, matches]);

  const handleToggleSelect = useCallback(
    (transaction: Transaction) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(transaction.id)) {
          next.delete(transaction.id);
        } else {
          next.add(transaction.id);
        }
        return next;
      });
    },
    [setSelectedIds]
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [setSelectedIds]);

  const handleBatchSkip = useCallback(async () => {
    const toSkip = activeTransactions.filter((txn) => selectedIds.has(txn.id));
    for (const txn of toSkip) {
      await handleDirectSkip(txn);
    }
    setSelectedIds(new Set());
  }, [activeTransactions, selectedIds, handleDirectSkip, setSelectedIds]);

  const handleBatchUnmatch = useCallback(async () => {
    const toUnmatch = activeTransactions.filter((txn) => selectedIds.has(txn.id));
    for (const txn of toUnmatch) {
      await handleDirectUnmatch(txn);
    }
    setSelectedIds(new Set());
  }, [activeTransactions, selectedIds, handleDirectUnmatch, setSelectedIds]);

  const handleBatchRestore = useCallback(async () => {
    const toRestore = skippedTransactions.filter((txn) => selectedIds.has(txn.id));
    for (const txn of toRestore) {
      await handleRestore(txn);
    }
    setSelectedIds(new Set());
  }, [skippedTransactions, selectedIds, handleRestore, setSelectedIds]);

  return {
    selectedAmount,
    selectionState,
    handleToggleSelect,
    handleBatchSkip,
    handleBatchUnmatch,
    handleBatchRestore,
    clearSelection,
  };
}
