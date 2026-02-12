/**
 * Demo Refunds API
 *
 * localStorage-based implementation of the Refunds API for demo mode.
 */

import type {
  RefundsConfig,
  RefundsMatch,
  RefundsSavedView,
  Transaction,
  TransactionTag,
  CreateMatchRequest,
} from '../../types/refunds';
import { getDemoState, updateDemoState } from './demoState';
import { DEMO_TAGS, DEMO_TRANSACTIONS, DEMO_REFUND_TRANSACTIONS } from './demoRefundsData';

const DEMO_DELAY = 200;
const simulateDelay = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, DEMO_DELAY));

// ---- Config ----

export async function getRefundsConfig(): Promise<RefundsConfig> {
  await simulateDelay();
  return getDemoState().refundsConfig;
}

export async function updateRefundsConfig(
  updates: Partial<RefundsConfig>
): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    refundsConfig: { ...state.refundsConfig, ...updates },
  }));
  return { success: true };
}

// ---- Tags ----

export async function getRefundsTags(): Promise<TransactionTag[]> {
  await simulateDelay();
  return DEMO_TAGS;
}

// ---- Views ----

export async function getRefundsViews(): Promise<RefundsSavedView[]> {
  await simulateDelay();
  return getDemoState().refundsViews;
}

export async function createRefundsView(
  name: string,
  tagIds: string[],
  categoryIds: string[] | null
): Promise<RefundsSavedView> {
  await simulateDelay();
  const views = getDemoState().refundsViews;
  const newView: RefundsSavedView = {
    id: crypto.randomUUID(),
    name,
    tagIds,
    categoryIds,
    sortOrder: views.length,
  };
  updateDemoState((state) => ({
    ...state,
    refundsViews: [...state.refundsViews, newView],
  }));
  return newView;
}

export async function updateRefundsView(
  viewId: string,
  updates: Partial<Pick<RefundsSavedView, 'name' | 'tagIds' | 'categoryIds' | 'sortOrder'>>
): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    refundsViews: state.refundsViews.map((v) => (v.id === viewId ? { ...v, ...updates } : v)),
  }));
  return { success: true };
}

export async function deleteRefundsView(viewId: string): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    refundsViews: state.refundsViews.filter((v) => v.id !== viewId),
  }));
  return { success: true };
}

export async function reorderRefundsViews(viewIds: string[]): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => ({
    ...state,
    refundsViews: viewIds
      .map((id, i) => {
        const view = state.refundsViews.find((v) => v.id === id);
        return view ? { ...view, sortOrder: i } : null;
      })
      .filter((v): v is RefundsSavedView => v !== null),
  }));
  return { success: true };
}

// ---- Transactions ----

export async function getRefundsTransactions(
  tagIds: string[],
  _startDate?: string | null,
  _endDate?: string | null,
  categoryIds?: string[] | null
): Promise<Transaction[]> {
  await simulateDelay();
  const overrides = getDemoState().refundsTransactionTagOverrides ?? {};

  // Apply tag overrides then filter by requested tag IDs and/or category IDs
  const withOverrides = DEMO_TRANSACTIONS.map((txn) => {
    const overriddenTagIds = overrides[txn.id];
    if (!overriddenTagIds) return txn;
    return { ...txn, tags: DEMO_TAGS.filter((t) => overriddenTagIds.includes(t.id)) };
  });

  const hasTags = tagIds.length > 0;
  const catIdSet = categoryIds != null && categoryIds.length > 0 ? new Set(categoryIds) : null;

  return withOverrides.filter((txn) => {
    if (hasTags && !txn.tags.some((tag) => tagIds.includes(tag.id))) return false;
    if (catIdSet && !(txn.category != null && catIdSet.has(txn.category.id))) return false;
    return true;
  });
}

export async function searchRefundsTransactions(
  search: string,
  _startDate?: string | null,
  _endDate?: string | null,
  limit: number = 10,
  cursor: number = 0
): Promise<{ transactions: Transaction[]; nextCursor: number | null }> {
  await simulateDelay();
  const all = [...DEMO_REFUND_TRANSACTIONS, ...DEMO_TRANSACTIONS].filter((txn) => txn.amount > 0);
  const query = search.toLowerCase().trim();
  const filtered = query
    ? all.filter(
        (txn) =>
          txn.merchant?.name.toLowerCase().includes(query) ||
          txn.originalName.toLowerCase().includes(query) ||
          Math.abs(txn.amount).toFixed(2).includes(query)
      )
    : all;
  const page = filtered.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < filtered.length ? cursor + limit : null;
  return { transactions: page, nextCursor };
}

