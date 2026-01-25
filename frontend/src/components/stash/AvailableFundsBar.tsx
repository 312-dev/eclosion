/**
 * Available Funds Bar
 *
 * A standalone container showing Available Funds with the Distribute button.
 * Includes buffer input in the breakdown tooltip.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../icons';
import {
  useAvailableToStash,
  useStashConfigQuery,
  useUpdateStashConfigMutation,
} from '../../api/queries';
import { HoverCard } from '../ui/HoverCard';
import { BreakdownDetailModal } from './BreakdownDetailModal';
import { BreakdownRow, ExpectedIncomeRow, BREAKDOWN_LABELS } from './BreakdownComponents';
import { BufferInputRow } from './BufferInputRow';
import { DistributeButton, HypothesizeButton } from './DistributeButton';
import { useToast } from '../../context/ToastContext';
import { UI, STORAGE_KEYS } from '../../constants';
import { formatCurrency } from '../../utils/formatters';
import type { StashItem } from '../../types';

/** Position options for the floating bar */
type BarPosition = 'left' | 'center' | 'right';

/** Load saved position from localStorage */
function loadSavedPosition(): BarPosition {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FUNDS_BAR_POSITION);
    if (saved === 'left' || saved === 'center' || saved === 'right') {
      return saved;
    }
  } catch {
    // localStorage may be unavailable
  }
  return 'center';
}

/** Save position to localStorage */
function savePosition(position: BarPosition): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FUNDS_BAR_POSITION, position);
  } catch {
    // localStorage may be unavailable
  }
}

/** Currency formatting options for whole dollars */
const currencyOpts = { maximumFractionDigits: 0 };

interface AvailableFundsBarProps {
  /** Left to Budget amount (ready_to_assign from Monarch) */
  readonly leftToBudget: number;
  /** List of stash items for the distribute button */
  readonly items: StashItem[];
}

