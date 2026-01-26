/**
 * Available to Stash API Functions
 *
 * Fetches data needed for the Available to Stash calculation.
 */

import type { AvailableToStashData } from '../../types';
import { fetchApi } from './fetchApi';

/**
 * Get data needed for Available to Stash calculation.
 *
 * This endpoint aggregates:
 * - Account balances (checking, savings, credit cards)
 * - Current month's category budgets and spending
 * - Monarch savings goal balances
 * - Planned and actual income
 * - Total Stash balances
 */
export async function getAvailableToStashData(): Promise<AvailableToStashData> {
  return fetchApi<AvailableToStashData>('/stash/available-to-stash');
}
