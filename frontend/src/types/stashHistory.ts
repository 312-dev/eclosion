/**
 * Stash History Types
 *
 * Types for the stash progress reports feature.
 */

/**
 * Monthly data for a single stash item.
 */
export interface StashMonthData {
  /** Month in YYYY-MM format */
  month: string;
  /** Cumulative balance at end of month */
  balance: number;
  /** Balance change from previous month (balance[n] - balance[n-1]) */
  contribution: number;
}

/**
 * A stash item with its monthly history.
 */
export interface StashHistoryItem {
  /** Stash item ID */
  id: string;
  /** Stash item name */
  name: string;
  /** Target amount for the stash goal */
  target_amount: number;
  /** Monthly history data */
  months: StashMonthData[];
}

/**
 * Response from the /stash/history endpoint.
 */
export interface StashHistoryResponse {
  /** List of stash items with their history */
  items: StashHistoryItem[];
  /** List of months in the response (YYYY-MM format) */
  months: string[];
}

/**
 * Time range options for the reports view.
 */
export type StashReportTimeRange = '3mo' | '6mo' | '12mo' | 'all';

/**
 * Report settings persisted to localStorage.
 */
export interface StashReportSettings {
  /** Selected time range */
  timeRange: StashReportTimeRange;
  /** Whether to show balance lines on the chart */
  showBalanceLines: boolean;
  /** Whether to show monthly contribution bars */
  showMonthlyContributions: boolean;
  /** IDs of stashes to hide (empty = show all) */
  hiddenStashIds: string[];
}

/**
 * Default report settings.
 */
export const DEFAULT_REPORT_SETTINGS: StashReportSettings = {
  timeRange: '12mo',
  showBalanceLines: true,
  showMonthlyContributions: true,
  hiddenStashIds: [],
};

/**
 * Convert time range to number of months.
 */
export function timeRangeToMonths(range: StashReportTimeRange): number {
  switch (range) {
    case '3mo':
      return 3;
    case '6mo':
      return 6;
    case '12mo':
      return 12;
    case 'all':
      return 36; // Max supported by API
  }
}
