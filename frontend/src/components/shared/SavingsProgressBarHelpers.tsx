/**
 * Helper components and functions for SavingsProgressBar
 */

import { Tooltip } from '../ui/Tooltip';
import { formatCurrency } from '../../utils';
import { Icons } from '../icons';

/** Calculate spending metrics based on goal type */
export function calculateSpendingMetrics(
  goalType: 'one_time' | 'debt' | 'savings_buffer' | undefined,
  totalSaved: number,
  totalContributions: number,
  availableToSpend: number | undefined
) {
  const isSavingsBuffer = goalType === 'savings_buffer';
  const displayedAvailable = isSavingsBuffer ? totalSaved : availableToSpend;

  let spentThisMonth = 0;
  if (isSavingsBuffer) {
    spentThisMonth = Math.max(0, totalContributions - totalSaved);
  } else if (availableToSpend !== undefined) {
    spentThisMonth = Math.max(0, totalSaved - availableToSpend);
  }

  const hasSpendingToShow = spentThisMonth > 0 && displayedAvailable !== undefined;
  const savedForDisplay = isSavingsBuffer ? totalContributions : totalSaved;

  return { displayedAvailable, spentThisMonth, hasSpendingToShow, savedForDisplay };
}

/** Render the progress bar text content */
export function ProgressBarContent({
  hasSpendingToShow,
  availableAmount,
  savedAmount,
  savedLabel,
  toGoAmount,
  textColor,
  labelColor,
}: {
  readonly hasSpendingToShow: boolean;
  readonly availableAmount: string;
  readonly savedAmount: string;
  readonly savedLabel: string;
  readonly toGoAmount: string | null;
  readonly textColor: string;
  readonly labelColor: string;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
      <span className="flex items-baseline gap-1">
        {hasSpendingToShow && availableAmount && (
          <>
            <span className="font-medium text-[15px]" style={{ color: textColor }}>
              {availableAmount}
            </span>
            <span className="text-xs" style={{ color: labelColor }}>
              avail
            </span>
            <span className="text-xs mx-0.5" style={{ color: labelColor }}>
              ·
            </span>
          </>
        )}
        <span className="font-medium text-[15px]" style={{ color: textColor }}>
          {savedAmount}
        </span>
        <span className="text-xs" style={{ color: labelColor }}>
          {savedLabel}
        </span>
      </span>
      {toGoAmount === null ? (
        <span className="flex items-baseline gap-1">
          <span className="font-medium text-[15px]" style={{ color: textColor }}>
            ∞
          </span>
          <span className="text-xs" style={{ color: labelColor }}>
            target
          </span>
        </span>
      ) : (
        <span className="flex items-baseline gap-1">
          <span className="font-medium text-[15px]" style={{ color: textColor }}>
            {toGoAmount}
          </span>
          <span className="text-xs" style={{ color: labelColor }}>
            to go
          </span>
        </span>
      )}
    </div>
  );
}

/** Helper to render the balance breakdown tooltip content */
export function renderBreakdownTooltip({
  rolloverAmount,
  creditsThisMonth,
  budgetedThisMonth,
  savedAmount,
  totalLabel,
  hasContributionBreakdown,
  hasSpendingToShow,
  spentThisMonth,
  availableAmount,
}: {
  rolloverAmount: number;
  creditsThisMonth: number;
  budgetedThisMonth: number;
  savedAmount: string;
  totalLabel: string;
  hasContributionBreakdown: boolean;
  hasSpendingToShow: boolean;
  spentThisMonth: number;
  availableAmount: string;
}) {
  return (
    <div className="text-sm space-y-2 min-w-56">
      <div
        className="font-medium border-b pb-1 mb-2"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        Balance Breakdown
      </div>
      {hasContributionBreakdown && (
        <div className="space-y-1">
          {rolloverAmount > 0 && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--monarch-text-muted)' }}>Rolled over</span>
              <span style={{ color: 'var(--monarch-green)' }}>
                +{formatCurrency(rolloverAmount, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
          {creditsThisMonth > 0 && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--monarch-text-muted)' }}>Credits this month</span>
              <span style={{ color: 'var(--monarch-green)' }}>
                +{formatCurrency(creditsThisMonth, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
          {budgetedThisMonth > 0 && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--monarch-text-muted)' }}>Budgeted this month</span>
              <span style={{ color: 'var(--monarch-green)' }}>
                +{formatCurrency(budgetedThisMonth, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
        </div>
      )}
      <div
        className={`flex justify-between font-medium ${hasContributionBreakdown ? 'pt-2 border-t' : ''}`}
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <span>{totalLabel}</span>
        <span style={{ color: 'var(--monarch-text-dark)' }}>{savedAmount}</span>
      </div>
      {hasSpendingToShow && spentThisMonth > 0 && (
        <>
          <div className="flex justify-between">
            <span style={{ color: 'var(--monarch-text-muted)' }}>Spent</span>
            <span style={{ color: 'var(--monarch-red)' }}>
              -{formatCurrency(spentThisMonth, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div
            className="flex justify-between font-medium pt-2 border-t"
            style={{ borderColor: 'var(--monarch-border)' }}
          >
            <span>Available</span>
            <span style={{ color: 'var(--monarch-text-dark)' }}>{availableAmount}</span>
          </div>
        </>
      )}
    </div>
  );
}

/** Target pin indicator component */
export function TargetPin({
  expectedProgressPercent,
  expectedTargetAmount,
  clampedPercent,
  fillColor,
}: {
  readonly expectedProgressPercent: number;
  readonly expectedTargetAmount: number | null;
  readonly clampedPercent: number;
  readonly fillColor: string;
}) {
  const isOnTarget = clampedPercent >= expectedProgressPercent;
  return (
    <div
      className="absolute z-20"
      style={{
        left: `${expectedProgressPercent}%`,
        transform: 'translateX(calc(-50% + 0.5px))',
        top: '-19px',
      }}
    >
      <Tooltip
        content={
          <div className="text-sm text-center">
            <span className="font-medium">Target for this month:</span>
            <br />
            {expectedTargetAmount === null
              ? 'N/A'
              : formatCurrency(expectedTargetAmount, { maximumFractionDigits: 0 })}
          </div>
        }
        side="top"
        align="center"
      >
        <div className="cursor-default">
          {isOnTarget ? (
            <Icons.MapPinCheckInside size={13} style={{ color: fillColor }} />
          ) : (
            <Icons.MapPinXInside size={13} style={{ color: fillColor }} />
          )}
        </div>
      </Tooltip>
    </div>
  );
}
