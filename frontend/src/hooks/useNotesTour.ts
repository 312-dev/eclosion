/**
 * useNotesTour Hook
 *
 * Manages the notes page guided tour.
 * Tour state is persisted in localStorage.
 */

import { useMemo, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { NOTES_TOUR_STEPS } from '../components/layout/notesTourSteps';

// localStorage key for notes tour state
export const NOTES_TOUR_STATE_KEY = 'eclosion-notes-tour';

interface TourState {
  hasSeenTour: boolean;
}

const INITIAL_TOUR_STATE: TourState = {
  hasSeenTour: false,
};

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
  const [tourState, setTourState] = useLocalStorage<TourState>(
    NOTES_TOUR_STATE_KEY,
    INITIAL_TOUR_STATE
  );

  // Notes tour steps are always available (not data-dependent like recurring)
  const steps = useMemo(() => NOTES_TOUR_STEPS, []);

  const markAsSeen = useCallback(() => {
    setTourState({ hasSeenTour: true });
  }, [setTourState]);

  const resetTour = useCallback(() => {
    setTourState(INITIAL_TOUR_STATE);
  }, [setTourState]);

  return {
    steps,
    hasSeenTour: tourState.hasSeenTour,
    markAsSeen,
    resetTour,
    hasTourSteps: steps.length > 0,
  };
}
