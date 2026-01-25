/**
 * DistributionFlowDiagram Component
 *
 * A fuel gauge visualization showing remaining funds to allocate.
 * The fill depletes from right to left as funds are stashed,
 * with the remaining amount always centered.
 */

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useAnimatedValue } from '../../hooks';
import { formatCurrency } from '../../utils/formatters';
import { Icons } from '../icons';

interface DistributionFlowDiagramProps {
  /** Title to display at top of the container */
  readonly title: string;
  /** Description text below the title */
  readonly description?: string;
  /** Icon to display next to the title (defaults to PiggyBank) */
  readonly icon?: React.ReactNode;
  /** Total amount available to distribute */
  readonly totalAmount: number;
  /** Amount already allocated */
  readonly allocatedAmount: number;
  /** Info tooltip content to display next to total */
  readonly infoTooltip?: React.ReactNode;
  /** Whether the total amount is editable (hypothetical mode) */
  readonly isEditable?: boolean;
  /** Callback when total amount changes (for hypothetical mode) */
  readonly onTotalChange?: (amount: number) => void;
  /** Callback when user attempts to edit in distribute mode */
  readonly onEditAttempt?: () => void;
  /** Whether this is distribute mode (affects edit behavior) */
  readonly isDistributeMode?: boolean;
}

/** Currency formatting options for whole dollars */
const currencyOpts = { maximumFractionDigits: 0 };

/**
 * Get fill color based on remaining percentage.
 * Transitions from blue (full) to muted gray (nearly empty).
 */
function getFillColor(percent: number, isOverAllocated: boolean, isFullyAllocated: boolean): string {
  if (isOverAllocated) return 'rgb(239, 68, 68)'; // red-500 for error
  if (isFullyAllocated) return 'rgb(34, 197, 94)'; // green-500 for success
  if (percent > 0.6) return 'rgb(59, 130, 246)'; // blue-500
  if (percent > 0.3) return 'rgb(99, 102, 241)'; // indigo-500
  if (percent > 0.1) return 'rgb(139, 92, 246)'; // violet-500
  return 'rgb(107, 114, 128)'; // gray-500
}

export function DistributionFlowDiagram({
  title,
  description,
  icon,
  totalAmount,
  allocatedAmount,
  infoTooltip,
  isEditable = false,
  onTotalChange,
  onEditAttempt,
  isDistributeMode = false,
}: DistributionFlowDiagramProps) {
  const displayTotal = Math.round(totalAmount);
  const remaining = totalAmount - allocatedAmount;
  const displayRemaining = Math.round(remaining);

  // Animate the remaining amount when it changes
  const animatedRemaining = useAnimatedValue(displayRemaining);

  // Determine allocation state
  const isFullyAllocated = displayRemaining === 0 && displayTotal > 0;
  const isOverAllocated = displayRemaining < 0;

  // Calculate remaining percentage (what's left to allocate)
  const remainingPercent = displayTotal > 0 ? Math.max(0, displayRemaining / displayTotal) : 0;

  // Get fill color based on state
  const fillColor = getFillColor(remainingPercent, isOverAllocated, isFullyAllocated);

  // Track input focus and hover state for blinking cursor
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);

  // Measure text width for precise input sizing
  const measureRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputWidth, setInputWidth] = useState(20);

  // Auto-focus input in editable mode (hypothetical)
  useEffect(() => {
    if (isEditable && inputRef.current) {
      inputRef.current.focus();
      // Move cursor to end of input
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isEditable]);

  // Get the display value
  const showTotal = isHovered || isFocused;
  const displayAmount = showTotal ? displayTotal : displayRemaining;
  const displayValue = Math.abs(displayAmount).toLocaleString('en-US');

  // Measure the text width after render
  useLayoutEffect(() => {
    if (measureRef.current) {
      setInputWidth(measureRef.current.offsetWidth);
    }
  }, [displayValue]);

  // Get text color for the centered amount
  const getTextColor = () => {
    if (isOverAllocated) return 'text-monarch-error';
    if (isFullyAllocated) return 'text-monarch-success';
    return 'text-white';
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-monarch-bg-elevated border border-monarch-border -mx-4">
      <div className="relative p-5">
        {/* Title and description */}
        <div className="flex items-center justify-center gap-2 mb-1">
          {icon ?? <Icons.PiggyBank size={20} className="text-monarch-accent" />}
          <h3 className="text-center text-base font-semibold text-monarch-text-dark">
            {title}
          </h3>
        </div>
        {description && (
          <p className="text-center text-sm text-monarch-text-muted mb-3">
            {description}
          </p>
        )}

        {/* Fuel gauge container */}
        <div className="relative h-16 w-full rounded-lg bg-monarch-bg-input overflow-hidden">
          {/* Fill bar - shrinks from right to left, expands on hover/focus */}
          <div
            className="absolute left-0 top-0 h-full rounded-lg transition-all duration-300 ease-out"
            style={{
              width: `${isHovered || isFocused ? 100 : remainingPercent * 100}%`,
              backgroundColor: isHovered || isFocused ? 'rgb(59, 130, 246)' : fillColor,
            }}
          />

          {/* Centered content */}
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            {isEditable ? (
              <div
                className={`relative flex items-center px-3 py-1 rounded-xl transition-all duration-200 ${isFocused ? 'ring-[3px] ring-white' : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <span className={`text-2xl font-medium ${isHovered || isFocused ? 'text-white' : getTextColor()}`}>
                  {isOverAllocated && !showTotal && '-'}$
                </span>
                {/* Hidden span for measuring text width */}
                <span
                  ref={measureRef}
                  className="absolute invisible whitespace-pre text-3xl font-bold tabular-nums"
                  aria-hidden="true"
                >
                  {displayValue || '0'}
                </span>
                {/* Input container with cursor overlay */}
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={displayValue}
                    onChange={(e) => {
                      setHasEdited(true);
                      const digitsOnly = e.target.value.replaceAll(/\D/g, '');
                      const val = digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10);
                      onTotalChange?.(val);
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="0"
                    className={`focus-none text-left text-3xl font-bold tabular-nums bg-transparent outline-none transition-all duration-200 ${isHovered || isFocused ? 'text-white' : getTextColor()} placeholder:text-monarch-text-muted`}
                    style={{ width: inputWidth }}
                    aria-label="Amount to distribute"
                  />
                  {/* Blinking cursor - shown when remaining is non-zero and user hasn't edited yet */}
                  {!isFocused && !hasEdited && displayRemaining > 0 && (
                    <span
                      className={`absolute top-1/2 -translate-y-1/2 w-0.5 h-7 typewriter-cursor ${isHovered ? 'bg-white' : getTextColor().replace('text-', 'bg-')}`}
                      style={{ left: inputWidth + 2 }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={`text-3xl font-bold tabular-nums ${getTextColor()} ${
                  isDistributeMode ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                }`}
                onClick={isDistributeMode ? onEditAttempt : undefined}
                onKeyDown={
                  isDistributeMode
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onEditAttempt?.();
                        }
                      }
                    : undefined
                }
                tabIndex={isDistributeMode ? 0 : -1}
                aria-label={isDistributeMode ? 'Click to learn about editing this value' : undefined}
              >
                {formatCurrency(animatedRemaining, currencyOpts)}
              </button>
            )}

            {infoTooltip && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {infoTooltip}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
