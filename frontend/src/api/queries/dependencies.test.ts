/**
 * Dependency Registry Tests
 *
 * Tests for the query dependency registry configuration.
 */

import { describe, it, expect } from 'vitest';
import {
  queryConfig,
  mutationEffects,
  pageQueryMap,
  pollingConfig,
  getInvalidationTargets,
  getStaleTargets,
  getPagePrimaryQueries,
  getPageAllQueries,
  getPageSyncScope,
  isQueryPollable,
  type QueryKeyName,
  type MutationType,
  type PageName,
} from './dependencies';
import { queryKeys } from './keys';

describe('Query Configuration', () => {
  it('should have config for all query keys', () => {
    const queryKeyNames = Object.keys(queryKeys) as QueryKeyName[];
    const configuredKeys = Object.keys(queryConfig) as QueryKeyName[];

    // Every query key should have a config entry
    queryKeyNames.forEach((key) => {
      expect(configuredKeys).toContain(key);
    });
  });

  it('should have valid staleTime values (positive numbers)', () => {
    Object.entries(queryConfig).forEach(([_key, config]) => {
      expect(config.staleTime).toBeGreaterThan(0);
      expect(typeof config.staleTime).toBe('number');
    });
  });

  it('should have valid gcTime values when specified', () => {
    Object.entries(queryConfig).forEach(([_key, config]) => {
      if (config.gcTime !== undefined) {
        expect(config.gcTime).toBeGreaterThan(0);
        expect(config.gcTime).toBeGreaterThanOrEqual(config.staleTime);
      }
    });
  });

  it('should have boolean pollable values', () => {
    Object.entries(queryConfig).forEach(([_key, config]) => {
      expect(typeof config.pollable).toBe('boolean');
    });
  });

  it('should only reference valid query keys in dependsOn', () => {
    const validKeys = Object.keys(queryKeys) as QueryKeyName[];

    Object.entries(queryConfig).forEach(([_key, config]) => {
      config.dependsOn.forEach((dep) => {
        expect(validKeys).toContain(dep);
      });
    });
  });
});

describe('Mutation Effects', () => {
  it('should only reference valid query keys in invalidate arrays', () => {
    const validKeys = Object.keys(queryKeys) as QueryKeyName[];

    Object.entries(mutationEffects).forEach(([mutation, effect]) => {
      effect.invalidate.forEach((key) => {
        expect(validKeys, `Invalid key "${key}" in ${mutation}.invalidate`).toContain(key);
      });
    });
  });

  it('should only reference valid query keys in markStale arrays', () => {
    const validKeys = Object.keys(queryKeys) as QueryKeyName[];

    Object.entries(mutationEffects).forEach(([mutation, effect]) => {
      effect.markStale.forEach((key) => {
        expect(validKeys, `Invalid key "${key}" in ${mutation}.markStale`).toContain(key);
      });
    });
  });

  it('should not have overlapping invalidate and markStale arrays', () => {
    Object.entries(mutationEffects).forEach(([mutation, effect]) => {
      const overlap = effect.invalidate.filter((key) =>
        effect.markStale.includes(key as QueryKeyName)
      );
      expect(overlap, `${mutation} has overlapping keys: ${overlap.join(', ')}`).toHaveLength(0);
    });
  });

  it('should have at least one target for each mutation', () => {
    Object.entries(mutationEffects).forEach(([mutation, effect]) => {
      const totalTargets = effect.invalidate.length + effect.markStale.length;
      expect(totalTargets, `${mutation} has no targets`).toBeGreaterThan(0);
    });
  });
});

describe('Page Query Map', () => {
  const pages: PageName[] = ['recurring', 'stash', 'notes', 'settings'];

  it('should have config for all pages', () => {
    pages.forEach((page) => {
      expect(pageQueryMap[page]).toBeDefined();
    });
  });

  it('should only reference valid query keys in primary arrays', () => {
    const validKeys = Object.keys(queryKeys) as QueryKeyName[];

    Object.entries(pageQueryMap).forEach(([page, config]) => {
      config.primary.forEach((key) => {
        expect(validKeys, `Invalid key "${key}" in ${page}.primary`).toContain(key);
      });
    });
  });

  it('should only reference valid query keys in supporting arrays', () => {
    const validKeys = Object.keys(queryKeys) as QueryKeyName[];

    Object.entries(pageQueryMap).forEach(([page, config]) => {
      config.supporting.forEach((key) => {
        expect(validKeys, `Invalid key "${key}" in ${page}.supporting`).toContain(key);
      });
    });
  });

  it('should not have overlapping primary and supporting arrays', () => {
    Object.entries(pageQueryMap).forEach(([page, config]) => {
      const overlap = config.primary.filter((key) =>
        config.supporting.includes(key as QueryKeyName)
      );
      expect(overlap, `${page} has overlapping keys: ${overlap.join(', ')}`).toHaveLength(0);
    });
  });

  it('should have valid sync scopes', () => {
    const validScopes = ['recurring', 'stash', 'notes', 'full'];

    Object.entries(pageQueryMap).forEach(([_page, config]) => {
      expect(validScopes).toContain(config.syncScope);
    });
  });
});

