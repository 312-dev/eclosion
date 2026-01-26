/**
 * HYSA (High-Yield Savings Account) Calculations
 *
 * Provides compound interest calculations for timeline projections.
 * Uses monthly compounding: balance = balance * (1 + APY/12)
 */

/**
 * Calculate balance after one month with HYSA interest.
 * Applies monthly contribution at start of month, then compounds interest.
 *
 * @param balance - Current balance before contribution
 * @param monthlyContribution - Amount to add this month
 * @param apy - Annual Percentage Yield (0-1, e.g., 0.045 for 4.5%)
 * @returns New balance after contribution and interest
 */
export function calculateMonthWithHYSA(
  balance: number,
  monthlyContribution: number,
  apy: number
): number {
  // Add contribution at start of month
  const newBalance = balance + monthlyContribution;
  // Apply monthly interest
  const monthlyRate = apy / 12;
  return newBalance * (1 + monthlyRate);
}

/**
 * Calculate the interest earned in a single month.
 *
 * @param balance - Balance at start of month (after contribution)
 * @param apy - Annual Percentage Yield (0-1)
 * @returns Interest earned this month
 */
export function calculateMonthlyInterest(balance: number, apy: number): number {
  const monthlyRate = apy / 12;
  return balance * monthlyRate;
}

/**
 * Calculate total balance after N months with compound interest.
 * Useful for quick projections without step-by-step simulation.
 *
 * Formula: FV = P(1 + r)^n + PMT * ((1 + r)^n - 1) / r
 * Where:
 *   P = principal (starting balance)
 *   r = monthly rate (APY/12)
 *   n = number of months
 *   PMT = monthly contribution
 *
 * @param principal - Starting balance
 * @param monthlyContribution - Amount added each month
 * @param apy - Annual Percentage Yield (0-1)
 * @param months - Number of months
 * @returns Final balance after compounding
 */
export function calculateFutureValue(
  principal: number,
  monthlyContribution: number,
  apy: number,
  months: number
): number {
  if (months <= 0) return principal;
  if (apy === 0) {
    // No interest - simple addition
    return principal + monthlyContribution * months;
  }

  const r = apy / 12;
  const compoundFactor = Math.pow(1 + r, months);

  // Future value of principal
  const principalFV = principal * compoundFactor;

  // Future value of annuity (monthly contributions)
  // Using annuity due formula (contributions at start of each period)
  const annuityFV = monthlyContribution * ((compoundFactor - 1) / r) * (1 + r);

  return principalFV + annuityFV;
}

/**
 * Calculate total interest earned over N months.
 *
 * @param principal - Starting balance
 * @param monthlyContribution - Amount added each month
 * @param apy - Annual Percentage Yield (0-1)
 * @param months - Number of months
 * @returns Total interest earned (not including contributions)
 */
export function calculateTotalInterest(
  principal: number,
  monthlyContribution: number,
  apy: number,
  months: number
): number {
  if (apy === 0 || months <= 0) return 0;

  const finalBalance = calculateFutureValue(principal, monthlyContribution, apy, months);
  const totalContributed = principal + monthlyContribution * months;

  return finalBalance - totalContributed;
}

/**
 * Calculate months needed to reach target with compound interest.
 * Uses iterative approach since there's no closed-form solution
 * when contributions are involved.
 *
 * @param principal - Starting balance
 * @param monthlyContribution - Amount added each month
 * @param apy - Annual Percentage Yield (0-1)
 * @param target - Target balance to reach
 * @param maxMonths - Maximum months to search (default: 1020 = 85 years)
 * @returns Number of months to reach target, or null if won't reach in maxMonths
 */
export function calculateMonthsToTarget(
  principal: number,
  monthlyContribution: number,
  apy: number,
  target: number,
  maxMonths: number = 1020
): number | null {
  // Already at or above target
  if (principal >= target) return 0;

  // No contributions and no interest means never reaching target
  if (monthlyContribution <= 0 && apy <= 0) return null;

  let balance = principal;
  const monthlyRate = apy / 12;

  for (let month = 1; month <= maxMonths; month++) {
    // Add contribution at start of month
    balance += monthlyContribution;
    // Apply interest
    balance *= 1 + monthlyRate;

    if (balance >= target) {
      return month;
    }
  }

  return null; // Won't reach target in maxMonths
}

/**
 * Generate month-by-month projection with HYSA interest.
 * Returns detailed data for each month including balance and interest earned.
 *
 * @param principal - Starting balance
 * @param monthlyContribution - Amount added each month
 * @param apy - Annual Percentage Yield (0-1)
 * @param months - Number of months to project
 * @returns Array of monthly snapshots
 */
export function generateMonthlyProjectionWithHYSA(
  principal: number,
  monthlyContribution: number,
  apy: number,
  months: number
): Array<{ month: number; balance: number; interestEarned: number }> {
  const results: Array<{
    month: number;
    balance: number;
    interestEarned: number;
  }> = [];

  let balance = principal;
  let totalInterest = 0;
  const monthlyRate = apy / 12;

  for (let month = 1; month <= months; month++) {
    // Add contribution at start of month
    balance += monthlyContribution;

    // Calculate and add interest
    const monthInterest = balance * monthlyRate;
    balance += monthInterest;
    totalInterest += monthInterest;

    results.push({
      month,
      balance: Math.round(balance),
      interestEarned: Math.round(totalInterest),
    });
  }

  return results;
}

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

/**
 * Parse APY from a percentage string or number.
 *
 * @param input - APY as string ("4.5%", "4.5", "0.045") or number
 * @returns APY as decimal (0-1), or 0 if invalid
 */
export function parseAPY(input: string | number): number {
  if (typeof input === 'number') {
    // If > 1, assume it's a percentage
    return input > 1 ? input / 100 : input;
  }

  const cleaned = input.replace('%', '').trim();
  const num = Number.parseFloat(cleaned);

  if (Number.isNaN(num)) return 0;

  // If > 1, assume it's a percentage
  return num > 1 ? num / 100 : num;
}

/**
 * Common HYSA APY presets for quick selection.
 */
export const COMMON_APY_PRESETS = [
  { label: 'None', value: 0 },
  { label: '3.5%', value: 0.035 },
  { label: '4.0%', value: 0.04 },
  { label: '4.5%', value: 0.045 },
  { label: '5.0%', value: 0.05 },
  { label: '5.5%', value: 0.055 },
] as const;
