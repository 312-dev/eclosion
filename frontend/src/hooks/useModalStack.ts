/**
 * useModalStack - Track modal stacking for proper z-index management
 *
 * When multiple modals are open (e.g., Settings modal → Reset modal),
 * each subsequent modal should have a higher z-index so it appears above.
 * This hook manages a global stack of modal IDs and returns the appropriate
 * z-index offset for the current modal.
 */

import { useState, useEffect, useId } from 'react';

// Global modal stack - tracks order of modal openings
const modalStack: string[] = [];

export function useModalStack(isOpen: boolean): number {
  // Use React's useId for a stable, unique ID
  const modalId = useId();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Add to stack when opened
      if (!modalStack.includes(modalId)) {
        modalStack.push(modalId);
      }
      // Update offset based on position in stack (via rAF to avoid synchronous setState in effect)
      const position = modalStack.indexOf(modalId);
      const newOffset = position >= 0 ? position * 10 : 0;
      const frame = requestAnimationFrame(() => setOffset(newOffset));
      return () => {
        cancelAnimationFrame(frame);
        // Cleanup on unmount or when closing
        const index = modalStack.indexOf(modalId);
        if (index !== -1) {
          modalStack.splice(index, 1);
        }
      };
    }

    // Remove from stack when closed
    const index = modalStack.indexOf(modalId);
    if (index !== -1) {
      modalStack.splice(index, 1);
    }
    const frame = requestAnimationFrame(() => setOffset(0));
    return () => cancelAnimationFrame(frame);
  }, [isOpen, modalId]);

  return offset;
}

/**
 * Get the total number of open modals
 */
export function getModalCount(): number {
  return modalStack.length;
}
