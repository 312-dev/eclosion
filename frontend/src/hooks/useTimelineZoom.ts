/**
 * useTimelineZoom Hook
 *
 * Manages timeline zoom level (resolution) and date range.
 * Resolution is auto-determined: monthly for ranges <= 2 years, yearly otherwise.
 */

import { useCallback, useMemo } from 'react';
import type { TimelineResolution, TimelineZoomState } from '../types/timeline';
import { useDistributionMode } from '../context/DistributionModeContext';
import { monthsDiff, formatDateDisplay } from '../utils/timelineProjection';

/** Threshold for switching from monthly to yearly resolution */
const YEARLY_THRESHOLD_MONTHS = 24; // Use yearly for ranges > 2 years

interface UseTimelineZoomResult {
  /** Current zoom state */
  zoom: TimelineZoomState;
  /** Current resolution (auto-determined from range) */
  resolution: TimelineResolution;
  /** Set the date range (resolution auto-determined) */
  setDateRange: (startDate: string, endDate: string) => void;
  /** Formatted date range for display */
  formattedRange: string;
  /** Number of months in current range */
  rangeMonths: number;
}

/**
 * Determine resolution based on range.
 * Monthly for ranges <= 2 years, yearly for longer ranges.
 */
function getResolutionForRange(months: number): TimelineResolution {
  return months <= YEARLY_THRESHOLD_MONTHS ? 'monthly' : 'yearly';
}

/**
 * Hook for managing timeline zoom level and date range.
 * Resolution is auto-determined based on range.
 */
export function useTimelineZoom(): UseTimelineZoomResult {
  const { timelineZoom, setTimelineZoom } = useDistributionMode();

  const rangeMonths = useMemo(() => {
    return monthsDiff(timelineZoom.startDate, timelineZoom.endDate);
  }, [timelineZoom.startDate, timelineZoom.endDate]);

  // Resolution is auto-determined based on range
  const resolution = useMemo(() => {
    return getResolutionForRange(rangeMonths);
  }, [rangeMonths]);

  const setDateRange = useCallback(
    (startDate: string, endDate: string) => {
      const newRangeMonths = monthsDiff(startDate, endDate);
      const newResolution = getResolutionForRange(newRangeMonths);

      setTimelineZoom({
        resolution: newResolution,
        startDate,
        endDate,
      });
    },
    [setTimelineZoom]
  );

  const formattedRange = useMemo(() => {
    const formatResolution = resolution === 'yearly' ? 'yearly' : 'monthly';
    const startFormatted = formatDateDisplay(timelineZoom.startDate, formatResolution);
    const endFormatted = formatDateDisplay(timelineZoom.endDate, formatResolution);
    return `${startFormatted} - ${endFormatted}`;
  }, [timelineZoom.startDate, timelineZoom.endDate, resolution]);

  return {
    zoom: timelineZoom,
    resolution,
    setDateRange,
    formattedRange,
    rangeMonths,
  };
}
