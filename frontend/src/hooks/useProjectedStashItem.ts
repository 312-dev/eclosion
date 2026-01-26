/**
 * useProjectedStashItem
 *
 * Provides projected (hypothetical) values for a stash item based on
 * allocations entered in hypothesize mode. Returns the original item
 * when not in hypothesize mode.
 *
 * This enables "what-if" planning where users can see projected balances
 * and progress without affecting actual data.
 *
 * Supports two projection modes:
 * 1. Immediate projection - shows values based on allocations (default)
 * 2. Cursor projection - shows values at a future date on the timeline
 */

import { useMemo } from 'react';
import type { StashItem, ItemStatus } from '../types';
import type { ProjectedCardState } from '../types/timeline';
import { useDistributionMode, useDistributionModeType } from '../context/DistributionModeContext';

export interface ProjectedStashItem extends StashItem {
  /** Whether this item has projected values applied */
  isProjected: boolean;
  /** The stashed allocation amount (new balance) */
  stashedAllocationAmount: number;
  /** The monthly allocation amount (new budget) */
  monthlyAllocationAmount: number;
  /** Original balance before projection */
  originalBalance: number;
  /** Original progress percent before projection */
  originalProgressPercent: number;
  /** Original planned budget before projection */
  originalPlannedBudget: number;
  /** Whether this is a cursor-based (future) projection */
  isCursorProjection: boolean;
  /** Months from now to the cursor date (0 if not cursor projection) */
  cursorMonthsFromNow: number;
  /** Interest earned by cursor date (0 if not cursor projection or no APY) */
  interestEarned: number;
}

/**
 * Calculate projected status based on new balance and target amount.
 */
function calculateProjectedStatus(
  projectedBalance: number,
  targetAmount: number,
  currentBudget: number,
  monthlyTarget: number
): ItemStatus {
  // Funded if balance meets or exceeds target
  if (projectedBalance >= targetAmount) {
    return 'funded';
  }

  // Check budget vs target for on-track status
  if (currentBudget > monthlyTarget) {
    return 'ahead';
  }
  if (currentBudget >= monthlyTarget) {
    return 'on_track';
  }

  return 'behind';
}

/**
 * Hook to get projected stash item values based on hypothesize mode allocations.
 *
 * In hypothesize mode:
 * - stashedAllocation represents the NEW balance (not an addition) - draws from Cash to Stash
 * - monthlyAllocation represents the NEW monthly budget - draws from Left to Budget
 * - progress_percent is recalculated based on new balance
 * - status is recalculated based on new balance and budget
 * - undefined allocation means "not touched" (shows original)
 * - 0 allocation means "explicitly set to $0"
 *
 * With cursor projection:
 * - If cursorProjection is provided, uses those future values
 * - Shows projected balance at the cursor date (including HYSA interest)
 *
 * Outside hypothesize mode:
 * - Returns original item values unchanged
 *
 * @param item - The original stash item
 * @param cursorProjection - Optional cursor projection for future values
 * @returns ProjectedStashItem with projected values (or original if not in hypothesize mode)
 */
export function useProjectedStashItem(
  item: StashItem,
  cursorProjection?: ProjectedCardState | null
): ProjectedStashItem {
  const mode = useDistributionModeType();
  const { stashedAllocations, monthlyAllocations } = useDistributionMode();

  return useMemo(() => {
    const isHypothesizeMode = mode === 'hypothesize';
    const stashedAllocation = stashedAllocations[item.id];
    const monthlyAllocation = monthlyAllocations[item.id];

    // Check if either allocation has been set
    const hasStashedAllocation = stashedAllocation !== undefined;
    const hasMonthlyAllocation = monthlyAllocation !== undefined;
    const hasAnyAllocation = hasStashedAllocation || hasMonthlyAllocation;

    // Base values for non-projected items
    const baseProjectedItem: ProjectedStashItem = {
      ...item,
      isProjected: false,
      stashedAllocationAmount: 0,
      monthlyAllocationAmount: 0,
      originalBalance: item.current_balance,
      originalProgressPercent: item.progress_percent,
      originalPlannedBudget: item.planned_budget,
      isCursorProjection: false,
      cursorMonthsFromNow: 0,
      interestEarned: 0,
    };

    // If not in hypothesize mode, return original item
    if (!isHypothesizeMode) {
      return baseProjectedItem;
    }

    // If cursor projection is provided, use future projected values
    if (cursorProjection) {
      return {
        ...item,
        current_balance: cursorProjection.projectedBalance,
        planned_budget: cursorProjection.projectedMonthlyTarget,
        progress_percent: cursorProjection.projectedProgressPercent,
        status: cursorProjection.projectedStatus,
        isProjected: true,
        stashedAllocationAmount: stashedAllocation ?? 0,
        monthlyAllocationAmount: monthlyAllocation ?? 0,
        originalBalance: item.current_balance,
        originalProgressPercent: item.progress_percent,
        originalPlannedBudget: item.planned_budget,
        isCursorProjection: true,
        cursorMonthsFromNow: cursorProjection.monthsFromNow,
        interestEarned: cursorProjection.interestEarned,
      };
    }

    // If no allocations set, return original item
    if (!hasAnyAllocation) {
      return baseProjectedItem;
    }

    // Use immediate projection (allocations only)
    const projectedBalance = hasStashedAllocation ? stashedAllocation : item.current_balance;
    const projectedBudget = hasMonthlyAllocation ? monthlyAllocation : item.planned_budget;

    const projectedProgressPercent =
      item.amount > 0 ? Math.min(100, (projectedBalance / item.amount) * 100) : 0;
    const projectedStatus = calculateProjectedStatus(
      projectedBalance,
      item.amount,
      projectedBudget,
      item.monthly_target
    );

    return {
      ...item,
      current_balance: projectedBalance,
      planned_budget: projectedBudget,
      progress_percent: projectedProgressPercent,
      status: projectedStatus,
      isProjected: true,
      stashedAllocationAmount: stashedAllocation ?? 0,
      monthlyAllocationAmount: monthlyAllocation ?? 0,
      originalBalance: item.current_balance,
      originalProgressPercent: item.progress_percent,
      originalPlannedBudget: item.planned_budget,
      isCursorProjection: false,
      cursorMonthsFromNow: 0,
      interestEarned: 0,
    };
  }, [item, mode, stashedAllocations, monthlyAllocations, cursorProjection]);
}

