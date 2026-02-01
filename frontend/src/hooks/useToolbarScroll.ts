/**
 * useToolbarScroll Hook
 *
 * Adds drag-to-scroll and hover-edge-scroll behavior to a toolbar element.
 * Only activates when the toolbar content overflows (has more content than visible).
 * Designed for third-party component toolbars where we can't use refs directly.
 *
 * @param containerRef - Ref to the container that holds the toolbar
 * @param toolbarSelector - CSS selector to find the toolbar element
 * @param wrapperSelector - CSS selector to find the wrapper element (for edge detection)
 * @param options - Configuration options
 */

import { useEffect, type RefObject } from 'react';

interface UseToolbarScrollOptions {
  /** Whether to enable scroll behaviors (default: true) */
  enabled?: boolean;
  /** Width of the edge zone in pixels (default: 40) */
  edgeWidth?: number;
  /** Scroll speed in pixels per frame (default: 4) */
  scrollSpeed?: number;
}

export function useToolbarScroll(
  containerRef: RefObject<HTMLElement | null>,
  toolbarSelector: string,
  wrapperSelector: string,
  options: UseToolbarScrollOptions = {}
): void {
  const { enabled = true, edgeWidth = 40, scrollSpeed = 4 } = options;

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const toolbar = containerRef.current.querySelector<HTMLElement>(toolbarSelector);
    const wrapper = containerRef.current.querySelector<HTMLElement>(wrapperSelector);

    if (!toolbar || !wrapper) return;

    // Track current overflow state
    let hasOverflow = false;

    // --- Drag to scroll state ---
    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    // --- Edge scroll state ---
    let animationId: number | null = null;
    let scrollDirection: 'left' | 'right' | null = null;

    const checkOverflow = () => {
      const newHasOverflow = toolbar.scrollWidth > toolbar.clientWidth + 2;
      if (newHasOverflow !== hasOverflow) {
        hasOverflow = newHasOverflow;
        // Update cursor based on overflow state
        toolbar.style.cursor = hasOverflow ? 'grab' : '';
      }
    };

    // --- Drag handlers ---
    const handleMouseDown = (e: MouseEvent) => {
      if (!hasOverflow || e.button !== 0) return; // Only when overflow and left button
      isDragging = true;
      startX = e.pageX;
      startScrollLeft = toolbar.scrollLeft;
      toolbar.style.cursor = 'grabbing';
      toolbar.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.pageX - startX;
      toolbar.scrollLeft = startScrollLeft - deltaX;
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        toolbar.style.cursor = hasOverflow ? 'grab' : '';
        toolbar.style.userSelect = '';
      }
    };

    // --- Edge scroll handlers ---
    const animate = () => {
      if (!scrollDirection) return;

      if (scrollDirection === 'left') {
        toolbar.scrollLeft = Math.max(0, toolbar.scrollLeft - scrollSpeed);
      } else {
        toolbar.scrollLeft = Math.min(
          toolbar.scrollWidth - toolbar.clientWidth,
          toolbar.scrollLeft + scrollSpeed
        );
      }

      const canContinue =
        (scrollDirection === 'left' && toolbar.scrollLeft > 0) ||
        (scrollDirection === 'right' &&
          toolbar.scrollLeft + toolbar.clientWidth < toolbar.scrollWidth);

      if (canContinue && scrollDirection) {
        animationId = requestAnimationFrame(animate);
      }
    };

    const handleEdgeMove = (e: MouseEvent) => {
      if (!hasOverflow || isDragging) return; // Only when overflow and not dragging

      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      const atStart = toolbar.scrollLeft <= 2;
      const atEnd = toolbar.scrollLeft + toolbar.clientWidth >= toolbar.scrollWidth - 2;

      const inLeftEdge = mouseX < edgeWidth && !atStart;
      const inRightEdge = mouseX > rect.width - edgeWidth && !atEnd;

      if (inLeftEdge && scrollDirection !== 'left') {
        scrollDirection = 'left';
        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(animate);
      } else if (inRightEdge && scrollDirection !== 'right') {
        scrollDirection = 'right';
        if (animationId) cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(animate);
      } else if (!inLeftEdge && !inRightEdge && scrollDirection) {
        scrollDirection = null;
        if (animationId) cancelAnimationFrame(animationId);
      }
    };

    const handleEdgeLeave = () => {
      scrollDirection = null;
      if (animationId) cancelAnimationFrame(animationId);
    };

    // Initial overflow check
    checkOverflow();

    // Watch for size changes that might affect overflow
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(toolbar);

    // Attach listeners
    toolbar.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    wrapper.addEventListener('mousemove', handleEdgeMove);
    wrapper.addEventListener('mouseleave', handleEdgeLeave);

    return () => {
      toolbar.style.cursor = '';
      toolbar.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      wrapper.removeEventListener('mousemove', handleEdgeMove);
      wrapper.removeEventListener('mouseleave', handleEdgeLeave);
      resizeObserver.disconnect();
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [enabled, containerRef, toolbarSelector, wrapperSelector, edgeWidth, scrollSpeed]);
}
