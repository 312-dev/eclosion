/**
 * RefundablesTab
 *
 * Main container for the Refundables feature. Manages saved views,
 * date range filtering, category filtering, transaction list, refund matching,
 * and tally bar.
 */

import { useState, useMemo, useCallback } from 'react';
import { Undo2, ChevronDown, SearchX } from 'lucide-react';
import { ToolPageHeader } from '../ui/ToolPageHeader';
import { EmptyState, EmptyStateIcon } from '../ui/EmptyState';
import { SkeletonToolHeader, SkeletonTabs } from '../ui/SkeletonLayouts';
import { Button } from '../ui/Button';
import { ViewTabs } from './ViewTabs';
import { ViewConfigModal } from './ViewConfigModal';
import { DeleteViewConfirmModal } from './DeleteViewConfirmModal';
import { DateRangeFilter, getDateRangeFromPreset } from './DateRangeFilter';
import { CategoryFilter } from './CategoryFilter';
import { TransactionList } from './TransactionList';
import { TransactionSearchBar } from './TransactionSearchBar';
import { RefundMatchModal } from './RefundMatchModal';
import { TallyBar } from './TallyBar';
import { ToolSettingsModal } from '../ui/ToolSettingsModal';
import { useRefundablesViewActions } from './useRefundablesViewActions';
import { useTransactionPipeline } from './useTransactionPipeline';
import { useRefundablesMatchHandlers } from './useRefundablesMatchHandlers';
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
import type { Transaction, DateRangeFilter as DateRangeFilterType } from '../../types/refundables';

const DEFAULT_DATE_RANGE: DateRangeFilterType = {
  preset: 'all_time',
  ...getDateRangeFromPreset('all_time'),
};

export function RefundablesTab() {
  usePageTitle('Refundables');

  // UI state
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeFilterType>(DEFAULT_DATE_RANGE);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[] | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [matchingTransaction, setMatchingTransaction] = useState<Transaction | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: unsortedViews = [], isLoading: viewsLoading } = useRefundablesViewsQuery();
  const views = useMemo(
    () => [...unsortedViews].sort((a, b) => a.sortOrder - b.sortOrder),
    [unsortedViews]
  );
  const { data: tags = [], isLoading: tagsLoading } = useRefundablesTagsQuery();
  const { data: config } = useRefundablesConfigQuery();
  const { data: matches = [] } = useRefundablesMatchesQuery();
  const { data: pendingCountData } = useRefundablesPendingCountQuery();

  // Active view
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

  // View CRUD actions
  const viewActions = useRefundablesViewActions({
    views,
    effectiveViewId,
    onViewDeleted: () => setActiveViewId(null),
  });

  const reorderViewsMutation = useReorderRefundablesViewsMutation();
  const handleReorderViews = useCallback(
    (viewIds: string[]) => reorderViewsMutation.mutate(viewIds),
    [reorderViewsMutation]
  );

  const handleDateRangeChange = useCallback((newDateRange: DateRangeFilterType) => {
    setDateRange(newDateRange);
    setSelectedCategoryIds(null);
    setSearchQuery('');
  }, []);

  const handleSelectView = useCallback((viewId: string | null) => {
    setActiveViewId(viewId);
    setSelectedCategoryIds(null);
    setSearchQuery('');
  }, []);

  // Transaction pipeline
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
  });

  // Match handlers
  const {
    handleMatch,
    handleSkip,
    handleUnmatch,
    handleDirectSkip,
    handleRestore,
    existingMatch,
    matchPending,
  } = useRefundablesMatchHandlers({ matchingTransaction, setMatchingTransaction, matches, tagIds });

  if (viewsLoading) {
    return (
      <div className="p-6">
        <SkeletonToolHeader />
        <SkeletonTabs />
      </div>
    );
  }

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
                        onCheckboxClick={setMatchingTransaction}
                        onSkipClick={handleDirectSkip}
                        onRestoreClick={handleRestore}
                      />
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-(--monarch-text-muted)">
                        All transactions have been skipped
                      </div>
                    )}
                  </div>
                  {skippedTransactions.length > 0 && (
                    <div className="mt-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-(--monarch-text-muted) hover:text-(--monarch-text-dark) transition-colors cursor-pointer rounded-lg hover:bg-(--monarch-bg-hover)"
                        onClick={() => setShowSkipped((prev) => !prev)}
                        aria-expanded={showSkipped}
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${showSkipped ? 'rotate-0' : '-rotate-90'}`}
                        />
                        <span>
                          {skippedTransactions.length} skipped transaction
                          {skippedTransactions.length === 1 ? '' : 's'}
                        </span>
                      </button>
                      {showSkipped && (
                        <div
                          className="mt-1 rounded-lg border border-(--monarch-border) overflow-hidden opacity-75"
                          style={{ backgroundColor: 'var(--monarch-bg-card)' }}
                        >
                          <TransactionList
                            transactions={skippedTransactions}
                            matches={matches}
                            agingWarningDays={0}
                            onCheckboxClick={setMatchingTransaction}
                            onSkipClick={handleDirectSkip}
                            onRestoreClick={handleRestore}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
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
          onClose={() => setMatchingTransaction(null)}
          transaction={matchingTransaction}
          config={config}
          existingMatch={existingMatch}
          onMatch={handleMatch}
          onSkip={handleSkip}
          onUnmatch={handleUnmatch}
          matching={matchPending}
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
        <ToolSettingsModal
          isOpen={true}
          onClose={() => setShowSettingsModal(false)}
          tool="refundables"
        />
      )}
    </div>
  );
}
