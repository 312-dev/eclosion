/**
 * DistributeInfoTooltip
 *
 * Tooltip content for the Distribute wizard screens.
 * Shows calculation breakdown for how the distributable amount was derived.
 */

import { BreakdownRow, ExpectedIncomeRow, BREAKDOWN_LABELS } from './BreakdownComponents';
import { BufferInputRow } from './BufferInputRow';
import { formatCurrency } from '../../utils/formatters';
import type { AvailableToStashBreakdown, DetailedBreakdown } from '../../types';

/** Currency formatting options for whole dollars */
const currencyOpts = { maximumFractionDigits: 0 };

interface SavingsTooltipProps {
  readonly breakdown: AvailableToStashBreakdown;
  readonly detailedBreakdown: DetailedBreakdown;
  readonly includeExpectedIncome: boolean;
  readonly availableAmount: number;
  readonly leftToBudget: number;
  readonly existingSavings: number;
  /** Saved buffer value from config */
  readonly savedBuffer: number;
  /** Callback to save the buffer value */
  readonly onSaveBuffer: (value: number) => Promise<void>;
  /** Raw expected income amount (regardless of toggle state) */
  readonly rawExpectedIncome: number;
  /** Callback to toggle expected income inclusion */
  readonly onToggleExpectedIncome: () => void;
}

/**
 * Tooltip for Screen 1 (Existing Savings).
 * Shows the Available Funds breakdown and how Left to Budget is subtracted.
 */
export function SavingsInfoTooltip({
  breakdown,
  detailedBreakdown,
  includeExpectedIncome,
  availableAmount,
  leftToBudget,
  existingSavings,
  savedBuffer,
  onSaveBuffer,
  rawExpectedIncome,
  onToggleExpectedIncome,
}: SavingsTooltipProps) {
  // Calculate available before buffer for the BufferInputRow cap
  const availableBeforeBuffer =
    breakdown.cashOnHand +
    breakdown.expectedIncome -
    breakdown.creditCardDebt -
    breakdown.unspentBudgets -
    breakdown.goalBalances -
    breakdown.stashBalances;

  return (
    <div className="text-sm space-y-2 min-w-56">
      <div
        className="font-medium border-b pb-1 mb-2"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        Calculation Breakdown
      </div>
      <div className="space-y-1">
        <ExpectedIncomeRow
          amount={rawExpectedIncome}
          isEnabled={includeExpectedIncome}
          onToggle={onToggleExpectedIncome}
        />
        <BreakdownRow
          label={BREAKDOWN_LABELS.cashOnHand}
          amount={breakdown.cashOnHand}
          isPositive
          items={detailedBreakdown.cashAccounts}
        />
        <BreakdownRow
          label={BREAKDOWN_LABELS.goalBalances}
          amount={breakdown.goalBalances}
          items={detailedBreakdown.goals}
        />
        <BreakdownRow
          label={BREAKDOWN_LABELS.creditCardDebt}
          amount={breakdown.creditCardDebt}
          items={detailedBreakdown.creditCards}
        />
        <BreakdownRow
          label={BREAKDOWN_LABELS.unspentBudgets}
          amount={breakdown.unspentBudgets}
          items={detailedBreakdown.unspentCategories}
        />
        <BreakdownRow
          label={BREAKDOWN_LABELS.stashBalances}
          amount={breakdown.stashBalances}
          items={detailedBreakdown.stashItems}
        />
        <BufferInputRow
          availableBeforeBuffer={availableBeforeBuffer}
          savedBuffer={savedBuffer}
          onSave={onSaveBuffer}
        />
      </div>
      <div
        className="flex justify-between pt-2 border-t"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <span style={{ color: 'var(--monarch-text-muted)' }}>Available Funds</span>
        <span style={{ color: 'var(--monarch-success)' }}>{formatCurrency(availableAmount, currencyOpts)}</span>
      </div>
      <div className="flex justify-between">
        <span style={{ color: 'var(--monarch-text-muted)' }}>Left to Budget</span>
        <span style={{ color: 'var(--monarch-red)' }}>−{formatCurrency(leftToBudget, currencyOpts)}</span>
      </div>
      <div
        className="flex justify-between font-medium pt-2 border-t"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <span>Existing Savings</span>
        <span style={{ color: 'var(--monarch-text-dark)' }}>{formatCurrency(existingSavings, currencyOpts)}</span>
      </div>
    </div>
  );
}

interface MonthlyTooltipProps {
  readonly monthlyAmount: number;
  /** Callback to refresh the left to budget amount */
  readonly onRefresh?: () => void;
  /** Whether a refresh is currently in progress */
  readonly isRefreshing?: boolean;
}

/**
 * Tooltip for Screen 2 (Monthly Income).
 * Explains what Left to Budget means.
 */
export function MonthlyInfoTooltip({ monthlyAmount, onRefresh, isRefreshing }: MonthlyTooltipProps) {
  return (
    <div className="text-sm space-y-2 min-w-56">
      <div
        className="flex items-center justify-between border-b pb-1 mb-2"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <span className="font-medium">Distribute Monthly Income</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 rounded text-monarch-text-muted hover:text-monarch-text-dark hover:bg-monarch-bg-hover transition-colors disabled:opacity-50"
            aria-label="Refresh left to budget"
          >
            <svg
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>
      <p style={{ color: 'var(--monarch-text-muted)' }}>
        This is your recurring monthly contribution. Projections are based on this rate.
      </p>
      <p style={{ color: 'var(--monarch-text-muted)' }}>
        If this seems too low, free up funds in your Monarch budget and{' '}
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline text-monarch-orange underline bg-transparent border-none p-0 m-0 font-inherit cursor-pointer hover:text-monarch-orange-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            refresh
          </button>
        ) : (
          'refresh'
        )}
        .
      </p>
      <div
        className="flex justify-between font-medium pt-2 border-t"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <span>Monthly Income</span>
        <span style={{ color: 'var(--monarch-text-dark)' }}>{formatCurrency(monthlyAmount, currencyOpts)}</span>
      </div>
    </div>
  );
}
