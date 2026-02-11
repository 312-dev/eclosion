/**
 * RefundablesTab — Main container for the Refundables feature.
 * Manages saved views, filtering, transaction list, refund matching, and tally bar.
 */

import { useState, useMemo, useCallback } from 'react';
import { Undo2, SearchX } from 'lucide-react';
import { ToolPageHeader } from '../ui/ToolPageHeader';
import { EmptyState, EmptyStateIcon } from '../ui/EmptyState';
import { SkeletonToolHeader, SkeletonTabs } from '../ui/SkeletonLayouts';
import { Button } from '../ui/Button';
import { ViewTabs } from './ViewTabs';
import { RefundablesModals } from './RefundablesModals';
import { DateRangeFilter, getDateRangeFromPreset } from './DateRangeFilter';
import { CategoryFilter } from './CategoryFilter';
import { TransactionList } from './TransactionList';
import { TransactionSearchBar } from './TransactionSearchBar';
import { TallyBar } from './TallyBar';
import { SkippedSection } from './SkippedSection';
import { SelectionActionBar } from './SelectionActionBar';
import { useRefundablesViewActions } from './useRefundablesViewActions';
import { useTransactionPipeline } from './useTransactionPipeline';
import { useRefundablesMatchHandlers } from './useRefundablesMatchHandlers';
import { useRefundablesSelection } from './useRefundablesSelection';
import { usePageTitle } from '../../hooks/usePageTitle';
import {
  useRefundablesViewsQuery,
  useRefundablesTagsQuery,
  useRefundablesConfigQuery,
  useRefundablesTransactionsQuery,
  useRefundablesMatchesQuery,
  useReorderRefundablesViewsMutation,
  useRefundablesPendingCountQuery,
} from '../../api/queries/refundablesQueries';
import type { MatchActionParams } from './useRefundablesMatchHandlers';
import type { Transaction, DateRangeFilter as DateRangeFilterType } from '../../types/refundables';

const DEFAULT_DATE_RANGE: DateRangeFilterType = {
  preset: 'all_time',
  ...getDateRangeFromPreset('all_time'),
};

