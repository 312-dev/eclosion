/**
 * useTimelineProjection Hook
 *
 * Generates memoized timeline projection data from stash items,
 * hypothesize allocations, events, and APY settings.
 */

import { useMemo } from 'react';
import type { StashItem } from '../types';
import type { TimelineItemConfig, TimelineProjectionResult } from '../types/timeline';
import { useDistributionMode } from '../context/DistributionModeContext';
import { generateTimelineProjection, getItemColor } from '../utils/timelineProjection';

interface UseTimelineProjectionOptions {
  /** Stash items to project */
  items: StashItem[];
  /** Whether to include monarch goals */
  includeMonarchGoals?: boolean;
}

/**
 * Generate timeline projection data for the chart.
 * Memoized to prevent recalculation on every render.
 */
export function useTimelineProjection({
  items,
}: UseTimelineProjectionOptions): TimelineProjectionResult {
  const {
    mode,
    stashedAllocations,
    monthlyAllocations,
    timelineEvents,
    itemApys,
    cursorDate,
    timelineZoom,
  } = useDistributionMode();

  // Build item configurations from stash items + hypothesize state
  const itemConfigs = useMemo((): TimelineItemConfig[] => {
    return items.map((item, index) => {
      // Get hypothesized values or fall back to actual values
      const stashedAllocation = stashedAllocations[item.id];
      const monthlyAllocation = monthlyAllocations[item.id];

      // Starting balance: hypothesized stash allocation (new balance) or current balance
      const startingBalance =
        stashedAllocation === undefined ? item.current_balance : stashedAllocation;

      // Monthly rate: hypothesized monthly allocation (new rate) or current planned budget
      const monthlyRate = monthlyAllocation === undefined ? item.planned_budget : monthlyAllocation;

      // APY from settings or 0
      const apy = itemApys[item.id] ?? 0;

      return {
        itemId: item.id,
        name: item.name,
        color: getItemColor(index),
        startingBalance,
        monthlyRate,
        targetAmount: item.amount,
        targetDate: item.target_date || null,
        goalType: item.goal_type,
        apy,
        isVisible: true,
      };
    });
  }, [items, stashedAllocations, monthlyAllocations, itemApys]);

  // Generate projection data
  const projection = useMemo((): TimelineProjectionResult => {
    // Only generate if in hypothesize mode
    if (mode !== 'hypothesize' || itemConfigs.length === 0) {
      return {
        dataPoints: [],
        itemConfigs: [],
        cursorProjections: null,
      };
    }

    return generateTimelineProjection({
      items: itemConfigs,
      events: timelineEvents,
      zoom: timelineZoom,
      cursorDate,
    });
  }, [mode, itemConfigs, timelineEvents, timelineZoom, cursorDate]);

  return projection;
}

/**
 * Get the item configuration for a specific stash item.
 * Useful for components that need config for a single item.
 */
export function useTimelineItemConfig(item: StashItem, index: number = 0): TimelineItemConfig {
  const { stashedAllocations, monthlyAllocations, itemApys } = useDistributionMode();

  return useMemo(() => {
    const stashedAllocation = stashedAllocations[item.id];
    const monthlyAllocation = monthlyAllocations[item.id];

    const startingBalance =
      stashedAllocation === undefined ? item.current_balance : stashedAllocation;

    const monthlyRate = monthlyAllocation === undefined ? item.planned_budget : monthlyAllocation;

    const apy = itemApys[item.id] ?? 0;

    return {
      itemId: item.id,
      name: item.name,
      color: getItemColor(index),
      startingBalance,
      monthlyRate,
      targetAmount: item.amount,
      targetDate: item.target_date || null,
      goalType: item.goal_type,
      apy,
      isVisible: true,
    };
  }, [item, index, stashedAllocations, monthlyAllocations, itemApys]);
}
