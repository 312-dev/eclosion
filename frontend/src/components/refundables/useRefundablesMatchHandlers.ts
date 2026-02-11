/**
 * Match action handlers for the Refundables feature.
 * Extracted from RefundablesTab to keep component under 300-line limit.
 */

import { useCallback, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { handleApiError } from '../../utils';
import {
  useCreateRefundablesMatchMutation,
  useDeleteRefundablesMatchMutation,
} from '../../api/queries/refundablesQueries';
import type { Transaction, RefundablesMatch } from '../../types/refundables';

interface MatchHandlersParams {
  readonly matchingTransaction: Transaction | null;
  readonly setMatchingTransaction: (t: Transaction | null) => void;
  readonly matches: RefundablesMatch[];
  readonly tagIds: string[];
}

export interface MatchActionParams {
  refundTransactionId: string;
  refundAmount: number;
  refundMerchant: string;
  refundDate: string;
  refundAccount: string;
  replaceTag: boolean;
}

export function useRefundablesMatchHandlers({
  matchingTransaction,
  setMatchingTransaction,
  matches,
  tagIds,
}: MatchHandlersParams): {
  handleMatch: (params: MatchActionParams) => Promise<void>;
  handleSkip: () => Promise<void>;
  handleUnmatch: () => Promise<void>;
  handleDirectSkip: (transaction: Transaction) => Promise<void>;
  handleRestore: (transaction: Transaction) => Promise<void>;
  existingMatch: RefundablesMatch | undefined;
  matchPending: boolean;
} {
  const toast = useToast();
  const createMatchMutation = useCreateRefundablesMatchMutation();
  const deleteMatchMutation = useDeleteRefundablesMatchMutation();

  const existingMatch = useMemo(
    () =>
      matchingTransaction
        ? matches.find((m) => m.originalTransactionId === matchingTransaction.id)
        : undefined,
    [matchingTransaction, matches]
  );

  const handleMatch = useCallback(
    async (params: MatchActionParams) => {
      if (!matchingTransaction) return;
      try {
        await createMatchMutation.mutateAsync({
          originalTransactionId: matchingTransaction.id,
          ...params,
          originalTagIds: matchingTransaction.tags.map((t) => t.id),
          originalNotes: matchingTransaction.notes,
          viewTagIds: tagIds,
          transactionData: matchingTransaction,
        });
        setMatchingTransaction(null);
        toast.success('Refund matched');
      } catch (err) {
        toast.error(handleApiError(err, 'Refundables'));
      }
    },
    [matchingTransaction, createMatchMutation, toast, tagIds, setMatchingTransaction]
  );

  const handleSkip = useCallback(async () => {
    if (!matchingTransaction) return;
    try {
      await createMatchMutation.mutateAsync({
        originalTransactionId: matchingTransaction.id,
        skipped: true,
        transactionData: matchingTransaction,
      });
      setMatchingTransaction(null);
      toast.info('Transaction skipped');
    } catch (err) {
      toast.error(handleApiError(err, 'Refundables'));
    }
  }, [matchingTransaction, createMatchMutation, toast, setMatchingTransaction]);

  const handleUnmatch = useCallback(async () => {
    if (!existingMatch) return;
    try {
      await deleteMatchMutation.mutateAsync(existingMatch.id);
      setMatchingTransaction(null);
      const tagNames = existingMatch.transactionData?.tags.map((t) => t.name);
      const suffix = tagNames?.length ? ` — tags restored: ${tagNames.join(', ')}` : '';
      toast.success(`Match removed${suffix}`);
    } catch (err) {
      toast.error(handleApiError(err, 'Refundables'));
    }
  }, [existingMatch, deleteMatchMutation, toast, setMatchingTransaction]);

  const handleDirectSkip = useCallback(
    async (transaction: Transaction) => {
      try {
        await createMatchMutation.mutateAsync({
          originalTransactionId: transaction.id,
          skipped: true,
          transactionData: transaction,
        });
        toast.info('Transaction skipped');
      } catch (err) {
        toast.error(handleApiError(err, 'Refundables'));
      }
    },
    [createMatchMutation, toast]
  );

  const handleRestore = useCallback(
    async (transaction: Transaction) => {
      const matchToDelete = matches.find((m) => m.originalTransactionId === transaction.id);
      if (!matchToDelete) return;
      try {
        await deleteMatchMutation.mutateAsync(matchToDelete.id);
        const tagNames = matchToDelete.transactionData?.tags.map((t) => t.name);
        const suffix = tagNames?.length ? ` — tags restored: ${tagNames.join(', ')}` : '';
        toast.success(`Transaction restored${suffix}`);
      } catch (err) {
        toast.error(handleApiError(err, 'Refundables'));
      }
    },
    [matches, deleteMatchMutation, toast]
  );

  return {
    handleMatch,
    handleSkip,
    handleUnmatch,
    handleDirectSkip,
    handleRestore,
    existingMatch,
    matchPending: createMatchMutation.isPending || deleteMatchMutation.isPending,
  };
}
