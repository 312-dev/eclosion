/**
 * Calculation Utilities
 *
 * Shared calculation functions that must match backend Python implementations.
 * These are used by both demo mode and potentially other frontend code.
 *
 * IMPORTANT: These functions mirror backend logic. If the Python implementation
 * changes, these must be updated to match. See parity tests in calculations.test.ts.
 *
 * Rounding Policy:
 * - Monthly targets use round() instead of ceil() to minimize overbudgeting
 * - Minimum $1/mo for any non-zero rate (prevents showing $0 for small expenses)
 * - Self-corrects: if slightly behind, rate increases as due date approaches
 */

/**
 * Round to nearest dollar, minimum $1 for non-zero rates.
 *
 * Uses standard rounding (round half up) for consistency.
 * Returns 0 for zero/negative rates (fully funded).
 *
 * This minimizes overbudgeting compared to ceil() while ensuring:
 * - Small expenses ($5/year) still show at least $1/mo
 * - The system self-corrects via monthly recalculation
 *
 * @param rate - The calculated monthly rate
 * @returns The rounded rate (minimum $1 if rate > 0)
 */
export function roundMonthlyRate(rate: number): number {
  if (rate <= 0) return 0;
  return Math.max(1, Math.round(rate));
}

/**
 * Calculate the frozen monthly target for a recurring item.
 *
 * This mirrors the logic from services/frozen_target_calculator.py `_calculate_target`.
 *
 * The frozen target is the amount a user needs to save each month to reach their
 * goal by the due date. It's "frozen" because it's calculated at the start of
 * each month and doesn't change mid-month.
 *
 * For sub-monthly items (weekly, bi-weekly):
 *   - Target is the monthly equivalent minus what you have
 *   - Example: $78/week → $78/0.25 = $312/month equivalent
 *
 * For monthly items:
 *   - Target is the shortfall: what's still needed to cover this month's expense
 *   - Example: $80 rent, $50 saved → target is $30
 *
 * For infrequent items (quarterly, yearly, etc.):
 *   - Target is the shortfall spread across remaining months
 *   - Example: $600 yearly insurance, $300 saved, 6 months left → $50/month
 *   - If already fully funded, target is $0
 *
 * @param amount - Per-occurrence expense amount
 * @param frequencyMonths - How many months between charges (0.25 = weekly, 1 = monthly, 12 = yearly)
 * @param monthsUntilDue - Months remaining until next payment
 * @param currentBalance - Current saved balance
 * @returns The monthly target amount (rounded to nearest dollar, min $1 if non-zero)
 */
export function calculateFrozenTarget(
  amount: number,
  frequencyMonths: number,
  monthsUntilDue: number,
  currentBalance: number
): number {
  if (frequencyMonths < 1) {
    // Sub-monthly (weekly, bi-weekly): use monthly equivalent
    // $78/week → $312/month
    const monthlyEquivalent = amount / frequencyMonths;
    return roundMonthlyRate(Math.max(0, monthlyEquivalent - currentBalance));
  } else if (frequencyMonths === 1) {
    // Monthly items: target is the shortfall (what's still needed)
    return roundMonthlyRate(Math.max(0, amount - currentBalance));
  } else {
    // Infrequent subscriptions - calculate catch-up rate
    const shortfall = Math.max(0, amount - currentBalance);
    const monthsRemaining = Math.max(1, monthsUntilDue);
    if (shortfall > 0) {
      return roundMonthlyRate(shortfall / monthsRemaining);
    }
    return 0;
  }
}
