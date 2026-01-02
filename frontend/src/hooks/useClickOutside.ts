/**
 * useClickOutside Hook
 *
 * Detects clicks outside of specified element(s) and calls a callback.
 * Eliminates duplicated click-outside handlers across components.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useClickOutside([ref], () => setIsOpen(false), isOpen);
 */

import { useEffect, type RefObject } from 'react';

/**
 * Hook to detect clicks outside of specified elements.
 *
 * @param refs - Array of refs to elements that should NOT trigger the callback
 * @param onClickOutside - Callback to execute when clicking outside
 * @param enabled - Whether the listener is active (default: true)
 */
export function useClickOutside(
  refs: RefObject<HTMLElement | null>[],
  onClickOutside: () => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;

    function handleClickOutside(event: MouseEvent) {
      // Check if click is outside all provided refs
      const isOutside = refs.every((ref) => {
        return ref.current && !ref.current.contains(event.target as Node);
      });

      if (isOutside) {
        onClickOutside();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, onClickOutside, enabled]);
}