// ---- Pending Count ----

export async function getRefundsPendingCount(): Promise<{
  count: number;
  viewCounts: Record<string, number>;
}> {
  await simulateDelay();
  const state = getDemoState();
  const views = state.refundsViews;
  if (views.length === 0) return { count: 0, viewCounts: {} };

  const overrides = state.refundsTransactionTagOverrides ?? {};
  const matchedIds = new Set(state.refundsMatches.map((m) => m.originalTransactionId));

  // Apply tag overrides
  const withOverrides = DEMO_TRANSACTIONS.map((txn) => {
    const overriddenTagIds = overrides[txn.id];
    if (!overriddenTagIds) return txn;
    return { ...txn, tags: DEMO_TAGS.filter((t) => overriddenTagIds.includes(t.id)) };
  });

  // Only expenses, unmatched
  const unmatchedExpenses = withOverrides.filter(
    (txn) => txn.amount < 0 && !matchedIds.has(txn.id)
  );

  // Per-view counts
  const viewCounts: Record<string, number> = {};
  const globalIds = new Set<string>();
  for (const view of views) {
    const tagSet = new Set(view.tagIds);
    let count = 0;
    for (const txn of unmatchedExpenses) {
      if (txn.tags.some((tag) => tagSet.has(tag.id))) {
        count++;
        globalIds.add(txn.id);
      }
    }
    viewCounts[view.id] = count;
  }

  return { count: globalIds.size, viewCounts };
}

// ---- Matches ----

export async function getRefundsMatches(): Promise<RefundsMatch[]> {
  await simulateDelay();
  return getDemoState().refundsMatches;
}

export async function createRefundsMatch(
  request: CreateMatchRequest
): Promise<{ success: boolean }> {
  await simulateDelay();
  const newMatch: RefundsMatch = {
    id: crypto.randomUUID(),
    originalTransactionId: request.originalTransactionId,
    refundTransactionId: request.refundTransactionId ?? null,
    refundAmount: request.refundAmount ?? null,
    refundMerchant: request.refundMerchant ?? null,
    refundDate: request.refundDate ?? null,
    refundAccount: request.refundAccount ?? null,
    skipped: request.skipped ?? false,
    expectedRefund: request.expectedRefund ?? false,
    expectedDate: request.expectedDate ?? null,
    expectedAccount: request.expectedAccount ?? null,
    expectedAccountId: request.expectedAccountId ?? null,
    expectedNote: request.expectedNote ?? null,
    expectedAmount: request.expectedAmount ?? null,
    transactionData: request.transactionData ?? null,
  };
  updateDemoState((state) => {
    const updated = { ...state, refundsMatches: [...state.refundsMatches, newMatch] };

    // Simulate view-scoped tag replacement
    if (request.replaceTag && request.originalTagIds) {
      const tagsToRemove = new Set(request.viewTagIds ?? request.originalTagIds);
      const newTagIds = request.originalTagIds.filter((tid) => !tagsToRemove.has(tid));
      const { replacementTagId } = state.refundsConfig;
      if (replacementTagId && !newTagIds.includes(replacementTagId)) {
        newTagIds.push(replacementTagId);
      }
      updated.refundsTransactionTagOverrides = {
        ...state.refundsTransactionTagOverrides,
        [request.originalTransactionId]: newTagIds,
      };
    }

    return updated;
  });
  return { success: true };
}

export async function deleteRefundsMatch(matchId: string): Promise<{ success: boolean }> {
  await simulateDelay();
  updateDemoState((state) => {
    const match = state.refundsMatches.find((m) => m.id === matchId);
    const updated = {
      ...state,
      refundsMatches: state.refundsMatches.filter((m) => m.id !== matchId),
    };

    // Restore original tags by removing the override (not for expected refunds - tags weren't changed)
    if (match && !match.expectedRefund) {
      const overrides = { ...state.refundsTransactionTagOverrides };
      delete overrides[match.originalTransactionId];
      updated.refundsTransactionTagOverrides = overrides;
    }

    return updated;
  });
  return { success: true };
}
