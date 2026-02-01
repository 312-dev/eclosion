/**
 * InlineCategorySelector Component
 *
 * Compact inline category selector for the New Stash form.
 * Allows users to either create a new category in a group or use an existing one.
 */

import { useCallback, useEffect } from 'react';
import { Icons } from '../icons';
import { SearchableSelect } from '../SearchableSelect';
import {
  useCategorySelectorData,
  useInlineCategorySelectorData,
} from './useInlineCategorySelectorData';

export type CategorySelectionMode = 'create_new' | 'use_existing';

export interface CategorySelectionResult {
  mode: CategorySelectionMode;
  /** For create_new: the group ID */
  categoryGroupId?: string;
  /** For create_new: the group name */
  categoryGroupName?: string;
  /** For use_existing: the category ID */
  categoryId?: string;
  /** For use_existing: the category name */
  categoryName?: string;
  /** For use_flexible_group: the group ID */
  flexibleGroupId?: string;
  /** For use_flexible_group: the group name */
  flexibleGroupName?: string;
}

interface InlineCategorySelectorProps {
  /** Current selection */
  readonly value: CategorySelectionResult;
  /** Called when selection changes */
  readonly onChange: (selection: CategorySelectionResult) => void;
  /** Default category group ID from config */
  readonly defaultCategoryGroupId?: string | undefined;
}

export function InlineCategorySelector({
  value,
  onChange,
  defaultCategoryGroupId,
}: InlineCategorySelectorProps) {
  const {
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
  } = useCategorySelectorData();

  const { existingValue, handleExistingChange } = useInlineCategorySelectorData(
    value,
    onChange,
    unmappedCategories,
    flexibleGroups
  );

  // Set default group on mount if provided and no selection
  useEffect(() => {
    if (defaultCategoryGroupId && !value.categoryGroupId && value.mode === 'create_new') {
      const group = categoryGroups?.find((g) => g.id === defaultCategoryGroupId);
      if (group) {
        onChange({
          mode: 'create_new',
          categoryGroupId: defaultCategoryGroupId,
          categoryGroupName: group.name,
        });
      }
    }
  }, [defaultCategoryGroupId, categoryGroups, value.categoryGroupId, value.mode, onChange]);

  // Refresh flexible groups on mount
  useEffect(() => {
    refreshFlexibleGroups();
  }, [refreshFlexibleGroups]);

  const handleGroupChange = useCallback(
    (groupId: string) => {
      const group = categoryGroups?.find((g) => g.id === groupId);
      onChange({
        mode: 'create_new',
        categoryGroupId: groupId,
        categoryGroupName: group?.name || '',
      });
    },
    [categoryGroups, onChange]
  );

  const handleModeSwitch = useCallback(
    (mode: CategorySelectionMode) => {
      if (mode === 'create_new') {
        const group = defaultCategoryGroupId
          ? categoryGroups?.find((g) => g.id === defaultCategoryGroupId)
          : undefined;
        onChange({
          mode: 'create_new',
          categoryGroupId: group?.id || '',
          categoryGroupName: group?.name || '',
        });
      } else {
        onChange({ mode: 'use_existing' });
      }
    },
    [categoryGroups, defaultCategoryGroupId, onChange]
  );

  const isCreateNew = value.mode === 'create_new';
  const isUseExisting = !isCreateNew;

  return (
    <div
      className="rounded-lg p-3"
      style={{
        backgroundColor: 'var(--monarch-bg-page)',
        border: '1px solid var(--monarch-border)',
      }}
    >
      {/* Mode tabs */}
      <div
        className="flex gap-1 mb-3 p-1 rounded-lg"
        style={{
          backgroundColor: 'var(--monarch-bg-hover)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <button
          type="button"
          onClick={() => handleModeSwitch('create_new')}
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
            isCreateNew ? 'shadow-sm' : 'hover:bg-monarch-bg-card/50'
          }`}
          style={
            isCreateNew
              ? { backgroundColor: 'var(--monarch-bg-card)', color: 'var(--monarch-text-dark)' }
              : { color: 'var(--monarch-text-muted)' }
          }
        >
          Create New
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('use_existing')}
          className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
            isUseExisting ? 'shadow-sm' : 'hover:bg-monarch-bg-card/50'
          }`}
          style={
            isUseExisting
              ? { backgroundColor: 'var(--monarch-bg-card)', color: 'var(--monarch-text-dark)' }
              : { color: 'var(--monarch-text-muted)' }
          }
        >
          Use Existing
        </button>
      </div>

      {isCreateNew ? (
        /* Create New Mode */
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchableSelect
              value={value.categoryGroupId || ''}
              onChange={handleGroupChange}
              options={groupOptions}
              placeholder="Select a category group"
              searchPlaceholder="Search groups..."
              loading={groupsLoading}
              aria-label="Category group"
              insideModal
            />
          </div>
          <button
            type="button"
            onClick={handleRefreshGroups}
            disabled={isRefreshing}
            className="p-2 rounded-md hover:bg-monarch-bg-hover"
            style={{ border: '1px solid var(--monarch-border)' }}
            aria-label="Refresh category groups"
          >
            <Icons.Refresh
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </button>
        </div>
      ) : (
        /* Use Existing Mode */
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchableSelect
              value={existingValue}
              onChange={handleExistingChange}
              groups={existingGroups}
              placeholder="Select an existing category"
              searchPlaceholder="Search categories..."
              loading={categoriesLoading || flexibleGroupsLoading}
              aria-label="Existing category"
              insideModal
            />
          </div>
          <button
            type="button"
            onClick={handleRefreshGroups}
            disabled={isRefreshing}
            className="p-2 rounded-md hover:bg-monarch-bg-hover"
            style={{ border: '1px solid var(--monarch-border)' }}
            aria-label="Refresh categories"
          >
            <Icons.Refresh
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ color: 'var(--monarch-text-muted)' }}
            />
          </button>
        </div>
      )}
    </div>
  );
}
