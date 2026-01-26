/**
 * Timeline Date Utilities
 *
 * Date formatting and manipulation for timeline projections.
 */

import type { TimelineResolution } from '../types/timeline';

/**
 * Format a date for the given resolution.
 */
export function formatDateForResolution(date: Date, resolution: TimelineResolution): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (resolution) {
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'monthly':
      return `${year}-${month}`;
    case 'yearly':
      return `${year}`;
  }
}

/**
 * Parse a date string back to components.
 */
export function parseDateString(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = dateStr.split('-').map(Number);
  return {
    year: parts[0] ?? 2026,
    month: parts[1] ?? 1,
    day: parts[2] ?? 1,
  };
}

/**
 * Calculate months between two dates.
 */
export function monthsDiff(startDate: string, endDate: string): number {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);
  return (end.year - start.year) * 12 + (end.month - start.month);
}

/**
 * Add months to a date string.
 */
export function addMonths(dateStr: string, months: number): string {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + months);
  return formatDateForResolution(date, 'monthly');
}

/**
 * Format date for display based on resolution.
 */
export function formatDateDisplay(
  dateStr: string,
  resolution: TimelineResolution,
  verbose = false
): string {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(year, month - 1, day);

  if (verbose) {
    switch (resolution) {
      case 'daily':
        return date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      case 'monthly':
        return date.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
      case 'yearly':
        return String(year);
    }
  }

  switch (resolution) {
    case 'daily':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case 'monthly':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
    case 'yearly':
      return String(year);
  }
}

/**
 * Get default color for an item based on its index.
 */
export function getItemColor(index: number): string {
  const colors: readonly string[] = [
    'var(--monarch-success)',
    'var(--monarch-accent)',
    '#8b5cf6',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#ec4899',
    '#84cc16',
  ] as const;
  const colorIndex = ((index % colors.length) + colors.length) % colors.length;
  return colors[colorIndex] ?? '#8b5cf6';
}
