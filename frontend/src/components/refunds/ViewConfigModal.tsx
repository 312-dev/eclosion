/**
 * ViewConfigModal
 *
 * Modal for creating or editing a saved view.
 * Allows naming the view, selecting tags, and optionally filtering by categories.
 * At least one tag or category must be selected.
 */

import { useState, useMemo, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ModalFooter } from '../ui/ModalButtons';
import { useCategoriesByGroup } from '../../api/queries/categoryStoreQueries';
import { TagSection, CategorySection } from './ViewConfigSections';
import type { TransactionTag, RefundablesSavedView } from '../../types/refundables';

interface ViewConfigModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (name: string, tagIds: string[], categoryIds: string[] | null) => void;
  readonly tags: TransactionTag[];
  readonly tagsLoading: boolean;
  readonly saving: boolean;
  readonly existingView?: RefundablesSavedView | null;
  readonly onDelete?: () => void;
}

export function ViewConfigModal({
  isOpen,
  onClose,
  onSave,
  tags,
  tagsLoading,
  saving,
  existingView = null,
  onDelete,
}: ViewConfigModalProps) {
  const [name, setName] = useState(existingView?.name ?? '');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(existingView?.tagIds ?? [])
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string> | null>(
    existingView?.categoryIds ? new Set(existingView.categoryIds) : null
  );
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [tagsExpanded, setTagsExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(
    existingView?.categoryIds != null && existingView.categoryIds.length > 0
  );

  const { data: categoryGroups } = useCategoriesByGroup();
  const isEditing = existingView != null;
  const title = isEditing ? 'Edit View' : 'Create Saved View';

  const filteredTags = useMemo(() => {
    if (!tagSearchQuery) return tags;
    const q = tagSearchQuery.toLowerCase();
    return tags.filter((tag) => tag.name.toLowerCase().includes(q));
  }, [tags, tagSearchQuery]);

  const allCategoriesFlat = useMemo(
    () => categoryGroups.flatMap((g) => g.categories),
    [categoryGroups]
  );

  const filteredCategoryGroups = useMemo(() => {
    if (!categorySearchQuery) return categoryGroups;
    const q = categorySearchQuery.toLowerCase();
    return categoryGroups
      .map((g) => ({
        ...g,
        categories: g.categories.filter(
          (c) => c.name.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.categories.length > 0);
  }, [categoryGroups, categorySearchQuery]);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      if (prev === null) return new Set([categoryId]);
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
        return next.size === 0 ? null : next;
      }
      next.add(categoryId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedCategoryIds(new Set(allCategoriesFlat.map((c) => c.id)));
  }, [allCategoriesFlat]);

  const handleDeselectAll = useCallback(() => {
    setSelectedCategoryIds(null);
  }, []);

  const hasTagsOrCategories =
    selectedTagIds.size > 0 || (selectedCategoryIds !== null && selectedCategoryIds.size > 0);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName || !hasTagsOrCategories) return;
    onSave(
      trimmedName,
      Array.from(selectedTagIds),
      selectedCategoryIds ? Array.from(selectedCategoryIds) : null
    );
  }, [name, selectedTagIds, selectedCategoryIds, hasTagsOrCategories, onSave]);

  const canSave = name.trim().length > 0 && hasTagsOrCategories && !saving;
  const tagSummary = selectedTagIds.size > 0 ? `${selectedTagIds.size} selected` : 'None';
  const categorySummary =
    selectedCategoryIds === null ? 'All' : `${selectedCategoryIds.size} selected`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <div className="flex items-center w-full">
          {isEditing && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center gap-1.5 text-sm text-(--monarch-error) hover:text-(--monarch-error)/80 transition-colors cursor-pointer mr-auto"
              aria-label="Delete this view"
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>Delete</span>
            </button>
          )}
          <ModalFooter
            onCancel={onClose}
            onSubmit={handleSave}
            submitLabel={isEditing ? 'Save Changes' : 'Create View'}
            isDisabled={!canSave}
            isSubmitting={saving}
          />
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label
            htmlFor="view-name"
            className="block text-sm font-medium text-(--monarch-text-dark) mb-1"
          >
            Name
          </label>
          <input
            id="view-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Medical Claims"
            maxLength={50}
            className="w-full px-3 py-2 text-sm rounded-lg border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) placeholder:text-(--monarch-text-muted) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20"
            autoFocus
          />
        </div>

        {!hasTagsOrCategories && name.trim().length > 0 && (
          <p className="text-xs text-(--monarch-text-muted)">
            Select at least one tag or category.
          </p>
        )}

        <TagSection
          filteredTags={filteredTags}
          tagsLoading={tagsLoading}
          selectedTagIds={selectedTagIds}
          tagSearchQuery={tagSearchQuery}
          onSearchChange={setTagSearchQuery}
          onToggle={toggleTag}
          expanded={tagsExpanded}
          onExpandToggle={() => setTagsExpanded((prev) => !prev)}
          summary={tagSummary}
        />

        {allCategoriesFlat.length > 0 && (
          <CategorySection
            filteredGroups={filteredCategoryGroups}
            selectedCategoryIds={selectedCategoryIds}
            categorySearchQuery={categorySearchQuery}
            onSearchChange={setCategorySearchQuery}
            onToggle={toggleCategory}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            expanded={categoriesExpanded}
            onExpandToggle={() => setCategoriesExpanded((prev) => !prev)}
            summary={categorySummary}
          />
        )}
      </div>
    </Modal>
  );
}
