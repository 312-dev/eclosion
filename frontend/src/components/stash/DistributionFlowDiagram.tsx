/**
 * DistributionFlowDiagram Component
 *
 * A horizontal flow diagram showing how funds flow from the remaining pool
 * into stash balances. Shows:
 * - Left: Fraction (remaining / total)
 * - Center: Horizontal arrow
 * - Right: Stashed amount
 */

import { Icons } from '../icons';
import { Tooltip } from '../ui';

interface DistributionFlowDiagramProps {
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

/**
 * Get the color for the remaining amount based on allocation state.
 */
function getRemainingColor(isOverAllocated: boolean, isFullyAllocated: boolean, hasRemaining: boolean): string {
  if (isOverAllocated) return 'var(--monarch-error)';
  if (isFullyAllocated) return 'var(--monarch-success)';
  if (hasRemaining) return 'var(--monarch-warning)';
  return 'var(--monarch-text-dark)';
}

/**
 * Get the color for the arrow based on allocation state.
 */
function getArrowColor(hasAllocated: boolean, isOverAllocated: boolean): string {
  if (!hasAllocated) return 'var(--monarch-border)';
  if (isOverAllocated) return 'var(--monarch-error)';
  return 'var(--monarch-success)';
}

export function DistributionFlowDiagram({
  totalAmount,
  allocatedAmount,
  infoTooltip,
  isEditable = false,
  onTotalChange,
  onEditAttempt,
  isDistributeMode = false,
}: DistributionFlowDiagramProps) {
  const remaining = totalAmount - allocatedAmount;
  const displayRemaining = Math.round(remaining);
  const displayTotal = Math.round(totalAmount);
  const displayAllocated = Math.round(allocatedAmount);

  // Determine allocation state
  const isFullyAllocated = displayRemaining === 0 && displayTotal > 0;
  const isOverAllocated = displayRemaining < 0;
  const hasRemaining = displayRemaining > 0;
  const hasAllocated = displayAllocated > 0;

  // Compute colors
  const remainingColor = getRemainingColor(isOverAllocated, isFullyAllocated, hasRemaining);
  const arrowColor = getArrowColor(hasAllocated, isOverAllocated);

  return (
    <div className="flex items-center justify-center gap-6 py-4">
      {/* Left: Fraction (Remaining / Total) */}
      <div className="flex flex-col items-center">
        {/* Remaining (numerator) with "to go" suffix */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-2xl font-bold tabular-nums transition-colors"
            style={{ color: remainingColor }}
          >
            {formatCurrency(displayRemaining)}
          </span>
                    {isFullyAllocated && (
            <Icons.Check size={18} style={{ color: 'var(--monarch-success)' }} />
          )}
          {isOverAllocated && (
            <Icons.Warning size={18} style={{ color: 'var(--monarch-error)' }} />
          )}
        </div>

        {/* Divider line */}
        <div
          className="w-full h-px my-1"
          style={{ backgroundColor: 'var(--monarch-border)' }}
        />

        {/* Total (denominator) in input-box style */}
        <div className="relative">
          <div
            className={`flex items-center justify-center rounded-lg border-2 px-2 py-1 transition-colors ${
              isEditable
                ? 'border-monarch-border focus-within:border-monarch-orange'
                : 'border-monarch-border cursor-pointer hover:border-monarch-text-muted'
            }`}
            onClick={!isEditable && isDistributeMode ? onEditAttempt : undefined}
            onKeyDown={
              !isEditable && isDistributeMode
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onEditAttempt?.();
                    }
                  }
                : undefined
            }
            role={!isEditable && isDistributeMode ? 'button' : undefined}
            tabIndex={!isEditable && isDistributeMode ? 0 : undefined}
            aria-label={!isEditable && isDistributeMode ? 'Click to learn about editing this value' : undefined}
          >
            <span className={`text-xl font-medium ${isEditable ? 'text-monarch-text-dark' : 'text-monarch-text-muted'}`}>$</span>
            {isEditable ? (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayTotal ? displayTotal.toLocaleString('en-US') : ''}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replaceAll(/\D/g, '');
                    const val = digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10);
                    onTotalChange?.(Math.max(0, val));
                  }}
                  placeholder="0"
                  className="w-24 text-center text-xl font-medium tabular-nums bg-transparent outline-none text-monarch-text-dark placeholder:text-monarch-text-muted"
                  aria-label="Total amount to distribute"
                />
                {isOverAllocated && (
                  <Tooltip content="Correct the difference">
                    <button
                      onClick={() => onTotalChange?.(allocatedAmount)}
                      className="p-0.5 rounded text-monarch-text-muted hover:text-monarch-orange transition-colors"
                      aria-label="Set available equal to allocated amount"
                    >
                      <Icons.Wrench size={14} />
                    </button>
                  </Tooltip>
                )}
              </>
            ) : (
              <span className="text-xl font-medium tabular-nums text-monarch-text-muted px-1">
                {displayTotal.toLocaleString()}
              </span>
            )}
          </div>
          {infoTooltip && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-1">
              {infoTooltip}
            </div>
          )}
        </div>
        <span className="text-sm text-monarch-text-muted">savings</span>
      </div>

      {/* Center: Horizontal arrow */}
      <svg
        width="48"
        height="20"
        viewBox="0 0 48 20"
        fill="none"
        className="transition-colors"
        aria-hidden="true"
      >
        {/* Single path for connected arrow */}
        <path
          d="M4 10H30M30 4L38 10L30 16"
          stroke={arrowColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Right: Stashed amount with "stashed" label below */}
      <div className="flex flex-col items-center">
        <span
          className="text-2xl font-bold tabular-nums transition-colors"
          style={{ color: hasAllocated ? arrowColor : 'var(--monarch-text-muted)' }}
        >
          {formatCurrency(displayAllocated)}
        </span>
        <span className="text-sm text-monarch-text-muted">stashed</span>
      </div>
    </div>
  );
}
