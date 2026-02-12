/**
 * TransactionRow
 *
 * Individual transaction row styled like Monarch's transaction list.
 * Uses CSS grid for consistent column alignment across rows.
 */

import React, { useState } from 'react';
import { Check, StickyNote } from 'lucide-react';
import { MerchantIcon } from '../ui';
import { Tooltip } from '../ui/Tooltip';
import { decodeHtmlEntities } from '../../utils';
import { getUserNotes, linkifyText } from '../../utils/refunds';
import type { Transaction, RefundsMatch } from '../../types/refunds';

interface TransactionRowProps {
  readonly transaction: Transaction;
  readonly match: RefundsMatch | undefined;
  readonly effectiveRefundAmount: number | undefined;
  readonly agingWarningDays: number;
  readonly isSelected: boolean;
  readonly onToggleSelect: (transaction: Transaction, shiftKey: boolean) => void;
}

function formatAmount(amount: number): string {
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMatchDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return dateStr;
  }
}

const MS_PER_DAY = 86_400_000;

/** Aging left-border accent (box-shadow): amber→red from 75%→100% of threshold. */
function getAgingBorder(transactionDate: string, thresholdDays: number): string | null {
  if (thresholdDays <= 0) return null;
  const txDate = new Date(transactionDate + 'T00:00:00');
  const daysOld = Math.floor((Date.now() - txDate.getTime()) / MS_PER_DAY);
  const progress = daysOld / thresholdDays;
  if (progress < 0.75) return null;
  // t: 0 at 75%, 1 at 100%+
  const t = Math.min(1, (progress - 0.75) / 0.25);
  const hue = 35 * (1 - t); // 35 → 0
  const sat = 90 + 10 * t; // 90% → 100%
  const light = 55 - 5 * t; // 55% → 50%
  return `inset 3px 0 0 hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`;
}

function getRowClassName(isMatched: boolean, isExpected: boolean, isSelected: boolean): string {
  if (isSelected) return 'bg-(--monarch-orange)/5';
  if (isMatched) return 'bg-(--monarch-success)/5';
  if (isExpected) return 'bg-(--monarch-accent)/5';
  return '';
}

function getCheckboxClassName(isSelected: boolean): string {
  if (isSelected) return 'bg-(--monarch-orange) border-(--monarch-orange) text-white';
  return 'border-(--monarch-text-muted)/40 hover:border-(--monarch-text-muted)';
}

function getStatusLabel(isMatched: boolean, isExpected: boolean, isSkipped: boolean): string {
  if (isMatched) return ', matched';
  if (isExpected) return ', expected refund';
  if (isSkipped) return ', skipped';
  return ', unmatched';
}

/** Small circular image for account logos with fallback to icon/initial. */
function AccountIcon({
  account,
}: {
  readonly account: Transaction['account'];
}): React.JSX.Element | null {
  const [hasError, setHasError] = useState(false);

  if (!account) return null;

  if (account.logoUrl && !hasError) {
    return (
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- onError is for image load failure
      <img
        src={account.logoUrl}
        alt=""
        className="w-5 h-5 rounded-full object-cover bg-white shrink-0"
        onError={() => setHasError(true)}
      />
    );
  }

  // Fallback: show first letter of account name in a colored circle
  const initial = account.displayName.charAt(0).toUpperCase();
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium text-(--monarch-text-muted)"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      {account.icon ?? initial}
    </div>
  );
}

function buildMatchedText(amt: number, refundAmt: number, m: RefundsMatch): string {
  const parts = ['Remaining: ' + formatAmount(Math.abs(amt) - refundAmt)];
  if (m.refundMerchant) parts.push('from "' + m.refundMerchant + '"');
  if (m.refundDate) parts.push('on ' + formatMatchDate(m.refundDate));
  return parts.join(' · ');
}

function buildExpectedText(amt: number, m: RefundsMatch): string {
  const parts = ['Remaining: ' + formatAmount(Math.abs(amt) - Math.abs(m.expectedAmount ?? amt))];
  if (m.expectedDate) parts.push('by ' + formatMatchDate(m.expectedDate));
  if (m.expectedAccount) parts.push('to ' + m.expectedAccount);
  return parts.join(' · ');
}

/** Match/expected detail text with tooltip for truncated content. */
function MatchDetailText({
  className,
  text,
}: {
  readonly className: string;
  readonly text: string;
}): React.JSX.Element {
  return (
    <Tooltip content={text} triggerClassName="block min-w-0">
      <span className={`text-xs truncate block ${className}`}>{text}</span>
    </Tooltip>
  );
}

/** Responsive grid: [actions][icon][merchant][category?][account?][amount]. */
const GRID_CLASSES =
  'grid gap-x-3 grid-cols-[48px_24px_minmax(0,1fr)_130px] sm:grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_130px] md:grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_130px]';

