/** Sub-components shared by TransactionRow: MatchIcon, TagsNotesAmount, AccountIcon. */
import React, { useState } from 'react';
import { StickyNote, RotateCcw, ChevronRight } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { getUserNotes, linkifyText } from '../../utils/refunds';
import type { Transaction } from '../../types/refunds';

export type MatchType = 'matched' | 'expected' | null;

export function formatAmount(amount: number): string {
  if (amount > 0)
    return `+$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (amount < 0)
    return `-$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function amountColorClass(matchType: MatchType, amount: number): string {
  if (matchType) return 'text-(--monarch-text-muted)';
  return amount > 0 ? 'text-(--monarch-success)' : 'text-(--monarch-error)';
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

function formatMatchAmount(amount: number | null): string {
  if (amount == null) return '';
  return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function AccountIcon({
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
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-medium text-(--monarch-text-muted)"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      {account.icon ?? account.displayName.charAt(0).toUpperCase()}
    </div>
  );
}

function MatchIcon({
  matchType,
  matchDate,
  matchAmount,
  creditGroupId,
  onScrollToCredit,
}: {
  readonly matchType: MatchType;
  readonly matchDate: string | null;
  readonly matchAmount: number | null;
  readonly creditGroupId: string | null;
  readonly onScrollToCredit: ((id: string) => void) | null;
}): React.JSX.Element | null {
  if (!matchType || !creditGroupId || !onScrollToCredit) return null;
  const isRefund = matchType === 'matched';
  const colorClass = isRefund ? 'text-(--monarch-success)' : 'text-(--monarch-accent)';
  const label = isRefund ? 'Refunded' : 'Expected';
  const preposition = isRefund ? 'on' : 'by';

  const handleScrollClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    onScrollToCredit(creditGroupId);
  };

  return (
    <Tooltip
      sticky
      content={
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- not a real URL, scrolls to element
        <span
          role="link"
          tabIndex={0}
          className="inline-flex items-center gap-1 cursor-pointer whitespace-nowrap leading-none hover:underline"
          onClick={handleScrollClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleScrollClick(e as unknown as React.MouseEvent);
            }
          }}
          aria-label={`Scroll to ${label.toLowerCase()} entry`}
        >
          <span className={colorClass}>{label}</span>
          <span className={`tabular-nums ${colorClass}`}>{formatMatchAmount(matchAmount)}</span>
          <span className="opacity-60">{preposition}</span>
          <span>{formatMatchDate(matchDate)}</span>
          <ChevronRight size={12} className="opacity-60" />
        </span>
      }
    >
      <button
        type="button"
        className={`inline-flex items-center cursor-pointer ${colorClass} hover:opacity-70 transition-opacity`}
        aria-label={`${label} ${preposition} ${formatMatchDate(matchDate)}`}
        onClick={handleScrollClick}
      >
        <RotateCcw size={12} />
      </button>
    </Tooltip>
  );
}

export function TagsNotesAmount({
  transaction,
  matchType,
  matchDate,
  matchAmount,
  creditGroupId,
  onScrollToCredit,
}: {
  readonly transaction: Transaction;
  readonly matchType: MatchType;
  readonly matchDate: string | null;
  readonly matchAmount: number | null;
  readonly creditGroupId: string | null;
  readonly onScrollToCredit: ((id: string) => void) | null;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 justify-end">
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
      {transaction.pending && (
        <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-(--monarch-text-muted)/15 text-(--monarch-text-muted) leading-none">
          P
        </span>
      )}
      <MatchIcon
        matchType={matchType}
        matchDate={matchDate}
        matchAmount={matchAmount}
        creditGroupId={creditGroupId}
        onScrollToCredit={onScrollToCredit}
      />
      <span
        className={`text-sm font-medium tabular-nums ${amountColorClass(matchType, transaction.amount)}`}
      >
        {formatAmount(transaction.amount)}
      </span>
    </div>
  );
}
