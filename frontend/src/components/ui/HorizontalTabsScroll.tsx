/**
 * HorizontalTabsScroll
 *
 * A wrapper for horizontally scrollable tab navigation with fade vignette effects.
 *
 * Features:
 * - Fade indicators when content overflows (both edges)
 * - Auto-hides fade when scrolled to end
 * - Desktop: hover over fade edge to auto-scroll, click-drag to scroll
 * - Mobile: native touch scrolling
 */

import { useRef, type ReactNode } from 'react';
import { useScrollEnd, useMediaQuery, useDragScroll, useEdgeScroll } from '../../hooks';

interface HorizontalTabsScrollProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  disableDragScroll?: boolean;
}

export function HorizontalTabsScroll({
  children,
  className = '',
  innerClassName = '',
  disableDragScroll = false,
}: Readonly<HorizontalTabsScrollProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Mobile: use simple scroll end detection for right fade
  const isScrolledToEnd = useScrollEnd(innerRef, isMobile);

  // Desktop: use edge scroll for both sides + drag scroll
  const { canScrollLeft, canScrollRight, isHoveringLeft, isHoveringRight } = useEdgeScroll(
    innerRef,
    containerRef,
    { enabled: !isMobile }
  );
  const { isDragging } = useDragScroll(innerRef, !isMobile && !disableDragScroll);

  // Determine which fades to show
  // Mobile: only right fade, hidden when at end
  // Desktop: both fades based on scroll position
  const showLeftFade = isMobile ? false : canScrollLeft;
  const showRightFade = isMobile ? !isScrolledToEnd : canScrollRight;

  // Build class names
  const containerClasses = [
    'horizontal-tabs-scroll',
    showLeftFade ? 'has-left-fade' : '',
    showRightFade ? 'has-right-fade' : '',
    isHoveringLeft ? 'hovering-left' : '',
    isHoveringRight ? 'hovering-right' : '',
    isDragging ? 'is-dragging' : '',
    // Legacy class for mobile compatibility
    isScrolledToEnd ? 'at-scroll-end' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const innerClasses = ['horizontal-tabs-inner', innerClassName].filter(Boolean).join(' ');

  return (
    <div ref={containerRef} className={containerClasses}>
      <div ref={innerRef} className={innerClasses}>
        {children}
      </div>
    </div>
  );
}
