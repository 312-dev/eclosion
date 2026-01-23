/**
 * StashBudgetInput - Editable budget input field for stash items
 *
 * Shows budget/monthly target inline (e.g., "$ 5 / 10") similar to RecurringItemBudget.
 * Allows users to manually allocate funds to their stash savings goals.
 */

import React, { useState, useCallback } from 'react';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useAvailableToStashDrawerOptional } from '../../context';
import { Tooltip } from '../ui/Tooltip';

/**
 * Format a number with commas for display. Returns empty string for 0.
 */
function formatWithCommas(value: number): string {
  if (value === 0) return '';
  return Math.round(value).toLocaleString('en-US');
}

/**
 * Parse a formatted string (with commas) back to a number.
 */
function parseFormatted(value: string): number {
  const digitsOnly = value.replaceAll(/\D/g, '');
  if (digitsOnly === '') return 0;
  return Number.parseInt(digitsOnly, 10);
}

interface StashBudgetInputProps {
  readonly plannedBudget: number;
  readonly monthlyTarget: number;
  readonly onAllocate: (newAmount: number) => Promise<void>;
  readonly isAllocating: boolean;
}

export function StashBudgetInput({
  plannedBudget,
  monthlyTarget,
  onAllocate,
  isAllocating,
}: StashBudgetInputProps) {
  const [budgetInput, setBudgetInput] = useState(formatWithCommas(plannedBudget));
  const [prevPlannedBudget, setPrevPlannedBudget] = useState(plannedBudget);
  const isRateLimited = useIsRateLimited();

  // Optional drawer context - may not be available in all contexts
  const drawerContext = useAvailableToStashDrawerOptional();

  const isDisabled = isAllocating || isRateLimited;

  // Adjust state during render when prop changes (React recommended pattern)
  if (plannedBudget !== prevPlannedBudget) {
    setPrevPlannedBudget(plannedBudget);
    setBudgetInput(formatWithCommas(plannedBudget));
  }

  const handleBudgetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const digitsOnly = rawInput.replaceAll(/\D/g, '');
    if (digitsOnly === '') {
      setBudgetInput('');
    } else {
      const numericValue = Number.parseInt(digitsOnly, 10);
      setBudgetInput(numericValue.toLocaleString('en-US'));
    }
  }, []);

  const handleBudgetSubmit = async () => {
    // Parse the formatted input
    const parsedAmount = parseFormatted(budgetInput);
    // Update display to normalized format
    setBudgetInput(formatWithCommas(parsedAmount));
    if (Math.abs(parsedAmount - plannedBudget) > 0.01) {
      await onAllocate(parsedAmount);
    }
    drawerContext?.closeTemporary();
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setBudgetInput(formatWithCommas(plannedBudget));
      drawerContext?.closeTemporary();
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    drawerContext?.temporarilyOpen();
    e.target.select();
  };

  const target = Math.round(monthlyTarget);

  return (
    <div
      className="flex items-center whitespace-nowrap rounded bg-monarch-bg-card border border-monarch-border px-2 py-1 focus-within:border-monarch-orange"
      data-no-dnd="true"
    >
      <span className="font-medium text-monarch-text-dark">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={budgetInput}
        onChange={handleBudgetChange}
        onKeyDown={handleBudgetKeyDown}
        onBlur={handleBudgetSubmit}
        onFocus={handleFocus}
        disabled={isDisabled}
        placeholder="0"
        aria-label="Budget amount"
        className="w-14 text-right font-medium text-monarch-text-dark bg-transparent font-inherit disabled:opacity-50 outline-none tabular-nums"
      />
      <Tooltip content="Monthly savings target to reach your goal by the target date" side="bottom">
        <span className="text-monarch-text-muted ml-1 cursor-help">/ {target}</span>
      </Tooltip>
    </div>
  );
}
