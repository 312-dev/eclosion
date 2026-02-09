/**
 * Demo Acknowledgements API
 *
 * localStorage-based implementation for demo mode.
 * Reads/writes acknowledgement state from the demo dashboard config.
 */

import type { AcknowledgementsData } from '../core/acknowledgements';
import { getDemoState, updateDemoState, simulateDelay } from './demoState';

const DEFAULTS: AcknowledgementsData = {
  seen_stash_tour: false,
  seen_notes_tour: false,
  seen_recurring_tour: false,
  seen_stash_intro: false,
  read_update_ids: [],
  updates_install_date: new Date().toISOString(),
  updates_last_viewed_at: null,
};

export async function getAcknowledgements(): Promise<AcknowledgementsData> {
  await simulateDelay(50);
  const state = getDemoState();
  const config = state.dashboard.config;
  return {
    seen_stash_tour: config.seen_stash_tour ?? DEFAULTS.seen_stash_tour,
    seen_notes_tour: config.seen_notes_tour ?? DEFAULTS.seen_notes_tour,
    seen_recurring_tour: config.seen_recurring_tour ?? DEFAULTS.seen_recurring_tour,
    seen_stash_intro: config.seen_stash_intro ?? DEFAULTS.seen_stash_intro,
    read_update_ids: config.read_update_ids ?? DEFAULTS.read_update_ids,
    updates_install_date: config.updates_install_date ?? DEFAULTS.updates_install_date,
    updates_last_viewed_at: config.updates_last_viewed_at ?? DEFAULTS.updates_last_viewed_at,
  };
}

export async function updateAcknowledgements(
  data: Partial<AcknowledgementsData>
): Promise<{ success: boolean }> {
  await simulateDelay(50);
  updateDemoState((s) => ({
    ...s,
    dashboard: {
      ...s.dashboard,
      config: { ...s.dashboard.config, ...data },
    },
  }));
  return { success: true };
}
