/**
 * DistributeButton and HypothesizeButton Components
 *
 * Two buttons for fund distribution and what-if planning:
 *
 * DistributeButton:
 * - Opens Distribute wizard in 'distribute' mode
 * - Disabled when availableAmount <= 0, no stash items, or rate limited
 *
 * HypothesizeButton:
 * - Opens Distribute wizard in 'hypothesize' mode (no save)
 * - Always enabled as long as there are stash items
 * - Allows "what-if" planning with any hypothetical amount
 */

import { useState } from 'react';
import { Icons } from '../icons';
import { DistributeWizard } from './DistributeWizard';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { Tooltip } from '../ui/Tooltip';
import type { StashItem } from '../../types';

/** Position in a button group for styling borders/corners */
type ButtonGroupPosition = 'left' | 'right' | 'standalone';

interface DistributeButtonProps {
  /** Available funds to distribute (after buffer) */
  readonly availableAmount: number;
  /** Left to Budget amount (ready_to_assign from Monarch) */
  readonly leftToBudget: number;
  /** List of stash items to distribute to */
  readonly items: StashItem[];
  /** Compact mode for button groups */
  readonly compact?: boolean;
  /** Position in button group for styling */
  readonly groupPosition?: ButtonGroupPosition;
}

interface HypothesizeButtonProps {
  /** Available funds (used as starting amount in hypothesize mode) */
  readonly availableAmount: number;
  /** Left to Budget amount (ready_to_assign from Monarch) */
  readonly leftToBudget: number;
  /** List of stash items to distribute to */
  readonly items: StashItem[];
  /** Compact mode for button groups */
  readonly compact?: boolean;
  /** Position in button group for styling */
  readonly groupPosition?: ButtonGroupPosition;
}

/**
 * Filter to active stash items only (not archived, not goals).
 */
function getActiveStashItems(items: StashItem[]): StashItem[] {
  return items.filter((item) => item.type === 'stash' && !item.is_archived);
}

/**
 * Get border radius classes based on button group position.
 */
function getGroupRadiusClasses(position: ButtonGroupPosition): string {
  switch (position) {
    case 'left':
      return 'rounded-l-md rounded-r-none';
    case 'right':
      return 'rounded-r-md rounded-l-none border-l-0';
    default:
      return 'rounded-lg';
  }
}

/**
 * Get size classes for button based on cell/compact mode.
 */
function getSizeClasses(isCell: boolean, compact: boolean): string {
  if (isCell) return 'flex-1 justify-center py-2.5 text-sm';
  if (compact) return 'px-3 py-1.5 text-sm';
  return 'px-4 py-2';
}

/**
 * Distribute button - allocates Available to Stash funds.
 */
export function DistributeButton({
  availableAmount,
  leftToBudget,
  items,
  compact = false,
  groupPosition = 'standalone',
}: DistributeButtonProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const isRateLimited = useIsRateLimited();

  const activeStashItems = getActiveStashItems(items);
  const hasNoItems = activeStashItems.length === 0;
  const nothingToDistribute = availableAmount <= 0;
  const isDisabled = isRateLimited || hasNoItems || nothingToDistribute;

  // Determine tooltip message based on disabled reason
  const getTooltipMessage = (): string | null => {
    if (nothingToDistribute) {
      return "There's nothing available to distribute. Use Hypothesize for what-if planning.";
    }
    if (hasNoItems) {
      return 'Create some stash items first';
    }
    if (isRateLimited) {
      return 'Rate limited - please wait';
    }
    return null;
  };

  const tooltipMessage = getTooltipMessage();
  const isCell = compact && groupPosition !== 'standalone';
  const sizeClasses = getSizeClasses(isCell, compact);
  const radiusClasses = isCell ? '' : getGroupRadiusClasses(groupPosition);

  const buttonContent = (
    <button
      onClick={() => setIsWizardOpen(true)}
      disabled={isDisabled}
      className={`flex items-center gap-1.5 ${sizeClasses} ${radiusClasses} font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{
        backgroundColor: isDisabled ? 'var(--monarch-bg-hover)' : 'var(--monarch-orange)',
        color: isDisabled ? 'var(--monarch-text-muted)' : 'white',
      }}
      aria-label="Distribute funds"
    >
      <Icons.Split size={compact ? 14 : 18} />
      <span>Distribute</span>
    </button>
  );

  return (
    <>
      {tooltipMessage ? (
        <Tooltip content={tooltipMessage} side="bottom">
          {buttonContent}
        </Tooltip>
      ) : (
        buttonContent
      )}

      <DistributeWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        mode="distribute"
        availableAmount={availableAmount}
        leftToBudget={leftToBudget}
        items={activeStashItems}
      />
    </>
  );
}

/**
 * Hypothesize button - "what-if" planning without saving.
 */
export function HypothesizeButton({
  availableAmount,
  leftToBudget,
  items,
  compact = false,
  groupPosition = 'standalone',
}: HypothesizeButtonProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const activeStashItems = getActiveStashItems(items);
  const hasNoItems = activeStashItems.length === 0;
  const isDisabled = hasNoItems;

  // Determine tooltip message based on disabled reason
  const tooltipMessage = hasNoItems ? 'Create some stash items first' : null;
  const isCell = compact && groupPosition !== 'standalone';
  const sizeClasses = getSizeClasses(isCell, compact);
  const radiusClasses = isCell ? '' : getGroupRadiusClasses(groupPosition);

  const buttonContent = (
    <button
      onClick={() => setIsWizardOpen(true)}
      disabled={isDisabled}
      className={`flex items-center gap-1.5 ${sizeClasses} ${radiusClasses} font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-(--monarch-bg-hover)`}
      style={{
        backgroundColor: isCell ? 'var(--monarch-bg-page)' : compact ? 'transparent' : 'var(--monarch-bg-card)',
        border: compact ? 'none' : '1px solid var(--monarch-border)',
        borderRight: isCell ? '1px solid var(--monarch-border)' : undefined,
        color: 'var(--monarch-text-dark)',
      }}
      aria-label="Hypothesize fund allocation"
    >
      <Icons.FlaskConical size={compact ? 14 : 18} />
      <span>Hypothesize</span>
    </button>
  );

  return (
    <>
      {tooltipMessage ? (
        <Tooltip content={tooltipMessage} side="bottom">
          {buttonContent}
        </Tooltip>
      ) : (
        buttonContent
      )}

      <DistributeWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        mode="hypothesize"
        availableAmount={availableAmount}
        leftToBudget={leftToBudget}
        items={activeStashItems}
      />
    </>
  );
}
