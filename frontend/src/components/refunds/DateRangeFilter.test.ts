import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDateRangeFromPreset } from './DateRangeFilter';

describe('getDateRangeFromPreset', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null dates for all_time', () => {
    const result = getDateRangeFromPreset('all_time');
    expect(result).toEqual({ startDate: null, endDate: null });
  });

  it('returns 7-day range for last_week', () => {
    const result = getDateRangeFromPreset('last_week');
    expect(result.endDate).toBe('2026-02-10');
    expect(result.startDate).toBe('2026-02-03');
  });

  it('returns 30-day range for last_month', () => {
    const result = getDateRangeFromPreset('last_month');
    expect(result.endDate).toBe('2026-02-10');
    expect(result.startDate).toBe('2026-01-11');
  });

  it('returns 90-day range for last_quarter', () => {
    const result = getDateRangeFromPreset('last_quarter');
    expect(result.endDate).toBe('2026-02-10');
    expect(result.startDate).toBe('2025-11-12');
  });

  it('returns 365-day range for last_year', () => {
    const result = getDateRangeFromPreset('last_year');
    expect(result.endDate).toBe('2026-02-10');
    expect(result.startDate).toBe('2025-02-10');
  });

  it('returns null dates for custom preset', () => {
    const result = getDateRangeFromPreset('custom');
    expect(result).toEqual({ startDate: null, endDate: null });
  });
});
