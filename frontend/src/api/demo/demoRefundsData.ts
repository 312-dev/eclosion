/**
 * Demo data constants for the Refunds feature.
 *
 * Extracted from demoRefunds.ts to keep file sizes under the 300-line limit.
 */

import type { Transaction, TransactionTag } from '../../types/refunds';

// ---- Demo Tags ----

export const TAG_PENDING_REFUND: TransactionTag = {
  id: 'tag-1',
  name: 'Pending Refund',
  color: '#9333ea',
  order: 0,
};
export const TAG_WORK_EXPENSE: TransactionTag = {
  id: 'tag-2',
  name: 'Work Expense',
  color: '#2563eb',
  order: 1,
};
export const TAG_REFUNDED: TransactionTag = {
  id: 'tag-3',
  name: 'Refunded',
  color: '#16a34a',
  order: 2,
};
export const TAG_INSURANCE_CLAIM: TransactionTag = {
  id: 'tag-4',
  name: 'Insurance Claim',
  color: '#ea580c',
  order: 3,
};

export const DEMO_TAGS: TransactionTag[] = [
  TAG_PENDING_REFUND,
  TAG_WORK_EXPENSE,
  TAG_REFUNDED,
  TAG_INSURANCE_CLAIM,
];

// ---- Demo Transactions ----

export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-demo-1',
    amount: -42.6,
    date: '2026-02-01',
    originalName: 'CVS PHARMACY',
    plaidName: 'CVS/PHARMACY #4521 02/01',
    notes: null,
    pending: false,
    hideFromReports: false,
    merchant: { id: 'm1', name: 'CVS Pharmacy', logoUrl: null },
    category: { id: 'c1', name: 'Medical', icon: '💊' },
    account: { id: 'a1', displayName: 'Cashback Rewards', logoUrl: null, icon: null },
    tags: [TAG_PENDING_REFUND],
  },
  {
    id: 'txn-demo-2',
    amount: -29.36,
    date: '2026-02-01',
    originalName: 'QUICKCART MEDICAL',
    plaidName: 'QUICKCART MKTP*MED SUPPLY',
    notes: null,
    pending: false,
    hideFromReports: false,
    merchant: { id: 'm2', name: 'QuickCart', logoUrl: null },
    category: { id: 'c1', name: 'Medical', icon: '💊' },
    account: { id: 'a2', displayName: 'QuickCart Visa', logoUrl: null, icon: null },
    tags: [TAG_PENDING_REFUND],
  },
  {
    id: 'txn-demo-3',
    amount: -28.9,
    date: '2026-02-01',
    originalName: 'CHIPOTLE',
    plaidName: 'CHIPOTLE ONLINE ORD #142',
    notes: null,
    pending: false,
    hideFromReports: false,
    merchant: { id: 'm3', name: 'Chipotle', logoUrl: null },
    category: { id: 'c2', name: 'Restaurants', icon: '🍽️' },
    account: { id: 'a1', displayName: 'Cashback Rewards', logoUrl: null, icon: null },
    tags: [TAG_WORK_EXPENSE],
  },
  {
    id: 'txn-demo-4',
    amount: -175.0,
    date: '2026-01-28',
    originalName: 'PLANET FITNESS',
    plaidName: 'PLANET FITNESS MONTHLY',
    notes: null,
    pending: false,
    hideFromReports: false,
    merchant: { id: 'm4', name: 'Planet Fitness', logoUrl: null },
    category: { id: 'c3', name: 'Fitness', icon: '💪' },
    account: { id: 'a1', displayName: 'Cashback Rewards', logoUrl: null, icon: null },
    tags: [TAG_WORK_EXPENSE],
  },
  {
    id: 'txn-demo-5',
    amount: -65,
    date: '2026-02-03',
    originalName: 'BRIGHTDESK SUPPLY',
    plaidName: 'BRIGHTDESK SUPPLY #1234',
    notes: null,
    pending: false,
    hideFromReports: false,
    merchant: { id: 'm5', name: 'BrightDesk Supply', logoUrl: null },
    category: { id: 'c4', name: 'Office Supplies', icon: '📎' },
    account: { id: 'a1', displayName: 'Cashback Rewards', logoUrl: null, icon: null },
    tags: [TAG_PENDING_REFUND, TAG_WORK_EXPENSE],
  },
];

// Demo refund transactions (for search results)
export const DEMO_REFUND_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-refund-1',
    amount: 42.6,
    date: '2026-02-08',
    originalName: 'CVS PHARMACY REFUND',
    plaidName: 'CVS/PHARMACY #4521 REFUND',
    notes: null,
    pending: false,
    hideFromReports: false,
    merchant: { id: 'm1', name: 'CVS Pharmacy', logoUrl: null },
    category: { id: 'c1', name: 'Medical', icon: '💊' },
    account: { id: 'a3', displayName: 'Main Checking', logoUrl: null, icon: null },
    tags: [],
  },
  {
    id: 'txn-refund-2',
    amount: 29.36,
    date: '2026-02-10',
    originalName: 'QUICKCART REFUND',
    plaidName: 'QUICKCART MKTP*REFUND',
    notes: null,
    pending: false,
    hideFromReports: false,
    merchant: { id: 'm2', name: 'QuickCart', logoUrl: null },
    category: { id: 'c1', name: 'Medical', icon: '💊' },
    account: { id: 'a2', displayName: 'QuickCart Visa', logoUrl: null, icon: null },
    tags: [],
  },
];
