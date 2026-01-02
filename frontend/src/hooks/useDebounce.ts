/**
 * useDebounce Hook
 *
 * Returns a debounced version of the provided value.
 * Useful for delaying expensive operations like API calls during typing.
 *
 * Usage:
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 *   useEffect(() => {
 *     // This only runs 300ms after the user stops typing
 *     search(debouncedSearchTerm);
 *   }, [debouncedSearchTerm]);
 */

import { useState, useEffect } from 'react';

/**
 * Hook that returns a debounced value.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds before updating the debounced value
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timeout to update debounced value after delay
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up timeout if value changes or component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}
