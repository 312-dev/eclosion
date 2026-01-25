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

export function DistributeScreen({
  mode: _mode,
  screenType,
  totalAmount,
  maxAmount: _maxAmount,
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
  const { data: availableData, rawData } = useAvailableToStash({ includeExpectedIncome });
  const breakdown = availableData?.breakdown;
  const detailedBreakdown = availableData?.detailedBreakdown;

  // Calculate raw expected income regardless of toggle setting (for checkbox display)
  const rawExpectedIncome = rawData ? Math.max(0, rawData.plannedIncome - rawData.actualIncome) : 0;

  // Buffer save handler for the editable buffer input
  const updateConfig = useUpdateStashConfigMutation();
  const savedBuffer = config?.bufferAmount ?? 0;

  // Toggle expected income setting
  const handleToggleExpectedIncome = useCallback(async () => {
    try {
      await updateConfig.mutateAsync({ includeExpectedIncome: !includeExpectedIncome });
    } catch {
      toast.error('Failed to update setting');
    }
  }, [updateConfig, includeExpectedIncome, toast]);

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

  // Calculate total allocated
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + val, 0);

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
  const displayTotalAmount = Math.round(totalAmount);

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
          rawExpectedIncome={rawExpectedIncome}
          onToggleExpectedIncome={handleToggleExpectedIncome}
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
        className="cursor-help text-white"
      />
    </HoverCard>
  ) : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header section with remaining amount */}
      <div className="px-4 pt-2 pb-4">
        {/* Flow diagram visualization - shared between savings and monthly screens */}
        <DistributionFlowDiagram
          title={screenType === 'savings' ? 'Available Funds' : 'Monthly Contributions'}
          description={
            screenType === 'savings'
              ? 'This money will be added to your stash balances.'
              : 'Set how much you will contribute to each stash this month.'
          }
          icon={
            screenType === 'savings' ? (
              <Icons.Landmark size={20} className="text-monarch-accent" />
            ) : (
              <Icons.Calendar size={20} className="text-monarch-accent" />
            )
          }
          totalAmount={displayTotalAmount}
          allocatedAmount={totalAllocated}
          infoTooltip={
            screenType === 'savings' ? flowInfoTooltip : (
              infoTooltipContent && (
                <HoverCard content={infoTooltipContent} side="bottom" align="center" closeDelay={400}>
                  <Icons.Info size={14} className="cursor-help text-white" />
                </HoverCard>
              )
            )
          }
          isEditable={screenType === 'savings' ? !isDistributeMode : isTotalEditable}
          {...(onTotalChange && { onTotalChange })}
          {...(onEditAttempt && { onEditAttempt })}
          isDistributeMode={isDistributeMode}
        />

      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto">
        {/* Section header - sticky with blur */}
        <div className="sticky top-0 z-sticky flex items-center justify-between px-4 py-3 bg-monarch-bg-card/95 backdrop-blur-sm border-b border-monarch-border">
          <h2 className="text-sm font-semibold text-monarch-text-dark uppercase tracking-wider">
            Stashes
          </h2>
          <div className="flex items-center gap-3">
            <Tooltip content="Reset amounts">
              <button
                onClick={onReset}
                className="p-1.5 rounded-lg text-monarch-text-muted hover:text-monarch-text-dark hover:bg-monarch-bg-hover transition-colors"
                aria-label="Reset amounts"
              >
                <Icons.Refresh size={14} />
              </button>
            </Tooltip>
            <span className="text-sm font-medium text-monarch-text-muted">Contribution</span>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="w-16 h-16 rounded-xl bg-monarch-bg-elevated flex items-center justify-center border border-monarch-border mb-4">
              <Icons.Wallet size={32} className="text-monarch-text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-monarch-text-dark mb-1">No stashes yet</h3>
            <p className="text-sm text-monarch-text-muted text-center max-w-xs">
              Create your first stash to start allocating funds toward your goals.
            </p>
          </div>
        ) : (
          <div className="py-2">
            {items.map((item, index) => (
              <DistributeItemRow
                key={item.id}
                item={item}
                index={index}
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
