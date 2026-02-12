/**
 * TransactionList
 *
 * Groups transactions and credit groups by date and renders them in a list
 * with date headers. Includes a header row with a tri-state select-all checkbox.
 */

import { useMemo } from 'react';
import { Check, Minus } from 'lucide-react';
import { TransactionRow } from './TransactionRow';
import { CreditGroupRow } from './CreditGroupRow';
import type { Transaction, RefundsMatch, CreditGroup } from '../../types/refunds';

interface TransactionListProps {
  readonly transactions: Transaction[];
  readonly matches: RefundsMatch[];
  readonly agingWarningDays: number;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleSelect: (transaction: Transaction, shiftKey: boolean) => void;
  readonly onToggleCreditGroup?: (groupId: string) => void;
  readonly onSelectAll: () => void;
  readonly onDeselectAll: () => void;
  readonly creditGroups?: CreditGroup[];
  readonly onScrollToTransaction?: (id: string) => void;
  readonly onScrollToCredit?: (id: string) => void;
}

type DateItem =
  | { kind: 'transaction'; transaction: Transaction }
  | { kind: 'credit'; group: CreditGroup };

interface DateGroup {
  date: string;
  label: string;
  total: number;
  items: DateItem[];
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupByDate(transactions: Transaction[], creditGroups: CreditGroup[]): DateGroup[] {
  const groups = new Map<string, DateItem[]>();

  for (const txn of transactions) {
    const existing = groups.get(txn.date);
    if (existing) {
      existing.push({ kind: 'transaction', transaction: txn });
    } else {
      groups.set(txn.date, [{ kind: 'transaction', transaction: txn }]);
    }
  }

  for (const cg of creditGroups) {
    const existing = groups.get(cg.date);
    if (existing) {
      existing.push({ kind: 'credit', group: cg });
    } else {
      groups.set(cg.date, [{ kind: 'credit', group: cg }]);
    }
  }

  // Sort by date descending
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      label: formatDateHeader(date),
      total: items.reduce((sum, item) => {
        if (item.kind === 'transaction') return sum + item.transaction.amount;
        return sum;
      }, 0),
      items,
    }));
}

type CheckboxState = 'none' | 'some' | 'all';

function getHeaderCheckboxState(
  transactions: Transaction[],
  selectedIds: ReadonlySet<string>
): CheckboxState {
  if (selectedIds.size === 0) return 'none';
  const selectedCount = transactions.filter((t) => selectedIds.has(t.id)).length;
  if (selectedCount === 0) return 'none';
  if (selectedCount === transactions.length) return 'all';
  return 'some';
}

/** Desktop-only grid matching TransactionRow's 6-column layout at md+. */
const HEADER_GRID_CLASSES =
  'hidden md:grid gap-x-3 grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_130px]';

function getSelectAllCheckboxClassName(state: CheckboxState): string {
  if (state === 'none')
    return 'border-(--monarch-text-muted)/40 hover:border-(--monarch-text-muted)';
  return 'bg-(--monarch-orange) border-(--monarch-orange) text-white';
}

interface MatchInfo {
  matchType: 'matched' | 'expected';
  matchDate: string | null;
  matchAmount: number | null;
  creditGroupId: string;
}

/** Build a map from original transaction ID → match info for icon display. */
function buildMatchInfoMap(
  matches: RefundsMatch[],
  creditGroups: CreditGroup[]
): Map<string, MatchInfo> {
  const map = new Map<string, MatchInfo>();

  // Index matches by originalTransactionId for per-txn amount lookup
  const matchByOrigId = new Map<string, RefundsMatch>();
  for (const m of matches) matchByOrigId.set(m.originalTransactionId, m);

  for (const group of creditGroups) {
    for (const origId of group.originalTransactionIds) {
      const m = matchByOrigId.get(origId);
      map.set(origId, {
        matchType: group.type === 'refund' ? 'matched' : 'expected',
        matchDate: group.date,
        matchAmount: m?.expectedAmount ?? m?.refundAmount ?? null,
        creditGroupId: group.id,
      });
    }
  }
  // For matches without credit groups (shouldn't happen, but defensive)
  for (const m of matches) {
    if (map.has(m.originalTransactionId)) continue;
    if (m.skipped) continue;
    if (m.expectedRefund) {
      map.set(m.originalTransactionId, {
        matchType: 'expected',
        matchDate: m.expectedDate,
        matchAmount: m.expectedAmount,
        creditGroupId: `expected-${m.expectedDate ?? 'none'}-${m.expectedAccountId ?? 'none'}`,
      });
    } else if (m.refundTransactionId) {
      map.set(m.originalTransactionId, {
        matchType: 'matched',
        matchDate: m.refundDate,
        matchAmount: m.refundAmount,
        creditGroupId: m.refundTransactionId,
      });
    }
  }
  return map;
}

