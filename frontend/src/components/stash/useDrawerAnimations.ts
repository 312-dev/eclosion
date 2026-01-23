/**
 * Custom hooks for AvailableToStashDrawer animations.
 */

import { useState, useEffect, useRef } from 'react';
import { UI } from '../../constants';

/**
 * Manages border visibility with delayed removal for collapse animation.
 */
export function useDrawerBorders(isExpanded: boolean) {
  const [showBorders, setShowBorders] = useState(false);

  useEffect(() => {
    if (!isExpanded) {
      // When collapsing, delay border removal until after animation
      const timer = setTimeout(() => setShowBorders(false), UI.ANIMATION.NORMAL);
      return () => clearTimeout(timer);
    }
    // When expanding, show borders immediately via rAF
    const frame = requestAnimationFrame(() => setShowBorders(true));
    return () => cancelAnimationFrame(frame);
  }, [isExpanded]);

  return showBorders;
}

/**
 * Triggers shake animation when value transitions from positive to negative.
 */
export function useNegativeTransitionShake(currentValue: number | undefined) {
  const [shouldShake, setShouldShake] = useState(false);
  const prevValueRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentValue === undefined) return;

    const prevValue = prevValueRef.current;
    prevValueRef.current = currentValue;

    // Trigger shake when transitioning from positive (or null) to negative
    if (currentValue < 0 && (prevValue === null || prevValue >= 0)) {
      const frame = requestAnimationFrame(() => setShouldShake(true));
      const timer = setTimeout(() => setShouldShake(false), UI.ANIMATION.SLOW);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [currentValue]);

  return shouldShake;
}