/**
 * Hook to get all projected stash items at once.
 * Useful for components that need to display multiple items with projections.
 *
 * @param items - Array of original stash items
 * @param cursorProjections - Optional map of cursor projections (itemId -> ProjectedCardState)
 * @returns Array of ProjectedStashItems
 */
export function useProjectedStashItems(
  items: StashItem[],
  cursorProjections?: Record<string, ProjectedCardState> | null
): ProjectedStashItem[] {
  const mode = useDistributionModeType();
  const { stashedAllocations, monthlyAllocations } = useDistributionMode();

  return useMemo(() => {
    const isHypothesizeMode = mode === 'hypothesize';

    return items.map((item) => {
      const stashedAllocation = stashedAllocations[item.id];
      const monthlyAllocation = monthlyAllocations[item.id];

      const hasStashedAllocation = stashedAllocation !== undefined;
      const hasMonthlyAllocation = monthlyAllocation !== undefined;
      const hasAnyAllocation = hasStashedAllocation || hasMonthlyAllocation;

      // Base values for non-projected items
      const baseItem: ProjectedStashItem = {
        ...item,
        isProjected: false,
        stashedAllocationAmount: 0,
        monthlyAllocationAmount: 0,
        originalBalance: item.current_balance,
        originalProgressPercent: item.progress_percent,
        originalPlannedBudget: item.planned_budget,
        isCursorProjection: false,
        cursorMonthsFromNow: 0,
        interestEarned: 0,
      };

      // If not in hypothesize mode, return original
      if (!isHypothesizeMode) {
        return baseItem;
      }

      // Check for cursor projection
      const cursorProjection = cursorProjections?.[item.id];
      if (cursorProjection) {
        return {
          ...item,
          current_balance: cursorProjection.projectedBalance,
          planned_budget: cursorProjection.projectedMonthlyTarget,
          progress_percent: cursorProjection.projectedProgressPercent,
          status: cursorProjection.projectedStatus,
          isProjected: true,
          stashedAllocationAmount: stashedAllocation ?? 0,
          monthlyAllocationAmount: monthlyAllocation ?? 0,
          originalBalance: item.current_balance,
          originalProgressPercent: item.progress_percent,
          originalPlannedBudget: item.planned_budget,
          isCursorProjection: true,
          cursorMonthsFromNow: cursorProjection.monthsFromNow,
          interestEarned: cursorProjection.interestEarned,
        };
      }

      // If no allocations set, return original
      if (!hasAnyAllocation) {
        return baseItem;
      }

      // Use immediate projection (allocations only)
      const projectedBalance = hasStashedAllocation ? stashedAllocation : item.current_balance;
      const projectedBudget = hasMonthlyAllocation ? monthlyAllocation : item.planned_budget;

      const projectedProgressPercent =
        item.amount > 0 ? Math.min(100, (projectedBalance / item.amount) * 100) : 0;
      const projectedStatus = calculateProjectedStatus(
        projectedBalance,
        item.amount,
        projectedBudget,
        item.monthly_target
      );

      return {
        ...item,
        current_balance: projectedBalance,
        planned_budget: projectedBudget,
        progress_percent: projectedProgressPercent,
        status: projectedStatus,
        isProjected: true,
        stashedAllocationAmount: stashedAllocation ?? 0,
        monthlyAllocationAmount: monthlyAllocation ?? 0,
        originalBalance: item.current_balance,
        originalProgressPercent: item.progress_percent,
        originalPlannedBudget: item.planned_budget,
        isCursorProjection: false,
        cursorMonthsFromNow: 0,
        interestEarned: 0,
      };
    });
  }, [items, mode, stashedAllocations, monthlyAllocations, cursorProjections]);
}