export function RefundablesTab() {
  usePageTitle('Refundables');
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilterType>(DEFAULT_DATE_RANGE);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[] | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [matchingTransaction, setMatchingTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSkipped, setShowSkipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchCount, setBatchCount] = useState(0);

  const { data: unsortedViews = [], isLoading: viewsLoading } = useRefundablesViewsQuery();
  const views = useMemo(
    () => [...unsortedViews].sort((a, b) => a.sortOrder - b.sortOrder),
    [unsortedViews]
  );
  const { data: tags = [], isLoading: tagsLoading } = useRefundablesTagsQuery();
  const { data: config } = useRefundablesConfigQuery();
  const { data: matches = [] } = useRefundablesMatchesQuery();
  const { data: pendingCountData } = useRefundablesPendingCountQuery();
  const activeView = useMemo(() => {
    if (activeViewId) return views.find((v) => v.id === activeViewId) ?? null;
    return views.length > 0 ? views[0] : null;
  }, [views, activeViewId]);

  const effectiveViewId = activeView?.id ?? null;
  const tagIds = useMemo(() => activeView?.tagIds ?? [], [activeView?.tagIds]);
  const viewCategoryIds = activeView?.categoryIds ?? null;

  const { data: transactions = [], isLoading: transactionsLoading } =
    useRefundablesTransactionsQuery(
      tagIds,
      dateRange.startDate,
      dateRange.endDate,
      viewCategoryIds
    );
  const viewActions = useRefundablesViewActions({
    views,
    effectiveViewId,
    onViewDeleted: () => setActiveViewId(null),
  });

  const reorderMutation = useReorderRefundablesViewsMutation();
  const handleReorderViews = useCallback(
    (ids: string[]) => reorderMutation.mutate(ids),
    [reorderMutation]
  );
  const {
    handleMatch,
    handleBatchMatchAll,
    handleSkip,
    handleUnmatch,
    handleDirectSkip,
    handleDirectUnmatch,
    handleRestore,
    existingMatch,
    matchPending,
  } = useRefundablesMatchHandlers({ matchingTransaction, setMatchingTransaction, matches, tagIds });
  const {
    activeTransactions,
    skippedTransactions,
    expenseTransactions,
    filteredTransactions,
    tally,
    viewCategoryCount,
  } = useTransactionPipeline({
    transactions,
    matches,
    tagIds,
    viewCategoryIds,
    dateRange,
    selectedCategoryIds,
    searchQuery,
    selectedIds,
  });
  const {
    selectedAmount,
    selectionState,
    handleToggleSelect,
    handleBatchSkip,
    handleBatchUnmatch,
    handleBatchRestore,
    clearSelection,
  } = useRefundablesSelection({
    selectedIds,
    setSelectedIds,
    activeTransactions,
    skippedTransactions,
    matches,
    handleDirectSkip,
    handleDirectUnmatch,
    handleRestore,
  });

  const batchTransactions = useMemo(
    () => activeTransactions.filter((txn) => selectedIds.has(txn.id)),
    [activeTransactions, selectedIds]
  );
  const handleStartBatchMatch = useCallback(() => {
    const first = batchTransactions[0];
    if (!first) return;
    setBatchCount(batchTransactions.length);
    setMatchingTransaction(first);
  }, [batchTransactions]);
  const handleModalBatchMatch = useCallback(
    async (params: MatchActionParams) => {
      await handleBatchMatchAll(batchTransactions, params);
      setBatchCount(0);
      setSelectedIds(new Set());
    },
    [batchTransactions, handleBatchMatchAll, setSelectedIds]
  );

  const handleCloseMatch = useCallback(() => {
    setMatchingTransaction(null);
    setBatchCount(0);
  }, []);

  const resetFiltersAndSelection = useCallback(() => {
    setSelectedCategoryIds(null);
    setSearchQuery('');
    clearSelection();
  }, [clearSelection]);
  const handleDateRangeChange = useCallback(
    (r: DateRangeFilterType) => {
      setDateRange(r);
      resetFiltersAndSelection();
    },
    [resetFiltersAndSelection]
  );
  const handleSelectView = useCallback(
    (id: string | null) => {
      setActiveViewId(id);
      resetFiltersAndSelection();
    },
    [resetFiltersAndSelection]
  );

  if (viewsLoading)
    return (
      <div className="p-6">
        <SkeletonToolHeader />
        <SkeletonTabs />
      </div>
    );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <ToolPageHeader
          icon={<Undo2 size={24} />}
          title="Refundables"
          description="Track purchases awaiting refunds and reimbursements"
          onSettingsClick={() => setShowSettingsModal(true)}
        />
        {views.length === 0 ? (
          <EmptyState
            icon={<EmptyStateIcon />}
            title="No saved views yet"
            description="Create a view to track transactions by tag. Tag transactions in Monarch, then filter them here to track refunds."
            action={
              <Button onClick={() => viewActions.setShowCreateModal(true)}>
                + Create First View
              </Button>
            }
            size="lg"
          />
        ) : (
          <>
            <ViewTabs
              views={views}
              activeViewId={effectiveViewId}
              viewCounts={pendingCountData?.viewCounts}
              onSelectView={handleSelectView}
              onAddView={() => viewActions.setShowCreateModal(true)}
              onEditView={viewActions.handleEditView}
              onReorder={handleReorderViews}
              trailing={
                <>
                  <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
                  {viewCategoryCount > 1 && (
                    <CategoryFilter
                      transactions={expenseTransactions}
                      selectedCategoryIds={selectedCategoryIds}
                      onChange={setSelectedCategoryIds}
                    />
                  )}
                </>
              }
            />
            <div className="mt-4">
              {transactionsLoading && (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-lg animate-pulse"
                      style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
                    />
                  ))}
                </div>
              )}
              {!transactionsLoading && filteredTransactions.length === 0 && (
                <EmptyState
                  icon={<SearchX className="w-full h-full" />}
                  title="No transactions found"
                  description="No transactions match the selected tags, date range, and categories."
                  size="md"
                />
              )}
              {!transactionsLoading && filteredTransactions.length > 0 && (
                <>
                  <div
                    className="rounded-lg border border-(--monarch-border) overflow-hidden"
                    style={{ backgroundColor: 'var(--monarch-bg-card)' }}
                  >
                    <TallyBar
                      tally={tally}
                      totalCount={
                        pendingCountData?.viewCounts[effectiveViewId ?? ''] ??
                        expenseTransactions.length
                      }
                      onResetFilter={
                        selectedCategoryIds === null
                          ? undefined
                          : () => setSelectedCategoryIds(null)
                      }
                    />
                    <TransactionSearchBar value={searchQuery} onChange={setSearchQuery} />
                    {activeTransactions.length > 0 ? (
                      <TransactionList
                        transactions={activeTransactions}
                        matches={matches}
                        agingWarningDays={config?.agingWarningDays ?? 30}
                        selectedIds={selectedIds}
                        onToggleSelect={handleToggleSelect}
                      />
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-(--monarch-text-muted)">
                        All transactions have been skipped
                      </div>
                    )}
                  </div>
                  <SkippedSection
                    transactions={skippedTransactions}
                    matches={matches}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    isOpen={showSkipped}
                    onToggle={() => setShowSkipped((prev) => !prev)}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
      <RefundablesModals
        viewActions={viewActions}
        tags={tags}
        tagsLoading={tagsLoading}
        matchingTransaction={matchingTransaction}
        onCloseMatch={handleCloseMatch}
        config={config}
        existingMatch={existingMatch}
        onMatch={batchCount > 1 ? handleModalBatchMatch : handleMatch}
        onSkip={handleSkip}
        onUnmatch={handleUnmatch}
        matchPending={matchPending}
        batchCount={batchCount}
        batchAmount={selectedAmount}
        batchTransactions={batchTransactions}
        showSettingsModal={showSettingsModal}
        onCloseSettings={() => setShowSettingsModal(false)}
      />
      {selectedIds.size > 0 && (
        <SelectionActionBar
          count={selectedIds.size}
          selectedAmount={selectedAmount}
          selectionState={selectionState}
          onMatch={handleStartBatchMatch}
          onSkip={handleBatchSkip}
          onUnmatch={handleBatchUnmatch}
          onRestore={handleBatchRestore}
          onClear={clearSelection}
        />
      )}
    </div>
  );
}
