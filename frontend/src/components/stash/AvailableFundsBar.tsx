/**
 * Available Funds Bar
 *
 * A standalone container showing Available Funds with the Distribute button.
 * Includes buffer input in the breakdown tooltip.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Icons } from '../icons';
import { useAvailableToStash, useStashConfigQuery, useUpdateStashConfigMutation } from '../../api/queries';
import { HoverCard } from '../ui/HoverCard';
import { formatAvailableAmount } from '../../utils/availableToStash';
import { BreakdownDetailModal } from './BreakdownDetailModal';
import { BufferInputRow } from './BufferInputRow';
import { DistributeButton, HypothesizeButton } from './DistributeButton';
import { useToast } from '../../context/ToastContext';
import { UI } from '../../constants';
import type { BreakdownLineItem, StashItem } from '../../types';

/** Format currency with no decimals */
function formatCurrency(amount: number): string {
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}$${Math.abs(amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

interface AvailableFundsBarProps {
  /** Whether to include expected income in calculation (from settings) */
  readonly includeExpectedIncome?: boolean;
  /** Reserved buffer amount to subtract from available (from settings) */
  readonly bufferAmount?: number;
  /** Left to Budget amount (ready_to_assign from Monarch) */
  readonly leftToBudget: number;
  /** List of stash items for the distribute button */
  readonly items: StashItem[];
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

export function AvailableFundsBar({
  includeExpectedIncome = false,
  bufferAmount = 0,
  leftToBudget,
  items,
}: Readonly<AvailableFundsBarProps>) {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const prevValueRef = useRef<number | null>(null);

  // Get config for buffer and mutation for saving
  const { data: config } = useStashConfigQuery();
  const updateConfig = useUpdateStashConfigMutation();
  const savedBuffer = config?.bufferAmount ?? 0;

  const { data, isLoading } = useAvailableToStash({
    includeExpectedIncome,
    bufferAmount,
  });

  const breakdown = data?.breakdown;
  const detailedBreakdown = data?.detailedBreakdown;

  // Calculate available before any buffer
  const availableBeforeBuffer = useMemo(() => {
    if (!breakdown) return 0;
    return (
      breakdown.cashOnHand +
      breakdown.expectedIncome -
      breakdown.creditCardDebt -
      breakdown.unspentBudgets -
      breakdown.goalBalances -
      breakdown.stashBalances
    );
  }, [breakdown]);

  // Calculate available with saved buffer
  const displayedAvailable = availableBeforeBuffer - savedBuffer;
  const isPositive = displayedAvailable >= 0;
  const displayedStatusColor = isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)';
  const displayedFormattedAmount = formatCurrency(displayedAvailable);

  // Track transitions to negative for shake animation
  useEffect(() => {
    if (!data) return;

    const prevValue = prevValueRef.current;
    const currentValue = displayedAvailable;

    // Update ref first
    prevValueRef.current = currentValue;

    // Trigger shake when transitioning from positive (or null) to negative
    if (currentValue < 0 && (prevValue === null || prevValue >= 0)) {
      const frame = requestAnimationFrame(() => {
        setShouldShake(true);
      });
      const timer = setTimeout(() => setShouldShake(false), UI.ANIMATION.SLOW);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [data, displayedAvailable]);

  // Save buffer to config
  const saveBuffer = useCallback(
    async (value: number) => {
      try {
        await updateConfig.mutateAsync({ bufferAmount: value });
      } catch {
        toast.error('Failed to save buffer amount');
      }
    },
    [updateConfig, toast]
  );

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
          <BufferInputRow
            availableBeforeBuffer={availableBeforeBuffer}
            savedBuffer={savedBuffer}
            onSave={saveBuffer}
          />
        </div>
        <div
          className="flex justify-between font-medium pt-2 border-t"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <span>Available</span>
          <span style={{ color: displayedStatusColor }}>{displayedFormattedAmount}</span>
        </div>
      </div>
    ) : null;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-between rounded-lg px-6 py-4 mt-4 mb-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-8 w-24 rounded" style={{ backgroundColor: 'var(--monarch-bg-hover)' }} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`rounded-xl mt-4 mb-4 overflow-hidden ${shouldShake ? 'animate-error-shake' : ''}`}
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        {/* Header section */}
        <div
          className="flex items-center justify-center gap-2 px-4 py-2"
          style={{ borderBottom: '1px solid var(--monarch-border)' }}
        >
          <Icons.Landmark
            size={16}
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-hidden="true"
          />
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Available Funds
          </span>
        </div>

        {/* Amount section */}
        <div
          className="flex items-center justify-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid var(--monarch-border)' }}
        >
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: displayedStatusColor }}
          >
            {displayedFormattedAmount}
          </span>
          <HoverCard content={tooltipContent} side="bottom" align="center" closeDelay={400}>
            <Icons.Info
              size={16}
              className="cursor-help"
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </HoverCard>
        </div>

        {/* Button group section */}
        <div className="flex">
          <HypothesizeButton
            availableAmount={displayedAvailable}
            leftToBudget={leftToBudget}
            items={items}
            compact
            groupPosition="left"
          />
          <DistributeButton
            availableAmount={displayedAvailable}
            leftToBudget={leftToBudget}
            items={items}
            compact
            groupPosition="right"
          />
        </div>
      </div>

      {data && (
        <BreakdownDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={data}
          statusColor={displayedStatusColor}
          formattedAmount={displayedFormattedAmount}
        />
      )}
    </>
  );
}
