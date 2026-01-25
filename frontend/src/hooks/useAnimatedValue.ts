/**
 * useAnimatedValue Hook
 *
 * Smoothly animates a numeric value when it changes.
 * Uses requestAnimationFrame for smooth 60fps animations.
 *
 * @example
 * const animatedBalance = useAnimatedValue(balance, { duration: 500 });
 * return <span>{formatCurrency(animatedBalance)}</span>;
 */

import { useState, useEffect, useRef } from 'react';

interface UseAnimatedValueOptions {
  /** Animation duration in milliseconds (default: 400) */
  duration?: number;
}

/**
 * Easing function: ease-out cubic for natural deceleration
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Hook that animates a numeric value smoothly when it changes.
 *
 * @param targetValue - The value to animate toward
 * @param options - Configuration options
 * @returns The current animated value (updates every frame during animation)
 */
export function useAnimatedValue(
  targetValue: number,
  options: UseAnimatedValueOptions = {}
): number {
  const { duration = 400 } = options;

  // Initialize display value to target (no animation on mount)
  const [displayValue, setDisplayValue] = useState(targetValue);
  const animationRef = useRef<number | null>(null);
  const previousTargetRef = useRef(targetValue);

  useEffect(() => {
    const previousTarget = previousTargetRef.current;
    previousTargetRef.current = targetValue;

    // Skip animation if value hasn't changed
    if (previousTarget === targetValue) {
      return;
    }

    // Cancel any existing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = displayValue;
    const delta = targetValue - startValue;

    // Skip animation if there's no change from current display
    if (delta === 0) {
      return;
    }

    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      startTime ??= currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentValue = startValue + delta * easedProgress;
      setDisplayValue(Math.round(currentValue));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly on the target
        setDisplayValue(targetValue);
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration, displayValue]);

  return displayValue;
}
