/**
 * Available to Stash Display
 *
 * Shows the calculated "Available to Stash" amount - money the user can
 * safely allocate to Stash items without disrupting their budget.
 *
 * See .claude/rules/available-to-stash.md for calculation details.
 */

import { useState } from 'react';
import { Icons } from '../icons';
import { useAvailableToStash } from '../../api/queries';
import { HoverCard } from '../ui/HoverCard';
import { formatAvailableAmount } from '../../utils/availableToStash';
import { BreakdownDetailModal } from './BreakdownDetailModal';
import type { BreakdownLineItem } from '../../types';

interface AvailableToStashProps {
  /** Show a compact version without breakdown */
  readonly compact?: boolean;
}

interface BreakdownRowProps {
  readonly label: string;
  readonly amount: number;
  readonly isPositive?: boolean;
  readonly items?: BreakdownLineItem[];
  readonly onExpand?: () => void;
}

/**
 * A single row in the breakdown tooltip with optional nested tooltip showing items.
 * The tooltip appears to the RIGHT of the amount when hovered.
 * Numbers with details have a dotted underline to indicate hover-ability.
 */
function BreakdownRow({ label, amount, isPositive = false, items, onExpand }: BreakdownRowProps) {
  const color = isPositive ? 'var(--monarch-green)' : 'var(--monarch-red)';
  const sign = isPositive ? '+' : '-';

  const hasItems = items && items.length > 0;

  const nestedTooltipContent = hasItems ? (
    <div className="text-xs max-w-64">
      <div
        className="flex items-center justify-between font-medium pb-1 mb-1 border-b"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        <span>{label}</span>
        {onExpand && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="p-0.5 rounded hover:bg-(--monarch-bg-hover)"
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-label={`Expand ${label} details`}
          >
            <Icons.Maximize2 size={10} />
          </button>
        )}
      </div>
      <div
        className="max-h-40 overflow-y-auto space-y-0.5 pr-1"
        style={{ scrollbarGutter: 'stable' }}
      >
        {items.map((item) => (
          <div key={item.id} className="flex justify-between gap-4">
            <span className="truncate" style={{ color: 'var(--monarch-text-muted)' }}>
              {item.name}
            </span>
            <span className="tabular-nums shrink-0" style={{ color }}>
              {sign}
              {formatAvailableAmount(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const amountDisplay = (
    <span
      className={hasItems ? 'cursor-help' : ''}
      style={{
        color,
        borderBottom: hasItems
          ? `1px dashed color-mix(in srgb, ${color} 40%, transparent)`
          : 'none',
        paddingBottom: hasItems ? '2px' : undefined,
      }}
    >
      {sign}
      {formatAvailableAmount(amount)}
    </span>
  );

  return (
    <div className="flex justify-between">
      <span style={{ color: 'var(--monarch-text-muted)' }}>{label}</span>
      {hasItems ? (
        <HoverCard content={nestedTooltipContent} side="right" closeDelay={400}>
          {amountDisplay}
        </HoverCard>
      ) : (
        amountDisplay
      )}
    </div>
  );
}

/**
 * Display the Available to Stash amount with optional breakdown tooltip.
 */
export function AvailableToStash({ compact = false }: Readonly<AvailableToStashProps>) {
  const [includeExpectedIncome, setIncludeExpectedIncome] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading, formattedAmount, status, statusColor } = useAvailableToStash({
    includeExpectedIncome,
  });

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg animate-pulse"
        style={{ backgroundColor: 'var(--monarch-bg-card)' }}
      >
        <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--monarch-bg-hover)' }} />
      </div>
    );
  }

  const breakdown = data?.breakdown;
  const detailedBreakdown = data?.detailedBreakdown;

  const openModal = () => setIsModalOpen(true);

  const tooltipContent =
    breakdown && detailedBreakdown ? (
      <div className="text-sm space-y-2 min-w-56">
        <div
          className="font-medium border-b pb-1 mb-2"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          Calculation Breakdown
        </div>
        <div className="space-y-1">
          <BreakdownRow
            label="Cash on hand"
            amount={breakdown.cashOnHand}
            isPositive
            items={detailedBreakdown.cashAccounts}
            onExpand={openModal}
          />
          <BreakdownRow
            label="Remaining goal funds"
            amount={breakdown.goalBalances}
            items={detailedBreakdown.goals}
            onExpand={openModal}
          />
          {includeExpectedIncome && breakdown.expectedIncome > 0 && (
            <BreakdownRow label="Expected income" amount={breakdown.expectedIncome} isPositive />
          )}
          <BreakdownRow
            label="Credit card debt"
            amount={breakdown.creditCardDebt}
            items={detailedBreakdown.creditCards}
            onExpand={openModal}
          />
          <BreakdownRow
            label="Unspent budgets"
            amount={breakdown.unspentBudgets}
            items={detailedBreakdown.unspentCategories}
            onExpand={openModal}
          />
          <BreakdownRow
            label="Stash balances"
            amount={breakdown.stashBalances}
            items={detailedBreakdown.stashItems}
            onExpand={openModal}
          />
        </div>
        <div
          className="flex justify-between font-medium pt-2 border-t"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <span>Available</span>
          <span style={{ color: statusColor }}>{formattedAmount}</span>
        </div>
      </div>
    ) : null;

  if (compact) {
    return (
      <>
        <HoverCard content={tooltipContent} closeDelay={400}>
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded text-sm cursor-help"
            style={{ backgroundColor: 'var(--monarch-bg-card)' }}
          >
            <span style={{ color: 'var(--monarch-text-muted)' }}>Available:</span>
            <span className="font-medium" style={{ color: statusColor }}>
              {formattedAmount}
            </span>
          </div>
        </HoverCard>
        {data && (
          <BreakdownDetailModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            data={data}
            statusColor={statusColor}
            formattedAmount={formattedAmount}
          />
        )}
      </>
    );
  }

  // Simple color: green for >= $0, red for < $0
  const amountColor = (data?.available ?? 0) >= 0 ? 'var(--monarch-green)' : 'var(--monarch-red)';

  return (
    <>
      <div
        className="inline-block rounded-lg p-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        {/* Main content row - grouped together */}
        <div className="flex items-center gap-3 mb-2">
          <Icons.Landmark size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            Available to Stash
          </span>
          <div className="text-2xl font-semibold" style={{ color: amountColor }}>
            {formattedAmount}
          </div>
          <HoverCard content={tooltipContent} side="bottom" align="start" closeDelay={400}>
            <Icons.Info
              size={16}
              className="cursor-help"
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </HoverCard>
        </div>

        {/* Status message */}
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {status === 'negative' && (
            <span>You're overcommitted. Consider reducing budgets or stash targets.</span>
          )}
          {status === 'zero' && <span>All your money is allocated. Great job budgeting!</span>}
          {status === 'low' && <span>You have a small buffer. Be mindful of new commitments.</span>}
          {status === 'healthy' && <span>You have room to save for something new!</span>}
        </div>

        {/* Expected income toggle */}
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeExpectedIncome}
              onChange={(e) => setIncludeExpectedIncome(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Include the additional expected income this month
            </span>
          </label>
        </div>
      </div>

      {data && (
        <BreakdownDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={data}
          statusColor={statusColor}
          formattedAmount={formattedAmount}
        />
      )}
    </>
  );
}
