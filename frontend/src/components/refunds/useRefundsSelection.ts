/**
 * Selection-derived state and batch action handlers for the Refunds feature.
 * Extracted from RefundsTab to keep component under 300-line limit.
 *
 * Selection ID state (useState) is owned by the parent; this hook computes
 * derived values and action handlers from it.
 *
 * Both transaction IDs and credit-group IDs can live in `selectedIds`.
 * Credit-group selections are classified separately so that batch actions
 * operate on the group's original transactions.
 */

import { useMemo, useCallback, useRef } from 'react';
import type { Transaction, RefundsMatch, CreditGroup } from '../../types/refunds';

export type SelectionState = 'unmatched' | 'matched' | 'skipped' | 'expected' | 'mixed';

type SelectionCategory = 'unmatched' | 'matched' | 'skipped' | 'expected';

function classifyTransaction(match: RefundsMatch | undefined): SelectionCategory {
  if (!match) return 'unmatched';
  if (match.skipped) return 'skipped';
  if (match.expectedRefund) return 'expected';
  return 'matched';
}

/** Compute the aggregate selection state from flags. */
function resolveSelectionState(flags: Record<SelectionCategory, boolean>): SelectionState {
  const count = Object.values(flags).filter(Boolean).length;
  if (count > 1) return 'mixed';
  if (flags.expected) return 'expected';
  if (flags.matched) return 'matched';
  if (flags.skipped) return 'skipped';
  return 'unmatched';
}

interface SelectionParams {
  readonly selectedIds: Set<string>;
  readonly setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  readonly activeTransactions: Transaction[];
  readonly skippedTransactions: Transaction[];
  readonly matches: RefundsMatch[];
  readonly creditGroups: CreditGroup[];
  readonly handleDirectSkip: (transaction: Transaction) => Promise<void>;
  readonly handleDirectUnmatch: (transaction: Transaction) => Promise<void>;
  readonly handleRestore: (transaction: Transaction) => Promise<void>;
}

interface SelectionActions {
  selectedAmount: number;
  selectionState: SelectionState;
  handleToggleSelect: (transaction: Transaction, shiftKey: boolean) => void;
  handleToggleCreditGroup: (groupId: string) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;
  handleBatchSkip: () => Promise<void>;
  handleBatchUnmatch: () => Promise<void>;
  handleBatchRestore: () => Promise<void>;
  handleBatchClearExpected: () => Promise<void>;
  clearSelection: () => void;
}

