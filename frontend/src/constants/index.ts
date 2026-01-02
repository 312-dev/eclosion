/**
 * Application Constants
 *
 * Centralized configuration values to avoid magic numbers.
 */

// ============================================================================
// Toast Durations (milliseconds)
// ============================================================================

export const TOAST_DURATION = {
  DEFAULT: 3000,
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
} as const;

// ============================================================================
// Query Cache Times (milliseconds)
// ============================================================================

export const CACHE_TIME = {
  /** Short-lived data like unmapped categories */
  SHORT: 1 * 60 * 1000, // 1 minute
  /** Standard data like dashboard */
  STANDARD: 2 * 60 * 1000, // 2 minutes
  /** Stable data like category groups */
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  /** Rarely changing data like deployment info */
  LONG: 10 * 60 * 1000, // 10 minutes
  /** Changelog polling interval */
  VERSION_CHECK: 30 * 60 * 1000, // 30 minutes
} as const;

// ============================================================================
// API Configuration
// ============================================================================

export const API_CONFIG = {
  /** Default retry count for failed requests */
  RETRY_COUNT: 1,
  /** Default rate limit retry delay (seconds) */
  RATE_LIMIT_DEFAULT_DELAY: 60,
} as const;

// ============================================================================
// Local Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  LANDING_PAGE: 'eclosion-landing-page',
  THEME: 'eclosion-theme',
} as const;

// ============================================================================
// UI Constants
// ============================================================================

export const UI = {
  /** Animation durations */
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  /** Debounce delays */
  DEBOUNCE: {
    SEARCH: 300,
    RESIZE: 150,
  },
} as const;

// ============================================================================
// Layout Dimensions
// ============================================================================

export const LAYOUT = {
  /** Dropdown menu widths */
  DROPDOWN: {
    CATEGORY_GROUP: 180,
    ACTIONS: 180,
    EMOJI_PICKER: 200,
    FILTER: 120,
  },
  /** Modal/popover widths */
  MODAL: {
    TOUR_POPOVER: 300,
    WIZARD_CARD: 340,
  },
  /** Sidebar dimensions */
  SIDEBAR: {
    WIDTH: 220,
    STATS_WIDTH: 280,
  },
  /** Spacing */
  SPACING: {
    DROPDOWN_OFFSET: 4,
    POPOVER_OFFSET: 8,
  },
} as const;
