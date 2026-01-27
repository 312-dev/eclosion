/**
 * HYSA (High-Yield Savings Account) Utilities
 *
 * Formatting helpers for APY display.
 */

/**
 * Format APY as a percentage string.
 *
 * @param apy - Annual Percentage Yield (0-1)
 * @returns Formatted string like "4.5%" or "0%"
 */
export function formatAPY(apy: number): string {
  if (apy === 0) return '0%';
  const percent = apy * 100;
  // Use 1 decimal place if not a whole number
  return percent % 1 === 0 ? `${percent}%` : `${percent.toFixed(1)}%`;
}
