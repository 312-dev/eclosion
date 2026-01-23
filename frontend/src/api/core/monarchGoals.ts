/**
 * Monarch Goals API Client
 *
 * Handles API calls for Monarch savings goals displayed in Stash grid.
 */

import { fetchApi } from './fetchApi';
import type { MonarchGoal, MonarchGoalLayoutUpdate } from '../../types/monarchGoal';

export async function getMonarchGoals(): Promise<{ goals: MonarchGoal[] }> {
  return fetchApi('/stash/monarch-goals');
}

export async function updateMonarchGoalLayouts(
  layouts: MonarchGoalLayoutUpdate[]
): Promise<{ success: boolean }> {
  return fetchApi('/stash/monarch-goals/layout', {
    method: 'PUT',
    body: JSON.stringify({ layouts }),
  });
}
