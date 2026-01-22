/**
 * Demo Stash History API
 *
 * Generates mock historical data for the Reports tab in demo mode.
 * Simulates gradual progress toward stash goals over time.
 */

import { getDemoState, simulateDelay } from './demoState';
import type { StashHistoryResponse, StashHistoryItem, StashMonthData } from '../../types';

/**
 * Generate a list of month strings going back N months from today.
 */
function generateMonthList(months: number): string[] {
  const result: string[] = [];
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    result.push(`${year}-${month}`);
  }

  return result;
}

/**
 * Generate realistic mock history for a stash item.
 *
 * Simulates gradual progress with some variation:
 * - Start from 0 or a small initial balance
 * - Add monthly contributions that trend toward the monthly target
 * - Include some months with higher/lower contributions for realism
 */
function generateItemHistory(
  item: {
    id: string;
    name: string;
    amount: number;
    current_balance: number;
    monthly_target: number;
    created_at?: string | null | undefined;
  },
  months: string[]
): StashHistoryItem {
  const monthData: StashMonthData[] = [];

  // Determine how many months the item has existed
  const createdDate = item.created_at ? new Date(item.created_at) : new Date();
  const createdMonth = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;

  // Work backwards from current balance to generate history
  // We'll reverse-engineer a plausible history
  const currentBalance = item.current_balance;
  const monthlyTarget = item.monthly_target || Math.round(item.amount / 12);

  // Generate balances for each month
  let balance = 0;
  let prevBalance = 0;

  for (const month of months) {
    // Skip months before the item was created
    if (month < createdMonth) {
      monthData.push({
        month,
        balance: 0,
        contribution: 0,
      });
      continue;
    }

    // For months the item existed, simulate contributions
    // Add some randomness for realism
    const isCurrentMonth = month === months.at(-1);

    if (isCurrentMonth) {
      // Current month should match current balance
      balance = currentBalance;
    } else {
      // Historical months: gradual progress with variation
      const targetForMonth = monthlyTarget;
      const variation = 0.3; // 30% variation
      const randomFactor = 1 + (Math.random() - 0.5) * variation * 2;
      const contribution = Math.round(targetForMonth * randomFactor);

      // Don't exceed target amount
      balance = Math.min(item.amount, prevBalance + Math.max(0, contribution));
    }

    const contribution = balance - prevBalance;

    monthData.push({
      month,
      balance,
      contribution,
    });

    prevBalance = balance;
  }

  return {
    id: item.id,
    name: item.name,
    target_amount: item.amount,
    months: monthData,
  };
}

/**
 * Get stash history data for the Reports tab.
 *
 * @param months - Number of months of history (default: 12)
 */
export async function getStashHistory(months = 12): Promise<StashHistoryResponse> {
  await simulateDelay();

  const state = getDemoState();
  const monthList = generateMonthList(months);

  // Filter to active (non-archived) items only
  const activeItems = state.stash.items.filter((item) => !item.is_archived);

  const items: StashHistoryItem[] = activeItems.map((item) =>
    generateItemHistory(
      {
        id: item.id,
        name: item.name,
        amount: item.amount,
        current_balance: item.current_balance,
        monthly_target: item.monthly_target,
        created_at: item.created_at,
      },
      monthList
    )
  );

  return {
    items,
    months: monthList,
  };
}
