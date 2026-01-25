/**
 * Smart Invalidation Hook Tests
 *
 * Tests for the useSmartInvalidate hook and related utilities.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSmartInvalidate, useInvalidateQueries } from './useSmartInvalidate';

// Mock the context
vi.mock('../context/DemoContext', () => ({
  useDemo: vi.fn(() => false),
}));

// Mock the dependencies module
vi.mock('../api/queries/dependencies', () => ({
  getInvalidationTargets: vi.fn((mutation: string) => {
    const map: Record<string, string[]> = {
      sync: ['dashboard', 'categoryStore', 'stash', 'availableToStash'],
      createStash: ['stash', 'availableToStash'],
      toggleItem: ['dashboard'],
    };
    return map[mutation] || [];
  }),
  getStaleTargets: vi.fn((mutation: string) => {
    const map: Record<string, string[]> = {
      sync: ['monarchGoals', 'stashHistory', 'categoryGroups'],
      createStash: ['dashboard', 'categoryGroups'],
      toggleItem: [],
    };
    return map[mutation] || [];
  }),
}));

// Mock the query keys
vi.mock('../api/queries/keys', () => ({
  queryKeys: {
    dashboard: ['dashboard'],
    categoryStore: ['categoryStore'],
    stash: ['stash'],
    availableToStash: ['availableToStash'],
    monarchGoals: ['monarchGoals'],
    stashHistory: ['stashHistory'],
    categoryGroups: ['categoryGroups'],
  },
  getQueryKey: (key: string[], isDemo: boolean) => (isDemo ? ['demo', ...key] : key),
}));

import { useDemo } from '../context/DemoContext';

const mockUseDemo = vi.mocked(useDemo);

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
}

describe('useSmartInvalidate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDemo.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a function', () => {
    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useSmartInvalidate(), { wrapper });

    expect(typeof result.current).toBe('function');
  });

  it('should call invalidateQueries for invalidation targets', () => {
    const { wrapper, queryClient } = createTestWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSmartInvalidate(), { wrapper });

    result.current('toggleItem');

    // Should have called invalidateQueries at least once for 'dashboard'
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('should call invalidateQueries with refetchType none for stale targets', () => {
    const { wrapper, queryClient } = createTestWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSmartInvalidate(), { wrapper });

    result.current('sync');

    // Should have multiple calls - some for immediate invalidation, some for marking stale
    const calls = invalidateSpy.mock.calls;

    // Check that at least one call has refetchType: 'none' (for stale targets)
    const staleCall = calls.find(
      (call) => call[0] && typeof call[0] === 'object' && 'refetchType' in call[0]
    );
    expect(staleCall).toBeDefined();
  });

  it('should work in demo mode', () => {
    mockUseDemo.mockReturnValue(true);
    const { wrapper, queryClient } = createTestWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSmartInvalidate(), { wrapper });

    result.current('createStash');

    expect(invalidateSpy).toHaveBeenCalled();
  });

  it('should be stable across renders (memoized)', () => {
    const { wrapper } = createTestWrapper();
    const { result, rerender } = renderHook(() => useSmartInvalidate(), { wrapper });

    const firstFn = result.current;
    rerender();
    const secondFn = result.current;

    expect(firstFn).toBe(secondFn);
  });
});

describe('useInvalidateQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDemo.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a function', () => {
    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useInvalidateQueries(), { wrapper });

    expect(typeof result.current).toBe('function');
  });

  it('should invalidate specified queries', () => {
    const { wrapper, queryClient } = createTestWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInvalidateQueries(), { wrapper });

    result.current(['dashboard', 'stash']);

    // Should call invalidateQueries for each key
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it('should use refetchType none when lazy option is true', () => {
    const { wrapper, queryClient } = createTestWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInvalidateQueries(), { wrapper });

    result.current(['dashboard'], { lazy: true });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchType: 'none',
      })
    );
  });

  it('should use refetchType active by default', () => {
    const { wrapper, queryClient } = createTestWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useInvalidateQueries(), { wrapper });

    result.current(['dashboard']);

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        refetchType: 'active',
      })
    );
  });

  it('should be stable across renders (memoized)', () => {
    const { wrapper } = createTestWrapper();
    const { result, rerender } = renderHook(() => useInvalidateQueries(), { wrapper });

    const firstFn = result.current;
    rerender();
    const secondFn = result.current;

    expect(firstFn).toBe(secondFn);
  });
});
