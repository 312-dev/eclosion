/**
 * Demo Accounts
 *
 * Demo mode account data and API functions.
 * Shared constant used by both the account store and available-to-stash demo data.
 */

import type { AccountMetadata } from '../../types/accountStore';
import { simulateDelay } from './demoState';

/**
 * All demo accounts (shared between account store and available-to-stash).
 */
export const DEMO_ACCOUNTS: AccountMetadata[] = [
  // Cash accounts
  {
    id: 'demo-checking',
    name: 'Chase Checking',
    balance: 5200,
    accountType: 'checking',
    isEnabled: true,
    logoUrl: null,
    icon: null,
  },
  {
    id: 'demo-savings',
    name: 'Ally Savings',
    balance: 8500,
    accountType: 'savings',
    isEnabled: true,
    logoUrl: null,
    icon: null,
  },
  // Credit card (positive balance = debt owed)
  {
    id: 'demo-credit',
    name: 'Chase Sapphire',
    balance: 1850,
    accountType: 'credit_card',
    isEnabled: true,
    logoUrl: null,
    icon: null,
  },
  // Loan accounts for debt tracking (using Monarch's loan subtypes)
  {
    id: 'demo-student-loan',
    name: 'Federal Student Loans',
    balance: 24500,
    accountType: 'student',
    isEnabled: true,
    logoUrl: null,
    icon: null,
  },
  {
    id: 'demo-car-loan',
    name: 'Honda Civic Auto Loan',
    balance: 12800,
    accountType: 'auto',
    isEnabled: true,
    logoUrl: null,
    icon: null,
  },
  {
    id: 'demo-mortgage',
    name: 'Home Mortgage',
    balance: 285000,
    accountType: 'mortgage',
    isEnabled: true,
    logoUrl: null,
    icon: null,
  },
];

/**
 * Get all demo accounts (unfiltered).
 */
export async function getAccounts(): Promise<AccountMetadata[]> {
  await simulateDelay();
  return DEMO_ACCOUNTS;
}
