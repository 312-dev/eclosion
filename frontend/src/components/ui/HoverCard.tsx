/**
 * HoverCard - Interactive hover content using Radix UI
 *
 * Unlike Tooltip, HoverCard is designed for interactive content that
 * users might want to hover into, click on, or scroll through.
 *
 * Usage:
 *   <HoverCard content={<InteractiveContent />}>
 *     <button>Hover me</button>
 *   </HoverCard>
 */

import { useState } from 'react';
import * as RadixHoverCard from '@radix-ui/react-hover-card';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, TIMING } from '../motion';

export interface HoverCardProps {
  /** The content to display in the hover card */
  readonly content: ReactNode;
  /** The element that triggers the hover card */
  readonly children: ReactNode;
  /** Side of the trigger to show the card */
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment relative to the trigger */
  readonly align?: 'start' | 'center' | 'end';
  /** Delay before opening (ms) */
  readonly openDelay?: number;
  /** Delay before closing (ms) */
  readonly closeDelay?: number;
}

/** Get slide offset based on card side */
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

export function HoverCard({
  content,
  children,
  side = 'bottom',
  align = 'center',
  openDelay = 200,
  closeDelay = 300,
}: HoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const slideOffset = getSlideOffset(side);

  return (
    <RadixHoverCard.Root
      openDelay={openDelay}
      closeDelay={closeDelay}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <RadixHoverCard.Trigger asChild>{children}</RadixHoverCard.Trigger>
      <AnimatePresence>
        {isOpen && (
          <RadixHoverCard.Portal forceMount>
            <RadixHoverCard.Content
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
                className="z-tooltip max-w-sm rounded-md px-3 py-2 text-sm leading-relaxed shadow-tooltip"
                style={{
                  backgroundColor: 'var(--monarch-tooltip-bg)',
                  color: 'var(--monarch-tooltip-text)',
                }}
              >
                {content}
                <RadixHoverCard.Arrow style={{ fill: 'var(--monarch-tooltip-bg)' }} />
              </motion.div>
            </RadixHoverCard.Content>
          </RadixHoverCard.Portal>
        )}
      </AnimatePresence>
    </RadixHoverCard.Root>
  );
}
