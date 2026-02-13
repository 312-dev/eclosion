/**
 * useRefundsTally
 *
 * Calculates tally summary from transactions and matches.
 */

import { useMemo } from 'react';
import type { Transaction, RefundsMatch, RefundsTally } from '../../types/refunds';

/** Accumulate matched refund amount, de-duplicating shared refund transactions. */
function accumulateMatchedAmount(match: RefundsMatch, countedRefundIds: Set<string>): number {
  const refundId = match.refundTransactionId;
  if (refundId && countedRefundIds.has(refundId)) return 0;
  if (refundId) countedRefundIds.add(refundId);
  return Math.abs(match.refundAmount ?? 0);
}

function computeTally(
  transactions: Transaction[],
  matchMap: Map<string, RefundsMatch>
): RefundsTally {
  const countedRefundIds = new Set<string>();
  let totalAmount = 0;
  let matchedAmount = 0;
  let expectedAmount = 0;
  let unmatchedAmount = 0;
  let matchedCount = 0;
  let expectedCount = 0;
  let skippedCount = 0;
  let unmatchedCount = 0;

  for (const txn of transactions) {
    const match = matchMap.get(txn.id);
    if (!match) {
      totalAmount += Math.abs(txn.amount);
      unmatchedAmount += Math.abs(txn.amount);
      unmatchedCount++;
      continue;
    }
    if (match.skipped) {
      skippedCount++;
      continue;
    }
    totalAmount += Math.abs(txn.amount);
    if (match.expectedRefund) {
      expectedCount++;
      expectedAmount += Math.abs(match.expectedAmount ?? txn.amount);
    } else {
      matchedCount++;
      matchedAmount += accumulateMatchedAmount(match, countedRefundIds);
    }
  }

  return {
    transactionCount: transactions.length,
    totalAmount,
    matchedAmount,
    expectedAmount,
    remainingAmount: unmatchedAmount,
    matchedCount,
    expectedCount,
    skippedCount,
    unmatchedCount,
  };
}

export function useRefundsTally(
  transactions: Transaction[],
  matches: RefundsMatch[]
): RefundsTally {
  return useMemo(() => {
    const matchMap = new Map(matches.map((m) => [m.originalTransactionId, m]));
    return computeTally(transactions, matchMap);
  }, [transactions, matches]);
}
