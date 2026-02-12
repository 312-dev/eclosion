/**
 * Tag and Category selection sections for the ViewConfigModal.
 * Extracted to keep ViewConfigModal under the 300-line limit.
 */

import { Search, Check, ChevronDown } from 'lucide-react';
import { decodeHtmlEntities } from '../../utils';
import type { TransactionTag } from '../../types/refunds';

interface CategoryInfo {
  id: string;
  name: string;
  icon?: string;
}

interface CategoryGroupInfo {
  id: string;
  name: string;
  categories: CategoryInfo[];
}

interface TagSectionProps {
  readonly filteredTags: TransactionTag[];
  readonly tagsLoading: boolean;
  readonly selectedTagIds: Set<string>;
  readonly tagSearchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly onToggle: (tagId: string) => void;
  readonly expanded: boolean;
  readonly onExpandToggle: () => void;
  readonly summary: string;
}

export function TagSection({
  filteredTags,
  tagsLoading,
  selectedTagIds,
  tagSearchQuery,
  onSearchChange,
  onToggle,
  expanded,
  onExpandToggle,
  summary,
}: TagSectionProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-(--monarch-border) overflow-hidden">
      <button
        type="button"
        onClick={onExpandToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-(--monarch-bg-hover) transition-colors"
        aria-expanded={expanded}
      >
        <span className="text-sm font-medium text-(--monarch-text-dark)">Tags</span>
        <span className="flex items-center gap-2">
          <span
            className={`text-xs ${selectedTagIds.size > 0 ? 'text-(--monarch-orange)' : 'text-(--monarch-text-muted)'}`}
          >
            {summary}
          </span>
          <ChevronDown
            size={14}
            className={`text-(--monarch-text-muted) transition-transform transition-fast ${expanded ? 'rotate-0' : '-rotate-90'}`}
          />
        </span>
      </button>

      {expanded && (
        <div className="animate-expand border-t border-(--monarch-border)">
          <div className="relative px-3 pt-2 pb-1">
            <Search
              size={14}
              className="absolute left-6 top-1/2 -translate-y-[30%] text-(--monarch-text-muted)"
              aria-hidden="true"
            />
            <input
              type="text"
              value={tagSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tags..."
              aria-label="Search tags"
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) placeholder:text-(--monarch-text-muted) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20"
            />
          </div>

          <div className="max-h-40 overflow-y-auto" aria-label="Available tags">
            {tagsLoading && (
              <div className="px-3 py-3 text-sm text-center text-(--monarch-text-muted)">
                Loading tags...
              </div>
            )}
            {!tagsLoading && filteredTags.length === 0 && (
              <div className="px-3 py-3 text-sm text-center text-(--monarch-text-muted)">
                {tagSearchQuery ? 'No tags found' : 'No tags available'}
              </div>
            )}
            {!tagsLoading &&
              filteredTags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onToggle(tag.id)}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors hover:bg-(--monarch-bg-hover) ${
                      isSelected ? 'bg-(--monarch-orange)/10' : ''
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-(--monarch-orange) border-(--monarch-orange) text-white'
                          : 'border-(--monarch-border)'
                      }`}
                    >
                      {isSelected && <Check size={12} />}
                    </div>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden="true"
                    />
                    <span className="text-(--monarch-text-dark)">{tag.name}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

interface CategorySectionProps {
  readonly filteredGroups: CategoryGroupInfo[];
  readonly selectedCategoryIds: Set<string> | null;
  readonly categorySearchQuery: string;
  readonly onSearchChange: (q: string) => void;
  readonly onToggle: (categoryId: string) => void;
  readonly onSelectAll: () => void;
  readonly onDeselectAll: () => void;
  readonly expanded: boolean;
  readonly onExpandToggle: () => void;
  readonly summary: string;
}

export function CategorySection({
  filteredGroups,
  selectedCategoryIds,
  categorySearchQuery,
  onSearchChange,
  onToggle,
  onSelectAll,
  onDeselectAll,
  expanded,
  onExpandToggle,
  summary,
}: CategorySectionProps): React.JSX.Element {
  return (
    <div className="rounded-lg border border-(--monarch-border) overflow-hidden">
      <button
        type="button"
        onClick={onExpandToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-(--monarch-bg-hover) transition-colors"
        aria-expanded={expanded}
      >
        <span className="text-sm font-medium text-(--monarch-text-dark)">Categories</span>
        <span className="flex items-center gap-2">
          <span
            className={`text-xs ${selectedCategoryIds === null ? 'text-(--monarch-text-muted)' : 'text-(--monarch-orange)'}`}
          >
            {summary}
          </span>
          <ChevronDown
            size={14}
            className={`text-(--monarch-text-muted) transition-transform transition-fast ${expanded ? 'rotate-0' : '-rotate-90'}`}
          />
        </span>
      </button>

      {expanded && (
        <div className="animate-expand border-t border-(--monarch-border)">
          <div className="px-3 pt-2 pb-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-(--monarch-text-muted)"
                aria-hidden="true"
              />
              <input
                type="text"
                value={categorySearchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search categories..."
                aria-label="Search categories"
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) placeholder:text-(--monarch-text-muted) focus:outline-none focus:border-(--monarch-orange) focus:ring-1 focus:ring-(--monarch-orange)/20"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs shrink-0">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-(--monarch-orange) hover:underline"
              >
                All
              </button>
              <span className="text-(--monarch-text-muted)" aria-hidden="true">
                &middot;
              </span>
              <button
                type="button"
                onClick={onDeselectAll}
                className="text-(--monarch-orange) hover:underline"
              >
                None
              </button>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto" aria-label="Available categories">
            {filteredGroups.map((group, groupIdx) => (
              <div key={group.id}>
                <div
                  className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-(--monarch-text-muted)"
                  style={
                    groupIdx > 0 ? { borderTop: '1px solid var(--monarch-border)' } : undefined
                  }
                >
                  {decodeHtmlEntities(group.name)}
                </div>
                {group.categories.map((cat) => {
                  const isSelected =
                    selectedCategoryIds !== null && selectedCategoryIds.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onToggle(cat.id)}
                      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors hover:bg-(--monarch-bg-hover) ${
                        isSelected ? 'bg-(--monarch-orange)/10' : ''
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-(--monarch-orange) border-(--monarch-orange) text-white'
                            : 'border-(--monarch-border)'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                      </div>
                      {cat.icon && (
                        <span className="shrink-0" aria-hidden="true">
                          {cat.icon}
                        </span>
                      )}
                      <span className="text-(--monarch-text-dark)">
                        {decodeHtmlEntities(cat.name)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
