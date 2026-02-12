/**
 * useRefundsTally
 *
 * Calculates tally summary from transactions and matches.
 */

import { useMemo } from 'react';
import type { Transaction, RefundsMatch, RefundsTally } from '../../types/refunds';

export function useRefundsTally(
  transactions: Transaction[],
  matches: RefundsMatch[]
): RefundsTally {
  return useMemo(() => {
    const matchMap = new Map(matches.map((m) => [m.originalTransactionId, m]));
    let totalAmount = 0;
    let matchedAmount = 0;
    let expectedAmount = 0;
    let matchedCount = 0;
    let expectedCount = 0;
    let skippedCount = 0;
    let unmatchedCount = 0;

    for (const txn of transactions) {
      const match = matchMap.get(txn.id);
      if (match) {
        if (match.skipped) {
          skippedCount++;
        } else if (match.expectedRefund) {
          totalAmount += Math.abs(txn.amount);
          expectedCount++;
          expectedAmount += Math.abs(match.expectedAmount ?? txn.amount);
        } else {
          totalAmount += Math.abs(txn.amount);
          matchedCount++;
          matchedAmount += Math.abs(match.refundAmount ?? 0);
        }
      } else {
        totalAmount += Math.abs(txn.amount);
        unmatchedCount++;
      }
    }

    return {
      transactionCount: transactions.length,
      totalAmount,
      matchedAmount,
      expectedAmount,
      remainingAmount: totalAmount - matchedAmount - expectedAmount,
      matchedCount,
      expectedCount,
      skippedCount,
      unmatchedCount,
    };
  }, [transactions, matches]);
}
