/**
 * Formatting Utilities
 *
 * Centralized formatting functions for currency, dates, and frequencies.
 * Eliminates duplication across RecurringList, RollupZone, and ReadyToAssign.
 */

/**
 * Format a number as USD currency.
 *
 * @param amount - The amount to format
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
  amount: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const maxDigits = options?.maximumFractionDigits ?? 2;
  const minDigits = options?.minimumFractionDigits ?? Math.min(2, maxDigits);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(amount);
}

/**
 * Frequency labels for display.
 */
export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Every week',
  every_two_weeks: 'Every 2 weeks',
  twice_a_month: 'Twice a month',
  monthly: 'Every month',
  quarterly: 'Every 3 months',
  semiyearly: 'Every 6 months',
  yearly: 'Every year',
};

/**
 * Short frequency labels for compact display.
 */
export const FREQUENCY_SHORT_LABELS: Record<string, string> = {
  weekly: 'weekly',
  every_two_weeks: 'biweekly',
  twice_a_month: '2x/mo',
  monthly: 'monthly',
  quarterly: 'quarterly',
  semiyearly: 'semiannually',
  yearly: 'annually',
};

/**
 * Frequency sort order (most frequent first).
 */
export const FREQUENCY_ORDER: Record<string, number> = {
  weekly: 1,
  every_two_weeks: 2,
  twice_a_month: 3,
  monthly: 4,
  quarterly: 5,
  semiyearly: 6,
  yearly: 7,
};

/**
 * Format a frequency string for display.
 *
 * @param freq - The frequency key (e.g., "monthly", "yearly")
 * @returns Human-readable frequency (e.g., "Every month")
 */
export function formatFrequency(freq: string): string {
  return FREQUENCY_LABELS[freq] || freq;
}

/**
 * Format a frequency string in short form.
 *
 * @param freq - The frequency key (e.g., "monthly", "yearly")
 * @returns Short frequency label (e.g., "monthly", "annually")
 */
export function formatFrequencyShort(freq: string): string {
  return FREQUENCY_SHORT_LABELS[freq] || freq;
}

/**
 * Result of relative date formatting.
 */
export interface RelativeDateResult {
  /** Formatted date string (e.g., "Jan 15" or "Jan 15 '25") */
  date: string;
  /** Relative time string (e.g., "in 5 days", "Tomorrow") */
  relative: string;
}

/**
 * Format a date string with both absolute and relative representations.
 *
 * @param dateStr - ISO date string (YYYY-MM-DD)
 * @returns Object with formatted date and relative time
 */
export function formatDateRelative(dateStr: string): RelativeDateResult {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Format date - include year with apostrophe if different year
  const currentYear = today.getFullYear();
  const dateYear = date.getFullYear();
  let formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (dateYear !== currentYear) {
    formatted += ` '${String(dateYear).slice(-2)}`;
  }

  let relative = '';
  if (diffDays === 0) {
    relative = 'Today';
  } else if (diffDays === 1) {
    relative = 'Tomorrow';
  } else if (diffDays < 0) {
    relative = `${Math.abs(diffDays)} days ago`;
  } else if (diffDays <= 30) {
    relative = `in ${diffDays} days`;
  } else {
    // Calculate months for longer durations
    const months = Math.round(diffDays / 30);
    relative = months === 1 ? 'in 1 month' : `in ${months} months`;
  }

  return { date: formatted, relative };
}

/**
 * Format a number as a percentage.
 *
 * @param value - The value to format (0-100 or 0-1 depending on isDecimal)
 * @param isDecimal - If true, treats value as decimal (0-1), otherwise as percentage (0-100)
 * @returns Formatted percentage string (e.g., "75%")
 */
export function formatPercent(value: number, isDecimal = false): string {
  const percent = isDecimal ? value * 100 : value;
  return `${Math.round(percent)}%`;
}