export function TransactionList({
  transactions,
  matches,
  agingWarningDays,
  selectedIds,
  onToggleSelect,
  onToggleCreditGroup,
  onSelectAll,
  onDeselectAll,
  creditGroups = [],
  onScrollToTransaction,
  onScrollToCredit,
}: TransactionListProps): React.JSX.Element | null {
  const matchesByOriginalId = useMemo(() => {
    const map = new Map<string, RefundsMatch>();
    for (const m of matches) {
      map.set(m.originalTransactionId, m);
    }
    return map;
  }, [matches]);

  /** Per-match effective refund amount, split evenly when a refund is shared. */
  const effectiveRefundMap = useMemo(() => {
    const refundShareCount = new Map<string, number>();
    for (const m of matches) {
      if (!m.skipped && m.refundTransactionId) {
        refundShareCount.set(
          m.refundTransactionId,
          (refundShareCount.get(m.refundTransactionId) ?? 0) + 1
        );
      }
    }
    const map = new Map<string, number>();
    for (const m of matches) {
      if (!m.skipped && m.refundTransactionId && m.refundAmount != null) {
        const count = refundShareCount.get(m.refundTransactionId) ?? 1;
        map.set(m.originalTransactionId, m.refundAmount / count);
      }
    }
    return map;
  }, [matches]);

  const matchInfoMap = useMemo(
    () => buildMatchInfoMap(matches, creditGroups),
    [matches, creditGroups]
  );

  const dateGroups = useMemo(
    () => groupByDate(transactions, creditGroups),
    [transactions, creditGroups]
  );

  const checkboxState = useMemo(
    () => getHeaderCheckboxState(transactions, selectedIds),
    [transactions, selectedIds]
  );

  if (transactions.length === 0 && creditGroups.length === 0) {
    return null;
  }

  const handleHeaderCheckboxClick = checkboxState === 'none' ? onSelectAll : onDeselectAll;
  const headerCheckboxLabel =
    checkboxState === 'none' ? 'Select all transactions' : 'Deselect all transactions';

  const scrollToCreditFn = onScrollToCredit ?? null;
  const scrollToTransactionFn = onScrollToTransaction;

  return (
    <div className="divide-y divide-(--monarch-border)">
      {/* Column header — desktop */}
      <div className={`items-center px-4 py-2 bg-(--monarch-bg-page) ${HEADER_GRID_CLASSES}`}>
        <div className="flex items-center justify-center">
          <button
            type="button"
            className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${getSelectAllCheckboxClassName(checkboxState)}`}
            aria-label={headerCheckboxLabel}
            onClick={handleHeaderCheckboxClick}
          >
            {checkboxState === 'all' && <Check size={14} />}
            {checkboxState === 'some' && <Minus size={14} />}
          </button>
        </div>
        <div /> {/* icon column spacer */}
        <span className="text-xs font-medium text-(--monarch-text-muted)">Name</span>
        <span className="text-xs font-medium text-(--monarch-text-muted)">Category</span>
        <span className="text-xs font-medium text-(--monarch-text-muted)">Account</span>
        <span className="text-xs font-medium text-(--monarch-text-muted) text-right">Amount</span>
      </div>

      {dateGroups.map((group) => (
        <div key={group.date}>
          <div className="flex items-center justify-between px-4 py-2 text-xs font-medium uppercase tracking-wide text-(--monarch-text-muted) bg-(--monarch-bg-page)">
            <span>{group.label}</span>
            <span className="tabular-nums">
              $
              {Math.abs(group.total).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          {group.items.map((item) => {
            if (item.kind === 'credit') {
              return (
                <div key={item.group.id} data-credit-id={item.group.id}>
                  <CreditGroupRow
                    group={item.group}
                    transactions={transactions}
                    onScrollToTransaction={scrollToTransactionFn ?? (() => {})}
                    isSelected={selectedIds.has(item.group.id)}
                    onToggleSelect={onToggleCreditGroup ?? (() => {})}
                  />
                </div>
              );
            }
            const txn = item.transaction;
            const matchInfo = matchInfoMap.get(txn.id);
            return (
              <div key={txn.id} data-transaction-id={txn.id}>
                <TransactionRow
                  transaction={txn}
                  match={matchesByOriginalId.get(txn.id)}
                  effectiveRefundAmount={effectiveRefundMap.get(txn.id)}
                  agingWarningDays={agingWarningDays}
                  isSelected={selectedIds.has(txn.id)}
                  onToggleSelect={onToggleSelect}
                  matchType={matchInfo?.matchType ?? null}
                  matchDate={matchInfo?.matchDate ?? null}
                  matchAmount={matchInfo?.matchAmount ?? null}
                  creditGroupId={matchInfo?.creditGroupId ?? null}
                  onScrollToCredit={scrollToCreditFn}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
