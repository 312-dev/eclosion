/**
 * Demo Stash Configuration API
 *
 * LocalStorage-based implementation of stash config for demo mode.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type { StashConfig } from '../../types';

/**
 * Get category groups for stash selections.
 */
export async function getStashCategoryGroups(): Promise<{ id: string; name: string }[]> {
  await simulateDelay();
  return getDemoState().categoryGroups;
}

/**
 * Get stash configuration.
 */
export async function getStashConfig(): Promise<StashConfig> {
  await simulateDelay();
  return getDemoState().stashConfig;
}

/**
 * Update stash configuration.
 */
export async function updateStashConfig(
  updates: Partial<StashConfig>
): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    stashConfig: { ...state.stashConfig, ...updates },
  }));
  return { success: true };
}

/**
 * Fetch og:image from a URL (demo mode stub).
 */
export async function fetchOgImage(_url: string): Promise<string | null> {
  return null;
}
