/**
 * Rollup Item Card
 *
 * Mobile card component for rollup items. Displays item information
 * in a compact card layout optimized for narrow viewports.
 */

import { memo, useState, useCallback } from 'react';
import type { RollupItem } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import {
  formatCurrency,
  formatDateRelative,
  formatFrequencyShort,
  decodeHtmlEntities,
  getNormalizationDate,
} from '../../utils';
import { getCurrentMonthKey } from '../../utils/dateRangeUtils';
import { MerchantIcon, LoadingSpinner } from '../ui';
import { TrendUpIcon, TrendDownIcon, XIcon, AnchorIcon } from '../icons';
import { useIsRateLimited } from '../../context/RateLimitContext';

interface RollupItemCardProps {
  readonly item: RollupItem;
  readonly onRemove: () => Promise<void>;
  /** Optional data-tour attribute for guided tour targeting */
  readonly dataTourId?: string;
}

export const RollupItemCard = memo(function RollupItemCard({
  item,
  onRemove,
  dataTourId,
}: RollupItemCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const isRateLimited = useIsRateLimited();
  const isDisabled = isRemoving || isRateLimited;
  const target = Math.round(item.frozen_monthly_target);
  const idealRate = Math.round(item.ideal_monthly_rate);
  const isCatchingUp = target > idealRate && idealRate > 0;
  const isAhead = target < idealRate && target > 0;
  const isStable = target === idealRate && target > 0;
  const { date, relative } = formatDateRelative(item.next_due_date);

  const handleRemove = useCallback(async () => {
    setIsRemoving(true);
    try {
      await onRemove();
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove]);

  return (
    <article
      aria-label={`${decodeHtmlEntities(item.name)} rollup item`}
      className="rounded-lg border bg-monarch-bg-card border-monarch-border p-3"
      data-tour={dataTourId}
    >
      {/* Row 1: Name + Remove */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MerchantIcon logoUrl={item.logo_url} itemName={item.name} size="sm" />
          <a
            href={`https://app.monarch.com/merchants/${item.merchant_id}?date=${getCurrentMonthKey()}-01`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium truncate no-underline text-monarch-text-dark"
          >
            {decodeHtmlEntities(item.name)}
          </a>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isDisabled}
          aria-label={`Remove ${decodeHtmlEntities(item.name)} from rollup`}
          aria-busy={isRemoving}
          className="p-1.5 rounded transition-all disabled:opacity-50 hover:bg-black/10"
        >
          {isRemoving ? (
            <LoadingSpinner size="sm" color="var(--monarch-text-muted)" />
          ) : (
            <XIcon size={14} color="var(--monarch-text-muted)" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Row 2: Date + Cost + Monthly - compact row */}
      <div className="mt-2 flex items-center justify-between text-sm">
        {/* Date */}
        <div className="text-monarch-text-muted">
          <span className="text-monarch-text-dark">{date}</span>
          {relative && <span className="text-xs ml-1">({relative})</span>}
        </div>

        {/* Cost + Monthly target */}
        <div className="flex items-center gap-3">
          {/* Total cost */}
          <div className="text-right">
            <span className="text-monarch-text-dark">
              {formatCurrency(item.amount, { maximumFractionDigits: 0 })}
            </span>
            {item.frequency !== 'monthly' && (
              <span className="text-xs text-monarch-text-light ml-1">
                {formatFrequencyShort(item.frequency)}
              </span>
            )}
          </div>

          {/* Monthly target with indicator */}
          <div className="flex items-center gap-1 text-monarch-text-muted">
            <span>{formatCurrency(target, { maximumFractionDigits: 0 })}/mo</span>
            {isCatchingUp && (
              <Tooltip
                content={
                  <>
                    <div className="font-medium flex items-center gap-1">
                      <TrendUpIcon size={12} strokeWidth={2.5} className="text-monarch-error" />{' '}
                      Catching Up
                    </div>
                    <div>
                      <span className="text-monarch-orange">
                        {formatCurrency(target, { maximumFractionDigits: 0 })}/mo
                      </span>
                      <span className="text-monarch-text-muted"> → </span>
                      <span className="text-monarch-success">
                        {formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo
                      </span>
                    </div>
                    <div className="text-monarch-text-muted text-xs mt-1">
                      {item.frequency_months < 1
                        ? 'Normalizes as buffer builds'
                        : `Normalizes ${getNormalizationDate(item.next_due_date)}`}
                    </div>
                  </>
                }
              >
                <span className="cursor-help text-monarch-error">
                  <TrendUpIcon size={10} strokeWidth={2.5} />
                </span>
              </Tooltip>
            )}
            {isAhead && (
              <Tooltip
                content={
                  <>
                    <div className="font-medium flex items-center gap-1">
                      <TrendDownIcon size={12} strokeWidth={2.5} className="text-monarch-success" />{' '}
                      Ahead of Schedule
                    </div>
                    <div>
                      <span className="text-monarch-success">
                        {formatCurrency(target, { maximumFractionDigits: 0 })}/mo
                      </span>
                      <span className="text-monarch-text-muted"> → </span>
                      <span className="text-monarch-orange">
                        {formatCurrency(idealRate, { maximumFractionDigits: 0 })}/mo
                      </span>
                    </div>
                    <div className="text-monarch-text-muted text-xs mt-1">
                      {item.frequency_months < 1
                        ? 'Normalizes as buffer depletes'
                        : `Normalizes ${getNormalizationDate(item.next_due_date)}`}
                    </div>
                  </>
                }
              >
                <span className="cursor-help text-monarch-success">
                  <TrendDownIcon size={10} strokeWidth={2.5} />
                </span>
              </Tooltip>
            )}
            {isStable && (
              <Tooltip
                content={
                  <>
                    <div className="font-medium flex items-center gap-1">
                      <AnchorIcon size={12} strokeWidth={2.5} className="text-monarch-text-muted" />{' '}
                      Stable Target
                    </div>
                    <div className="text-monarch-text-muted text-xs">
                      This is the stable monthly target for this subscription
                    </div>
                  </>
                }
              >
                <span className="cursor-help text-monarch-text-muted">
                  <AnchorIcon size={10} strokeWidth={2.5} />
                </span>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});
