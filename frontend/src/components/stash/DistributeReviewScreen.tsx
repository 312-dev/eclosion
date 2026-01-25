/**
 * DistributeReviewScreen Component
 *
 * Review screen for the distribution wizard showing a summary of all
 * allocations before applying them. Shows new balances with green deltas
 * and monthly budget amounts.
 */

import type { StashItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface DistributeReviewScreenProps {
  /** Savings allocations (balance boosts) by item ID */
  readonly savingsAllocations: Record<string, number>;
  /** Monthly budget allocations by item ID */
  readonly monthlyAllocations: Record<string, number>;
  /** List of stash items */
  readonly items: StashItem[];
}

/** Format currency options for whole dollars */
const currencyOpts = { maximumFractionDigits: 0 };

export function DistributeReviewScreen({
  savingsAllocations,
  monthlyAllocations,
  items,
}: DistributeReviewScreenProps) {
  // Filter items that have allocations
  const itemsWithSavings = items.filter((item) => (savingsAllocations[item.id] ?? 0) > 0);
  const itemsWithMonthly = items.filter((item) => (monthlyAllocations[item.id] ?? 0) > 0);

  // Calculate totals
  const totalSavings = Object.values(savingsAllocations).reduce((sum, val) => sum + val, 0);
  const totalMonthly = Object.values(monthlyAllocations).reduce((sum, val) => sum + val, 0);

  const hasSavings = totalSavings > 0;
  const hasMonthly = totalMonthly > 0;

  return (
    <div className="flex flex-col min-h-0 flex-1 px-4 py-2">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {/* Balance Changes Section */}
        {hasSavings && (
          <div>
            <h4 className="text-sm font-medium text-monarch-text-muted mb-2">
              Balance Changes
            </h4>
            <div className="bg-monarch-bg-hover rounded-lg divide-y divide-monarch-border">
              {itemsWithSavings.map((item) => {
                const allocation = savingsAllocations[item.id] ?? 0;
                const newBalance = item.current_balance + allocation;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm text-monarch-text-dark truncate flex-1 mr-2">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-monarch-text-dark">
                        {formatCurrency(newBalance, currencyOpts)}
                      </span>
                      <span className="text-sm font-medium text-monarch-success">
                        (+{formatCurrency(allocation, currencyOpts)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Monthly Budgets Section */}
        {hasMonthly && (
          <div>
            <h4 className="text-sm font-medium text-monarch-text-muted mb-2">
              Monthly Budgets
            </h4>
            <div className="bg-monarch-bg-hover rounded-lg divide-y divide-monarch-border">
              {itemsWithMonthly.map((item) => {
                const allocation = monthlyAllocations[item.id] ?? 0;
                const currentBudget = item.planned_budget ?? 0;
                const newBudget = currentBudget + allocation;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm text-monarch-text-dark truncate flex-1 mr-2">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-monarch-text-muted">
                        {formatCurrency(currentBudget, currencyOpts)}/mo
                      </span>
                      <span className="text-monarch-text-muted">→</span>
                      <span className="text-sm font-medium text-monarch-text-dark">
                        {formatCurrency(newBudget, currencyOpts)}/mo
                      </span>
                      <span className="text-sm font-medium text-monarch-success">
                        (+{formatCurrency(allocation, currencyOpts)})
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="pt-3 mt-3 border-t border-monarch-border">
        <div className="flex items-center justify-center gap-2 text-sm text-monarch-text-muted">
          {hasSavings && (
            <span className="text-monarch-success font-medium">
              +{formatCurrency(totalSavings, currencyOpts)} to stash balances
            </span>
          )}
          {hasSavings && hasMonthly && <span>•</span>}
          {hasMonthly && (
            <span className="text-monarch-success font-medium">
              +{formatCurrency(totalMonthly, currencyOpts)}/mo to stashes
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
