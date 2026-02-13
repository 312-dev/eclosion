import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRefundsTally } from './useRefundsTally';
import type { Transaction, RefundsMatch } from '../../types/refunds';

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    amount: -50,
    date: '2026-02-01',
    originalName: 'TEST',
    plaidName: null,
    notes: null,
    pending: false,
    hideFromReports: false,
    merchant: null,
    category: null,
    account: null,
    tags: [],
    ...overrides,
  };
}

function makeMatch(overrides: Partial<RefundsMatch> = {}): RefundsMatch {
  return {
    id: 'match-1',
    originalTransactionId: 'txn-1',
    refundTransactionId: 'refund-1',
    refundAmount: 50,
    refundMerchant: 'Test',
    refundDate: '2026-02-05',
    refundAccount: 'Checking',
    skipped: false,
    expectedRefund: false,
    expectedDate: null,
    expectedAccount: null,
    expectedAccountId: null,
    expectedNote: null,
    expectedAmount: null,
    transactionData: null,
    ...overrides,
  };
}

describe('useRefundsTally', () => {
  it('returns zeros for empty inputs', () => {
    const { result } = renderHook(() => useRefundsTally([], []));

    expect(result.current).toEqual({
      transactionCount: 0,
      totalAmount: 0,
      matchedAmount: 0,
      expectedAmount: 0,
      remainingAmount: 0,
      matchedCount: 0,
      expectedCount: 0,
      skippedCount: 0,
      unmatchedCount: 0,
    });
  });

  it('counts all transactions as unmatched when no matches exist', () => {
    const transactions = [makeTxn({ id: 'a', amount: -100 }), makeTxn({ id: 'b', amount: -50 })];

    const { result } = renderHook(() => useRefundsTally(transactions, []));

    expect(result.current.transactionCount).toBe(2);
    expect(result.current.totalAmount).toBe(150);
    expect(result.current.matchedAmount).toBe(0);
    expect(result.current.remainingAmount).toBe(150);
    expect(result.current.unmatchedCount).toBe(2);
    expect(result.current.matchedCount).toBe(0);
    expect(result.current.skippedCount).toBe(0);
  });

  it('calculates matched amounts correctly', () => {
    const transactions = [makeTxn({ id: 'a', amount: -100 }), makeTxn({ id: 'b', amount: -50 })];
    const matches = [makeMatch({ originalTransactionId: 'a', refundAmount: 80 })];

    const { result } = renderHook(() => useRefundsTally(transactions, matches));

    expect(result.current.matchedCount).toBe(1);
    expect(result.current.matchedAmount).toBe(80);
    expect(result.current.remainingAmount).toBe(70); // 150 - 80
    expect(result.current.unmatchedCount).toBe(1);
  });

  it('counts skipped transactions separately', () => {
    const transactions = [
      makeTxn({ id: 'a', amount: -100 }),
      makeTxn({ id: 'b', amount: -50 }),
      makeTxn({ id: 'c', amount: -25 }),
    ];
    const matches = [
      makeMatch({ originalTransactionId: 'a', refundAmount: 100 }),
      makeMatch({ id: 'match-2', originalTransactionId: 'b', skipped: true, refundAmount: null }),
    ];

    const { result } = renderHook(() => useRefundsTally(transactions, matches));

    expect(result.current.matchedCount).toBe(1);
    expect(result.current.skippedCount).toBe(1);
    expect(result.current.unmatchedCount).toBe(1);
    expect(result.current.totalAmount).toBe(125); // excludes skipped $50
    expect(result.current.matchedAmount).toBe(100);
    expect(result.current.remainingAmount).toBe(25); // 125 - 100
  });

  it('uses absolute values for negative transaction amounts', () => {
    const transactions = [makeTxn({ id: 'a', amount: -42.6 })];

    const { result } = renderHook(() => useRefundsTally(transactions, []));

    expect(result.current.totalAmount).toBe(42.6);
  });

  it('handles null refundAmount on matched (non-skipped) transactions', () => {
    const transactions = [makeTxn({ id: 'a', amount: -100 })];
    const matches = [makeMatch({ originalTransactionId: 'a', refundAmount: null })];

    const { result } = renderHook(() => useRefundsTally(transactions, matches));

    expect(result.current.matchedCount).toBe(1);
    expect(result.current.matchedAmount).toBe(0);
    expect(result.current.remainingAmount).toBe(100);
  });

  it('ignores matches that do not correspond to any transaction', () => {
    const transactions = [makeTxn({ id: 'a', amount: -100 })];
    const matches = [makeMatch({ originalTransactionId: 'orphan', refundAmount: 50 })];

    const { result } = renderHook(() => useRefundsTally(transactions, matches));

    expect(result.current.unmatchedCount).toBe(1);
    expect(result.current.matchedCount).toBe(0);
    expect(result.current.matchedAmount).toBe(0);
  });

  it('counts expected refunds separately from matched', () => {
    const transactions = [
      makeTxn({ id: 'a', amount: -100 }),
      makeTxn({ id: 'b', amount: -50 }),
      makeTxn({ id: 'c', amount: -25 }),
    ];
    const matches = [
      makeMatch({ originalTransactionId: 'a', refundAmount: 100 }),
      makeMatch({
        id: 'match-2',
        originalTransactionId: 'b',
        expectedRefund: true,
        expectedAmount: 50,
        refundAmount: null,
      }),
    ];

    const { result } = renderHook(() => useRefundsTally(transactions, matches));

    expect(result.current.matchedCount).toBe(1);
    expect(result.current.expectedCount).toBe(1);
    expect(result.current.unmatchedCount).toBe(1);
    expect(result.current.matchedAmount).toBe(100);
    expect(result.current.expectedAmount).toBe(50);
    expect(result.current.totalAmount).toBe(175); // all 3 included (expected not excluded)
    expect(result.current.remainingAmount).toBe(25); // 175 - 100 - 50
  });

  it('de-duplicates matched amount when multiple purchases share the same refund', () => {
    const transactions = [
      makeTxn({ id: 'a', amount: -80 }),
      makeTxn({ id: 'b', amount: -60 }),
      makeTxn({ id: 'c', amount: -40 }),
    ];
    const matches = [
      makeMatch({
        id: 'm1',
        originalTransactionId: 'a',
        refundTransactionId: 'shared-refund',
        refundAmount: 200,
      }),
      makeMatch({
        id: 'm2',
        originalTransactionId: 'b',
        refundTransactionId: 'shared-refund',
        refundAmount: 200,
      }),
    ];

    const { result } = renderHook(() => useRefundsTally(transactions, matches));

    expect(result.current.matchedCount).toBe(2);
    expect(result.current.matchedAmount).toBe(200); // counted once, not 400
    expect(result.current.totalAmount).toBe(180); // 80 + 60 + 40
    expect(result.current.remainingAmount).toBe(0); // capped: refund exceeds originals
    expect(result.current.unmatchedCount).toBe(1);
  });

  it('returns stable reference when inputs do not change', () => {
    const transactions = [makeTxn({ id: 'a', amount: -100 })];
    const matches: RefundsMatch[] = [];

    const { result, rerender } = renderHook(() => useRefundsTally(transactions, matches));

    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
