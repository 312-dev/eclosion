/**
 * Demo Stash Utilities
 *
 * Shared helper functions for stash demo mode operations.
 */

import type { StashItem } from '../../types';
import {
  calculateStashMonthlyTarget,
  calculateMonthsRemaining,
  calculateProgressPercent,
  calculateShortfall,
} from '../../utils/savingsCalculations';

/**
 * Recompute derived values for a stash item.
 */
export function recomputeItem(item: StashItem): StashItem {
  const monthsRemaining = calculateMonthsRemaining(item.target_date);
  // Use current_balance minus planned_budget for target calculation
  // This way transaction inflows reduce the target, but budget allocations don't
  const effectiveBalanceForTarget = item.current_balance - item.planned_budget;
  const monthlyTarget = calculateStashMonthlyTarget(
    item.amount,
    effectiveBalanceForTarget,
    item.target_date
  );
  const progressPercent = calculateProgressPercent(item.current_balance, item.amount);
  const shortfall = calculateShortfall(item.current_balance, item.amount);

  // Determine status
  let status: StashItem['status'];
  if (item.current_balance >= item.amount) {
    status = 'funded';
  } else if (item.planned_budget >= monthlyTarget) {
    status = item.planned_budget > monthlyTarget ? 'ahead' : 'on_track';
  } else {
    status = 'behind';
  }

  return {
    ...item,
    months_remaining: monthsRemaining,
    monthly_target: monthlyTarget,
    progress_percent: progressPercent,
    shortfall,
    status,
    // Preserve rollover_amount and credits_this_month (set in demo data or mutations)
    rollover_amount: item.rollover_amount ?? 0,
    credits_this_month: item.credits_this_month ?? 0,
  };
}

/**
 * Recompute totals for stash data.
 */
export function recomputeTotals(data: {
  items: StashItem[];
  archived_items: StashItem[];
  total_target?: number;
  total_saved?: number;
  total_monthly_target?: number;
}): {
  items: StashItem[];
  archived_items: StashItem[];
  total_target: number;
  total_saved: number;
  total_monthly_target: number;
} {
  const items = data.items.map(recomputeItem);
  const archivedItems = data.archived_items.map(recomputeItem);

  return {
    items,
    archived_items: archivedItems,
    total_target: items.reduce((sum, item) => sum + item.amount, 0),
    total_saved: items.reduce((sum, item) => sum + item.current_balance, 0),
    total_monthly_target: items.reduce((sum, item) => sum + item.monthly_target, 0),
  };
}
