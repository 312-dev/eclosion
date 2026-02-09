/**
 * Acknowledgements API Functions
 *
 * Server-side storage for tour completion, news article read state,
 * and feature intro acknowledgements.
 */

import { fetchApi } from './fetchApi';

export interface AcknowledgementsData {
  seen_stash_tour: boolean;
  seen_notes_tour: boolean;
  seen_recurring_tour: boolean;
  seen_stash_intro: boolean;
  read_update_ids: string[];
  updates_install_date: string | null;
  updates_last_viewed_at: string | null;
}

export async function getAcknowledgements(): Promise<AcknowledgementsData> {
  return fetchApi<AcknowledgementsData>('/acknowledgements');
}

export async function updateAcknowledgements(
  data: Partial<AcknowledgementsData>
): Promise<{ success: boolean }> {
  return fetchApi('/acknowledgements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
