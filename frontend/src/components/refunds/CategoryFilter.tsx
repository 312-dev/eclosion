/** Multi-select dropdown for filtering refund transactions by category. */

import { useState, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, Filter, Search, Check } from 'lucide-react';
import { Portal } from '../Portal';
import { useDropdown } from '../../hooks';
import { useCategoriesByGroup } from '../../api/queries/categoryStoreQueries';
import { Z_INDEX, UI } from '../../constants';
import { decodeHtmlEntities } from '../../utils';
import type { Transaction } from '../../types/refunds';

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
}

const UNCATEGORIZED: CategoryOption = {
  id: '__uncategorized__',
  name: 'Uncategorized',
  icon: '❓',
};

interface CategoryFilterProps {
  readonly transactions: Transaction[];
  readonly selectedCategoryIds: string[] | null;
  readonly onChange: (ids: string[] | null) => void;
}

export function CategoryFilter({
  transactions,
  selectedCategoryIds,
  onChange,
}: CategoryFilterProps) {
  const { isOpen, toggle, close, position, triggerRef, dropdownRef } = useDropdown<
    HTMLDivElement,
    HTMLButtonElement
  >({ alignment: 'left' });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: categoryGroups } = useCategoriesByGroup();

  const transactionCategoryInfo = useMemo(() => {
    const ids = new Set<string>();
    const icons = new Map<string, string>();
    let hasUncategorized = false;
    for (const txn of transactions) {
      if (txn.category) {
        ids.add(txn.category.id);
        if (!icons.has(txn.category.id)) icons.set(txn.category.id, txn.category.icon);
      } else {
        hasUncategorized = true;
      }
    }
    return { ids, icons, hasUncategorized };
  }, [transactions]);

  const categories = useMemo(() => {
    const result: CategoryOption[] = [];
    for (const group of categoryGroups) {
      for (const cat of group.categories) {
        if (transactionCategoryInfo.ids.has(cat.id)) {
          result.push({
            id: cat.id,
            name: cat.name,
            icon: cat.icon ?? transactionCategoryInfo.icons.get(cat.id) ?? '',
          });
        }
      }
    }
    if (transactionCategoryInfo.hasUncategorized) result.push(UNCATEGORIZED);
    return result;
  }, [categoryGroups, transactionCategoryInfo]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      setSearchQuery('');
      setActiveIndex(-1);
      setTimeout(() => searchInputRef.current?.focus(), UI.DELAY.FOCUS_AFTER_OPEN);
    }
    toggle();
  }, [isOpen, toggle]);

  const isAllSelected = selectedCategoryIds === null;

  const toggleCategory = useCallback(
    (categoryId: string) => {
      if (isAllSelected) {
        const allOtherIds = categories.filter((c) => c.id !== categoryId).map((c) => c.id);
        onChange(allOtherIds.length === 0 ? null : allOtherIds);
      } else if (selectedCategoryIds.includes(categoryId)) {
        const next = selectedCategoryIds.filter((id) => id !== categoryId);
        onChange(next.length === 0 ? null : next);
      } else {
        const next = [...selectedCategoryIds, categoryId];
        onChange(next.length === categories.length ? null : next);
      }
    },
    [isAllSelected, selectedCategoryIds, categories, onChange]
  );

  const handleSelectAll = useCallback(() => onChange(null), [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const len = filteredCategories.length;
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          triggerRef.current?.focus();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1 < len ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : len - 1));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < len) {
            const cat = filteredCategories[activeIndex];
            if (cat) toggleCategory(cat.id);
          }
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(len - 1);
          break;
      }
    },
    [filteredCategories, activeIndex, close, triggerRef, toggleCategory]
  );

  const displayLabel = useMemo(() => {
    if (isAllSelected) return 'All categories';
    if (selectedCategoryIds.length === 1) {
      const cat = categories.find((c) => c.id === selectedCategoryIds[0]);
      return cat?.name ?? 'All categories';
    }
    return `${selectedCategoryIds.length} categories`;
  }, [isAllSelected, selectedCategoryIds, categories]);

  if (categories.length <= 1) return null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-(--monarch-border) bg-(--monarch-bg-card) hover:border-(--monarch-text-muted) transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filter by category"
      >
        <Filter size={14} className="text-(--monarch-text-muted)" aria-hidden="true" />
        <span className="text-(--monarch-text-dark)">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`text-(--monarch-text-muted) transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-(--z-index-dropdown)"
            onClick={() => close()}
            aria-hidden="true"
          />
          <div
            ref={dropdownRef}
            aria-label="Category filter"
            className="fixed rounded-lg shadow-lg border border-(--monarch-border) bg-(--monarch-bg-card) overflow-hidden z-(--z-index-dropdown)"
            style={{
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              right: position.right,
              minWidth: 240,
              maxWidth: '90vw',
              zIndex: Z_INDEX.DROPDOWN,
            }}
          >
            <div className="p-2 border-b border-(--monarch-border)">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-(--monarch-text-muted)"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search categories..."
                  aria-label="Search categories"
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) placeholder:text-(--monarch-text-muted) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20"
                />
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-(--monarch-border)">
              <span className="text-xs text-(--monarch-text-muted)">
                {isAllSelected
                  ? 'All selected'
                  : `${selectedCategoryIds.length} of ${categories.length}`}
              </span>
              {!isAllSelected && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-(--monarch-orange) hover:underline"
                  aria-label="Select all categories"
                >
                  Select all
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredCategories.length === 0 && (
                <div className="px-3 py-4 text-sm text-center text-(--monarch-text-muted)">
                  No categories found
                </div>
              )}
              {filteredCategories.map((cat) => {
                const flatIndex = filteredCategories.indexOf(cat);
                const isSelected = isAllSelected || selectedCategoryIds?.includes(cat.id) === true;
                const isActive = flatIndex === activeIndex;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleCategory(cat.id)}
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors hover:bg-(--monarch-bg-hover) ${isSelected ? 'bg-(--monarch-orange)/5' : ''} ${isActive ? 'bg-(--monarch-bg-hover)' : ''}`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-(--monarch-orange) border-(--monarch-orange) text-white' : 'border-(--monarch-border)'}`}
                      aria-hidden="true"
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                    <span className="shrink-0" aria-hidden="true">
                      {cat.icon}
                    </span>
                    <span className="truncate text-(--monarch-text-dark)">
                      {decodeHtmlEntities(cat.name)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
