import { useState, useMemo, useCallback } from 'react';
import { Undo2 } from 'lucide-react';
import { ToolPageHeader } from '../ui/ToolPageHeader';
import { EmptyState, EmptyStateIcon } from '../ui/EmptyState';
import { SkeletonToolHeader, SkeletonTabs } from '../ui/SkeletonLayouts';
import { Button } from '../ui/Button';
import { ViewTabs } from './ViewTabs';
import { RefundsModals } from './RefundsModals';
import { DateRangeFilter, getDateRangeFromPreset } from './DateRangeFilter';
import { CategoryFilter } from './CategoryFilter';
import { TransactionContent } from './TransactionContent';
import { SelectionActionBar } from './SelectionActionBar';
import { useRefundsViewActions } from './useRefundsViewActions';
import { useTransactionPipeline } from './useTransactionPipeline';
import { useRefundsMatchHandlers } from './useRefundsMatchHandlers';
import { useRefundsSelection } from './useRefundsSelection';
import { useExpectedRefundFlow } from './useExpectedRefundFlow';
import { usePageTitle } from '../../hooks/usePageTitle';
import { buildRefundsExportHtml, printHtml } from '../../utils/refundsExport';
import {
  useRefundsViewsQuery,
  useRefundsTagsQuery,
  useRefundsConfigQuery,
  useRefundsTransactionsQuery,
  useRefundsMatchesQuery,
  useReorderRefundsViewsMutation,
  useRefundsPendingCountQuery,
} from '../../api/queries/refundsQueries';
import type { MatchActionParams } from './useRefundsMatchHandlers';
import type { Transaction, DateRangeFilter as DateRangeFilterType } from '../../types/refunds';

const DEFAULT_DATE_RANGE: DateRangeFilterType = {
  preset: 'all_time',
  ...getDateRangeFromPreset('all_time'),
};

export function RefundsTab() {
  usePageTitle('Refunds');
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilterType>(DEFAULT_DATE_RANGE);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[] | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [matchingTransaction, setMatchingTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSkipped, setShowSkipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchCount, setBatchCount] = useState(0);

  const { data: unsortedViews = [], isLoading: viewsLoading } = useRefundsViewsQuery();
  const views = useMemo(
    () => [...unsortedViews].sort((a, b) => a.sortOrder - b.sortOrder),
    [unsortedViews]
  );
  const { data: tags = [], isLoading: tagsLoading } = useRefundsTagsQuery();
  const { data: config } = useRefundsConfigQuery();
  const { data: matches = [] } = useRefundsMatchesQuery();
  const { data: pendingCountData } = useRefundsPendingCountQuery();
  const activeView = useMemo(() => {
    if (activeViewId) return views.find((v) => v.id === activeViewId) ?? null;
    return views.length > 0 ? views[0] : null;
  }, [views, activeViewId]);

  const effectiveViewId = activeView?.id ?? null;
  const tagIds = useMemo(() => activeView?.tagIds ?? [], [activeView?.tagIds]);
  const viewCategoryIds = activeView?.categoryIds ?? null;

  const { data: transactions = [], isLoading: transactionsLoading } = useRefundsTransactionsQuery(
    tagIds,
    dateRange.startDate,
    dateRange.endDate,
    viewCategoryIds
  );
  const viewActions = useRefundsViewActions({
    views,
    effectiveViewId,
    onViewDeleted: () => setActiveViewId(null),
  });

  const reorderMutation = useReorderRefundsViewsMutation();
  const handleReorderViews = useCallback(
    (ids: string[]) => reorderMutation.mutate(ids),
    [reorderMutation]
  );
  const {
    handleMatch,
    handleBatchMatchAll,
    handleBatchExpectedRefundAll,
    handleSkip,
    handleUnmatch,
    handleDirectSkip,
    handleDirectUnmatch,
    handleRestore,
    existingMatch,
    matchPending,
  } = useRefundsMatchHandlers({ matchingTransaction, setMatchingTransaction, matches, tagIds });
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
    handleSelectAll,
    handleDeselectAll,
    handleBatchSkip,
    handleBatchUnmatch,
    handleBatchRestore,
    handleBatchClearExpected,
    clearSelection,
  } = useRefundsSelection({
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
  const selectedSkippedTransactions = useMemo(
    () => skippedTransactions.filter((txn) => selectedIds.has(txn.id)),
    [skippedTransactions, selectedIds]
  );
  const expectedFlow = useExpectedRefundFlow({
    batchTransactions,
    handleBatchExpectedRefundAll,
    handleBatchClearExpected,
    setSelectedIds,
  });
  const handleExport = useCallback(() => {
    const allSelected = [...batchTransactions, ...selectedSkippedTransactions];
    if (allSelected.length === 0) return;
    printHtml(buildRefundsExportHtml(allSelected, matches));
  }, [batchTransactions, selectedSkippedTransactions, matches]);
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
      <div className={`flex-1 overflow-y-auto p-6${selectedIds.size > 0 ? ' pb-28' : ''}`}>
        <ToolPageHeader
          icon={<Undo2 size={24} />}
          title="Refunds"
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
              <TransactionContent
                transactionsLoading={transactionsLoading}
                filteredTransactions={filteredTransactions}
                activeTransactions={activeTransactions}
                skippedTransactions={skippedTransactions}
                expenseTransactions={expenseTransactions}
                matches={matches}
                config={config}
                tally={tally}
                pendingCount={pendingCountData?.viewCounts[effectiveViewId ?? ''] ?? 0}
                selectedCategoryIds={selectedCategoryIds}
                onResetCategoryFilter={() => setSelectedCategoryIds(null)}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                showSkipped={showSkipped}
                onToggleSkipped={() => setShowSkipped((prev) => !prev)}
              />
            </div>
          </>
        )}
      </div>
      <RefundsModals
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
        expectedTransaction={expectedFlow.expectedTransaction}
        onCloseExpected={expectedFlow.handleCloseExpected}
        onExpectedRefund={expectedFlow.handleModalExpectedRefund}
        expectedBatchCount={expectedFlow.expectedBatchCount}
        showClearExpectedConfirm={expectedFlow.showClearExpectedConfirm}
        onCloseClearExpected={expectedFlow.handleCloseClearExpected}
        onConfirmClearExpected={expectedFlow.handleConfirmClearExpected}
        clearExpectedCount={selectedIds.size}
        clearExpectedPending={matchPending}
        showSettingsModal={showSettingsModal}
        onCloseSettings={() => setShowSettingsModal(false)}
      />
      {selectedIds.size > 0 && (
        <SelectionActionBar
          count={selectedIds.size}
          selectedAmount={selectedAmount}
          selectionState={selectionState}
          onMatch={handleStartBatchMatch}
          onExpectedRefund={expectedFlow.handleStartBatchExpected}
          onSkip={handleBatchSkip}
          onUnmatch={handleBatchUnmatch}
          onRestore={handleBatchRestore}
          onClearExpected={expectedFlow.handleStartClearExpected}
          onClear={clearSelection}
          onExport={handleExport}
        />
      )}
    </div>
  );
}
