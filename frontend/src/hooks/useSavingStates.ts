/**
 * useSavingStates Hook
 *
 * Manages multiple named saving states for forms with multiple async actions.
 * Each key gets its own independent loading state.
 *
 * Usage:
 *   const { isSaving, withSaving } = useSavingStates<'group' | 'autoTrack' | 'threshold'>();
 *
 *   <button onClick={() => withSaving('group', () => saveGroup(id))} disabled={isSaving('group')}>
 *     {isSaving('group') ? 'Saving...' : 'Save'}
 *   </button>
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseSavingStatesReturn<K extends string> {
  /** Check if a specific key is currently saving */
  isSaving: (key: K) => boolean;
  /** Execute an async action while tracking its saving state */
  withSaving: <T>(key: K, action: () => Promise<T>) => Promise<T | undefined>;
  /** Check if any key is currently saving */
  isAnySaving: () => boolean;
}

export function useSavingStates<K extends string>(): UseSavingStatesReturn<K> {
  const [savingKeys, setSavingKeys] = useState<Set<K>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isSaving = useCallback(
    (key: K): boolean => savingKeys.has(key),
    [savingKeys]
  );

  const isAnySaving = useCallback(
    (): boolean => savingKeys.size > 0,
    [savingKeys]
  );

  const withSaving = useCallback(
    async <T>(key: K, action: () => Promise<T>): Promise<T | undefined> => {
      setSavingKeys(prev => new Set(prev).add(key));
      try {
        return await action();
      } finally {
        if (mountedRef.current) {
          setSavingKeys(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
      }
    },
    []
  );

  return { isSaving, withSaving, isAnySaving };
}
