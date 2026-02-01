/**
 * useEdgeScroll Hook
 *
 * Auto-scrolls a horizontally scrollable element when hovering over edge zones.
 * Useful for showing more content when hovering over fade/vignette edges.
 *
 * @param scrollRef - React ref to the scrollable element
 * @param containerRef - React ref to the container (for detecting edge hover)
 * @param options - Configuration options
 * @returns Object with scroll state info
 */

import { useState, useEffect, useRef, type RefObject } from 'react';

export interface UseEdgeScrollOptions {
  /** Whether to enable edge scrolling (default: true) */
  enabled?: boolean;
  /** Width of the edge zone in pixels (default: 40) */
  edgeWidth?: number;
  /** Scroll speed in pixels per frame (default: 4) */
  scrollSpeed?: number;
}

export interface UseEdgeScrollReturn {
  /** Whether content can scroll left (content before visible area) */
  canScrollLeft: boolean;
  /** Whether content can scroll right (content after visible area) */
  canScrollRight: boolean;
  /** Whether currently hovering over left edge */
  isHoveringLeft: boolean;
  /** Whether currently hovering over right edge */
  isHoveringRight: boolean;
}

export function useEdgeScroll(
  scrollRef: RefObject<HTMLElement | null>,
  containerRef: RefObject<HTMLElement | null>,
  options: UseEdgeScrollOptions = {}
): UseEdgeScrollReturn {
  const { enabled = true, edgeWidth = 40, scrollSpeed = 4 } = options;

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHoveringLeft, setIsHoveringLeft] = useState(false);
  const [isHoveringRight, setIsHoveringRight] = useState(false);

  const animationRef = useRef<number | null>(null);
  const scrollDirectionRef = useRef<'left' | 'right' | null>(null);

  // Main effect that handles all the event listeners and animation
  useEffect(() => {
    if (!enabled) return;

    const scrollElement = scrollRef.current;
    const container = containerRef.current;

    if (!scrollElement || !container) return;

    // Update scroll state helper
    const updateScrollState = () => {
      const atStart = scrollElement.scrollLeft <= 2;
      const atEnd =
        scrollElement.scrollLeft + scrollElement.clientWidth >= scrollElement.scrollWidth - 2;

      setCanScrollLeft(!atStart);
      setCanScrollRight(!atEnd);
    };

    // Animation loop
    const animate = () => {
      const direction = scrollDirectionRef.current;

      if (!direction) return;

      if (direction === 'left') {
        scrollElement.scrollLeft = Math.max(0, scrollElement.scrollLeft - scrollSpeed);
      } else if (direction === 'right') {
        scrollElement.scrollLeft = Math.min(
          scrollElement.scrollWidth - scrollElement.clientWidth,
          scrollElement.scrollLeft + scrollSpeed
        );
      }

      updateScrollState();

      // Continue animation if still scrollable in that direction
      const canContinue =
        (direction === 'left' && scrollElement.scrollLeft > 0) ||
        (direction === 'right' &&
          scrollElement.scrollLeft + scrollElement.clientWidth < scrollElement.scrollWidth);

      if (canContinue && scrollDirectionRef.current) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    const startScrolling = (direction: 'left' | 'right') => {
      scrollDirectionRef.current = direction;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    const stopScrolling = () => {
      scrollDirectionRef.current = null;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      // Check scroll state fresh each time
      const atStart = scrollElement.scrollLeft <= 2;
      const atEnd =
        scrollElement.scrollLeft + scrollElement.clientWidth >= scrollElement.scrollWidth - 2;
      const scrollableLeft = !atStart;
      const scrollableRight = !atEnd;

      const inLeftEdge = mouseX < edgeWidth && scrollableLeft;
      const inRightEdge = mouseX > rect.width - edgeWidth && scrollableRight;

      setIsHoveringLeft(inLeftEdge);
      setIsHoveringRight(inRightEdge);

      if (inLeftEdge) {
        if (scrollDirectionRef.current !== 'left') {
          startScrolling('left');
        }
      } else if (inRightEdge) {
        if (scrollDirectionRef.current !== 'right') {
          startScrolling('right');
        }
      } else {
        stopScrolling();
      }
    };

    const handleMouseLeave = () => {
      setIsHoveringLeft(false);
      setIsHoveringRight(false);
      stopScrolling();
    };

    const handleScroll = () => {
      updateScrollState();
    };

    // Initial check
    updateScrollState();

    // Set up event listeners
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      resizeObserver.disconnect();
      stopScrolling();
    };
  }, [enabled, scrollRef, containerRef, edgeWidth, scrollSpeed]);

  return {
    canScrollLeft,
    canScrollRight,
    isHoveringLeft,
    isHoveringRight,
  };
}
