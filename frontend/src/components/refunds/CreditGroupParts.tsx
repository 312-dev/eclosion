/**
 * CreditGroupParts
 *
 * Sub-components for CreditGroupRow: OriginalRow (linked original transaction)
 * and HiddenCountRow (collapsed count of filtered-out originals).
 */

import React from 'react';
import type { Transaction } from '../../types/refunds';
import { decodeHtmlEntities } from '../../utils';

function getPrefix(amount: number): string {
  if (amount > 0) return '+';
  if (amount < 0) return '-';
  return '';
}

export function formatAmount(amount: number): string {
  return `${getPrefix(amount)}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export type Coverage = 'full' | 'partial' | 'none';

export interface OriginalCoverage {
  transaction: Transaction;
  coverage: Coverage;
  /** For partial: the amount still owed (negative). */
  remainingAmount: number;
}

/** Distribute refund across originals in order; return per-txn coverage. */
export function computeCoverage(
  refundAmount: number,
  originals: Transaction[]
): OriginalCoverage[] {
  let available = Math.abs(refundAmount);
  return originals.map((txn) => {
    const expense = Math.abs(txn.amount);
    if (available >= expense) {
      available -= expense;
      return { transaction: txn, coverage: 'full', remainingAmount: 0 };
    }
    if (available > 0) {
      const remaining = expense - available;
      available = 0;
      return { transaction: txn, coverage: 'partial', remainingAmount: -remaining };
    }
    return { transaction: txn, coverage: 'none', remainingAmount: txn.amount };
  });
}

/** Desktop-only 6-column grid matching TransactionRow/header. */
const GRID_CLASSES_DESKTOP =
  'hidden md:grid gap-x-3 grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_130px]';

export function OriginalRow({
  transaction,
  coverage,
  remainingAmount,
  isRefund,
  dim,
  onClick,
}: {
  readonly transaction: Transaction;
  readonly coverage: Coverage;
  readonly remainingAmount: number;
  readonly isRefund: boolean;
  readonly dim?: boolean;
  readonly onClick: () => void;
}): React.JSX.Element {
  const merchantName = decodeHtmlEntities(transaction.merchant?.name ?? transaction.originalName);
  const shortDate = formatShortDate(transaction.date);
  const isCovered = coverage === 'full';
  const isPartial = coverage === 'partial';
  const dimClass = isCovered || dim ? 'opacity-50' : '';
  const hoverBg = isRefund ? 'hover:bg-(--monarch-success)/12' : 'hover:bg-(--monarch-accent)/12';

  return (
    <button
      type="button"
      className={`w-full p-0 text-left text-xs ${hoverBg} transition-colors rounded cursor-pointer`}
      onClick={onClick}
      aria-label={`Scroll to ${merchantName}`}
    >
      {/* Desktop: grid aligned to parent columns */}
      <div className={`items-center px-4 py-1.5 ${dimClass} ${GRID_CLASSES_DESKTOP}`}>
        <div />
        <div />
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-(--monarch-text-muted) tabular-nums shrink-0">{shortDate}</span>
          <span className="text-(--monarch-text-muted) truncate">{merchantName}</span>
        </div>
        <div />
        <div />
        <div className="flex items-center justify-end gap-2">
          {isPartial && (
            <span className="tabular-nums font-medium text-(--monarch-error)">
              {formatAmount(remainingAmount)}
            </span>
          )}
          <span
            className={`tabular-nums font-medium ${isCovered || isPartial ? 'line-through text-(--monarch-text-muted)' : 'text-(--monarch-error)'}`}
          >
            {formatAmount(transaction.amount)}
          </span>
        </div>
      </div>
      {/* Mobile */}
      <div
        className={`md:hidden flex items-center gap-2 pr-3 py-1.5 ${dimClass}`}
        style={{ paddingLeft: 'calc(0.75rem + 20px)' }}
      >
        <span className="text-(--monarch-text-muted) tabular-nums shrink-0">{shortDate}</span>
        <span className="text-(--monarch-text-muted) truncate flex-1">{merchantName}</span>
        {isPartial && (
          <span className="tabular-nums font-medium shrink-0 text-(--monarch-error)">
            {formatAmount(remainingAmount)}
          </span>
        )}
        <span
          className={`tabular-nums font-medium shrink-0 ${isCovered || isPartial ? 'line-through text-(--monarch-text-muted)' : 'text-(--monarch-error)'}`}
        >
          {formatAmount(transaction.amount)}
        </span>
      </div>
    </button>
  );
}

export function HiddenCountRow({
  count,
  label,
  onClick,
}: {
  readonly count: number;
  readonly label: string;
  readonly onClick?: (e: React.MouseEvent) => void;
}): React.JSX.Element {
  const text = `...and ${count} other${count > 1 ? 's' : ''} ${label}`;
  const Tag = onClick ? 'button' : 'div';
  const interactive = onClick ? 'hover:text-(--monarch-text-dark) cursor-pointer' : '';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`w-full text-left text-xs text-(--monarch-text-muted) transition-colors ${interactive}`}
      onClick={onClick}
    >
      {/* Desktop: grid aligned to parent columns */}
      <div className={`items-center px-4 py-1.5 ${GRID_CLASSES_DESKTOP}`}>
        <div />
        <div />
        <div className="col-span-4">{text}</div>
      </div>
      {/* Mobile */}
      <div className="md:hidden py-1.5 pr-3" style={{ paddingLeft: 'calc(0.75rem + 20px)' }}>
        {text}
      </div>
    </Tag>
  );
}
