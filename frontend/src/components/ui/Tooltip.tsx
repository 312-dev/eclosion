/**
 * Tooltip - Custom tooltip component using Radix UI
 *
 * Replaces native browser tooltips with styled, accessible tooltips.
 * For non-interactive content only (text hints, labels).
 *
 * On touch devices, the tooltip opens/closes on tap instead of hover.
 *
 * Usage:
 *   <Tooltip content="Helpful text">
 *     <button>Hover me</button>
 *   </Tooltip>
 *
 * For interactive content (scrollable lists, buttons), use HoverCard instead.
 */

import { useState, useEffect, useRef } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, TIMING } from '../motion';
import { useMediaQuery, breakpoints } from '../../hooks/useMediaQuery';

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
  /** Additional className for the trigger wrapper span */
  readonly triggerClassName?: string;
  /** When true, tooltip opens on click and stays open until clicked again or outside */
  readonly sticky?: boolean;
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
  triggerClassName,
  sticky = false,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const isTouchDevice = useMediaQuery(breakpoints.isTouchDevice);
  const triggerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Touch devices: tap to toggle
  useEffect(() => {
    if (!isTouchDevice) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const handleClick = (e: MouseEvent) => {
      setIsOpen((prev) => !prev);
      e.stopPropagation();
    };

    trigger.addEventListener('click', handleClick);
    return () => trigger.removeEventListener('click', handleClick);
  }, [isTouchDevice]);

  // Desktop + sticky: click to lock/unlock
  useEffect(() => {
    if (isTouchDevice || !sticky) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const handleClick = (e: MouseEvent) => {
      setIsLocked((prev) => {
        if (prev) {
          setIsOpen(false);
          return false;
        }
        setIsOpen(true);
        return true;
      });
      e.stopPropagation();
    };

    trigger.addEventListener('click', handleClick);
    return () => trigger.removeEventListener('click', handleClick);
  }, [isTouchDevice, sticky]);

  // Close on click outside (touch devices, or desktop sticky when locked)
  useEffect(() => {
    const shouldListen = (isTouchDevice && isOpen) || (sticky && isLocked);
    if (!shouldListen) return;

    const handleClickOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      const isOutsideContent = contentRef.current && !contentRef.current.contains(target);

      if (isOutsideTrigger && isOutsideContent) {
        setIsOpen(false);
        setIsLocked(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isTouchDevice, sticky, isOpen, isLocked]);

  if (disabled || !content) {
    return <>{children}</>;
  }

  const slideOffset = getSlideOffset(side);

  // Touch: disable hover entirely. Sticky desktop: allow hover but block close when locked.
  let handleOpenChange: (open: boolean) => void;
  if (isTouchDevice) {
    handleOpenChange = () => {};
  } else if (sticky) {
    handleOpenChange = (open: boolean) => {
      if (!open && isLocked) return;
      setIsOpen(open);
    };
  } else {
    handleOpenChange = setIsOpen;
  }

  return (
    <RadixTooltip.Root
      delayDuration={isTouchDevice ? 999999 : delayDuration}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <RadixTooltip.Trigger asChild>
        <span
          ref={triggerRef as React.RefObject<HTMLSpanElement>}
          className={`inline-flex ${triggerClassName ?? ''}`}
        >
          {children}
        </span>
      </RadixTooltip.Trigger>
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
                ref={contentRef}
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
