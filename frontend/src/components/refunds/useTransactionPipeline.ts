/**
 * Transaction filtering, merging, and splitting pipeline for the Refundables tab.
 * Extracted from RefundablesTab to keep component under 300-line limit.
 */

import { useMemo } from 'react';
import type { Transaction, RefundablesMatch } from '../../types/refundables';
import { useRefundablesTally } from './useRefundablesTally';

interface TransactionPipelineInput {
  readonly transactions: Transaction[];
  readonly matches: RefundablesMatch[];
  readonly tagIds: string[];
  readonly viewCategoryIds: string[] | null;
  readonly dateRange: { startDate: string | null; endDate: string | null };
  readonly selectedCategoryIds: string[] | null;
  readonly searchQuery: string;
  readonly selectedIds: ReadonlySet<string>;
}

export function useTransactionPipeline(input: TransactionPipelineInput): {
  activeTransactions: Transaction[];
  skippedTransactions: Transaction[];
  expenseTransactions: Transaction[];
  filteredTransactions: Transaction[];
  tally: ReturnType<typeof useRefundablesTally>;
  viewCategoryCount: number;
} {
  const {
    transactions,
    matches,
    tagIds,
    viewCategoryIds,
    dateRange,
    selectedCategoryIds,
    searchQuery,
    selectedIds,
  } = input;

  // Merge orphaned matched/skipped transactions whose tags were removed from Monarch
  const mergedTransactions = useMemo((): Transaction[] => {
    if (matches.length === 0) return transactions;
    const fetchedIds = new Set(transactions.map((t) => t.id));
    const viewTagIdSet = new Set(tagIds);
    const viewCatIdSet = viewCategoryIds ? new Set(viewCategoryIds) : null;
    const orphaned: Transaction[] = [];
    for (const match of matches) {
      if (!match.transactionData) continue;
      if (fetchedIds.has(match.originalTransactionId)) continue;
      if (!isOrphanInView(match, viewTagIdSet, viewCatIdSet, dateRange)) continue;
      orphaned.push(match.transactionData);
    }
    return orphaned.length > 0 ? [...transactions, ...orphaned] : transactions;
  }, [transactions, matches, tagIds, viewCategoryIds, dateRange]);

  // Filter out credit (positive amount) transactions
  const expenseTransactions = useMemo(
    () => mergedTransactions.filter((txn) => txn.amount < 0),
    [mergedTransactions]
  );

  // Apply ad-hoc category filter (pin selected items so they stay visible)
  const filteredTransactions = useMemo(() => {
    if (selectedCategoryIds === null) return expenseTransactions;
    return expenseTransactions.filter((txn) => {
      if (selectedIds.has(txn.id)) return true;
      const catId = txn.category?.id ?? '__uncategorized__';
      return selectedCategoryIds.includes(catId);
    });
  }, [expenseTransactions, selectedCategoryIds, selectedIds]);

  // Apply text search filter (pin selected items so they stay visible)
  const searchedTransactions = useMemo(() => {
    if (!searchQuery.trim()) return filteredTransactions;
    const q = searchQuery.toLowerCase();
    return filteredTransactions.filter((txn) => selectedIds.has(txn.id) || matchesSearch(txn, q));
  }, [filteredTransactions, searchQuery, selectedIds]);

  // Split into active and skipped
  const skippedTransactionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of matches) {
      if (m.skipped) ids.add(m.originalTransactionId);
    }
    return ids;
  }, [matches]);

  const activeTransactions = useMemo(
    () => searchedTransactions.filter((txn) => !skippedTransactionIds.has(txn.id)),
    [searchedTransactions, skippedTransactionIds]
  );

  const skippedTransactions = useMemo(
    () => searchedTransactions.filter((txn) => skippedTransactionIds.has(txn.id)),
    [searchedTransactions, skippedTransactionIds]
  );

  const tally = useRefundablesTally(searchedTransactions, matches);

  const viewCategoryCount = useMemo(() => {
    const catIds = new Set<string>();
    for (const txn of expenseTransactions) {
      catIds.add(txn.category?.id ?? '__uncategorized__');
    }
    return catIds.size;
  }, [expenseTransactions]);

  return {
    activeTransactions,
    skippedTransactions,
    expenseTransactions,
    filteredTransactions,
    tally,
    viewCategoryCount,
  };
}

function isOrphanInView(
  match: RefundablesMatch,
  viewTagIdSet: Set<string>,
  viewCatIdSet: Set<string> | null,
  dateRange: { startDate: string | null; endDate: string | null }
): boolean {
  const txn = match.transactionData;
  if (!txn) return false;
  const matchesTags = viewTagIdSet.size > 0 && txn.tags.some((t) => viewTagIdSet.has(t.id));
  const matchesCat =
    viewCatIdSet !== null && txn.category?.id != null && viewCatIdSet.has(txn.category.id);
  if (!matchesTags && !matchesCat) return false;
  if (dateRange.startDate && txn.date < dateRange.startDate) return false;
  if (dateRange.endDate && txn.date > dateRange.endDate) return false;
  return true;
}

function matchesSearch(txn: Transaction, q: string): boolean {
  const merchant = (txn.merchant?.name ?? txn.originalName).toLowerCase();
  const category = (txn.category?.name ?? '').toLowerCase();
  const account = (txn.account?.displayName ?? '').toLowerCase();
  const notes = (txn.notes ?? '').toLowerCase();
  const tags = txn.tags.map((t) => t.name.toLowerCase()).join(' ');
  const amount = Math.abs(txn.amount).toFixed(2);
  const date = new Date(txn.date + 'T00:00:00')
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toLowerCase();
  return (
    merchant.includes(q) ||
    category.includes(q) ||
    account.includes(q) ||
    notes.includes(q) ||
    tags.includes(q) ||
    amount.includes(q) ||
    date.includes(q)
  );
}
