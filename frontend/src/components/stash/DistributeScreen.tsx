/**
 * DistributeScreen Component
 *
 * A screen for distributing funds across stash items.
 * Used by DistributeWizard for both distribute and hypothesize modes.
 *
 * Features:
 * - Amount/Percent toggle for input mode
 * - Editable total amount (with optional max cap)
 * - Per-item allocation inputs
 * - Status indicator for remaining/over-allocated
 * - Info tooltip showing how the amount was calculated
 */

import { useState, useCallback } from 'react';
import { DistributeItemRow } from './DistributeItemRow';
import { DistributionFlowDiagram } from './DistributionFlowDiagram';
import { SavingsInfoTooltip, MonthlyInfoTooltip } from './DistributeInfoTooltip';
import { Icons } from '../icons';
import { Tooltip } from '../ui';
import { HoverCard } from '../ui/HoverCard';
import { useAvailableToStash, useStashConfigQuery, useUpdateStashConfigMutation } from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { distributeAmountByRatios } from '../../utils/calculations';
import type { StashItem, StashEventsMap, StashEvent } from '../../types';
import type { DistributeMode } from './DistributeWizard';

type InputMode = 'amount' | 'percent';
type ScreenType = 'savings' | 'monthly';

interface DistributeScreenProps {
  /** Mode: 'distribute' for real allocation, 'hypothesize' for what-if planning */
  readonly mode: DistributeMode;
  /** Which screen: 'savings' (screen 1) or 'monthly' (screen 2) */
  readonly screenType: ScreenType;
  /** Total amount to distribute */
  readonly totalAmount: number;
  /** Maximum allowed amount (used in distribute mode) */
  readonly maxAmount?: number;
  /** Whether the total amount is editable */
  readonly isTotalEditable?: boolean;
  /** Callback when total amount changes */
  readonly onTotalChange?: (amount: number) => void;
  /** Current allocations by item ID */
  readonly allocations: Record<string, number>;
  /** Callback when an allocation changes */
  readonly onAllocationChange: (id: string, amount: number) => void;
  /** List of stash items to show */
  readonly items: StashItem[];
  /** Reset all allocations to zero */
  readonly onReset: () => void;
  /** Left to Budget amount (for displaying split info) */
  readonly leftToBudget?: number;
  /** Whether to show forecast projections (only on monthly step) */
  readonly showForecast?: boolean;
  /** Rollover allocations from Screen 1 (for calculating starting balance on Screen 2) */
  readonly rolloverAllocations?: Record<string, number>;
  /** Available amount before subtracting leftToBudget (for savings screen tooltip) */
  readonly availableAmount?: number;
  /** Callback to refresh the left to budget amount (for monthly screen) */
  readonly onRefreshLeftToBudget?: () => void;
  /** Whether the left to budget refresh is in progress */
  readonly isRefreshingLeftToBudget?: boolean;
  /** Callback when user attempts to edit total in distribute mode */
  readonly onEditAttempt?: () => void;
  /** Whether this is distribute mode (affects edit behavior) */
  readonly isDistributeMode?: boolean;
  /** Stash events for hypothetical projections (monthly screen only) */
  readonly stashEvents?: StashEventsMap;
  /** Callback to add an event to a stash item */
  readonly onAddEvent?: (stashId: string) => void;
  /** Callback to update an event */
  readonly onUpdateEvent?: (stashId: string, eventId: string, updates: Partial<StashEvent>) => void;
  /** Callback to remove an event */
  readonly onRemoveEvent?: (stashId: string, eventId: string) => void;
}

