/**
 * useInlineCategorySelectorData Hook
 *
 * Data fetching and transformation logic for the InlineCategorySelector component.
 */

import { useMemo, useCallback, useState } from 'react';
import { decodeHtmlEntities } from '../../utils';
import type { SelectOption, SelectGroup } from '../SearchableSelect';
import {
  useCategoryGroupsDetailed,
  useRefreshCategoryGroups,
  useUnmappedCategoriesList,
  useFlexibleCategoryGroups,
  useRefreshFlexibleCategoryGroups,
} from '../../api/queries';
import type { UnmappedCategory } from '../../types/category';
import type { CategorySelectionResult } from './InlineCategorySelector';

interface FlexibleGroup {
  id: string;
  name: string;
}

export function useInlineCategorySelectorData(
  value: CategorySelectionResult,
  onChange: (selection: CategorySelectionResult) => void,
  unmappedCategories: UnmappedCategory[],
  flexibleGroups: FlexibleGroup[]
) {
  // Get current value for existing category dropdown
  const existingValue = useMemo(() => {
    if (value.flexibleGroupId) return `flex:${value.flexibleGroupId}`;
    if (value.categoryId) return `cat:${value.categoryId}`;
    return '';
  }, [value.flexibleGroupId, value.categoryId]);

  // Handle selection from existing categories dropdown
  const handleExistingChange = useCallback(
    (selectedValue: string) => {
      if (selectedValue.startsWith('flex:')) {
        const groupId = selectedValue.slice(5);
        const group = flexibleGroups.find((g) => g.id === groupId);
        onChange({
          mode: 'use_existing',
          flexibleGroupId: groupId,
          flexibleGroupName: group?.name || '',
        });
      } else if (selectedValue.startsWith('cat:')) {
        const categoryId = selectedValue.slice(4);
        const cat = unmappedCategories.find((c) => c.id === categoryId);
        onChange({
          mode: 'use_existing',
          categoryId,
          categoryName: cat?.name || '',
        });
      }
    },
    [flexibleGroups, unmappedCategories, onChange]
  );

  return { existingValue, handleExistingChange };
}

export function useCategorySelectorData() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data fetching
  const { groups: allCategoryGroups, isLoading: groupsLoading } = useCategoryGroupsDetailed();
  const refreshGroups = useRefreshCategoryGroups();

  // Filter out income groups - stashes are for expense savings
  const categoryGroups = useMemo(
    () => allCategoryGroups.filter((g) => g.type !== 'income'),
    [allCategoryGroups]
  );
  const { categories: unmappedCategories, isLoading: categoriesLoading } =
    useUnmappedCategoriesList();
  const { groups: flexibleGroups, isLoading: flexibleGroupsLoading } = useFlexibleCategoryGroups();
  const refreshFlexibleGroups = useRefreshFlexibleCategoryGroups();

  // Get IDs of flexible groups for filtering
  const flexibleGroupIds = useMemo(
    () => new Set(flexibleGroups.map((g) => g.id)),
    [flexibleGroups]
  );

  // Get IDs of income groups for filtering
  const incomeGroupIds = useMemo(
    () => new Set(allCategoryGroups.filter((g) => g.type === 'income').map((g) => g.id)),
    [allCategoryGroups]
  );

  // Filter categories for "use existing" mode
  // Group categories by their category group (excluding flexible groups and income groups)
  const groupedCategories = useMemo(() => {
    const grouped = unmappedCategories.reduce(
      (acc, cat) => {
        const groupId = cat.group_id || 'uncategorized';
        // Skip categories belonging to flexible groups or income groups
        if (flexibleGroupIds.has(groupId) || incomeGroupIds.has(groupId)) {
          return acc;
        }
        acc[groupId] ??= {
          groupId,
          groupName: cat.group_name || 'Uncategorized',
          groupOrder: cat.group_order,
          categories: [],
        };
        acc[groupId].categories.push(cat);
        return acc;
      },
      {} as Record<
        string,
        { groupId: string; groupName: string; groupOrder: number; categories: UnmappedCategory[] }
      >
    );
    return Object.values(grouped).sort((a, b) => a.groupOrder - b.groupOrder);
  }, [unmappedCategories, flexibleGroupIds, incomeGroupIds]);

  // Build options for category group dropdown (Create New mode)
  const groupOptions: SelectOption[] = useMemo(
    () =>
      (categoryGroups ?? []).map((group) => {
        const isFlexible = flexibleGroupIds.has(group.id);
        const option: SelectOption = {
          value: group.id,
          label: decodeHtmlEntities(group.name),
          disabled: isFlexible,
        };
        if (isFlexible) {
          option.disabledReason = 'Uses flexible rollover. Select in "Use existing" instead.';
        }
        return option;
      }),
    [categoryGroups, flexibleGroupIds]
  );

  // Build grouped options for existing categories dropdown (Use Existing mode)
  const existingGroups: SelectGroup[] = useMemo(() => {
    const groups: SelectGroup[] = [];

    // Add flexible groups first
    if (flexibleGroups.length > 0) {
      groups.push({
        label: 'Rollover Groups',
        options: flexibleGroups.map((group) => ({
          value: `flex:${group.id}`,
          label: `📁 ${decodeHtmlEntities(group.name)}`,
        })),
      });
    }

    // Add individual categories grouped by their category group
    groupedCategories.forEach((group) => {
      groups.push({
        label: decodeHtmlEntities(group.groupName),
        options: group.categories.map((cat) => ({
          value: `cat:${cat.id}`,
          label: cat.icon
            ? `${cat.icon} ${decodeHtmlEntities(cat.name)}`
            : decodeHtmlEntities(cat.name),
        })),
      });
    });

    return groups;
  }, [flexibleGroups, groupedCategories]);

  const handleRefreshGroups = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshGroups();
      await refreshFlexibleGroups();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshGroups, refreshFlexibleGroups]);

  return {
    categoryGroups,
    unmappedCategories,
    flexibleGroups,
    groupsLoading,
    categoriesLoading,
    flexibleGroupsLoading,
    groupOptions,
    existingGroups,
    isRefreshing,
    handleRefreshGroups,
    refreshFlexibleGroups,
  };
}
