/**
 * useStashTour Hook
 *
 * Manages the stash page guided tour with trigger-based steps.
 * Steps are dynamically generated based on available data.
 * Tour state is persisted server-side via the config store.
 *
 * Step triggers (progressive disclosure):
 * - Phase 1: Always shown (available-funds, distribute-mode, hypothesize-mode, add-item)
 * - Phase 2: When items exist (progress-bar, budget-input, take-stash, edit-item, arrange-cards)
 * - Phase 3: Secondary features (reports-tab)
 * - Phase 4: When Monarch Goals enabled (monarch-goal-badge)
 * - Phase 5: Browser integration (sync-bookmarks) - desktop or browser configured
 * - Phase 6: Pending bookmarks (pending-bookmarks)
 */

import { useMemo, useCallback } from 'react';
import { useConfig, useUpdateConfigInCache } from '../api/queries/configStoreQueries';
import { useUpdateAcknowledgementsMutation } from '../api/queries/settingsMutations';
import { STASH_TOUR_STEPS, type StashTourStepId } from '../components/layout/stashTourSteps';

// localStorage keys preserved for migration hook reference
export const STASH_TOUR_STATE_KEY = 'eclosion-stash-tour';
export const STASH_INTRO_STATE_KEY = 'eclosion-stash-intro';

/** Data needed to evaluate which tour steps should be shown */
export interface StashTourData {
  /** Number of stash items (not including Monarch goals) */
  itemCount: number;
  /** Number of pending bookmarks awaiting review */
  pendingCount: number;
  /** Whether browser bookmark sync is configured */
  isBrowserConfigured: boolean;
  /** Whether running in desktop mode (Electron) */
  isDesktop: boolean;
  /** Whether Monarch Goals are enabled in settings */
  hasMonarchGoalsEnabled: boolean;
  /** Number of active Monarch goals (when goals are enabled) */
  monarchGoalCount: number;
}

/**
 * Evaluates which tour steps should be shown based on current data.
 * Returns steps in order they should be presented.
 *
 * This implements progressive disclosure - steps only appear when
 * the relevant UI elements and data are available.
 */
function evaluateTriggers(data: StashTourData | undefined): StashTourStepId[] {
  if (!data) return [];

  // Build step list using spread to satisfy linter (no multiple pushes)
  const stepIds: StashTourStepId[] = [
    // Phase 1: Always shown (core concepts - most important first)
    'available-funds',
    'distribute-mode',
    'hypothesize-mode',
    'add-item',

    // Phase 2: When items exist (card interactions)
    ...(data.itemCount > 0
      ? (['progress-bar', 'budget-input', 'take-stash', 'edit-item', 'arrange-cards'] as const)
      : []),

    // Phase 3: Secondary features (always shown)
    'reports-tab',

    // Phase 4: When Monarch Goals enabled
    ...(data.hasMonarchGoalsEnabled && data.monarchGoalCount > 0
      ? (['monarch-goal-badge'] as const)
      : []),

    // Phase 5: Browser integration
    ...(data.isDesktop || data.isBrowserConfigured ? (['sync-bookmarks'] as const) : []),

    // Phase 6: Pending bookmarks
    ...(data.pendingCount > 0 ? (['pending-bookmarks'] as const) : []),
  ];

  return stepIds;
}

export interface UseStashTourReturn {
  /** Tour steps to display, based on current data triggers */
  steps: typeof STASH_TOUR_STEPS;
  /** Whether user has already seen the tour */
  hasSeenTour: boolean;
  /** Mark the tour as seen (call when tour completes or is dismissed) */
  markAsSeen: () => void;
  /** Reset tour state (for replay functionality) */
  resetTour: () => void;
  /** Whether there are any steps available to show */
  hasTourSteps: boolean;
  /** Whether user has seen the intro modal (Stashes vs Monarch Goals) */
  hasSeenIntro: boolean;
  /** Mark the intro modal as seen */
  markIntroSeen: () => void;
  /** Reset intro state (for replay functionality) */
  resetIntro: () => void;
}

/**
 * Hook for managing the stash page guided tour.
 *
 * @param data - Stash data to evaluate triggers against
 * @returns Tour state and controls
 */
export function useStashTour(data: StashTourData | undefined): UseStashTourReturn {
  const { config } = useConfig();
  const updateConfigInCache = useUpdateConfigInCache();
  const updateAck = useUpdateAcknowledgementsMutation();

  const hasSeenTour = config?.seen_stash_tour ?? false;
  const hasSeenIntro = config?.seen_stash_intro ?? false;

  // Evaluate which steps should be shown based on current data
  const activeStepIds = useMemo(() => evaluateTriggers(data), [data]);

  // Filter tour steps to only include those whose triggers are met
  const steps = useMemo(() => {
    return STASH_TOUR_STEPS.filter((step) => activeStepIds.includes(step.id));
  }, [activeStepIds]);

  const markAsSeen = useCallback(() => {
    updateConfigInCache({ seen_stash_tour: true });
    updateAck.mutate({ seen_stash_tour: true });
  }, [updateConfigInCache, updateAck]);

  const resetTour = useCallback(() => {
    updateConfigInCache({ seen_stash_tour: false });
    updateAck.mutate({ seen_stash_tour: false });
  }, [updateConfigInCache, updateAck]);

  const markIntroSeen = useCallback(() => {
    updateConfigInCache({ seen_stash_intro: true });
    updateAck.mutate({ seen_stash_intro: true });
  }, [updateConfigInCache, updateAck]);

  const resetIntro = useCallback(() => {
    updateConfigInCache({ seen_stash_intro: false });
    updateAck.mutate({ seen_stash_intro: false });
  }, [updateConfigInCache, updateAck]);

  return {
    steps,
    hasSeenTour,
    markAsSeen,
    resetTour,
    hasTourSteps: steps.length > 0,
    hasSeenIntro,
    markIntroSeen,
    resetIntro,
  };
}
