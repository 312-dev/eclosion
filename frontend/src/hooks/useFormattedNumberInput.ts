/**
 * useFormattedNumberInput - Hook for auto-comma formatting in number inputs
 *
 * Provides state management for number inputs that display with commas
 * as the user types (e.g., "1000" becomes "1,000").
 *
 * Usage:
 *   const { displayValue, handleChange, handleBlur, handleKeyDown, handleFocus } =
 *     useFormattedNumberInput({
 *       value: amount,
 *       onChange: setAmount,
 *     });
 *
 *   <input
 *     type="text"
 *     inputMode="numeric"
 *     value={displayValue}
 *     onChange={handleChange}
 *     onBlur={handleBlur}
 *     onKeyDown={handleKeyDown}
 *     onFocus={handleFocus}
 *   />
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseFormattedNumberInputOptions {
  /** The numeric value (controlled) */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Optional callback when input is blurred */
  onBlur?: () => void;
  /** Optional callback when input is focused */
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Whether to allow empty input (defaults to true, treating empty as 0) */
  allowEmpty?: boolean;
  /** Optional minimum value */
  min?: number;
  /** Optional maximum value */
  max?: number;
}

export interface UseFormattedNumberInputReturn {
  /** The formatted display value with commas (e.g., "1,234") */
  displayValue: string;
  /** Handler for input change events */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler for blur events - finalizes the value */
  handleBlur: () => void;
  /** Handler for keydown events - handles Enter/Escape */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Handler for focus events - selects all text */
  handleFocus: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Ref to attach to the input element */
  inputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * Format a number with commas for display.
 * Returns empty string for 0 or falsy values.
 */
function formatWithCommas(value: number): string {
  if (value === 0) return '';
  return value.toLocaleString('en-US');
}

/**
 * Parse a string with commas back to a number.
 * Strips all non-digit characters.
 */
function parseFromFormatted(value: string): number {
  const digitsOnly = value.replaceAll(/\D/g, '');
  if (digitsOnly === '') return 0;
  return Number.parseInt(digitsOnly, 10);
}

export function useFormattedNumberInput({
  value,
  onChange,
  onBlur,
  onFocus,
  allowEmpty: _allowEmpty = true,
  min,
  max,
}: UseFormattedNumberInputOptions): UseFormattedNumberInputReturn {
  // Track the raw input value for display
  const [localValue, setLocalValue] = useState(() => formatWithCommas(Math.round(value)));
  const inputRef = useRef<HTMLInputElement>(null);
  const prevValueRef = useRef(value);

  // Sync local state when external value changes
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      // Use requestAnimationFrame to avoid setState during render
      const frame = requestAnimationFrame(() => {
        setLocalValue(formatWithCommas(Math.round(value)));
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;

      // Strip non-digits
      const digitsOnly = rawInput.replaceAll(/\D/g, '');

      // Format with commas for display
      if (digitsOnly === '') {
        setLocalValue('');
      } else {
        const numericValue = Number.parseInt(digitsOnly, 10);

        // Apply min/max constraints
        let clampedValue = numericValue;
        if (min !== undefined) clampedValue = Math.max(min, clampedValue);
        if (max !== undefined) clampedValue = Math.min(max, clampedValue);

        setLocalValue(clampedValue.toLocaleString('en-US'));

        // Update parent immediately for responsive UI
        onChange(clampedValue);
      }
    },
    [onChange, min, max]
  );

  const handleBlur = useCallback(() => {
    // Parse final value
    const numericValue = parseFromFormatted(localValue);

    // Apply min/max constraints
    let finalValue = numericValue;
    if (min !== undefined) finalValue = Math.max(min, finalValue);
    if (max !== undefined) finalValue = Math.min(max, finalValue);

    // Update display to show formatted value (or empty for 0)
    setLocalValue(formatWithCommas(finalValue));

    // Ensure parent has final value
    if (finalValue !== value) {
      onChange(finalValue);
    }

    onBlur?.();
  }, [localValue, value, onChange, onBlur, min, max]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        inputRef.current?.blur();
      } else if (e.key === 'Escape') {
        // Reset to original value
        setLocalValue(formatWithCommas(Math.round(value)));
        inputRef.current?.blur();
      }
    },
    [value]
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      e.target.select();
      onFocus?.(e);
    },
    [onFocus]
  );

  return {
    displayValue: localValue,
    handleChange,
    handleBlur,
    handleKeyDown,
    handleFocus,
    inputRef,
  };
}
