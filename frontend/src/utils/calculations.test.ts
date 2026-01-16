/**
 * Calculation Parity Tests
 *
 * These tests verify that frontend calculations match the backend Python implementations.
 * If a test fails, it indicates a parity issue between frontend and backend.
 *
 * Backend reference: services/frozen_target_calculator.py
 *
 * Test cases are derived from the Python implementation's logic and edge cases.
 * When updating the Python code, corresponding test cases should be added here
 * to ensure the TypeScript implementation stays in sync.
 */

import { describe, it, expect } from 'vitest';
import { calculateFrozenTarget } from './calculations';

describe('calculateFrozenTarget - parity with Python _calculate_target', () => {
  /**
   * Python reference (services/frozen_target_calculator.py _calculate_target):
   *
   * For sub-monthly (weekly, bi-weekly): monthly_equivalent = amount / frequency_months
   * For monthly: shortfall = amount - balance
   * For infrequent: shortfall spread across remaining months
   */

  describe('monthly expenses (frequency_months === 1)', () => {
    it('returns shortfall when partially funded', () => {
      // Python: math.ceil(max(0, 80 - 50)) = 30
      expect(calculateFrozenTarget(80, 1, 1, 50)).toBe(30);
    });

    it('returns full amount when balance is zero', () => {
      // Python: math.ceil(max(0, 100 - 0)) = 100
      expect(calculateFrozenTarget(100, 1, 1, 0)).toBe(100);
    });

    it('returns zero when fully funded', () => {
      // Python: math.ceil(max(0, 80 - 80)) = 0
      expect(calculateFrozenTarget(80, 1, 1, 80)).toBe(0);
    });

    it('returns zero when overfunded', () => {
      // Python: math.ceil(max(0, 80 - 100)) = 0
      expect(calculateFrozenTarget(80, 1, 1, 100)).toBe(0);
    });

    it('rounds up fractional amounts', () => {
      // Python: math.ceil(max(0, 99 - 50)) = 49
      expect(calculateFrozenTarget(99, 1, 1, 50)).toBe(49);
      // Python: math.ceil(max(0, 100 - 51)) = 49
      expect(calculateFrozenTarget(100, 1, 1, 51)).toBe(49);
    });

  });

  describe('sub-monthly expenses (frequency_months < 1)', () => {
    it('calculates monthly equivalent for weekly expenses', () => {
      // $78/week, frequency=0.25, 10 balance
      // Monthly equivalent = 78/0.25 = $312
      // Target = max(0, 312 - 10) = 302
      expect(calculateFrozenTarget(78, 0.25, 1, 10)).toBe(302);
    });

    it('calculates monthly equivalent for bi-weekly expenses', () => {
      // $100/bi-weekly, frequency=0.5, 50 balance
      // Monthly equivalent = 100/0.5 = $200
      // Target = max(0, 200 - 50) = 150
      expect(calculateFrozenTarget(100, 0.5, 1, 50)).toBe(150);
    });

    it('returns zero when fully funded for the month', () => {
      // $78/week, frequency=0.25, 312 balance (covers full month)
      // Monthly equivalent = 78/0.25 = $312
      // Target = max(0, 312 - 312) = 0
      expect(calculateFrozenTarget(78, 0.25, 1, 312)).toBe(0);
    });

    it('returns zero when overfunded', () => {
      // $78/week, frequency=0.25, 400 balance
      // Monthly equivalent = 78/0.25 = $312
      // Target = max(0, 312 - 400) = 0
      expect(calculateFrozenTarget(78, 0.25, 1, 400)).toBe(0);
    });
  });

  describe('infrequent expenses (frequency_months > 1)', () => {
    describe('quarterly expenses (3 months)', () => {
      it('spreads shortfall evenly across remaining months', () => {
        // $300 quarterly, $0 saved, 3 months left
        // Python: shortfall=300, months=3, ceil(300/3) = 100
        expect(calculateFrozenTarget(300, 3, 3, 0)).toBe(100);
      });

      it('calculates catch-up rate when behind', () => {
        // $300 quarterly, $100 saved, 2 months left
        // Python: shortfall=200, months=2, ceil(200/2) = 100
        expect(calculateFrozenTarget(300, 3, 2, 100)).toBe(100);
      });

      it('returns zero when fully funded', () => {
        // $300 quarterly, $300 saved
        // Python: shortfall=0, returns 0
        expect(calculateFrozenTarget(300, 3, 1, 300)).toBe(0);
      });

      it('returns zero when overfunded', () => {
        // $300 quarterly, $400 saved
        // Python: shortfall=-100 → max(0, -100) = 0, returns 0
        expect(calculateFrozenTarget(300, 3, 2, 400)).toBe(0);
      });
    });

    describe('yearly expenses (12 months)', () => {
      it('calculates ideal monthly rate from start', () => {
        // $600 yearly, $0 saved, 12 months left
        // Python: shortfall=600, months=12, ceil(600/12) = 50
        expect(calculateFrozenTarget(600, 12, 12, 0)).toBe(50);
      });

      it('calculates catch-up rate when behind schedule', () => {
        // $600 yearly, $300 saved, 3 months left
        // Python: shortfall=300, months=3, ceil(300/3) = 100
        expect(calculateFrozenTarget(600, 12, 3, 300)).toBe(100);
      });

      it('returns zero when funded early', () => {
        // $600 yearly, $600 saved, 6 months left
        expect(calculateFrozenTarget(600, 12, 6, 600)).toBe(0);
      });

      it('rounds fractional monthly amounts', () => {
        // $100 yearly, $0 saved, 12 months left
        // Python: round(100/12) = round(8.33) = 8
        expect(calculateFrozenTarget(100, 12, 12, 0)).toBe(8);
      });

      it('handles uneven division with proper rounding', () => {
        // $500 yearly, $0 saved, 7 months left
        // Python: round(500/7) = round(71.43) = 71
        expect(calculateFrozenTarget(500, 12, 7, 0)).toBe(71);
      });
    });

    describe('months_until_due edge cases', () => {
      it('uses minimum of 1 month when due now', () => {
        // $600 yearly, $0 saved, 0 months left (due now)
        // Python: months_remaining = max(1, 0) = 1, ceil(600/1) = 600
        expect(calculateFrozenTarget(600, 12, 0, 0)).toBe(600);
      });

      it('uses minimum of 1 month for negative months_until_due', () => {
        // Overdue scenario (shouldn't happen but handle gracefully)
        // Python: months_remaining = max(1, -2) = 1
        expect(calculateFrozenTarget(600, 12, -2, 0)).toBe(600);
      });

      it('handles fractional months', () => {
        // $300, 1.5 months left
        // Python: months_remaining = max(1, 1.5) = 1.5, ceil(300/1.5) = 200
        expect(calculateFrozenTarget(300, 3, 1.5, 0)).toBe(200);
      });
    });
  });

  describe('edge cases', () => {
    it('handles zero amount', () => {
      // No expense, no target needed
      expect(calculateFrozenTarget(0, 12, 6, 0)).toBe(0);
      expect(calculateFrozenTarget(0, 1, 1, 50)).toBe(0);
    });

    it('handles very large amounts', () => {
      // $12,000 yearly, $0 saved, 12 months
      expect(calculateFrozenTarget(12000, 12, 12, 0)).toBe(1000);
    });

    it('handles decimal amounts', () => {
      // $99.99, $50 saved - shortfall is 49.99
      // Python: ceil(49.99) = 50
      expect(calculateFrozenTarget(99.99, 1, 1, 50)).toBe(50);
    });

    it('handles decimal balance', () => {
      // $100, $50.50 saved
      // Python: ceil(max(0, 100 - 50.50)) = ceil(49.50) = 50
      expect(calculateFrozenTarget(100, 1, 1, 50.5)).toBe(50);
    });

    it('handles very small shortfall', () => {
      // $100, $99.01 saved
      // Python: ceil(0.99) = 1
      expect(calculateFrozenTarget(100, 1, 1, 99.01)).toBe(1);
    });

    it('handles frequency exactly equal to 1', () => {
      // Boundary case: frequency_months === 1 should use monthly logic (shortfall)
      expect(calculateFrozenTarget(100, 1, 1, 50)).toBe(50);
    });

    it('handles frequency just below 1 (sub-monthly)', () => {
      // Boundary case: frequency_months < 1 should use monthly equivalent
      // $100, 0.9 month frequency (slightly more than monthly)
      // Monthly equivalent = 100/0.9 = $111.11
      // Target = max(0, 111 - 50) = 61 (after rounding)
      expect(calculateFrozenTarget(100, 0.9, 1, 50)).toBe(61);
    });

    it('handles frequency just above 1', () => {
      // Boundary case: frequency_months > 1 should use infrequent logic
      // $100, 1.1 month frequency, 1 month left, $50 saved
      // shortfall=50, months=1, round(50/1) = 50
      expect(calculateFrozenTarget(100, 1.1, 1, 50)).toBe(50);
    });
  });

  describe('real-world scenarios', () => {
    it('Netflix yearly subscription', () => {
      // $180 yearly Netflix, $90 saved, 6 months left
      // Need to save $90 more over 6 months = $15/month
      expect(calculateFrozenTarget(180, 12, 6, 90)).toBe(15);
    });

    it('car insurance semi-annual', () => {
      // $600 every 6 months, $200 saved, 4 months left
      // Need $400 more over 4 months = $100/month
      expect(calculateFrozenTarget(600, 6, 4, 200)).toBe(100);
    });

    it('rent monthly', () => {
      // $1500 rent, $1200 saved
      // Need $300 more this month
      expect(calculateFrozenTarget(1500, 1, 1, 1200)).toBe(300);
    });

    it('annual property tax', () => {
      // $3600 yearly, $0 saved, 12 months
      // $300/month
      expect(calculateFrozenTarget(3600, 12, 12, 0)).toBe(300);
    });

    it('quarterly gym membership', () => {
      // $150 quarterly, just paid, $0 saved, 3 months left
      // $50/month
      expect(calculateFrozenTarget(150, 3, 3, 0)).toBe(50);
    });

    it('already overfunded for next cycle', () => {
      // $100 monthly phone, $150 saved (extra from last month)
      // Target is $0 because already covered
      expect(calculateFrozenTarget(100, 1, 1, 150)).toBe(0);
    });
  });
});

