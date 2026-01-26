/**
 * Stash Event Types
 *
 * Events are ephemeral modifiers for hypothetical projection calculations.
 * They are NOT persisted - only used within the Distribute wizard session.
 */

/**
 * Event type: one-time deposit or monthly rate change
 * - '1x': Adds a lump sum in a specific month
 * - 'mo': Changes the contribution rate from that month forward
 */
export type StashEventType = '1x' | 'mo';

/**
 * A hypothetical event that modifies projection calculations.
 */
export interface StashEvent {
  /** Unique ID for React key and state management */
  id: string;
  /** Event type: '1x' for one-time, 'mo' for rate change */
  type: StashEventType;
  /** Amount in whole dollars */
  amount: number;
  /** Target month (YYYY-MM format, e.g., "2026-03") */
  month: string;
}

/**
 * Events grouped by stash item ID.
 * Each stash item can have up to 10 events.
 */
export type StashEventsMap = Record<string, StashEvent[]>;
