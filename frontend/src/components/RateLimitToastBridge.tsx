/**
 * Rate Limit Toast Bridge
 *
 * Shows a warning toast when rate limiting first occurs.
 * Must be rendered inside both ToastProvider and RateLimitProvider.
 */

import { useEffect, useRef } from 'react';
import { useRateLimit } from '../context/RateLimitContext';
import { useToast } from '../context/ToastContext';

export function RateLimitToastBridge() {
  const { isRateLimited } = useRateLimit();
  const toast = useToast();
  const wasRateLimited = useRef(false);

  useEffect(() => {
    // Only show toast on transition TO rate-limited state
    if (isRateLimited && !wasRateLimited.current) {
      toast.warning('Sync paused due to rate limiting. Please wait a few minutes.');
    }
    wasRateLimited.current = isRateLimited;
  }, [isRateLimited, toast]);

  return null;
}
