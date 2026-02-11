import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRefundablesTally } from './useRefundablesTally';
import type { Transaction, RefundablesMatch } from '../../types/refundables';

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-1',
    amount: -50,
    date: '2026-02-01',
    originalName: 'TEST',
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

function makeMatch(overrides: Partial<RefundablesMatch> = {}): RefundablesMatch {
  return {
    id: 'match-1',
    originalTransactionId: 'txn-1',
    refundTransactionId: 'refund-1',
    refundAmount: 50,
    refundMerchant: 'Test',
    refundDate: '2026-02-05',
    refundAccount: 'Checking',
    skipped: false,
    transactionData: null,
    ...overrides,
  };
}

describe('useRefundablesTally', () => {
  it('returns zeros for empty inputs', () => {
    const { result } = renderHook(() => useRefundablesTally([], []));

    expect(result.current).toEqual({
      transactionCount: 0,
      totalAmount: 0,
      matchedAmount: 0,
      remainingAmount: 0,
      matchedCount: 0,
      skippedCount: 0,
      unmatchedCount: 0,
    });
  });

  it('counts all transactions as unmatched when no matches exist', () => {
    const transactions = [makeTxn({ id: 'a', amount: -100 }), makeTxn({ id: 'b', amount: -50 })];

    const { result } = renderHook(() => useRefundablesTally(transactions, []));

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

    const { result } = renderHook(() => useRefundablesTally(transactions, matches));

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

    const { result } = renderHook(() => useRefundablesTally(transactions, matches));

    expect(result.current.matchedCount).toBe(1);
    expect(result.current.skippedCount).toBe(1);
    expect(result.current.unmatchedCount).toBe(1);
    expect(result.current.matchedAmount).toBe(100);
    expect(result.current.remainingAmount).toBe(75); // 175 - 100
  });

  it('uses absolute values for negative transaction amounts', () => {
    const transactions = [makeTxn({ id: 'a', amount: -42.6 })];

    const { result } = renderHook(() => useRefundablesTally(transactions, []));

    expect(result.current.totalAmount).toBe(42.6);
  });

  it('handles null refundAmount on matched (non-skipped) transactions', () => {
    const transactions = [makeTxn({ id: 'a', amount: -100 })];
    const matches = [makeMatch({ originalTransactionId: 'a', refundAmount: null })];

    const { result } = renderHook(() => useRefundablesTally(transactions, matches));

    expect(result.current.matchedCount).toBe(1);
    expect(result.current.matchedAmount).toBe(0);
    expect(result.current.remainingAmount).toBe(100);
  });

  it('ignores matches that do not correspond to any transaction', () => {
    const transactions = [makeTxn({ id: 'a', amount: -100 })];
    const matches = [makeMatch({ originalTransactionId: 'orphan', refundAmount: 50 })];

    const { result } = renderHook(() => useRefundablesTally(transactions, matches));

    expect(result.current.unmatchedCount).toBe(1);
    expect(result.current.matchedCount).toBe(0);
    expect(result.current.matchedAmount).toBe(0);
  });

  it('returns stable reference when inputs do not change', () => {
    const transactions = [makeTxn({ id: 'a', amount: -100 })];
    const matches: RefundablesMatch[] = [];

    const { result, rerender } = renderHook(() => useRefundablesTally(transactions, matches));

    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