/**
 * Format currency for display.
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function DistributeScreen({
  mode: _mode,
  screenType,
  totalAmount,
  maxAmount,
  isTotalEditable = false,
  onTotalChange,
  allocations,
  onAllocationChange,
  items,
  onReset,
  leftToBudget,
  showForecast = false,
  rolloverAllocations,
  availableAmount,
  onRefreshLeftToBudget,
  isRefreshingLeftToBudget,
  onEditAttempt,
  isDistributeMode = false,
  stashEvents,
  onAddEvent,
  onUpdateEvent,
  onRemoveEvent,
}: DistributeScreenProps) {
  const [inputMode, setInputMode] = useState<InputMode>('amount');

  const toast = useToast();

  // Fetch breakdown data for the info tooltip
  const { data: config } = useStashConfigQuery();
  const includeExpectedIncome = config?.includeExpectedIncome ?? false;
  const { data: availableData } = useAvailableToStash({ includeExpectedIncome });
  const breakdown = availableData?.breakdown;
  const detailedBreakdown = availableData?.detailedBreakdown;

  // Buffer save handler for the editable buffer input
  const updateConfig = useUpdateStashConfigMutation();
  const savedBuffer = config?.bufferAmount ?? 0;

  const handleSaveBuffer = useCallback(
    async (value: number) => {
      try {
        await updateConfig.mutateAsync({ bufferAmount: value });
      } catch {
        toast.error('Failed to save buffer amount');
      }
    },
    [updateConfig, toast]
  );

  // Calculate total allocated and remaining
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const remaining = totalAmount - totalAllocated;
  const isAtMax = maxAmount !== undefined && totalAmount >= maxAmount;

  // Handle allocation change from percentage input
  // Uses largest remainder method when percentages sum to ~100%, otherwise simple rounding
  const handlePercentChange = useCallback(
    (id: string, percent: number) => {
      // Build percentages for all items, updating the changed one
      const percentages: Record<string, number> = {};
      for (const item of items) {
        if (item.id === id) {
          percentages[item.id] = percent;
        } else {
          // Get existing percentage from current allocation
          const existingAmount = allocations[item.id] ?? 0;
          percentages[item.id] = totalAmount > 0 ? (existingAmount / totalAmount) * 100 : 0;
        }
      }

      // Check if percentages sum to ~100% (within 1%)
      const totalPercent = Object.values(percentages).reduce((sum, p) => sum + p, 0);
      const isComplete = totalPercent >= 99 && totalPercent <= 101;

      if (isComplete && items.length > 1) {
        // Use largest remainder method for complete allocation
        const ratios: Record<string, number> = {};
        for (const [itemId, pct] of Object.entries(percentages)) {
          ratios[itemId] = pct / 100;
        }
        const newAllocations = distributeAmountByRatios(totalAmount, ratios);

        // Update all items
        for (const item of items) {
          const newAmount = newAllocations[item.id] ?? 0;
          const currentAmount = allocations[item.id] ?? 0;
          if (newAmount !== currentAmount) {
            onAllocationChange(item.id, newAmount);
          }
        }
      } else {
        // Simple rounding for incomplete allocation (during typing)
        const amount = Math.round((percent / 100) * totalAmount);
        onAllocationChange(id, amount);
      }
    },
    [items, allocations, totalAmount, onAllocationChange]
  );

  // Get percentage for an item
  const getPercentForItem = (itemId: string): number => {
    const amount = allocations[itemId] ?? 0;
    if (totalAmount <= 0) return 0;
    return Math.round((amount / totalAmount) * 100);
  };

  // Round values to whole dollars for display
  const displayRemaining = Math.round(remaining);
  const displayTotalAmount = Math.round(totalAmount);

  // Get color for the remaining amount display
  const getRemainingColor = () => {
    if (displayRemaining < 0) return 'var(--monarch-error)';
    if (displayRemaining === 0) return 'var(--monarch-success)';
    return 'var(--monarch-text-dark)';
  };

  // Render the info tooltip content based on screen type
  const infoTooltipContent = (() => {
    if (screenType === 'savings' && breakdown && detailedBreakdown) {
      return (
        <SavingsInfoTooltip
          breakdown={breakdown}
          detailedBreakdown={detailedBreakdown}
          includeExpectedIncome={includeExpectedIncome}
          availableAmount={availableAmount ?? 0}
          leftToBudget={leftToBudget ?? 0}
          existingSavings={displayTotalAmount}
          savedBuffer={savedBuffer}
          onSaveBuffer={handleSaveBuffer}
        />
      );
    }

    if (screenType === 'monthly') {
      return (
        <MonthlyInfoTooltip
          monthlyAmount={displayTotalAmount}
          {...(onRefreshLeftToBudget && { onRefresh: onRefreshLeftToBudget })}
          {...(isRefreshingLeftToBudget !== undefined && { isRefreshing: isRefreshingLeftToBudget })}
        />
      );
    }

    return null;
  })();

  // Build info tooltip for the flow diagram
  const flowInfoTooltip = screenType === 'savings' && infoTooltipContent ? (
    <HoverCard content={infoTooltipContent} side="bottom" align="center" closeDelay={400}>
      <Icons.Info
        size={14}
        className="cursor-help"
        style={{ color: 'var(--monarch-text-muted)' }}
      />
    </HoverCard>
  ) : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header section with remaining amount */}
      <div className="px-4 pt-2 pb-4">
        {/* Screen 1 (Savings): Flow diagram visualization */}
        {screenType === 'savings' ? (
          <DistributionFlowDiagram
            totalAmount={displayTotalAmount}
            allocatedAmount={totalAllocated}
            infoTooltip={flowInfoTooltip}
            isEditable={!isDistributeMode}
            {...(onTotalChange && { onTotalChange })}
            {...(onEditAttempt && { onEditAttempt })}
            isDistributeMode={isDistributeMode}
          />
        ) : (
          /* Screen 2 (Monthly) or editable mode */
          <div className="flex flex-col items-center">
            {/* Remaining amount (what hasn't been budgeted yet) */}
            <div className="flex items-center gap-2">
              <span
                className="text-4xl font-semibold transition-colors"
                style={{ color: getRemainingColor() }}
              >
                {formatCurrency(displayRemaining)}
              </span>
              {displayRemaining === 0 && displayTotalAmount > 0 && (
                <Icons.Check size={22} style={{ color: 'var(--monarch-success)' }} />
              )}
              {displayRemaining < 0 && (
                <Icons.Warning size={22} style={{ color: 'var(--monarch-error)' }} />
              )}
            </div>
            <div
              className="w-24 h-px my-2"
              style={{ backgroundColor: 'var(--monarch-border)' }}
            />
            {/* Total amount in input field style */}
            <div className="relative inline-flex items-center">
              <div
                className={`flex items-center justify-center rounded-lg border-2 px-3 py-1.5 transition-colors ${
                  isTotalEditable
                    ? isAtMax
                      ? 'border-monarch-warning'
                      : 'border-monarch-border focus-within:border-monarch-orange'
                    : 'border-monarch-border cursor-pointer hover:border-monarch-text-muted'
                }`}
                onClick={!isTotalEditable && isDistributeMode ? onEditAttempt : undefined}
                onDoubleClick={!isTotalEditable && isDistributeMode ? onEditAttempt : undefined}
                onKeyDown={
                  !isTotalEditable && isDistributeMode
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onEditAttempt?.();
                        }
                      }
                    : undefined
                }
                role={!isTotalEditable && isDistributeMode ? 'button' : undefined}
                tabIndex={!isTotalEditable && isDistributeMode ? 0 : undefined}
                aria-label={!isTotalEditable && isDistributeMode ? 'Click to learn about editing this value' : undefined}
              >
                <span className={`text-lg font-medium ${isTotalEditable ? 'text-monarch-text-dark' : 'text-monarch-text-muted'}`}>$</span>
                {isTotalEditable ? (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={displayTotalAmount ? displayTotalAmount.toLocaleString('en-US') : ''}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replaceAll(/\D/g, '');
                        const val = digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10);
                        onTotalChange?.(Math.max(0, val));
                      }}
                      placeholder="0"
                      className="w-24 text-center text-lg font-medium bg-transparent outline-none text-monarch-text-dark placeholder:text-monarch-text-muted tabular-nums"
                      aria-label="Total amount to distribute"
                    />
                    {displayRemaining < 0 && (
                      <Tooltip content="Correct the difference">
                        <button
                          onClick={() => onTotalChange?.(totalAllocated)}
                          className="p-0.5 rounded text-monarch-text-muted hover:text-monarch-orange transition-colors"
                          aria-label="Set available equal to allocated amount"
                        >
                          <Icons.Wrench size={14} />
                        </button>
                      </Tooltip>
                    )}
                  </>
                ) : (
                  <span className="text-lg font-medium text-monarch-text-muted px-2">
                    {displayTotalAmount.toLocaleString()}
                  </span>
                )}
              </div>
              {infoTooltipContent && (
                <HoverCard content={infoTooltipContent} side="bottom" align="center" closeDelay={400}>
                  <Icons.Info
                    size={14}
                    className="absolute -right-5 cursor-help"
                    style={{ color: 'var(--monarch-text-muted)' }}
                  />
                </HoverCard>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto">
        {/* Column headers row */}
        <div className="px-4 py-2 flex items-center justify-between border-b border-monarch-border">
          <span className="text-xs font-medium text-monarch-text-muted">Stashes</span>
          <div className="flex items-center gap-2">
            <Tooltip content="Reset amounts">
              <button
                onClick={onReset}
                className="p-1 rounded text-monarch-text-muted hover:text-monarch-text-dark hover:bg-monarch-bg-hover transition-colors"
                aria-label="Reset amounts"
              >
                <Icons.Refresh size={12} />
              </button>
            </Tooltip>
            <span className="text-xs font-medium text-monarch-text-muted">Contribution</span>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-monarch-text-muted">
            No stash items to distribute to.
          </div>
        ) : (
          <div className="divide-y divide-monarch-border">
            {items.map((item) => (
              <DistributeItemRow
                key={item.id}
                item={item}
                amount={allocations[item.id] ?? 0}
                percent={getPercentForItem(item.id)}
                onAmountChange={onAllocationChange}
                onPercentChange={handlePercentChange}
                inputMode={inputMode}
                onInputModeChange={setInputMode}
                showTargetInfo={true}
                showLiveProjection={showForecast}
                rolloverAmount={rolloverAllocations?.[item.id] ?? 0}
                screenType={screenType}
                onApplySuggestion={(id, suggestedAmount) => {
                  if (inputMode === 'percent') {
                    // Convert amount to percentage and apply
                    const percent = totalAmount > 0 ? Math.round((suggestedAmount / totalAmount) * 100) : 0;
                    handlePercentChange(id, percent);
                  } else {
                    onAllocationChange(id, suggestedAmount);
                  }
                }}
                {...(showForecast && stashEvents && {
                  itemEvents: stashEvents[item.id] ?? [],
                  onAddEvent: onAddEvent ? () => onAddEvent(item.id) : undefined,
                  onUpdateEvent: onUpdateEvent
                    ? (eventId: string, updates: Partial<StashEvent>) =>
                        onUpdateEvent(item.id, eventId, updates)
                    : undefined,
                  onRemoveEvent: onRemoveEvent
                    ? (eventId: string) => onRemoveEvent(item.id, eventId)
                    : undefined,
                })}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
