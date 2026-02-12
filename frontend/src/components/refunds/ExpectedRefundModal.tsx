/**
 * ExpectedRefundModal
 *
 * Modal for setting an expected refund on a transaction.
 * Collects expected amount, date, deposit account, and optional note.
 * Supports batch mode for multiple selected transactions.
 */

import { useState, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { Wallet, CreditCard, Landmark } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { CurrencyInput } from '../ui/CurrencyInput';
import { SearchableSelect } from '../SearchableSelect';
import { PrimaryButton, CancelButton } from '../ui/ModalButtons';
import { Tooltip } from '../ui/Tooltip';
import { useAvailableToStashDataQuery } from '../../api/queries/availableToStashQueries';
import { isCashAccount, isCreditCardAccount } from '../../types/availableToStash';
import { decodeHtmlEntities } from '../../utils';
import type { AccountBalance } from '../../types/availableToStash';
import type { Transaction } from '../../types/refunds';
import type { ExpectedRefundParams } from './useRefundsMatchHandlers';

const ICON_STYLE = { color: 'var(--monarch-text-muted)' } as const;
const ICON_SIZE = 16;

function AccountIcon({ account }: { readonly account: AccountBalance }): React.JSX.Element {
  if (account.logoUrl) {
    return (
      <img
        src={account.logoUrl}
        alt=""
        className="w-4 h-4 rounded-full object-cover bg-white shrink-0"
      />
    );
  }
  if (account.icon) {
    return <span className="text-xs leading-none">{account.icon}</span>;
  }
  if (isCreditCardAccount(account.accountType))
    return <CreditCard size={ICON_SIZE} style={ICON_STYLE} />;
  if (isCashAccount(account.accountType)) return <Wallet size={ICON_SIZE} style={ICON_STYLE} />;
  return <Landmark size={ICON_SIZE} style={ICON_STYLE} />;
}

interface ExpectedRefundModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly transaction: Transaction;
  readonly onSubmit: (params: ExpectedRefundParams) => Promise<void>;
  readonly submitting: boolean;
  readonly batchCount: number;
  readonly batchAmount: number;
  readonly batchTransactions: Transaction[];
}

function formatAmount(amount: number): string {
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** ~6 lines of text at text-sm (20px line-height) + vertical padding */
const MAX_TEXTAREA_HEIGHT = 140;

function getToday(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

/** Default expected date: 14 days from today. */
function getDefaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split('T')[0] ?? '';
}

export function ExpectedRefundModal({
  isOpen,
  onClose,
  transaction,
  onSubmit,
  submitting,
  batchCount,
  batchAmount,
  batchTransactions,
}: ExpectedRefundModalProps): React.JSX.Element {
  const isBatch = batchCount > 1;
  const defaultAmount = isBatch ? batchAmount : Math.abs(transaction.amount);
  const merchantName = decodeHtmlEntities(transaction.merchant?.name ?? transaction.originalName);

  // Default to the most common account among selected transactions
  const defaultAccountId = useMemo(() => {
    const txns = batchTransactions.length > 0 ? batchTransactions : [transaction];
    const counts = new Map<string, number>();
    for (const txn of txns) {
      if (txn.account?.id) {
        counts.set(txn.account.id, (counts.get(txn.account.id) ?? 0) + 1);
      }
    }
    if (counts.size === 0) return '';
    let maxId = '';
    let maxCount = 0;
    for (const [id, count] of counts) {
      if (count > maxCount) {
        maxId = id;
        maxCount = count;
      }
    }
    return maxId;
  }, [batchTransactions, transaction]);

  const [amount, setAmount] = useState(defaultAmount);
  const [expectedDate, setExpectedDate] = useState(getDefaultDate);
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [note, setNote] = useState('');

  // Reset form when transaction changes
  const [prevTxnId, setPrevTxnId] = useState(transaction.id);
  if (prevTxnId !== transaction.id) {
    setPrevTxnId(transaction.id);
    setAmount(defaultAmount);
    setExpectedDate(getDefaultDate());
    setAccountId(defaultAccountId);
    setNote('');
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleNoteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
      el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
    }
  }, []);

  // Lazy-load accounts for the deposit selector
  const { data: stashData, isLoading: accountsLoading } = useAvailableToStashDataQuery();

  const accounts = stashData?.accounts;
  const accountOptions = useMemo(() => {
    if (!accounts) return [];
    return accounts
      .filter((a) => a.isEnabled)
      .map((a) => ({ value: a.id, label: a.name, icon: <AccountIcon account={a} /> }));
  }, [accounts]);

  const selectedAccountName = useMemo(
    () => accountOptions.find((o) => o.value === accountId)?.label ?? '',
    [accountOptions, accountId]
  );

  const handleSubmit = (): void => {
    onSubmit({
      expectedDate,
      expectedAccount: selectedAccountName,
      expectedAccountId: accountId,
      expectedNote: note.trim(),
      expectedAmount: amount,
    });
  };

  const batchTooltipContent: ReactNode | null = isBatch ? (
    <div className="text-xs space-y-0.5 min-w-48">
      {batchTransactions.map((txn) => (
        <div key={txn.id} className="flex justify-between gap-4">
          <span className="truncate" style={{ color: 'var(--monarch-tooltip-text)', opacity: 0.7 }}>
            {decodeHtmlEntities(txn.merchant?.name ?? txn.originalName)}
          </span>
          <span className="tabular-nums shrink-0">{formatAmount(txn.amount)}</span>
        </div>
      ))}
    </div>
  ) : null;

  let title = `Expected Refund for "${merchantName}"`;
  let description: ReactNode | undefined =
    `${formatAmount(transaction.amount)} on ${formatDate(transaction.date)}`;
  if (isBatch) {
    title = 'Expected Refund';
    description = (
      <span>
        {'Apply to '}
        <Tooltip content={batchTooltipContent} side="bottom">
          <span
            className="cursor-help"
            style={{
              textDecorationLine: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: '3px',
            }}
          >
            {batchCount} selected transactions
          </span>
        </Tooltip>
      </span>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="sm"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <CancelButton onClick={onClose} />
          <PrimaryButton
            onClick={handleSubmit}
            disabled={submitting}
            isLoading={submitting}
            loadingText="Saving..."
          >
            {isBatch ? `Set Expected (${batchCount})` : 'Set Expected'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Amount */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Expected Amount
          </label>
          <CurrencyInput value={amount} onChange={setAmount} min={0} autoFocus />
        </div>

        {/* Expected Date */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Expected By
          </label>
          <input
            type="date"
            value={expectedDate}
            min={getToday()}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded-lg border border-(--monarch-border) bg-(--monarch-bg-card) text-(--monarch-text-dark) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20"
          />
        </div>

        {/* Account Selector */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Deposit Account
            <span className="font-normal text-(--monarch-text-muted)"> (optional)</span>
          </label>
          <SearchableSelect
            value={accountId}
            onChange={setAccountId}
            options={[{ value: '', label: 'No account selected' }, ...accountOptions]}
            placeholder="Select account..."
            loading={accountsLoading}
            searchable={accountOptions.length > 5}
            insideModal
            aria-label="Deposit account"
          />
        </div>

        {/* Note */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Note
            <span className="font-normal text-(--monarch-text-muted)"> (optional)</span>
          </label>
          <textarea
            ref={textareaRef}
            value={note}
            onChange={handleNoteChange}
            placeholder="Added to existing transaction notes..."
            rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-(--monarch-border) bg-(--monarch-bg-card) text-(--monarch-text-dark) placeholder:text-(--monarch-text-muted) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20 resize-none"
            style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
          />
        </div>
      </div>
    </Modal>
  );
}
