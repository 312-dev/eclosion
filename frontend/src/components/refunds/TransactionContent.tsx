import { SearchX } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { TallyBar } from './TallyBar';
import { TransactionSearchBar } from './TransactionSearchBar';
import { TransactionList } from './TransactionList';
import { SkippedSection } from './SkippedSection';
import type {
  Transaction,
  RefundsMatch,
  RefundsConfig,
  RefundsTally,
  CreditGroup,
} from '../../types/refunds';

interface TransactionContentProps {
  readonly transactionsLoading: boolean;
  readonly filteredTransactions: Transaction[];
  readonly activeTransactions: Transaction[];
  readonly skippedTransactions: Transaction[];
  readonly matches: RefundsMatch[];
  readonly config: RefundsConfig | undefined;
  readonly tally: RefundsTally;
  readonly searchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly searchTrailing?: React.ReactNode;
  readonly selectedIds: Set<string>;
  readonly onToggleSelect: (txn: Transaction, shiftKey: boolean) => void;
  readonly onToggleCreditGroup: (groupId: string) => void;
  readonly onSelectAll: () => void;
  readonly onDeselectAll: () => void;
  readonly showSkipped: boolean;
  readonly onToggleSkipped: () => void;
  readonly creditGroups: CreditGroup[];
  readonly onScrollToTransaction: (id: string) => void;
  readonly onScrollToCredit: (id: string) => void;
  /** Full transaction list for credit group nested lookups (includes hidden transactions). */
  readonly creditGroupTransactions?: Transaction[] | undefined;
  /** IDs of transactions that pass all filters (view + category + search). */
  readonly filteredTransactionIds?: ReadonlySet<string> | undefined;
}

export function TransactionContent({
  transactionsLoading,
  filteredTransactions,
  activeTransactions,
  skippedTransactions,
  matches,
  config,
  tally,
  searchQuery,
  onSearchChange,
  searchTrailing,
  selectedIds,
  onToggleSelect,
  onToggleCreditGroup,
  onSelectAll,
  onDeselectAll,
  showSkipped,
  onToggleSkipped,
  creditGroups,
  onScrollToTransaction,
  onScrollToCredit,
  creditGroupTransactions,
  filteredTransactionIds,
}: TransactionContentProps): React.ReactNode {
  if (transactionsLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-lg animate-pulse"
            style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
          />
        ))}
      </div>
    );
  }
  if (filteredTransactions.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="w-full h-full" />}
        title="No transactions found"
        description="No transactions match the selected tags, date range, and categories."
        size="md"
      />
    );
  }
  return (
    <>
      <div
        className="sm:rounded-lg sm:border border-(--monarch-border) overflow-hidden section-enter"
        style={{ backgroundColor: 'var(--monarch-bg-card)' }}
      >
        <TallyBar tally={tally} />
        <TransactionSearchBar
          value={searchQuery}
          onChange={onSearchChange}
          transactionCount={tally.transactionCount}
          trailing={searchTrailing}
        />
        {activeTransactions.length > 0 ? (
          <TransactionList
            transactions={activeTransactions}
            matches={matches}
            agingWarningDays={config?.agingWarningDays ?? 30}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onToggleCreditGroup={onToggleCreditGroup}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
            creditGroups={creditGroups}
            onScrollToTransaction={onScrollToTransaction}
            onScrollToCredit={onScrollToCredit}
            creditGroupTransactions={creditGroupTransactions}
            filteredTransactionIds={filteredTransactionIds}
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
        onToggleSelect={onToggleSelect}
        onSelectAll={onSelectAll}
        onDeselectAll={onDeselectAll}
        isOpen={showSkipped}
        onToggle={onToggleSkipped}
      />
    </>
  );
}
