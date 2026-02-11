/**
 * RefundMatchModal
 *
 * Modal for matching a transaction to its refund.
 * Shows search results, allows selecting a refund transaction or skipping.
 * Optionally replaces the original tag with a configured replacement tag.
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { PrimaryButton, CancelButton, WarningButton, ModalButton } from '../ui/ModalButtons';
import { useSearchRefundablesTransactionsQuery } from '../../api/queries/refundablesQueries';
import { decodeHtmlEntities } from '../../utils';
import {
  MatchDetailsContent,
  SearchResultsList,
  formatAmount,
  formatDate,
} from './RefundMatchSubComponents';
import type { Transaction, RefundablesConfig, RefundablesMatch } from '../../types/refundables';

interface RefundMatchModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly transaction: Transaction;
  readonly config: RefundablesConfig | undefined;
  readonly existingMatch: RefundablesMatch | undefined;
  readonly onMatch: (params: {
    refundTransactionId: string;
    refundAmount: number;
    refundMerchant: string;
    refundDate: string;
    refundAccount: string;
    replaceTag: boolean;
  }) => void;
  readonly onSkip: () => void;
  readonly onUnmatch: () => void;
  readonly matching: boolean;
}

export function RefundMatchModal({
  isOpen,
  onClose,
  transaction,
  config,
  existingMatch,
  onMatch,
  onSkip,
  onUnmatch,
  matching,
}: RefundMatchModalProps) {
  const merchantName = decodeHtmlEntities(transaction.merchant?.name ?? transaction.originalName);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [replaceTag, setReplaceTag] = useState(config?.replaceTagByDefault ?? false);
  const hasReplacementTag = config?.replacementTagId != null;
  const isAlreadyMatched = existingMatch != null;
  const tagActionLabel = hasReplacementTag
    ? 'Replace tag with configured replacement'
    : 'Remove tag';
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [prevTxnId, setPrevTxnId] = useState(transaction.id);
  if (prevTxnId !== transaction.id) {
    setPrevTxnId(transaction.id);
    setSearchQuery('');
    setSelectedTxnId(null);
  }

  const {
    data: searchData,
    isLoading: searching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useSearchRefundablesTransactionsQuery(searchQuery);

  const refundCandidates = useMemo(() => {
    const allResults = searchData?.pages.flatMap((p) => p.transactions) ?? [];
    return allResults.filter((t) => t.id !== transaction.id && t.amount > 0);
  }, [searchData, transaction.id]);

  const selectedTxn = useMemo(
    () => refundCandidates.find((t) => t.id === selectedTxnId),
    [refundCandidates, selectedTxnId]
  );

  const handleMatch = useCallback(() => {
    if (!selectedTxn) return;
    onMatch({
      refundTransactionId: selectedTxn.id,
      refundAmount: selectedTxn.amount,
      refundMerchant: selectedTxn.merchant?.name ?? selectedTxn.originalName,
      refundDate: selectedTxn.date,
      refundAccount: selectedTxn.account?.displayName ?? '',
      replaceTag,
    });
  }, [selectedTxn, onMatch, replaceTag]);

  const descriptionText = isAlreadyMatched
    ? undefined
    : `Original: ${formatAmount(transaction.amount)} on ${formatDate(transaction.date)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAlreadyMatched ? 'Match Details' : `Match Refund for "${merchantName}"`}
      {...(descriptionText == null ? {} : { description: descriptionText })}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          {isAlreadyMatched ? (
            <>
              <CancelButton onClick={onClose}>Close</CancelButton>
              <WarningButton onClick={onUnmatch} disabled={matching}>
                Unmatch
              </WarningButton>
            </>
          ) : (
            <>
              <CancelButton onClick={onClose} />
              <ModalButton variant="secondary" onClick={onSkip} disabled={matching}>
                Skip
              </ModalButton>
              <PrimaryButton
                onClick={handleMatch}
                disabled={!selectedTxn || matching}
                isLoading={matching}
              >
                Match Selected
              </PrimaryButton>
            </>
          )}
        </div>
      }
    >
      {isAlreadyMatched ? (
        <MatchDetailsContent existingMatch={existingMatch} />
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-(--monarch-text-muted)"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or amount..."
              aria-label="Search for refund transactions"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) placeholder:text-(--monarch-text-muted) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20"
            />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-(--monarch-border)">
            <SearchResultsList
              searching={searching}
              candidates={refundCandidates}
              searchQuery={searchQuery}
              selectedTxnId={selectedTxnId}
              onSelect={setSelectedTxnId}
              onClearFilters={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={fetchNextPage}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={replaceTag}
              onChange={(e) => setReplaceTag(e.target.checked)}
              className="rounded border-(--monarch-border) text-(--monarch-orange) focus:ring-(--monarch-orange)"
            />
            <span className="text-sm text-(--monarch-text-dark)">{tagActionLabel}</span>
          </label>
        </div>
      )}
    </Modal>
  );
}
