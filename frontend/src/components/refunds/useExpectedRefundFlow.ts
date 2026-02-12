/**
 * Expected refund flow orchestration.
 *
 * Manages modal state and handlers for setting/clearing expected refunds,
 * extracted from RefundsTab to keep it under 300 lines.
 */

import { useState, useCallback } from 'react';
import type { Transaction } from '../../types/refunds';
import type { ExpectedRefundParams } from './useRefundsMatchHandlers';

interface ExpectedRefundFlowParams {
  readonly batchTransactions: Transaction[];
  readonly handleBatchExpectedRefundAll: (
    transactions: Transaction[],
    params: ExpectedRefundParams
  ) => Promise<void>;
  readonly handleBatchClearExpected: () => Promise<void>;
  readonly setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

interface ExpectedRefundFlowResult {
  expectedTransaction: Transaction | null;
  expectedBatchCount: number;
  showClearExpectedConfirm: boolean;
  handleStartBatchExpected: () => void;
  handleModalExpectedRefund: (params: ExpectedRefundParams) => Promise<void>;
  handleCloseExpected: () => void;
  handleStartClearExpected: () => void;
  handleConfirmClearExpected: () => Promise<void>;
  handleCloseClearExpected: () => void;
}

export function useExpectedRefundFlow({
  batchTransactions,
  handleBatchExpectedRefundAll,
  handleBatchClearExpected,
  setSelectedIds,
}: ExpectedRefundFlowParams): ExpectedRefundFlowResult {
  const [expectedTransaction, setExpectedTransaction] = useState<Transaction | null>(null);
  const [expectedBatchCount, setExpectedBatchCount] = useState(0);
  const [showClearExpectedConfirm, setShowClearExpectedConfirm] = useState(false);

  const handleStartBatchExpected = useCallback(() => {
    const first = batchTransactions[0];
    if (!first) return;
    setExpectedBatchCount(batchTransactions.length);
    setExpectedTransaction(first);
  }, [batchTransactions]);

  const handleModalExpectedRefund = useCallback(
    async (params: ExpectedRefundParams) => {
      await handleBatchExpectedRefundAll(batchTransactions, params);
      setExpectedTransaction(null);
      setExpectedBatchCount(0);
      setSelectedIds(new Set());
    },
    [batchTransactions, handleBatchExpectedRefundAll, setSelectedIds]
  );

  const handleCloseExpected = useCallback(() => {
    setExpectedTransaction(null);
    setExpectedBatchCount(0);
  }, []);

  const handleConfirmClearExpected = useCallback(async () => {
    await handleBatchClearExpected();
    setShowClearExpectedConfirm(false);
  }, [handleBatchClearExpected]);

  return {
    expectedTransaction,
    expectedBatchCount,
    showClearExpectedConfirm,
    handleStartBatchExpected,
    handleModalExpectedRefund,
    handleCloseExpected,
    handleStartClearExpected: useCallback(() => setShowClearExpectedConfirm(true), []),
    handleConfirmClearExpected,
    handleCloseClearExpected: useCallback(() => setShowClearExpectedConfirm(false), []),
  };
}
