/**
 * useMediaQuery Hook
 *
 * Tracks whether a CSS media query matches.
 * SSR-safe - returns false during server-side rendering.
 *
 * Usage:
 *   const isMobile = useMediaQuery('(max-width: 768px)');
 *   const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 *
 *   return isMobile ? <MobileLayout /> : <DesktopLayout />;
 */

import { useState, useEffect } from 'react';

/**
 * Hook for tracking CSS media query matches.
 *
 * @param query - The media query string (e.g., '(max-width: 768px)')
 * @returns Whether the media query currently matches
 */
export function useMediaQuery(query: string): boolean {
  // SSR-safe: default to false during server-side rendering
  const getMatches = (): boolean => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    // SSR-safe: check if window is defined
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);

    // Update state when media query match changes
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Set initial value (in case it changed between render and effect)
    setMatches(mediaQueryList.matches);

    // Modern browsers support addEventListener
    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Common breakpoint queries for convenience
 */
export const breakpoints = {
  /** Mobile devices (max-width: 640px) */
  sm: '(max-width: 640px)',
  /** Tablet devices (max-width: 768px) */
  md: '(max-width: 768px)',
  /** Small laptops (max-width: 1024px) */
  lg: '(max-width: 1024px)',
  /** Large screens (max-width: 1280px) */
  xl: '(max-width: 1280px)',
  /** Extra large screens (max-width: 1536px) */
  '2xl': '(max-width: 1536px)',
  /** Prefers dark color scheme */
  prefersDark: '(prefers-color-scheme: dark)',
  /** Prefers light color scheme */
  prefersLight: '(prefers-color-scheme: light)',
  /** Prefers reduced motion */
  prefersReducedMotion: '(prefers-reduced-motion: reduce)',
} as const;
