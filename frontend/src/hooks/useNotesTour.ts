/**
 * useNotesTour Hook
 *
 * Manages the notes page guided tour.
 * Tour state is persisted server-side via the config store.
 */

import { useMemo, useCallback } from 'react';
import { useConfig, useUpdateConfigInCache } from '../api/queries/configStoreQueries';
import { useUpdateAcknowledgementsMutation } from '../api/queries/settingsMutations';
import { NOTES_TOUR_STEPS } from '../components/layout/notesTourSteps';

// localStorage key preserved for migration hook reference
export const NOTES_TOUR_STATE_KEY = 'eclosion-notes-tour';

export interface UseNotesTourReturn {
  /** Tour steps to display */
  steps: typeof NOTES_TOUR_STEPS;
  /** Whether user has already seen the tour */
  hasSeenTour: boolean;
  /** Mark the tour as seen (call when tour completes or is dismissed) */
  markAsSeen: () => void;
  /** Reset tour state (for replay functionality) */
  resetTour: () => void;
  /** Whether there are any steps available to show */
  hasTourSteps: boolean;
}

/**
 * Hook for managing the notes page guided tour.
 *
 * @returns Tour state and controls
 */
export function useNotesTour(): UseNotesTourReturn {
  const { config } = useConfig();
  const updateConfigInCache = useUpdateConfigInCache();
  const updateAck = useUpdateAcknowledgementsMutation();

  const hasSeenTour = config?.seen_notes_tour ?? false;

  // Notes tour steps are always available (not data-dependent like recurring)
  const steps = useMemo(() => NOTES_TOUR_STEPS, []);

  const markAsSeen = useCallback(() => {
    updateConfigInCache({ seen_notes_tour: true });
    updateAck.mutate({ seen_notes_tour: true });
  }, [updateConfigInCache, updateAck]);

  const resetTour = useCallback(() => {
    updateConfigInCache({ seen_notes_tour: false });
    updateAck.mutate({ seen_notes_tour: false });
  }, [updateConfigInCache, updateAck]);

  return {
    steps,
    hasSeenTour,
    markAsSeen,
    resetTour,
    hasTourSteps: steps.length > 0,
  };
}
