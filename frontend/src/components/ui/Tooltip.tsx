/**
 * Tooltip - Custom tooltip component using Radix UI
 *
 * Replaces native browser tooltips with styled, accessible tooltips.
 * For non-interactive content only (text hints, labels).
 *
 * Usage:
 *   <Tooltip content="Helpful text">
 *     <button>Hover me</button>
 *   </Tooltip>
 *
 * For interactive content (scrollable lists, buttons), use HoverCard instead.
 */

import { useState } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, TIMING } from '../motion';

export interface TooltipProps {
  /** The content to display in the tooltip */
  readonly content: ReactNode;
  /** The element that triggers the tooltip */
  readonly children: ReactNode;
  /** Side of the trigger to show the tooltip */
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment relative to the trigger */
  readonly align?: 'start' | 'center' | 'end';
  /** Delay before showing (ms) */
  readonly delayDuration?: number;
  /** Whether the tooltip is disabled */
  readonly disabled?: boolean;
}

/** Get slide offset based on tooltip side */
function getSlideOffset(side: 'top' | 'right' | 'bottom' | 'left') {
  switch (side) {
    case 'top':
      return { y: 4 };
    case 'bottom':
      return { y: -4 };
    case 'left':
      return { x: 4 };
    case 'right':
      return { x: -4 };
  }
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 300,
  disabled = false,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (disabled || !content) {
    return <>{children}</>;
  }

  const slideOffset = getSlideOffset(side);

  return (
    <RadixTooltip.Root delayDuration={delayDuration} open={isOpen} onOpenChange={setIsOpen}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <AnimatePresence>
        {isOpen && (
          <RadixTooltip.Portal forceMount>
            <RadixTooltip.Content
              side={side}
              align={align}
              sideOffset={5}
              collisionPadding={10}
              asChild
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, ...slideOffset }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, ...slideOffset }}
                transition={{ duration: TIMING.fast }}
                className="z-tooltip max-w-xs rounded-md px-3 py-2 text-sm leading-relaxed shadow-tooltip"
                style={{
                  backgroundColor: 'var(--monarch-tooltip-bg)',
                  color: 'var(--monarch-tooltip-text)',
                }}
              >
                {content}
                <RadixTooltip.Arrow style={{ fill: 'var(--monarch-tooltip-bg)' }} />
              </motion.div>
            </RadixTooltip.Content>
          </RadixTooltip.Portal>
        )}
      </AnimatePresence>
    </RadixTooltip.Root>
  );
}

export { Provider as TooltipProvider } from '@radix-ui/react-tooltip';
