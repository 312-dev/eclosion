/**
 * Breakdown Detail Modal
 *
 * Full-screen modal showing detailed breakdown of Available to Stash calculation.
 * Displays all accounts, categories, goals, and stash items that contribute to each total.
 */

import { Modal } from '../ui/Modal';
import { Icons } from '../icons';
import type { AvailableToStashResult } from '../../types';
import { formatAvailableAmount } from '../../utils/availableToStash';

interface BreakdownDetailModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly data: AvailableToStashResult;
  readonly statusColor: string;
  readonly formattedAmount: string;
}

interface BreakdownSectionProps {
  readonly title: string;
  readonly items: { id: string; name: string; amount: number }[];
  readonly total: number;
  readonly isPositive?: boolean;
  readonly emptyMessage?: string;
}

function BreakdownSection({
  title,
  items,
  total,
  isPositive = false,
  emptyMessage = 'None',
}: BreakdownSectionProps) {
  const color = isPositive ? 'var(--monarch-green)' : 'var(--monarch-red)';
  const sign = isPositive ? '+' : '-';

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--monarch-bg-page)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          {title}
        </h3>
        <span className="text-sm font-medium" style={{ color }}>
          {sign}
          {formatAvailableAmount(total)}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {emptyMessage}
        </p>
      ) : (
        <div
          className="max-h-48 overflow-y-auto space-y-1 pr-2"
          style={{ scrollbarGutter: 'stable' }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-(--monarch-bg-hover)"
            >
              <span
                className="text-sm truncate flex-1 mr-4"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                {item.name}
              </span>
              <span className="text-sm tabular-nums" style={{ color }}>
                {sign}
                {formatAvailableAmount(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BreakdownDetailModal({
  isOpen,
  onClose,
  data,
  statusColor,
  formattedAmount,
}: BreakdownDetailModalProps) {
  const { breakdown, detailedBreakdown, includesExpectedIncome } = data;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Icons.Landmark size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          <span>Available to Stash Breakdown</span>
        </div>
      }
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Summary */}
        <div
          className="flex items-center justify-between p-4 rounded-lg"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            Total Available
          </span>
          <span className="text-2xl font-semibold" style={{ color: statusColor }}>
            {formattedAmount}
          </span>
        </div>

        {/* Positive contributions */}
        <BreakdownSection
          title="Cash on Hand"
          items={detailedBreakdown.cashAccounts}
          total={breakdown.cashOnHand}
          isPositive
          emptyMessage="No cash accounts"
        />

        <BreakdownSection
          title="Monarch Goals"
          items={detailedBreakdown.goals}
          total={breakdown.goalBalances}
          emptyMessage="No active goals"
        />

        {includesExpectedIncome && breakdown.expectedIncome > 0 && (
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Expected Income
              </h3>
              <span className="text-sm font-medium" style={{ color: 'var(--monarch-green)' }}>
                +{formatAvailableAmount(breakdown.expectedIncome)}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Income planned but not yet received this month
            </p>
          </div>
        )}

        {/* Negative contributions (committed funds) */}
        <BreakdownSection
          title="Credit Card Debt"
          items={detailedBreakdown.creditCards}
          total={breakdown.creditCardDebt}
          emptyMessage="No credit card balances"
        />

        <BreakdownSection
          title="Unspent Budgets"
          items={detailedBreakdown.unspentCategories}
          total={breakdown.unspentBudgets}
          emptyMessage="All budgets fully spent"
        />

        <BreakdownSection
          title="Stash Balances"
          items={detailedBreakdown.stashItems}
          total={breakdown.stashBalances}
          emptyMessage="No stash balances"
        />
      </div>
    </Modal>
  );
}