/**
 * Cross-implementation snapshot tests
 *
 * These test cases should produce identical results when run against
 * the Python implementation. If updating this file, also update the
 * corresponding Python tests in tests/test_frozen_target_calculator.py.
 */
describe('cross-implementation test vectors', () => {
  /**
   * Test vectors validated against Python frozen_target_calculator.py:
   *
   * For sub-monthly (freq < 1): monthly_equivalent = amount/freq, target = max(0, equiv - balance)
   * For monthly (freq == 1): target = max(0, amount - balance)
   * For infrequent (freq > 1): target = shortfall / months_remaining
   */
  const testVectors: Array<{
    inputs: [number, number, number, number]; // amount, freq, months, balance
    expected: number;
    description: string;
  }> = [
    { inputs: [100, 1, 1, 0], expected: 100, description: 'monthly-full' },
    { inputs: [100, 1, 1, 100], expected: 0, description: 'monthly-funded' },
    { inputs: [100, 1, 1, 50], expected: 50, description: 'monthly-partial' },
    { inputs: [78, 0.25, 1, 0], expected: 312, description: 'weekly-full' },
    { inputs: [78, 0.25, 1, 312], expected: 0, description: 'weekly-funded' },
    { inputs: [78, 0.25, 1, 100], expected: 212, description: 'weekly-partial' },
    { inputs: [600, 12, 12, 0], expected: 50, description: 'yearly-start' },
    { inputs: [600, 12, 6, 300], expected: 50, description: 'yearly-ontrack' },
    { inputs: [600, 12, 3, 300], expected: 100, description: 'yearly-behind' },
    { inputs: [600, 12, 6, 600], expected: 0, description: 'yearly-funded' },
    { inputs: [100, 12, 12, 0], expected: 8, description: 'yearly-rounded' },
    { inputs: [500, 12, 7, 0], expected: 71, description: 'yearly-uneven' },
    { inputs: [300, 3, 3, 0], expected: 100, description: 'quarterly-start' },
    { inputs: [600, 12, 0, 0], expected: 600, description: 'due-now' },
    { inputs: [0, 12, 6, 0], expected: 0, description: 'zero-amount' },
  ];

  testVectors.forEach(({ inputs, expected, description }) => {
    it(`vector: ${description}`, () => {
      const [amount, freq, months, balance] = inputs;
      expect(calculateFrozenTarget(amount, freq, months, balance)).toBe(expected);
    });
  });
});