export function AvailableFundsBar({
  leftToBudget,
  items,
}: Readonly<AvailableFundsBarProps>) {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const prevValueRef = useRef<number | null>(null);

  // Position state for snap-to-corner behavior
  const [position, setPosition] = useState<BarPosition>(loadSavedPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; width: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ grabOffsetX: number } | null>(null);

  // Get config for settings and mutation for saving
  // Read directly from query to ensure immediate updates after mutations
  const { data: config } = useStashConfigQuery();
  const updateConfig = useUpdateStashConfigMutation();
  const includeExpectedIncome = config?.includeExpectedIncome ?? false;
  const bufferAmount = config?.bufferAmount ?? 0;

  const { data, rawData, isLoading } = useAvailableToStash({
    includeExpectedIncome,
    bufferAmount,
  });

  // Calculate raw expected income regardless of toggle setting
  const rawExpectedIncome = rawData ? Math.max(0, rawData.plannedIncome - rawData.actualIncome) : 0;

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
  const displayedAvailable = availableBeforeBuffer - bufferAmount;
  const isPositive = displayedAvailable >= 0;
  const displayedStatusColor = isPositive ? 'var(--monarch-success)' : 'var(--monarch-error)';
  const displayedFormattedAmount = formatCurrency(displayedAvailable, currencyOpts);

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

  // Toggle expected income setting
  const handleToggleExpectedIncome = useCallback(async () => {
    try {
      await updateConfig.mutateAsync({ includeExpectedIncome: !includeExpectedIncome });
    } catch {
      toast.error('Failed to update setting');
    }
  }, [updateConfig, includeExpectedIncome, toast]);

  const openModal = () => setIsModalOpen(true);

  // Calculate position for snap based on drag location
  const calculateSnapPosition = useCallback((mouseX: number): BarPosition => {
    // Get content area bounds (right of sidebar)
    const contentLeft = sidebarWidth;
    const contentRight = window.innerWidth;
    const contentWidth = contentRight - contentLeft;

    // Calculate relative position within content area (0-1)
    const relativeX = (mouseX - contentLeft) / contentWidth;

    // Snap thresholds: left third, middle third, right third
    if (relativeX < 0.33) return 'left';
    if (relativeX > 0.67) return 'right';
    return 'center';
  }, []);

  // Handle drag start - track where user grabbed relative to card
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    // Store the offset from the card's left edge to where the user clicked
    const grabOffsetX = e.clientX - rect.left;

    dragStartRef.current = { grabOffsetX };
    setIsDragging(true);
    // Store the card's current position and width so it doesn't shrink during drag
    setDragOffset({ x: rect.left, width: rect.width });
  }, []);

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !dragOffset) return;

      const { grabOffsetX } = dragStartRef.current;
      // Position card so the grab point stays under the mouse
      const newLeft = e.clientX - grabOffsetX;
      setDragOffset({ x: newLeft, width: dragOffset.width });
    };

    const handleMouseUp = (e: MouseEvent) => {
      const newPosition = calculateSnapPosition(e.clientX);
      setPosition(newPosition);
      savePosition(newPosition);
      setIsDragging(false);
      setDragOffset(null);
      dragStartRef.current = null;
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    globalThis.addEventListener('mouseup', handleMouseUp);

    return () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, calculateSnapPosition]);

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
          <ExpectedIncomeRow
            amount={rawExpectedIncome}
            isEnabled={includeExpectedIncome}
            onToggle={handleToggleExpectedIncome}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.cashOnHand}
            amount={breakdown.cashOnHand}
            isPositive
            items={detailedBreakdown.cashAccounts}
            onExpand={openModal}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.goalBalances}
            amount={breakdown.goalBalances}
            items={detailedBreakdown.goals}
            onExpand={openModal}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.creditCardDebt}
            amount={breakdown.creditCardDebt}
            items={detailedBreakdown.creditCards}
            onExpand={openModal}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.unspentBudgets}
            amount={breakdown.unspentBudgets}
            items={detailedBreakdown.unspentCategories}
            onExpand={openModal}
          />
          <BreakdownRow
            label={BREAKDOWN_LABELS.stashBalances}
            amount={breakdown.stashBalances}
            items={detailedBreakdown.stashItems}
            onExpand={openModal}
          />
          <BufferInputRow
            availableBeforeBuffer={availableBeforeBuffer}
            savedBuffer={bufferAmount}
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

  // Shared box shadow style for the floating card - pronounced with wide spread
  const cardShadow =
    '0 -12px 48px rgba(0, 0, 0, 0.25), 0 -4px 16px rgba(0, 0, 0, 0.15), 0 0 80px rgba(0, 0, 0, 0.1)';

  // Sidebar width for centering calculation
  const sidebarWidth = 220;

  // Calculate positioning styles for the container
  const getContainerStyles = useCallback((): React.CSSProperties => {
    // Snap positions with smooth transition
    const baseStyles: React.CSSProperties = {
      left: sidebarWidth,
      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    };

    switch (position) {
      case 'left':
        return { ...baseStyles, justifyContent: 'flex-start', paddingLeft: '2rem' };
      case 'right':
        return { ...baseStyles, justifyContent: 'flex-end', paddingRight: '2rem' };
      case 'center':
      default:
        return { ...baseStyles, justifyContent: 'center' };
    }
  }, [position, isDragging]);

  // Calculate styles for the card (applies drag offset when dragging)
  const getCardStyles = useCallback((): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      backgroundColor: 'var(--monarch-bg-card)',
      border: '1px solid var(--monarch-border)',
      boxShadow: cardShadow,
    };

    if (isDragging && dragOffset) {
      return {
        ...baseStyles,
        position: 'fixed',
        left: dragOffset.x,
        bottom: 72,
        width: dragOffset.width,
        transition: 'none',
      };
    }

    return {
      ...baseStyles,
      transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    };
  }, [isDragging, dragOffset, cardShadow]);

  const floatingBar = createPortal(
    <>
      {/* Vignette gradient - full width, behind footer (z-10) */}
      <div
        className="fixed bottom-0 left-0 right-0 h-64 z-10 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, var(--monarch-bg-page) 0%, var(--monarch-bg-page) 40%, transparent 100%)',
        }}
      />
      {/* Fixed floating card - positioned based on user preference */}
      <div
        className="fixed bottom-18 right-0 z-40 flex pointer-events-none"
        style={getContainerStyles()}
      >
        <div
          ref={cardRef}
          className={`pointer-events-auto rounded-xl overflow-hidden max-w-75 w-full relative ${shouldShake ? 'animate-error-shake' : ''}`}
          style={getCardStyles()}
        >
          {/* Drag handle - full width invisible button with corner grip indicators */}
          <button
            type="button"
            className="absolute inset-x-0 top-0 h-8 cursor-grab active:cursor-grabbing group bg-transparent border-0 outline-none focus-visible:ring-2 focus-visible:ring-(--monarch-orange) focus-visible:ring-inset rounded-t-xl z-10"
            onMouseDown={handleDragStart}
            aria-label={`Reposition widget. Currently ${position}. Use arrow keys to move.`}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const newPos = position === 'right' ? 'center' : 'left';
                setPosition(newPos);
                savePosition(newPos);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                const newPos = position === 'left' ? 'center' : 'right';
                setPosition(newPos);
                savePosition(newPos);
              }
            }}
          >
            {/* Corner grip indicators - 9 dots wide, 2 rows */}
            <div className="absolute top-1.5 left-2 flex flex-col gap-0.5 transition-opacity opacity-0 group-hover:opacity-60">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
              </div>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
              </div>
            </div>
            <div className="absolute top-1.5 right-2 flex flex-col gap-0.5 transition-opacity opacity-0 group-hover:opacity-60">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
              </div>
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
                <div className="w-1 h-1 rounded-full bg-(--monarch-text-muted)" />
              </div>
            </div>
          </button>
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
            <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-muted)' }}>
              Available Funds
            </span>
          </div>

          {/* Amount section */}
          <div
            className="flex items-center justify-center px-4 py-3"
            style={{ borderBottom: '1px solid var(--monarch-border)' }}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div
                  className="h-9 w-28 rounded animate-pulse"
                  style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
                />
                <div
                  className="w-4 h-4 rounded animate-pulse"
                  style={{ backgroundColor: 'var(--monarch-bg-hover)' }}
                />
              </div>
            ) : (
              <HoverCard content={tooltipContent} side="top" align="center" closeDelay={400}>
                <div className="flex items-center gap-2 cursor-help">
                  <span
                    className="text-3xl font-bold tabular-nums"
                    style={{ color: displayedStatusColor }}
                  >
                    {displayedFormattedAmount}
                  </span>
                  <Icons.Info size={16} style={{ color: 'var(--monarch-text-muted)' }} />
                </div>
              </HoverCard>
            )}
          </div>

          {/* Button group section */}
          <div className="flex">
            <HypothesizeButton
              availableAmount={isLoading ? 0 : displayedAvailable}
              leftToBudget={leftToBudget}
              items={items}
              compact
              groupPosition="left"
            />
            {isLoading ? (
              <div
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium animate-pulse"
                style={{
                  backgroundColor: 'var(--monarch-bg-hover)',
                  color: 'var(--monarch-text-muted)',
                }}
              >
                <Icons.Split size={14} style={{ opacity: 0.5 }} />
                <span style={{ opacity: 0.5 }}>Distribute</span>
              </div>
            ) : (
              <DistributeButton
                availableAmount={displayedAvailable}
                leftToBudget={leftToBudget}
                items={items}
                compact
                groupPosition="right"
              />
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );

  return (
    <>
      {floatingBar}
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