export function useRefundsSelection({
  selectedIds,
  setSelectedIds,
  activeTransactions,
  skippedTransactions,
  matches,
  creditGroups,
  handleDirectSkip,
  handleDirectUnmatch,
  handleRestore,
}: SelectionParams): SelectionActions {
  const allVisibleTransactions = useMemo(
    () => [...activeTransactions, ...skippedTransactions],
    [activeTransactions, skippedTransactions]
  );

  /** Index credit groups by ID for fast lookup. */
  const creditGroupMap = useMemo(() => {
    const map = new Map<string, CreditGroup>();
    for (const cg of creditGroups) map.set(cg.id, cg);
    return map;
  }, [creditGroups]);

  const selectedAmount = useMemo(() => {
    let sum = 0;
    for (const txn of allVisibleTransactions) {
      if (selectedIds.has(txn.id)) sum += Math.abs(txn.amount);
    }
    for (const cg of creditGroups) {
      if (selectedIds.has(cg.id)) sum += Math.abs(cg.amount);
    }
    return sum;
  }, [allVisibleTransactions, creditGroups, selectedIds]);

  const selectionState: SelectionState = useMemo(() => {
    if (selectedIds.size === 0) return 'unmatched';
    const flags: Record<SelectionCategory, boolean> = {
      unmatched: false,
      matched: false,
      skipped: false,
      expected: false,
    };

    for (const txn of activeTransactions) {
      if (selectedIds.has(txn.id)) {
        flags[classifyTransaction(matches.find((m) => m.originalTransactionId === txn.id))] = true;
      }
    }
    for (const txn of skippedTransactions) {
      if (selectedIds.has(txn.id)) flags.skipped = true;
    }
    for (const cg of creditGroups) {
      if (selectedIds.has(cg.id)) flags[cg.type === 'refund' ? 'matched' : 'expected'] = true;
    }

    return resolveSelectionState(flags);
  }, [selectedIds, activeTransactions, skippedTransactions, matches, creditGroups]);

  const lastClickedIdRef = useRef<string | null>(null);

  const handleToggleSelect = useCallback(
    (transaction: Transaction, shiftKey: boolean) => {
      if (shiftKey && lastClickedIdRef.current) {
        const anchorIdx = allVisibleTransactions.findIndex(
          (t) => t.id === lastClickedIdRef.current
        );
        const targetIdx = allVisibleTransactions.findIndex((t) => t.id === transaction.id);
        if (anchorIdx !== -1 && targetIdx !== -1) {
          const start = Math.min(anchorIdx, targetIdx);
          const end = Math.max(anchorIdx, targetIdx);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            for (let i = start; i <= end; i++) {
              next.add(allVisibleTransactions[i]!.id);
            }
            return next;
          });
          return;
        }
      }
      lastClickedIdRef.current = transaction.id;
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
    [setSelectedIds, allVisibleTransactions]
  );

  const handleToggleCreditGroup = useCallback(
    (groupId: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.add(groupId);
        }
        return next;
      });
    },
    [setSelectedIds]
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(allVisibleTransactions.map((t) => t.id)));
  }, [setSelectedIds, allVisibleTransactions]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
    lastClickedIdRef.current = null;
  }, [setSelectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastClickedIdRef.current = null;
  }, [setSelectedIds]);

  /** Resolve selected credit-group IDs → their original transaction IDs. */
  const resolveGroupOriginals = useCallback(
    (ids: ReadonlySet<string>): Transaction[] => {
      const txnIds = new Set<string>();
      for (const id of ids) {
        const cg = creditGroupMap.get(id);
        if (cg) {
          for (const origId of cg.originalTransactionIds) txnIds.add(origId);
        }
      }
      return activeTransactions.filter((t) => txnIds.has(t.id));
    },
    [creditGroupMap, activeTransactions]
  );

  const handleBatchSkip = useCallback(async () => {
    const toSkip = activeTransactions.filter((txn) => selectedIds.has(txn.id));
    for (const txn of toSkip) {
      await handleDirectSkip(txn);
    }
    setSelectedIds(new Set());
  }, [activeTransactions, selectedIds, handleDirectSkip, setSelectedIds]);

  const handleBatchUnmatch = useCallback(async () => {
    // Direct transaction selections
    const directUnmatch = activeTransactions.filter((txn) => selectedIds.has(txn.id));
    // Credit-group selections → their originals
    const groupUnmatch = resolveGroupOriginals(selectedIds);
    const allToUnmatch = new Map<string, Transaction>();
    for (const txn of directUnmatch) allToUnmatch.set(txn.id, txn);
    for (const txn of groupUnmatch) allToUnmatch.set(txn.id, txn);

    for (const txn of allToUnmatch.values()) {
      await handleDirectUnmatch(txn);
    }
    setSelectedIds(new Set());
  }, [activeTransactions, selectedIds, resolveGroupOriginals, handleDirectUnmatch, setSelectedIds]);

  const handleBatchRestore = useCallback(async () => {
    const toRestore = skippedTransactions.filter((txn) => selectedIds.has(txn.id));
    for (const txn of toRestore) {
      await handleRestore(txn);
    }
    setSelectedIds(new Set());
  }, [skippedTransactions, selectedIds, handleRestore, setSelectedIds]);

  const handleBatchClearExpected = useCallback(async () => {
    // Direct transaction selections
    const directClear = activeTransactions.filter((txn) => selectedIds.has(txn.id));
    // Credit-group selections → their originals
    const groupClear = resolveGroupOriginals(selectedIds);
    const allToClear = new Map<string, Transaction>();
    for (const txn of directClear) allToClear.set(txn.id, txn);
    for (const txn of groupClear) allToClear.set(txn.id, txn);

    for (const txn of allToClear.values()) {
      await handleDirectUnmatch(txn);
    }
    setSelectedIds(new Set());
  }, [activeTransactions, selectedIds, resolveGroupOriginals, handleDirectUnmatch, setSelectedIds]);

  return {
    selectedAmount,
    selectionState,
    handleToggleSelect,
    handleToggleCreditGroup,
    handleSelectAll,
    handleDeselectAll,
    handleBatchSkip,
    handleBatchUnmatch,
    handleBatchRestore,
    handleBatchClearExpected,
    clearSelection,
  };
}
