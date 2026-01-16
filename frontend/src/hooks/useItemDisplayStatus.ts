/**
 * useItemDisplayStatus Hook
 *
 * Calculates the display status for a recurring item.
 *
 * ## Status Logic (Priority Order)
 *
 * 1. `balance >= amount` → **Funded**: You have enough saved for the bill
 * 2. `budget > target` → **Ahead**: Budgeting more than needed this month
 * 3. `budget >= target` → **On Track**: Meeting your monthly goal
 * 4. `budget < target` → **Behind**: Budgeting less than needed
 *
 * ## Key Concept: Funded vs On Track
 *
 * - **Funded** = You have the money for the upcoming bill (balance >= amount)
 * - **On Track** = You're budgeting enough this month (budget >= target)
 *
 * These are independent! You can be:
 * - Funded but budgeting $0 → Still "Funded" (you have the money)
 * - On Track but not funded → "On Track" (making progress)
 *
 * ## Examples
 *
 * | Expense | Balance | Amount | Budget | Target | Status |
 * |---------|---------|--------|--------|--------|--------|
 * | $600/yr | $600    | $600   | $0     | $0     | Funded |
 * | $600/yr | $600    | $600   | $50    | $0     | Funded |
 * | $600/yr | $300    | $600   | $75    | $50    | Ahead  |
 * | $600/yr | $300    | $600   | $50    | $50    | On Track |
 * | $600/yr | $300    | $600   | $30    | $50    | Behind |
 * | $175/qtr| $175    | $175   | $175   | $175   | Funded |
 * | $78/wk  | $340    | $335   | $340   | $335   | Funded |
 *
 * Usage:
 *   const displayStatus = useItemDisplayStatus(item);
 */

import { useMemo } from 'react';
import type { RecurringItem, ItemStatus } from '../types';

/**
 * Calculate the display status for a recurring item.
 *
 * Pure function that can be used outside of React components.
 *
 * Logic:
 * 1. If balance >= amount (for the bill) → FUNDED
 * 2. Otherwise, compare budget vs target for ahead/on_track/behind
 *
 * The key insight: "Funded" means you have enough saved for the upcoming bill,
 * regardless of what you're currently budgeting this month.
 */
export function calculateItemDisplayStatus(item: RecurringItem): ItemStatus {
  const targetRounded = Math.ceil(item.frozen_monthly_target);
  const budgetRounded = Math.ceil(item.planned_budget);
  const balanceRounded = Math.round(item.current_balance);
  const amountRounded = Math.round(item.amount);
  const isFunded = balanceRounded >= amountRounded;

  // Item is disabled - use backend status
  if (!item.is_enabled) {
    return item.status;
  }

  // FUNDED: You have enough saved for the bill
  // This takes priority - if you have the money, you're funded
  if (isFunded) {
    return 'funded';
  }

  // No target configured yet - fall back to backend status
  if (item.frozen_monthly_target <= 0) {
    return item.status;
  }

  // Not funded yet - determine status based on budget vs target
  // Budgeting more than needed
  if (budgetRounded > targetRounded) return 'ahead';

  // Budgeting exactly what's needed
  if (budgetRounded >= targetRounded) return 'on_track';

  // Budget below target
  return 'behind';
}

/**
 * Hook that returns the calculated display status for a recurring item.
 * Memoized to prevent unnecessary recalculations.
 *
 * @param item - The recurring item to calculate status for
 * @returns The calculated display status
 */
export function useItemDisplayStatus(item: RecurringItem): ItemStatus {
  return useMemo(() => calculateItemDisplayStatus(item), [item]);
}
