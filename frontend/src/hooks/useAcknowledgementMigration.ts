/**
 * One-Time Acknowledgement Migration Hook
 *
 * Migrates tour/updates acknowledgement state from localStorage to the
 * server-side database. Runs once on first load after upgrade, then
 * cleans up the localStorage keys.
 *
 * Detection: If the server has no `updates_install_date` AND localStorage
 * has acknowledgement data, we migrate it. If neither has data, we just
 * initialize the install date.
 */

import { useEffect, useRef } from 'react';
import { useConfig } from '../api/queries/configStoreQueries';
import { useUpdateAcknowledgementsMutation } from '../api/queries/settingsMutations';
import { useDemo } from '../context/DemoContext';
import type { AcknowledgementsData } from '../api/core/acknowledgements';
import { STASH_TOUR_STATE_KEY, STASH_INTRO_STATE_KEY } from './useStashTour';
import { NOTES_TOUR_STATE_KEY } from './useNotesTour';
import { TOUR_STATE_KEY } from './useRecurringTour';
import { UPDATES_STATE_KEY } from './useUpdatesState';

function readLocalStorageJson<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as T;
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Migrates acknowledgement state from localStorage to the database.
 * Should be mounted once in the authenticated app shell.
 * No-op in demo mode and after the first successful migration.
 */
export function useAcknowledgementMigration(): void {
  const { config } = useConfig();
  const updateAck = useUpdateAcknowledgementsMutation();
  const isDemo = useDemo();
  const migrationAttempted = useRef(false);

  useEffect(() => {
    if (isDemo || migrationAttempted.current || !config) return;

    // Already migrated — server has an install date
    if (config.updates_install_date != null) {
      migrationAttempted.current = true;
      return;
    }

    migrationAttempted.current = true;

    const payload: Partial<AcknowledgementsData> = {};

    // Read tour states from localStorage
    const stashTour = readLocalStorageJson<{ hasSeenTour?: boolean }>(STASH_TOUR_STATE_KEY);
    if (stashTour?.hasSeenTour) payload.seen_stash_tour = true;

    const notesTour = readLocalStorageJson<{ hasSeenTour?: boolean }>(NOTES_TOUR_STATE_KEY);
    if (notesTour?.hasSeenTour) payload.seen_notes_tour = true;

    const recurringTour = readLocalStorageJson<{ hasSeenTour?: boolean }>(TOUR_STATE_KEY);
    if (recurringTour?.hasSeenTour) payload.seen_recurring_tour = true;

    const stashIntro = readLocalStorageJson<{ hasSeenIntro?: boolean }>(STASH_INTRO_STATE_KEY);
    if (stashIntro?.hasSeenIntro) payload.seen_stash_intro = true;

    // Read updates state
    const updatesState = readLocalStorageJson<{
      installDate?: string;
      readIds?: string[];
      lastViewedAt?: string | null;
    }>(UPDATES_STATE_KEY);

    if (updatesState) {
      payload.read_update_ids = updatesState.readIds ?? [];
      payload.updates_install_date = updatesState.installDate ?? new Date().toISOString();
      payload.updates_last_viewed_at = updatesState.lastViewedAt ?? null;
    } else {
      // No localStorage data — set install date to now
      payload.updates_install_date = new Date().toISOString();
    }

    updateAck.mutate(payload, {
      onSuccess: () => {
        // Clean up localStorage keys after successful migration
        localStorage.removeItem(STASH_TOUR_STATE_KEY);
        localStorage.removeItem(STASH_INTRO_STATE_KEY);
        localStorage.removeItem(NOTES_TOUR_STATE_KEY);
        localStorage.removeItem(TOUR_STATE_KEY);
        localStorage.removeItem(UPDATES_STATE_KEY);
      },
    });
  }, [config, isDemo, updateAck]);
}
