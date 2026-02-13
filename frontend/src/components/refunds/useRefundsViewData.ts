/** Encapsulates view-related query logic for the Refunds tab. */

import { useMemo } from 'react';
import {
  useRefundsViewsQuery,
  useRefundsTransactionsQuery,
} from '../../api/queries/refundsQueries';
import { useRefundsAllViewsTransactionsQuery } from '../../api/queries/refundsAllViewsQuery';
import type { RefundsSavedView, Transaction, DateRangeFilter } from '../../types/refunds';

export const ALL_VIEW_ID = '__all__';

interface ViewData {
  views: RefundsSavedView[];
  viewsLoading: boolean;
  isAllView: boolean;
  activeView: RefundsSavedView | null;
  effectiveViewId: string | null;
  tagIds: string[];
  viewCategoryIds: string[] | null;
  transactions: Transaction[];
  transactionsLoading: boolean;
}

export function useRefundsViewData(
  activeViewId: string | null,
  dateRange: DateRangeFilter
): ViewData {
  const { data: unsortedViews = [], isLoading: viewsLoading } = useRefundsViewsQuery();
  const views = useMemo(
    () => [...unsortedViews].sort((a, b) => a.sortOrder - b.sortOrder),
    [unsortedViews]
  );
  const isAllView = activeViewId === ALL_VIEW_ID;
  const activeView = useMemo((): RefundsSavedView | null => {
    if (isAllView) return null;
    if (activeViewId) return views.find((v) => v.id === activeViewId) ?? null;
    return views.length > 0 ? (views[0] ?? null) : null;
  }, [views, activeViewId, isAllView]);

  const includedViews = useMemo(() => views.filter((v) => !v.excludeFromAll), [views]);
  const allTagIds = useMemo(
    () => [...new Set(includedViews.flatMap((v) => v.tagIds))],
    [includedViews]
  );
  const allCategoryIds = useMemo(() => {
    const ids = includedViews.flatMap((v) => v.categoryIds ?? []);
    return ids.length > 0 ? [...new Set(ids)] : null;
  }, [includedViews]);
  const effectiveViewId = isAllView ? ALL_VIEW_ID : (activeView?.id ?? null);
  const tagIds = useMemo(
    () => (isAllView ? allTagIds : (activeView?.tagIds ?? [])),
    [isAllView, allTagIds, activeView?.tagIds]
  );
  const viewCategoryIds = isAllView ? allCategoryIds : (activeView?.categoryIds ?? null);

  const singleViewQuery = useRefundsTransactionsQuery(
    isAllView ? [] : (activeView?.tagIds ?? []),
    dateRange.startDate,
    dateRange.endDate,
    isAllView ? null : (activeView?.categoryIds ?? null)
  );
  const allViewQuery = useRefundsAllViewsTransactionsQuery(
    includedViews,
    dateRange.startDate,
    dateRange.endDate,
    isAllView
  );
  const transactions = isAllView ? allViewQuery.data : (singleViewQuery.data ?? []);
  const transactionsLoading = isAllView ? allViewQuery.isLoading : singleViewQuery.isLoading;

  return {
    views,
    viewsLoading,
    isAllView,
    activeView,
    effectiveViewId,
    tagIds,
    viewCategoryIds,
    transactions,
    transactionsLoading,
  };
}
