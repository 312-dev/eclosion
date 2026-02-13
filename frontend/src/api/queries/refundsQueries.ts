/**
 * Refunds Queries
 *
 * React Query hooks for the Refunds feature.
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import { useSmartInvalidate } from '../../hooks/useSmartInvalidate';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type {
  RefundsConfig,
  RefundsSavedView,
  RefundsMatch,
  Transaction,
  TransactionTag,
  CreateMatchRequest,
} from '../../types/refunds';

// ---- Config ----

export function useRefundsConfigQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.refundsConfig, isDemo),
    queryFn: async (): Promise<RefundsConfig> => {
      if (isDemo) {
        return await demoApi.getRefundsConfig();
      }
      return await api.getRefundsConfig();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateRefundsConfigMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (updates: Partial<RefundsConfig>) =>
      isDemo ? demoApi.updateRefundsConfig(updates) : api.updateRefundsConfig(updates),
    onSuccess: () => {
      smartInvalidate('updateRefundsConfig');
    },
  });
}

// ---- Tags ----

export function useRefundsTagsQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.refundsTags, isDemo),
    queryFn: async (): Promise<TransactionTag[]> => {
      if (isDemo) {
        return await demoApi.getRefundsTags();
      }
      return await api.getRefundsTags();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---- Saved Views ----

export function useRefundsViewsQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.refundsViews, isDemo),
    queryFn: async (): Promise<RefundsSavedView[]> => {
      if (isDemo) {
        return await demoApi.getRefundsViews();
      }
      return await api.getRefundsViews();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRefundsViewMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: ({
      name,
      tagIds,
      categoryIds,
      excludeFromAll,
    }: {
      name: string;
      tagIds: string[];
      categoryIds: string[] | null;
      excludeFromAll: boolean;
    }) =>
      isDemo
        ? demoApi.createRefundsView(name, tagIds, categoryIds, excludeFromAll)
        : api.createRefundsView(name, tagIds, categoryIds, excludeFromAll),
    onSuccess: () => {
      smartInvalidate('createRefundsView');
    },
  });
}

export function useUpdateRefundsViewMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: ({
      viewId,
      updates,
    }: {
      viewId: string;
      updates: Partial<
        Pick<RefundsSavedView, 'name' | 'tagIds' | 'categoryIds' | 'sortOrder' | 'excludeFromAll'>
      >;
    }) =>
      isDemo ? demoApi.updateRefundsView(viewId, updates) : api.updateRefundsView(viewId, updates),
    onSuccess: () => {
      smartInvalidate('updateRefundsView');
    },
  });
}

export function useReorderRefundsViewsMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (viewIds: string[]) =>
      isDemo ? demoApi.reorderRefundsViews(viewIds) : api.reorderRefundsViews(viewIds),
    onMutate: async (viewIds: string[]) => {
      await queryClient.cancelQueries({
        queryKey: getQueryKey(queryKeys.refundsViews, isDemo),
      });
      const previous = queryClient.getQueryData<RefundsSavedView[]>(
        getQueryKey(queryKeys.refundsViews, isDemo)
      );
      if (previous) {
        const reordered = viewIds
          .map((id, i) => {
            const view = previous.find((v) => v.id === id);
            return view ? { ...view, sortOrder: i } : null;
          })
          .filter((v): v is RefundsSavedView => v !== null);
        queryClient.setQueryData(getQueryKey(queryKeys.refundsViews, isDemo), reordered);
      }
      return { previous };
    },
    onError: (_err, _viewIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getQueryKey(queryKeys.refundsViews, isDemo), context.previous);
      }
    },
    onSettled: () => {
      smartInvalidate('reorderRefundsViews');
    },
  });
}

export function useDeleteRefundsViewMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (viewId: string) =>
      isDemo ? demoApi.deleteRefundsView(viewId) : api.deleteRefundsView(viewId),
    onSuccess: () => {
      smartInvalidate('deleteRefundsView');
    },
  });
}

// ---- Transactions ----

export function useRefundsTransactionsQuery(
  tagIds: string[],
  startDate: string | null,
  endDate: string | null,
  categoryIds?: string[] | null
) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [
      ...getQueryKey(queryKeys.refundsTransactions, isDemo),
      tagIds,
      startDate,
      endDate,
      categoryIds,
    ],
    queryFn: async (): Promise<Transaction[]> => {
      if (isDemo) {
        return await demoApi.getRefundsTransactions(tagIds, startDate, endDate, categoryIds);
      }
      return await api.getRefundsTransactions(tagIds, startDate, endDate, categoryIds);
    },
    enabled: tagIds.length > 0 || (categoryIds != null && categoryIds.length > 0),
    staleTime: 2 * 60 * 1000,
  });
}

const SEARCH_PAGE_SIZE = 10;

interface SearchPage {
  transactions: Transaction[];
  nextCursor: number | null;
}

export function useSearchRefundsTransactionsQuery(
  search: string,
  startDate?: string | null,
  endDate?: string | null
) {
  const isDemo = useDemo();
  return useInfiniteQuery<SearchPage, Error, { pages: SearchPage[] }, unknown[], number>({
    queryKey: [
      ...getQueryKey(queryKeys.refundsTransactions, isDemo),
      'search',
      search,
      startDate,
      endDate,
    ],
    queryFn: async ({ pageParam }): Promise<SearchPage> => {
      if (isDemo) {
        return await demoApi.searchRefundsTransactions(
          search,
          startDate,
          endDate,
          SEARCH_PAGE_SIZE,
          pageParam
        );
      }
      return await api.searchRefundsTransactions(
        search,
        startDate,
        endDate,
        SEARCH_PAGE_SIZE,
        pageParam
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
  });
}

// ---- Pending Count ----

interface PendingCountData {
  count: number;
  viewCounts: Record<string, number>;
}

export function useRefundsPendingCountQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.refundsPendingCount, isDemo),
    queryFn: async (): Promise<PendingCountData> => {
      return isDemo ? await demoApi.getRefundsPendingCount() : await api.getRefundsPendingCount();
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ---- Matches ----

export function useRefundsMatchesQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.refundsMatches, isDemo),
    queryFn: async (): Promise<RefundsMatch[]> => {
      if (isDemo) {
        return await demoApi.getRefundsMatches();
      }
      return await api.getRefundsMatches();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRefundsMatchMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (request: CreateMatchRequest) =>
      isDemo ? demoApi.createRefundsMatch(request) : api.createRefundsMatch(request),
    onSuccess: () => {
      smartInvalidate('createRefundsMatch');
    },
  });
}

export function useDeleteRefundsMatchMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (matchId: string) =>
      isDemo ? demoApi.deleteRefundsMatch(matchId) : api.deleteRefundsMatch(matchId),
    onSuccess: () => {
      smartInvalidate('deleteRefundsMatch');
    },
  });
}
