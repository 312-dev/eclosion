/**
 * Auto-Sync Visibility Hook
 *
 * Detects when the app moves between foreground and background,
 * and notifies the backend to adjust auto-sync intervals:
 * - Foreground: 5-minute sync interval
 * - Background: 60-minute sync interval
 *
 * This saves API calls when the user isn't actively using the app,
 * while providing responsive syncing when they are.
 */

import { useEffect, useRef } from 'react';
import { useDemo } from '../context/DemoContext';
import { setAutoSyncVisibility } from '../api/core';

/**
 * Hook that manages auto-sync visibility state.
 *
 * When auto-sync is enabled, this hook listens for document visibility
 * changes and notifies the backend to switch between foreground (5 min)
 * and background (60 min) sync intervals.
 *
 * @param autoSyncEnabled - Whether auto-sync is currently enabled
 *
 * @example
 * ```tsx
 * // In a component that knows auto-sync status
 * useAutoSyncVisibility(autoSyncStatus?.enabled ?? false);
 * ```
 */
export function useAutoSyncVisibility(autoSyncEnabled: boolean): void {
  const isDemo = useDemo();
  const lastVisibilityState = useRef<boolean | null>(null);

  useEffect(() => {
    // Skip in demo mode - no backend to notify
    if (isDemo) return;

    // Skip if auto-sync is not enabled
    if (!autoSyncEnabled) return;

    const handleVisibilityChange = (): void => {
      const isForeground = document.visibilityState === 'visible';

      // Only notify if state actually changed
      if (lastVisibilityState.current === isForeground) return;
      lastVisibilityState.current = isForeground;

      // Fire and forget - we don't need to wait for the response
      setAutoSyncVisibility(isForeground).catch(() => {
        // Silently ignore errors - visibility change is best-effort
      });
    };

    // Set initial state on mount
    const initialForeground = document.visibilityState === 'visible';
    if (lastVisibilityState.current !== initialForeground) {
      lastVisibilityState.current = initialForeground;
      setAutoSyncVisibility(initialForeground).catch(() => {
        // Silently ignore errors
      });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isDemo, autoSyncEnabled]);
}
