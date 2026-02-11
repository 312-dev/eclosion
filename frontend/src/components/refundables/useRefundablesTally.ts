/**
 * useRefundablesTally
 *
 * Calculates tally summary from transactions and matches.
 */

import { useMemo } from 'react';
import type { Transaction, RefundablesMatch, RefundablesTally } from '../../types/refundables';

export function useRefundablesTally(
  transactions: Transaction[],
  matches: RefundablesMatch[]
): RefundablesTally {
  return useMemo(() => {
    const matchMap = new Map(matches.map((m) => [m.originalTransactionId, m]));
    let totalAmount = 0;
    let matchedAmount = 0;
    let matchedCount = 0;
    let skippedCount = 0;
    let unmatchedCount = 0;

    for (const txn of transactions) {
      totalAmount += Math.abs(txn.amount);
      const match = matchMap.get(txn.id);
      if (match) {
        if (match.skipped) {
          skippedCount++;
        } else {
          matchedCount++;
          matchedAmount += Math.abs(match.refundAmount ?? 0);
        }
      } else {
        unmatchedCount++;
      }
    }

    return {
      transactionCount: transactions.length,
      totalAmount,
      matchedAmount,
      remainingAmount: totalAmount - matchedAmount,
      matchedCount,
      skippedCount,
      unmatchedCount,
    };
  }, [transactions, matches]);
}
