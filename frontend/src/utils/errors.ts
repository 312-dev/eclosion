/**
 * Error Utilities
 *
 * Centralized error handling and formatting functions.
 */

import { RateLimitError } from '../api/client';

/**
 * Format an error for display to the user.
 *
 * Handles special cases like rate limiting and provides
 * user-friendly messages.
 *
 * @param err - The error to format
 * @param fallback - Fallback message if error can't be parsed
 * @returns User-friendly error message
 */
export function formatErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof RateLimitError) {
    return `Rate limit reached. Please wait ${err.retryAfter} seconds and try again.`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

/**
 * Check if an error is a rate limit error.
 *
 * @param err - The error to check
 * @returns True if the error is a rate limit error
 */
export function isRateLimitError(err: unknown): err is RateLimitError {
  return err instanceof RateLimitError;
}

/**
 * Get the retry-after value from a rate limit error.
 *
 * @param err - The error to check
 * @returns Retry-after seconds, or null if not a rate limit error
 */
export function getRetryAfter(err: unknown): number | null {
  if (err instanceof RateLimitError) {
    return err.retryAfter;
  }
  return null;
}
