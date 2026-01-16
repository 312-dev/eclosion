/**
 * Tests for useItemDisplayStatus hook
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useItemDisplayStatus, calculateItemDisplayStatus } from './useItemDisplayStatus';
import type { RecurringItem } from '../types';

// Helper to create a minimal recurring item with required fields
// Defaults to yearly expense (frequency_months: 12) for most tests
function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    id: 'test-id',
    name: 'Test Item',
    status: 'pending',
    is_enabled: true,
    frozen_monthly_target: 100,
    planned_budget: 100,
    current_balance: 0,
    contributed_this_month: 0,
    amount: 100,
    amount_needed_now: 100,
    progress_percent: 0,
    months_until_due: 0,
    next_due_date: '2024-01-15',
    category_id: 'cat-1',
    category_name: 'Test Category',
    group_id: 'group-1',
    group_name: 'Test Group',
    emoji: '💰',
    frequency_months: 12, // Default to yearly (infrequent)
    frequency: 'yearly',
    ...overrides,
  } as RecurringItem;
}

describe('calculateItemDisplayStatus', () => {
  describe('when item is enabled with frozen_monthly_target > 0', () => {
    it('returns "ahead" when budgeted more than target', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 150,
      });

      expect(calculateItemDisplayStatus(item)).toBe('ahead');
    });

    it('returns "funded" when balance covers amount (regardless of budget)', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 100,
        current_balance: 100,
        amount: 100,
      });

      // Funded takes priority - if you have the money, you're funded
      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('returns "on_track" when budgeted equals target but balance does not cover amount', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 100,
        current_balance: 50,
        amount: 100,
      });

      expect(calculateItemDisplayStatus(item)).toBe('on_track');
    });

    it('returns "behind" when budgeted less than target and trajectory falls short', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 50,
        current_balance: 0,
        amount: 300,
        months_until_due: 3,
      });

      // Projected: 0 + (3 * 50) = 150 < 300, so behind
      expect(calculateItemDisplayStatus(item)).toBe('behind');
    });

    it('returns "behind" when budgeted less than target even with high balance', () => {
      // Note: The current implementation compares budget to target directly.
      // Trajectory calculations are not used - the frozen target already
      // accounts for current balance at month start.
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 50,
        current_balance: 200,
        amount: 300,
        months_until_due: 3,
      });

      // Budget ($50) < target ($100) = behind
      expect(calculateItemDisplayStatus(item)).toBe('behind');
    });

    it('returns "behind" when months_until_due is 0 even with high balance', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 50,
        current_balance: 50,
        amount: 100,
        months_until_due: 0,
      });

      // Due now, can't project future savings, balance < amount
      expect(calculateItemDisplayStatus(item)).toBe('behind');
    });

    it('uses ceiling for target and budget comparisons (when not funded)', () => {
      const item = createItem({
        frozen_monthly_target: 99.1, // ceil = 100
        planned_budget: 99.5, // ceil = 100
        current_balance: 50, // Not funded
        amount: 100,
      });

      // budget (100) >= target (100) = on_track
      expect(calculateItemDisplayStatus(item)).toBe('on_track');
    });

    it('returns "funded" when funded regardless of budget amount', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 50, // Any budget - doesn't matter when funded
        current_balance: 150, // Already funded
        amount: 100,
      });

      // Funded takes priority - balance >= amount
      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('returns "funded" when funded and budget is $0', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 0, // Not budgeting anymore
        current_balance: 150, // Already funded
        amount: 100,
      });

      // Funded, effective target is $0. Budget ($0) >= $0 = funded
      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });
  });

  describe('monthly expenses (frequency_months <= 1)', () => {
    // Note: For monthly expenses, the target is for the upcoming bill.
    // Funded status takes priority regardless of frequency.

    it('returns "funded" when balance covers amount', () => {
      const item = createItem({
        frequency_months: 1,
        frozen_monthly_target: 80,
        planned_budget: 80,
        current_balance: 80,
        amount: 80,
      });

      // Funded takes priority - balance >= amount
      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('returns "funded" even when budget exceeds target', () => {
      const item = createItem({
        frequency_months: 1,
        frozen_monthly_target: 80,
        planned_budget: 100,
        current_balance: 80,
        amount: 80,
      });

      // Funded takes priority - balance >= amount
      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('returns "funded" regardless of budget amount', () => {
      const item = createItem({
        frequency_months: 1,
        frozen_monthly_target: 80,
        planned_budget: 50,
        current_balance: 80,
        amount: 80,
      });

      // Funded takes priority - balance >= amount
      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('returns "funded" even with zero budget', () => {
      const item = createItem({
        frequency_months: 1,
        frozen_monthly_target: 80,
        planned_budget: 0,
        current_balance: 80,
        amount: 80,
      });

      // Funded takes priority - balance >= amount
      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('returns "on_track" when not funded but budget meets target', () => {
      const item = createItem({
        frequency_months: 1,
        frozen_monthly_target: 80,
        planned_budget: 80,
        current_balance: 50, // Not enough saved
        amount: 80,
      });

      // Not funded, budget >= target = on_track
      expect(calculateItemDisplayStatus(item)).toBe('on_track');
    });
  });

  describe('when item is enabled without frozen_monthly_target', () => {
    it('returns "funded" when balance covers amount', () => {
      const item = createItem({
        frozen_monthly_target: 0,
        current_balance: 100,
        amount: 100,
      });

      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('returns original status when balance does not cover amount', () => {
      const item = createItem({
        frozen_monthly_target: 0,
        current_balance: 50,
        amount: 100,
        status: 'pending',
      });

      expect(calculateItemDisplayStatus(item)).toBe('pending');
    });
  });

  describe('when item is disabled', () => {
    it('returns original status regardless of budget', () => {
      const item = createItem({
        is_enabled: false,
        frozen_monthly_target: 100,
        planned_budget: 150,
        status: 'pending',
      });

      expect(calculateItemDisplayStatus(item)).toBe('pending');
    });
  });

  describe('edge cases', () => {
    it('handles zero amount', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 100,
        current_balance: 0,
        amount: 0,
      });

      // balance (0) >= amount (0) = funded
      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('handles negative balance', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 100,
        current_balance: -50,
        amount: 100,
      });

      expect(calculateItemDisplayStatus(item)).toBe('on_track');
    });
  });
});

describe('useItemDisplayStatus hook', () => {
  it('returns calculated status', () => {
    const item = createItem({
      frozen_monthly_target: 100,
      planned_budget: 150,
    });

    const { result } = renderHook(() => useItemDisplayStatus(item));

    expect(result.current).toBe('ahead');
  });

  it('updates when item changes', () => {
    const item1 = createItem({
      frozen_monthly_target: 100,
      planned_budget: 150,
    });

    const { result, rerender } = renderHook(({ item }) => useItemDisplayStatus(item), {
      initialProps: { item: item1 },
    });

    expect(result.current).toBe('ahead');

    const item2 = createItem({
      frozen_monthly_target: 100,
      planned_budget: 50,
    });

    rerender({ item: item2 });

    expect(result.current).toBe('behind');
  });

  it('memoizes result for same item values', () => {
    const item = createItem({
      frozen_monthly_target: 100,
      planned_budget: 100,
    });

    const { result, rerender } = renderHook(({ item }) => useItemDisplayStatus(item), {
      initialProps: { item },
    });

    const firstResult = result.current;

    // Rerender with same values (different object reference)
    const sameItem = createItem({
      frozen_monthly_target: 100,
      planned_budget: 100,
    });

    rerender({ item: sameItem });

    // Due to useMemo with value dependencies, result should be equivalent
    expect(result.current).toBe(firstResult);
  });
});
