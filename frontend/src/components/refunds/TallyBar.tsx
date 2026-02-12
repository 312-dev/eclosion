/**
 * TallyBar
 *
 * Sticky header row inside the transaction card showing running totals:
 * transaction count, total amount, matched refund amount, and remaining balance.
 */

import type React from 'react';
import type { RefundsTally } from '../../types/refunds';

interface TallyBarProps {
  readonly tally: RefundsTally;
}

function formatCurrency(amount: number): string {
  return `$${Math.round(Math.abs(amount)).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function StatItem({
  label,
  value,
  colorClass,
  colorStyle,
  valueFirst,
}: {
  readonly label: string;
  readonly value: string;
  readonly colorClass?: string | undefined;
  readonly colorStyle?: string | undefined;
  readonly valueFirst?: boolean | undefined;
}): React.JSX.Element {
  if (valueFirst) {
    return (
      <div className="min-w-0 text-center">
        <div
          className={`text-sm font-medium tabular-nums ${colorClass ?? ''}`}
          style={colorStyle ? { color: colorStyle } : undefined}
        >
          {value}
        </div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-(--monarch-text-muted)">
          {label}
        </div>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wider text-(--monarch-text-muted)">
        {label}
      </div>
      <div
        className={`text-sm font-medium tabular-nums ${colorClass ?? ''}`}
        style={colorStyle ? { color: colorStyle } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export function TallyBar({ tally }: TallyBarProps) {
  const isFullyRefunded = tally.remainingAmount <= 0;
  const hasExpected = tally.expectedAmount > 0;

  return (
    <output
      className="sticky top-0 z-10 border-b border-(--monarch-border) bg-(--monarch-bg-card) px-4 py-3 block"
      aria-label="Refunds summary"
    >
      {/* Financial summary — mobile stat row */}
      <div className="flex items-stretch gap-4 sm:hidden">
        <div className="flex-1">
          <StatItem
            label="Refunds"
            value={formatCurrency(tally.matchedAmount)}
            colorClass="text-(--monarch-success)"
            valueFirst
          />
        </div>
        {hasExpected && (
          <>
            <div className="w-px self-stretch my-0.5 bg-(--monarch-border)" aria-hidden="true" />
            <div className="flex-1">
              <StatItem
                label="Expected"
                value={formatCurrency(tally.expectedAmount)}
                colorStyle="var(--monarch-accent)"
                valueFirst
              />
            </div>
          </>
        )}
        <div className="w-px self-stretch my-0.5 bg-(--monarch-border)" aria-hidden="true" />
        <div className="flex-1">
          <StatItem
            label="Remaining"
            value={formatCurrency(tally.remainingAmount)}
            colorClass={isFullyRefunded ? 'text-(--monarch-success)' : 'text-(--monarch-orange)'}
            valueFirst
          />
        </div>
      </div>

      {/* Financial summary — desktop inline */}
      <div className="hidden sm:flex items-center gap-6 text-sm flex-wrap">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-base tabular-nums text-(--monarch-success)">
            {formatCurrency(tally.matchedAmount)}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-(--monarch-text-muted)">
            Refunds
          </span>
        </span>
        {hasExpected && (
          <>
            <div className="w-px self-stretch my-0.5 bg-(--monarch-border)" aria-hidden="true" />
            <span className="flex items-center gap-2">
              <span
                className="font-semibold text-base tabular-nums"
                style={{ color: 'var(--monarch-accent)' }}
              >
                {formatCurrency(tally.expectedAmount)}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-(--monarch-text-muted)">
                Expected
              </span>
            </span>
          </>
        )}
        <div className="w-px self-stretch my-0.5 bg-(--monarch-border)" aria-hidden="true" />
        <span className="flex items-center gap-2">
          <span
            className={`font-semibold text-base tabular-nums ${isFullyRefunded ? 'text-(--monarch-success)' : 'text-(--monarch-orange)'}`}
          >
            {formatCurrency(tally.remainingAmount)}
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-(--monarch-text-muted)">
            Remaining
          </span>
        </span>
      </div>
    </output>
  );
}