describe('Polling Configuration', () => {
  it('should have a valid poll interval', () => {
    expect(pollingConfig.pollInterval).toBeGreaterThan(0);
    expect(pollingConfig.pollInterval).toBeLessThanOrEqual(10 * 60 * 1000); // Max 10 minutes
  });

  it('should only include pollable queries', () => {
    pollingConfig.pollableQueries.forEach((key) => {
      expect(queryConfig[key]?.pollable, `${key} should be pollable`).toBe(true);
    });
  });

  it('should include all pollable queries', () => {
    const allPollable = Object.entries(queryConfig)
      .filter(([, config]) => config.pollable)
      .map(([key]) => key);

    allPollable.forEach((key) => {
      expect(pollingConfig.pollableQueries).toContain(key);
    });
  });
});

describe('Helper Functions', () => {
  describe('getInvalidationTargets', () => {
    it('should return invalidation targets for known mutations', () => {
      const targets = getInvalidationTargets('sync');
      expect(targets).toContain('dashboard');
      expect(targets.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown mutation types', () => {
      // @ts-expect-error - Testing invalid input
      const targets = getInvalidationTargets('unknownMutation');
      expect(targets).toEqual([]);
    });
  });

  describe('getStaleTargets', () => {
    it('should return stale targets for known mutations', () => {
      const targets = getStaleTargets('sync');
      expect(targets).toContain('monarchGoals');
    });

    it('should return empty array for mutations with no stale targets', () => {
      const targets = getStaleTargets('toggleItem');
      expect(targets).toEqual([]);
    });
  });

  describe('getPagePrimaryQueries', () => {
    it('should return primary queries for known pages', () => {
      expect(getPagePrimaryQueries('recurring')).toContain('dashboard');
      expect(getPagePrimaryQueries('stash')).toContain('stash');
      expect(getPagePrimaryQueries('notes')).toContain('monthNotes');
    });

    it('should return empty array for unknown pages', () => {
      // @ts-expect-error - Testing invalid input
      expect(getPagePrimaryQueries('unknownPage')).toEqual([]);
    });
  });

  describe('getPageAllQueries', () => {
    it('should return combined primary and supporting queries', () => {
      const allQueries = getPageAllQueries('recurring');
      expect(allQueries).toContain('dashboard'); // primary
      expect(allQueries).toContain('categoryStore'); // supporting
    });

    it('should return empty array for unknown pages', () => {
      // @ts-expect-error - Testing invalid input
      expect(getPageAllQueries('unknownPage')).toEqual([]);
    });
  });

  describe('getPageSyncScope', () => {
    it('should return correct sync scope for each page', () => {
      expect(getPageSyncScope('recurring')).toBe('recurring');
      expect(getPageSyncScope('stash')).toBe('stash');
      expect(getPageSyncScope('notes')).toBe('notes');
      expect(getPageSyncScope('settings')).toBe('full');
    });

    it('should return full for unknown pages', () => {
      // @ts-expect-error - Testing invalid input
      expect(getPageSyncScope('unknownPage')).toBe('full');
    });
  });

  describe('isQueryPollable', () => {
    it('should return true for pollable queries', () => {
      expect(isQueryPollable('dashboard')).toBe(true);
      expect(isQueryPollable('stash')).toBe(true);
    });

    it('should return false for non-pollable queries', () => {
      expect(isQueryPollable('stashConfig')).toBe(false);
      expect(isQueryPollable('categoryStore')).toBe(false);
    });

    it('should return false for unknown queries', () => {
      // @ts-expect-error - Testing invalid input
      expect(isQueryPollable('unknownQuery')).toBe(false);
    });
  });
});

describe('Specific Mutation Configurations', () => {
  it('sync should invalidate core data queries', () => {
    const targets = getInvalidationTargets('sync');
    expect(targets).toContain('dashboard');
    expect(targets).toContain('categoryStore');
    expect(targets).toContain('stash');
    expect(targets).toContain('availableToStash');
  });

  it('stash mutations should affect stash and availableToStash', () => {
    const stashMutations: MutationType[] = [
      'createStash',
      'deleteStash',
      'allocateStash',
      'distributeToStash',
    ];

    stashMutations.forEach((mutation) => {
      const targets = getInvalidationTargets(mutation);
      expect(targets, `${mutation} should invalidate stash`).toContain('stash');
      expect(targets, `${mutation} should invalidate availableToStash`).toContain(
        'availableToStash'
      );
    });
  });

  it('pending bookmark mutations should affect pending queries', () => {
    const pendingMutations: MutationType[] = ['skipPending', 'convertPending', 'importBookmarks'];

    pendingMutations.forEach((mutation) => {
      const targets = getInvalidationTargets(mutation);
      expect(targets, `${mutation} should invalidate pendingBookmarks`).toContain(
        'pendingBookmarks'
      );
      expect(targets, `${mutation} should invalidate pendingBookmarksCount`).toContain(
        'pendingBookmarksCount'
      );
    });
  });

  it('convertPending should also affect stash', () => {
    const targets = getInvalidationTargets('convertPending');
    expect(targets).toContain('stash');
    expect(targets).toContain('availableToStash');
  });

  it('notes mutations should affect monthNotes', () => {
    const notesMutations: MutationType[] = [
      'saveNote',
      'deleteNote',
      'saveGeneralNote',
      'deleteGeneralNote',
    ];

    notesMutations.forEach((mutation) => {
      const targets = getInvalidationTargets(mutation);
      expect(targets, `${mutation} should invalidate monthNotes`).toContain('monthNotes');
    });
  });
});
