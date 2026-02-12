/**
 * TransactionList
 *
 * Groups transactions by date and renders them in a list with date headers.
 */

import { useMemo } from 'react';
import { TransactionRow } from './TransactionRow';
import type { Transaction, RefundablesMatch } from '../../types/refundables';

interface TransactionListProps {
  readonly transactions: Transaction[];
  readonly matches: RefundablesMatch[];
  readonly agingWarningDays: number;
  readonly selectedIds: ReadonlySet<string>;
  readonly onToggleSelect: (transaction: Transaction) => void;
}

interface DateGroup {
  date: string;
  label: string;
  total: number;
  transactions: Transaction[];
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function groupByDate(transactions: Transaction[]): DateGroup[] {
  const groups = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    const date = txn.date;
    const existing = groups.get(date);
    if (existing) {
      existing.push(txn);
    } else {
      groups.set(date, [txn]);
    }
  }

  // Sort by date descending
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, txns]) => ({
      date,
      label: formatDateHeader(date),
      total: txns.reduce((sum, t) => sum + t.amount, 0),
      transactions: txns,
    }));
}

export function TransactionList({
  transactions,
  matches,
  agingWarningDays,
  selectedIds,
  onToggleSelect,
}: TransactionListProps) {
  const matchesByOriginalId = useMemo(() => {
    const map = new Map<string, RefundablesMatch>();
    for (const m of matches) {
      map.set(m.originalTransactionId, m);
    }
    return map;
  }, [matches]);

  const dateGroups = useMemo(() => groupByDate(transactions), [transactions]);

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="divide-y divide-(--monarch-border)">
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
          {group.transactions.map((txn) => (
            <TransactionRow
              key={txn.id}
              transaction={txn}
              match={matchesByOriginalId.get(txn.id)}
              agingWarningDays={agingWarningDays}
              isSelected={selectedIds.has(txn.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
