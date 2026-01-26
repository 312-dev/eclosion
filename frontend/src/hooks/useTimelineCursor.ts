/**
 * useTimelineCursor Hook
 *
 * Manages the timeline cursor state and provides projected values
 * for stash cards at the cursor position.
 */

import { useMemo, useCallback } from 'react';
import type { ProjectedCardState } from '../types/timeline';
import { useDistributionMode } from '../context/DistributionModeContext';
import { formatDateDisplay, parseDateString } from '../utils/timelineProjection';

interface UseTimelineCursorResult {
  /** Currently selected date on timeline (ISO string) */
  cursorDate: string | null;
  /** Set the cursor date */
  setCursorDate: (date: string | null) => void;
  /** Clear the cursor (set to null) */
  clearCursor: () => void;
  /** Whether a cursor is active */
  hasCursor: boolean;
  /** Formatted cursor date for display */
  formattedCursorDate: string | null;
  /** Months from now to cursor date */
  monthsFromNow: number;
  /** Whether we're in event edit mode */
  isEditingEvent: boolean;
  /** The event being edited (if any) */
  editingEventId: string | null;
}

/**
 * Hook for managing the timeline cursor.
 */
export function useTimelineCursor(): UseTimelineCursorResult {
  const {
    cursorDate,
    setCursorDate: setContextCursorDate,
    editingEvent,
    timelineZoom,
  } = useDistributionMode();

  const setCursorDate = useCallback(
    (date: string | null) => {
      setContextCursorDate(date);
    },
    [setContextCursorDate]
  );

  const clearCursor = useCallback(() => {
    setContextCursorDate(null);
  }, [setContextCursorDate]);

  const formattedCursorDate = useMemo(() => {
    if (!cursorDate) return null;
    return formatDateDisplay(cursorDate, timelineZoom.resolution);
  }, [cursorDate, timelineZoom.resolution]);

  const monthsFromNow = useMemo(() => {
    if (!cursorDate) return 0;
    const now = new Date();
    const cursor = parseDateString(cursorDate);
    const cursorMonth = cursor.year * 12 + cursor.month;
    const nowMonth = now.getFullYear() * 12 + (now.getMonth() + 1);
    return Math.max(0, cursorMonth - nowMonth);
  }, [cursorDate]);

  return {
    cursorDate,
    setCursorDate,
    clearCursor,
    hasCursor: cursorDate !== null,
    formattedCursorDate,
    monthsFromNow,
    isEditingEvent: editingEvent !== null,
    editingEventId: editingEvent?.event.id ?? null,
  };
}

/**
 * Get projected card state for a specific item at the cursor position.
 * Returns null if no cursor is set or no projection is available.
 */
export function useProjectedCardStateAtCursor(
  itemId: string,
  cursorProjections: Record<string, ProjectedCardState> | null
): ProjectedCardState | null {
  return useMemo(() => {
    if (!cursorProjections) return null;
    return cursorProjections[itemId] ?? null;
  }, [itemId, cursorProjections]);
}
