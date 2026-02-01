/**
 * useDragScroll Hook
 *
 * Enables click-and-drag horizontal scrolling for a scrollable element.
 * Useful for scrollable toolbars and tab bars where touch scrolling isn't available.
 *
 * @param ref - React ref to the scrollable element
 * @param enabled - Whether to enable drag scrolling (default: true)
 * @returns Object with isDragging state
 */

import { useState, useEffect, useCallback, type RefObject } from 'react';

interface UseDragScrollReturn {
  isDragging: boolean;
}

export function useDragScroll(
  ref: RefObject<HTMLElement | null>,
  enabled = true
): UseDragScrollReturn {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!enabled || !ref.current) return;

      // Only handle left mouse button
      if (e.button !== 0) return;

      const element = ref.current;
      const startX = e.pageX;
      const startScrollLeft = element.scrollLeft;

      setIsDragging(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.pageX - startX;
        element.scrollLeft = startScrollLeft - deltaX;
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [ref, enabled]
  );

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const element = ref.current;
    element.addEventListener('mousedown', handleMouseDown);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
    };
  }, [ref, enabled, handleMouseDown]);

  return { isDragging };
}
