/**
 * Refunds API
 *
 * API functions for the Refunds feature - tracking purchases
 * awaiting refunds/reimbursements.
 */

import type {
  RefundsConfig,
  RefundsMatch,
  RefundsSavedView,
  Transaction,
  TransactionTag,
  CreateMatchRequest,
} from '../../types/refunds';

import { fetchApi } from './fetchApi';

// ---- Config ----

export async function getRefundsConfig(): Promise<RefundsConfig> {
  return fetchApi<RefundsConfig>('/refunds/config');
}

export async function updateRefundsConfig(
  updates: Partial<RefundsConfig>
): Promise<{ success: boolean }> {
  return fetchApi('/refunds/config', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

// ---- Tags ----

export async function getRefundsTags(): Promise<TransactionTag[]> {
  const result = await fetchApi<{ tags: TransactionTag[] }>('/refunds/tags');
  return result.tags;
}

// ---- Saved Views ----

export async function getRefundsViews(): Promise<RefundsSavedView[]> {
  const result = await fetchApi<{ views: RefundsSavedView[] }>('/refunds/views');
  return result.views;
}

export async function createRefundsView(
  name: string,
  tagIds: string[],
  categoryIds: string[] | null,
  excludeFromAll: boolean
): Promise<RefundsSavedView> {
  return fetchApi<RefundsSavedView>('/refunds/views', {
    method: 'POST',
    body: JSON.stringify({ name, tagIds, categoryIds, excludeFromAll }),
  });
}

export async function updateRefundsView(
  viewId: string,
  updates: Partial<
    Pick<RefundsSavedView, 'name' | 'tagIds' | 'categoryIds' | 'sortOrder' | 'excludeFromAll'>
  >
): Promise<{ success: boolean }> {
  return fetchApi(`/refunds/views/${viewId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteRefundsView(viewId: string): Promise<{ success: boolean }> {
  return fetchApi(`/refunds/views/${viewId}`, {
    method: 'DELETE',
  });
}

export async function reorderRefundsViews(viewIds: string[]): Promise<{ success: boolean }> {
  return fetchApi('/refunds/views/reorder', {
    method: 'POST',
    body: JSON.stringify({ viewIds }),
  });
}

// ---- Transactions ----

export async function getRefundsTransactions(
  tagIds: string[],
  startDate?: string | null,
  endDate?: string | null,
  categoryIds?: string[] | null
): Promise<Transaction[]> {
  const result = await fetchApi<{ transactions: Transaction[] }>('/refunds/transactions', {
    method: 'POST',
    body: JSON.stringify({ tagIds, startDate, endDate, categoryIds }),
  });
  return result.transactions;
}

export interface SearchRefundsResult {
  transactions: Transaction[];
  nextCursor: number | null;
}

export async function searchRefundsTransactions(
  search: string,
  startDate?: string | null,
  endDate?: string | null,
  limit?: number,
  cursor?: number
): Promise<SearchRefundsResult> {
  return fetchApi<SearchRefundsResult>('/refunds/search', {
    method: 'POST',
    body: JSON.stringify({ search: search || undefined, startDate, endDate, limit, cursor }),
  });
}

// ---- Pending Count ----

export async function getRefundsPendingCount(): Promise<{
  count: number;
  viewCounts: Record<string, number>;
}> {
  return fetchApi('/refunds/pending-count');
}

// ---- Matches ----

export async function getRefundsMatches(): Promise<RefundsMatch[]> {
  const result = await fetchApi<{ matches: RefundsMatch[] }>('/refunds/matches');
  return result.matches;
}

export async function createRefundsMatch(
  request: CreateMatchRequest
): Promise<{ success: boolean }> {
  return fetchApi('/refunds/match', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function deleteRefundsMatch(matchId: string): Promise<{ success: boolean }> {
  return fetchApi(`/refunds/match/${matchId}`, {
    method: 'DELETE',
  });
}
