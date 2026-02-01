/**
 * useScrollEnd Hook
 *
 * Detects when a horizontally scrollable element is scrolled to the end.
 * Useful for hiding fade/vignette effects when there's nothing more to scroll to.
 *
 * @param ref - React ref to the scrollable element
 * @param enabled - Whether to enable scroll detection (default: true)
 * @returns boolean indicating if scrolled to the end (or no overflow)
 */

import { useState, useEffect, type RefObject } from 'react';

export function useScrollEnd(ref: RefObject<HTMLElement | null>, enabled = true): boolean {
  const [isAtEnd, setIsAtEnd] = useState(true);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const element = ref.current;

    const checkScrollEnd = () => {
      // At end if scrollLeft + visible width >= total scroll width (with 2px tolerance)
      const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
      setIsAtEnd(atEnd);
    };

    // Initial check
    checkScrollEnd();

    // Listen to scroll events
    element.addEventListener('scroll', checkScrollEnd, { passive: true });

    // Listen to size changes (content or container resize)
    const resizeObserver = new ResizeObserver(checkScrollEnd);
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', checkScrollEnd);
      resizeObserver.disconnect();
    };
  }, [ref, enabled]);

  return isAtEnd;
}