export const TransactionRow = React.memo(function TransactionRow({
  transaction,
  match,
  effectiveRefundAmount,
  agingWarningDays,
  isSelected,
  onToggleSelect,
}: TransactionRowProps) {
  const isExpected = match?.expectedRefund === true;
  const isMatched = match != null && !match.skipped && !isExpected;
  const isSkipped = match?.skipped === true;
  const hasMatch = match != null;
  const merchantName = decodeHtmlEntities(transaction.merchant?.name ?? transaction.originalName);

  // Only apply aging border to unmatched, unskipped, non-expected transactions
  const agingBorder =
    !isMatched && !isSkipped && !isExpected
      ? getAgingBorder(transaction.date, agingWarningDays)
      : null;

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a')) return;
    onToggleSelect(transaction, e.shiftKey);
  };

  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- native button can't contain nested interactive elements
    <div
      className={`w-full items-center px-4 py-3 border-b border-(--monarch-border) hover:bg-(--monarch-bg-hover) transition-colors text-left cursor-pointer ${GRID_CLASSES} ${getRowClassName(isMatched, isExpected, isSelected)}`}
      style={agingBorder ? { boxShadow: agingBorder } : undefined}
      aria-label={`${merchantName}: ${formatAmount(transaction.amount)}${getStatusLabel(isMatched, isExpected, isSkipped)}`}
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleSelect(transaction, e.shiftKey);
        }
      }}
    >
      {/* Col 1: Selection checkbox */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${getCheckboxClassName(isSelected)}`}
          aria-label={isSelected ? 'Deselect transaction' : 'Select transaction'}
          aria-pressed={isSelected}
          onClick={(e) => onToggleSelect(transaction, e.shiftKey)}
        >
          {isSelected && <Check size={14} />}
        </button>
      </div>

      {/* Col 2: Merchant icon */}
      <MerchantIcon
        logoUrl={transaction.merchant?.logoUrl ?? null}
        itemName={merchantName}
        size="sm"
      />

      {/* Col 3: Merchant name + match details */}
      <div className="min-w-0">
        <span className="font-medium text-sm text-(--monarch-text-dark) truncate block">
          {merchantName}
        </span>
        {hasMatch && isMatched && effectiveRefundAmount != null && (
          <MatchDetailText
            className={
              Math.abs(transaction.amount) - effectiveRefundAmount <= 0
                ? 'text-(--monarch-success)'
                : 'text-(--monarch-orange)'
            }
            text={buildMatchedText(transaction.amount, effectiveRefundAmount, match)}
          />
        )}
        {hasMatch && isExpected && (
          <MatchDetailText
            className={
              Math.abs(transaction.amount) - Math.abs(match.expectedAmount ?? transaction.amount) <=
              0
                ? 'text-(--monarch-success)'
                : 'text-(--monarch-orange)'
            }
            text={buildExpectedText(transaction.amount, match)}
          />
        )}
      </div>

      {/* Col 4: Category */}
      <div className="min-w-0 hidden sm:flex items-center gap-1.5">
        {transaction.category ? (
          <>
            <span className="shrink-0 text-sm">{transaction.category.icon}</span>
            <span className="text-xs text-(--monarch-text-muted) truncate">
              {decodeHtmlEntities(transaction.category.name)}
            </span>
          </>
        ) : (
          <span />
        )}
      </div>

      {/* Col 5: Account */}
      <div className="min-w-0 hidden md:flex items-center gap-1.5">
        {transaction.account ? (
          <>
            <AccountIcon account={transaction.account} />
            <span className="text-xs text-(--monarch-text-muted) truncate">
              {transaction.account.displayName}
            </span>
          </>
        ) : (
          <span />
        )}
      </div>

      {/* Col 6: Tags + notes + pending + amount */}
      <div className="flex items-center gap-2 justify-end">
        {/* Tag dots */}
        {transaction.tags.length > 0 && (
          <span
            className="flex items-center gap-0.5"
            aria-label={`Tags: ${transaction.tags.map((t) => t.name).join(', ')}`}
          >
            {transaction.tags.map((tag) => (
              <Tooltip key={tag.id} content={tag.name}>
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: tag.color }}
                />
              </Tooltip>
            ))}
          </span>
        )}

        {/* Notes icon */}
        {getUserNotes(transaction.notes) != null && (
          <Tooltip
            sticky
            content={
              <span
                className="block max-h-48 overflow-y-auto custom-scrollbar"
                style={{ whiteSpace: 'pre-line' }}
              >
                {linkifyText(getUserNotes(transaction.notes)!)}
              </span>
            }
          >
            <span aria-label="Transaction notes">
              <StickyNote size={14} className="text-(--monarch-text-muted)" />
            </span>
          </Tooltip>
        )}

        {/* Pending badge */}
        {transaction.pending && (
          <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-(--monarch-text-muted)/15 text-(--monarch-text-muted) leading-none">
            P
          </span>
        )}

        {/* Amount */}
        <span
          className={`text-sm font-medium tabular-nums ${
            transaction.amount > 0 ? 'text-(--monarch-success)' : 'text-(--monarch-text-dark)'
          }`}
        >
          {formatAmount(transaction.amount)}
        </span>
      </div>
    </div>
  );
});
