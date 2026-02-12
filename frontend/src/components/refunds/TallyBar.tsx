/**
 * TallyBar
 *
 * Sticky header row inside the transaction card showing running totals:
 * transaction count, total amount, matched refund amount, and remaining balance.
 */

import { Filter, FilterX } from 'lucide-react';
import type { RefundsTally } from '../../types/refunds';
import { Tooltip } from '../ui/Tooltip';

interface TallyBarProps {
  readonly tally: RefundsTally;
  readonly totalCount?: number | undefined;
  readonly onResetFilter?: (() => void) | undefined;
}

function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TallyBar({ tally, totalCount, onResetFilter }: TallyBarProps) {
  const isFullyRefunded = tally.remainingAmount <= 0;
  const isFiltered = totalCount !== undefined && totalCount > tally.transactionCount;

  return (
    <output
      className="sticky top-0 z-10 border-b border-(--monarch-border) bg-(--monarch-bg-card) px-4 py-3 block"
      aria-label="Refunds summary"
    >
      {/* Row 1: count + status breakdown */}
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-(--monarch-text-muted)">
          {isFiltered && onResetFilter && (
            <Tooltip content="Clear filter" side="top">
              <button
                type="button"
                onClick={onResetFilter}
                className="group inline-flex items-center text-(--monarch-orange) rounded transition-colors hover:bg-(--monarch-orange)/10 p-0.5 -m-0.5"
                aria-label="Clear filter"
              >
                <Filter size={12} className="group-hover:hidden" aria-hidden="true" />
                <FilterX size={12} className="hidden group-hover:block" aria-hidden="true" />
              </button>
            </Tooltip>
          )}
          {isFiltered && !onResetFilter && (
            <Filter size={12} className="text-(--monarch-orange)" aria-hidden="true" />
          )}
          <span>
            <span className="font-medium text-(--monarch-text-dark)">
              {isFiltered ? `${tally.transactionCount} of ${totalCount}` : tally.transactionCount}
            </span>{' '}
            transaction{tally.transactionCount === 1 && !isFiltered ? '' : 's'}
          </span>
        </span>

        {(tally.matchedCount > 0 || tally.expectedCount > 0 || tally.skippedCount > 0) && (
          <span className="flex items-center gap-3 text-xs text-(--monarch-text-muted)">
            {tally.unmatchedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-(--monarch-orange)" />
                {tally.unmatchedCount} pending
              </span>
            )}
            {tally.matchedCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-(--monarch-success)" />
                {tally.matchedCount} matched
              </span>
            )}
            {tally.expectedCount > 0 && (
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--monarch-accent)' }}
                />
                {tally.expectedCount} expected
              </span>
            )}
            {tally.skippedCount > 0 && (
              <span className="flex items-center gap-1">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--monarch-text-muted)' }}
                />
                {tally.skippedCount} skipped
              </span>
            )}
          </span>
        )}
      </div>

      {/* Row 2: financial summary */}
      <div className="flex items-center gap-4 mt-1.5 text-sm flex-wrap">
        <span className="text-(--monarch-text-muted)">
          Refunded{' '}
          <span className="font-medium text-(--monarch-success)">
            {formatCurrency(tally.matchedAmount)}
          </span>
        </span>
        {tally.expectedAmount > 0 && (
          <>
            <span className="text-(--monarch-text-muted) opacity-30" aria-hidden="true">
              &middot;
            </span>
            <span className="text-(--monarch-text-muted)">
              Expected{' '}
              <span className="font-medium" style={{ color: 'var(--monarch-accent)' }}>
                {formatCurrency(tally.expectedAmount)}
              </span>
            </span>
          </>
        )}
        <span className="text-(--monarch-text-muted) opacity-30" aria-hidden="true">
          &middot;
        </span>
        <span className="text-(--monarch-text-muted)">
          Remaining{' '}
          <span
            className={`font-medium ${isFullyRefunded ? 'text-(--monarch-success)' : 'text-(--monarch-orange)'}`}
          >
            {formatCurrency(tally.remainingAmount)}
          </span>
        </span>
      </div>
    </output>
  );
}
