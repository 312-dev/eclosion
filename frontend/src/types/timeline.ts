/**
 * Timeline Types
 *
 * Types for the timeline emulator in hypothesize mode.
 * Supports multi-line projection charts, HYSA calculations, and named events.
 */

import type { ItemStatus } from './common';
import type { StashGoalType } from './stash';

/**
 * Resolution level for timeline display.
 * - daily: Shows individual days, max 1 year range
 * - monthly: Default view, supports up to 85 years
 * - yearly: Annual snapshots for long-term planning
 */
export type TimelineResolution = 'daily' | 'monthly' | 'yearly';

/**
 * Type of named event on the timeline.
 * - deposit: One-time lump sum addition to a stash item
 * - rate_change: Changes the monthly contribution rate from this point forward
 */
export type NamedEventType = 'deposit' | 'rate_change';

/**
 * A user-created, named event on the timeline.
 * Events modify projections from their date forward.
 */
export interface NamedEvent {
  /** Unique ID for state management */
  id: string;
  /** User-defined name (required) - e.g., "Tax Refund", "Bonus", "Raise" */
  name: string;
  /** Event type */
  type: NamedEventType;
  /** Target month (YYYY-MM format, e.g., "2026-03") */
  date: string;
  /** Which stash item this primarily affects */
  itemId: string;
  /** Amount in whole dollars (deposit amount or new monthly rate) */
  amount: number;
  /** When this event was created (ISO timestamp) */
  createdAt: string;
}

/**
 * A single data point on the timeline.
 * Contains projected balances for all items at a specific point in time.
 */
export interface TimelineDataPoint {
  /** Date string - format depends on resolution (YYYY-MM-DD or YYYY-MM or YYYY) */
  date: string;
  /** Unix timestamp for sorting and comparison */
  timestamp: number;
  /** Projected balance per item (itemId -> balance in dollars) */
  balances: Record<string, number>;
  /** Cumulative interest earned per item (itemId -> interest in dollars) */
  interestEarned: Record<string, number>;
  /** IDs of events that occur at this point */
  eventIds: string[];
}

/**
 * Configuration for a single item in timeline projection.
 * Derived from StashItem + hypothesize mode allocations + APY settings.
 */
export interface TimelineItemConfig {
  /** Stash item ID */
  itemId: string;
  /** Display name */
  name: string;
  /** Line color on chart (hex or CSS variable) */
  color: string;
  /** Starting balance for projection */
  startingBalance: number;
  /** Monthly contribution rate */
  monthlyRate: number;
  /** Target amount to save */
  targetAmount: number;
  /** Target date for finite goals (ISO string) or null for ongoing */
  targetDate: string | null;
  /** Goal type affects completion behavior */
  goalType: StashGoalType;
  /** Annual Percentage Yield for HYSA (0-1, e.g., 0.045 for 4.5%) */
  apy: number;
  /** Whether this item is visible on the chart */
  isVisible: boolean;
}

/**
 * Zoom state for the timeline.
 */
export interface TimelineZoomState {
  /** Current resolution level */
  resolution: TimelineResolution;
  /** Start of the full data range (ISO date) */
  startDate: string;
  /** End of the full data range (ISO date) */
  endDate: string;
}

/**
 * Projected state for a card at a specific cursor position.
 * Used to update card displays when user selects a time point.
 */
export interface ProjectedCardState {
  /** Stash item ID */
  itemId: string;
  /** Projected balance at cursor date */
  projectedBalance: number;
  /** Calculated status based on projected values */
  projectedStatus: ItemStatus;
  /** Projected progress percent (balance / target * 100) */
  projectedProgressPercent: number;
  /** Months from now to cursor date */
  monthsFromNow: number;
  /** Total interest earned by cursor date (if APY > 0) */
  interestEarned: number;
  /** Monthly target at cursor date (may differ from current if rate changed) */
  projectedMonthlyTarget: number;
}

/**
 * Event currently being edited.
 * Tracks the event and provides context for the edit banner.
 */
export interface EditingEventContext {
  /** The event being edited */
  event: NamedEvent;
  /** Names of stash items affected by this event */
  affectedItemNames: string[];
}

/**
 * Complete timeline state persisted with scenarios.
 */
export interface TimelineScenarioState {
  /** All user-created events */
  events: NamedEvent[];
  /** Per-item APY settings (itemId -> APY as decimal) */
  itemApys: Record<string, number>;
  /** Last cursor position (ISO date or null) */
  cursorDate: string | null;
  /** Last zoom state */
  zoom: TimelineZoomState;
}

/** Threshold for switching from monthly to yearly resolution */
const YEARLY_THRESHOLD_MONTHS = 24;

/**
 * Determine resolution based on range in months.
 * Monthly for ranges <= 2 years, yearly for longer ranges.
 */
function getResolutionForRange(months: number): TimelineResolution {
  return months <= YEARLY_THRESHOLD_MONTHS ? 'monthly' : 'yearly';
}

/**
 * Create fresh default timeline state for new hypothesize sessions.
 * This is a function (not a constant) to ensure dates are calculated at runtime,
 * not at module import time which would cause stale dates.
 */
export function createDefaultTimelineState(): TimelineScenarioState {
  const now = new Date();
  const fiveYearsLater = new Date();
  fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);

  // Calculate months in range to determine correct resolution
  const rangeMonths =
    (fiveYearsLater.getFullYear() - now.getFullYear()) * 12 +
    (fiveYearsLater.getMonth() - now.getMonth());
  const resolution = getResolutionForRange(rangeMonths);

  return {
    events: [],
    itemApys: {},
    cursorDate: null,
    zoom: {
      resolution,
      startDate: now.toISOString().slice(0, 10),
      endDate: fiveYearsLater.toISOString().slice(0, 10),
    },
  };
}

/**
 * Default timeline zoom state for use as fallback.
 * @deprecated Use createDefaultTimelineState() for fresh dates.
 */
export const DEFAULT_TIMELINE_ZOOM: TimelineZoomState = {
  resolution: 'monthly',
  startDate: '', // Empty - must be set at runtime
  endDate: '',
};

/**
 * Result of timeline projection calculation.
 */
export interface TimelineProjectionResult {
  /** Array of data points for the chart */
  dataPoints: TimelineDataPoint[];
  /** Item configurations used for the projection */
  itemConfigs: TimelineItemConfig[];
  /** Projected card states at cursor position (if cursor is set) */
  cursorProjections: Record<string, ProjectedCardState> | null;
}

/**
 * Input parameters for timeline projection calculation.
 */
export interface TimelineProjectionInput {
  /** Item configurations with starting balances and rates */
  items: TimelineItemConfig[];
  /** Named events to apply */
  events: NamedEvent[];
  /** Zoom state determining date range and resolution */
  zoom: TimelineZoomState;
  /** Optional cursor date for calculating projected card states */
  cursorDate: string | null;
}
