/**
 * Dashboard API Functions
 *
 * Dashboard data and sync operations.
 */

import type { DashboardData, SyncResult } from '../../types';
import { fetchApi } from './fetchApi';

export async function getDashboard(): Promise<DashboardData> {
  return fetchApi<DashboardData>('/recurring/dashboard');
}

export async function triggerSync(): Promise<SyncResult> {
  return fetchApi<SyncResult>('/recurring/sync', { method: 'POST' });
}

export type SyncScope = 'recurring' | 'stash' | 'notes' | 'full';

/**
 * Trigger a scoped sync that only refreshes data relevant to a specific page.
 * - 'recurring': Only fetch recurring items, budgets, categories
 * - 'stash': Only fetch stash data, accounts, goals
 * - 'notes': No Monarch API calls (notes are local)
 * - 'full': Full sync (current behavior)
 */
export async function triggerScopedSync(scope: SyncScope): Promise<SyncResult> {
  return fetchApi<SyncResult>('/recurring/sync', {
    method: 'POST',
    body: JSON.stringify({ scope }),
  });
}
