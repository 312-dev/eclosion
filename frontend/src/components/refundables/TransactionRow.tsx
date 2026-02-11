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
import { isSafeUrl } from '../../utils/safeUrl';
import type { Transaction, RefundablesMatch } from '../../types/refundables';

interface TransactionRowProps {
  readonly transaction: Transaction;
  readonly match: RefundablesMatch | undefined;
  readonly agingWarningDays: number;
  readonly isSelected: boolean;
  readonly onToggleSelect: (transaction: Transaction) => void;
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

/**
 * Compute an aging left-border accent for unmatched transactions.
 *
 * Returns a box-shadow string (inset left border) or null.
 * Uses box-shadow instead of border-left to avoid layout shift.
 *
 * - Below 75% of threshold: no border
 * - 75%–100%: amber → orange → red
 * - 100%+: full red
 */
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

/** Strip auto-generated `[Refund matched]` lines, return user notes or null. */
function getUserNotes(notes: string | null): string | null {
  if (!notes) return null;
  const cleaned = notes
    .split('\n')
    .filter((line) => !line.startsWith('[Refund matched]'))
    .join('\n')
    .trim();
  return cleaned ? decodeHtmlEntities(cleaned) : null;
}

const URL_REGEX = /https?:\/\/[^\s)]+/g;

/** Render text with URLs as clickable links. */
function linkifyText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const url = match[0];
    const start = match.index;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    if (isSafeUrl(url)) {
      parts.push(
        <a
          key={start}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80"
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>
      );
    } else {
      parts.push(url);
    }
    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function getRowClassName(isMatched: boolean, isSelected: boolean): string {
  if (isSelected) return 'bg-(--monarch-orange)/5';
  if (isMatched) return 'bg-(--monarch-success)/5';
  return '';
}

function getCheckboxClassName(isSelected: boolean): string {
  if (isSelected) return 'bg-(--monarch-orange) border-(--monarch-orange) text-white';
  return 'border-(--monarch-text-muted)/40 hover:border-(--monarch-text-muted)';
}

function getStatusLabel(isMatched: boolean, isSkipped: boolean): string {
  if (isMatched) return ', matched';
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

/**
 * Grid column layout (responsive):
 *   md+:  [actions 48px] [icon 24px] [merchant 1.5fr] [category 1fr] [account 1.2fr] [amount 130px]
 *   sm-md: [actions 48px] [icon 24px] [merchant 1.5fr] [category 1fr] [amount 130px]
 *   <sm:  [actions 48px] [icon 24px] [merchant 1fr] [amount 130px]
 *
 * Amount column uses a fixed width so columns stay consistent across all rows
 * (each row is an independent grid container, so `auto` would vary per row).
 * Hidden cells (display:none) are removed from grid flow so remaining children fill columns in order.
 */
const GRID_CLASSES =
  'grid gap-x-3 grid-cols-[48px_24px_minmax(0,1fr)_130px] sm:grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_130px] md:grid-cols-[48px_24px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_130px]';

export const TransactionRow = React.memo(function TransactionRow({
  transaction,
  match,
  agingWarningDays,
  isSelected,
  onToggleSelect,
}: TransactionRowProps) {
  const isMatched = match != null && !match.skipped;
  const isSkipped = match?.skipped === true;
  const hasMatch = match != null;
  const merchantName = decodeHtmlEntities(transaction.merchant?.name ?? transaction.originalName);

  // Only apply aging border to unmatched, unskipped transactions
  const agingBorder =
    !isMatched && !isSkipped ? getAgingBorder(transaction.date, agingWarningDays) : null;

  return (
    <div
      className={`w-full items-center px-4 py-3 border-b border-(--monarch-border) hover:bg-(--monarch-bg-hover) transition-colors text-left ${GRID_CLASSES} ${getRowClassName(isMatched, isSelected)}`}
      style={agingBorder ? { boxShadow: agingBorder } : undefined}
      aria-label={`${merchantName}: ${formatAmount(transaction.amount)}${getStatusLabel(isMatched, isSkipped)}`}
    >
      {/* Col 1: Selection checkbox */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${getCheckboxClassName(isSelected)}`}
          aria-label={isSelected ? 'Deselect transaction' : 'Select transaction'}
          aria-pressed={isSelected}
          onClick={() => onToggleSelect(transaction)}
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
        {hasMatch && !isSkipped && match.refundAmount != null && (
          <span className="text-xs text-(--monarch-success) truncate block">
            Matched: {formatAmount(match.refundAmount)}
            {match.refundMerchant && ` from "${match.refundMerchant}"`}
            {match.refundDate && ` on ${formatMatchDate(match.refundDate)}`}
          </span>
        )}
      </div>

      {/* Col 4: Category */}
      <div className="min-w-0 hidden sm:flex items-center gap-1.5">
        {transaction.category ? (
          <>
            <span className="shrink-0 text-sm">{transaction.category.icon}</span>
            <span className="text-xs text-(--monarch-text-muted) truncate">
              {transaction.category.name}
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
