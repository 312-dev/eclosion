/**
 * BreakdownTooltip
 *
 * Tooltip content showing the Available Funds calculation breakdown.
 */

import { BreakdownRow } from './BreakdownRow';
import type { AvailableToStashBreakdown, DetailedBreakdown } from '../../types';

interface BreakdownTooltipProps {
  readonly breakdown: AvailableToStashBreakdown;
  readonly detailedBreakdown: DetailedBreakdown;
  readonly includeExpectedIncome: boolean;
  readonly statusColor: string;
  readonly formattedAmount: string;
  readonly onExpand: () => void;
}

export function BreakdownTooltip({
  breakdown,
  detailedBreakdown,
  includeExpectedIncome,
  statusColor,
  formattedAmount,
  onExpand,
}: BreakdownTooltipProps) {
  return (
    <div className="text-sm space-y-2 min-w-56">
      <div
        className="font-medium border-b pb-1 mb-2"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        Cash to Stash
      </div>
      <div className="space-y-1">
        <BreakdownRow
          label="Cash on hand"
          amount={breakdown.cashOnHand}
          isPositive
          items={detailedBreakdown.cashAccounts}
          onExpand={onExpand}
        />
        <BreakdownRow
          label="Remaining goal funds"
          amount={breakdown.goalBalances}
          items={detailedBreakdown.goals}
          onExpand={onExpand}
        />
        {includeExpectedIncome && breakdown.expectedIncome > 0 && (
          <BreakdownRow label="Expected income" amount={breakdown.expectedIncome} isPositive />
        )}
        <BreakdownRow
          label="Credit card debt"
          amount={breakdown.creditCardDebt}
          items={detailedBreakdown.creditCards}
          onExpand={onExpand}
        />
        <BreakdownRow
          label="Unspent budgets"
          amount={breakdown.unspentBudgets}
          items={detailedBreakdown.unspentCategories}
          onExpand={onExpand}
        />
        <BreakdownRow
          label="Stash balances"
          amount={breakdown.stashBalances}
          items={detailedBreakdown.stashItems}
          onExpand={onExpand}
        />
        {breakdown.bufferAmount > 0 && (
          <BreakdownRow label="Reserved buffer" amount={breakdown.bufferAmount} />
        )}
      </div>
      <div
        className="flex justify-between font-medium pt-2 border-t"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <span>Available</span>
        <span style={{ color: statusColor }}>{formattedAmount}</span>
      </div>
    </div>
  );
}
