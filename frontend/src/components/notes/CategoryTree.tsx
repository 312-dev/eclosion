/**
 * Category Tree
 *
 * Displays Monarch category groups and categories with their notes.
 * Groups are expandable/collapsible.
 */

import { ChevronDown, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { CategoryGroupRow } from './CategoryGroupRow';
import { CategoryRow } from './CategoryRow';
import type { CategoryGroupWithNotes, MonthKey } from '../../types/notes';

interface CategoryTreeProps {
  /** Category groups with their notes */
  groups: CategoryGroupWithNotes[];
  /** Set of expanded group IDs */
  expandedGroups: Set<string>;
  /** Callback to toggle a group */
  onToggleGroup: (groupId: string) => void;
  /** Callback to expand all groups */
  onExpandAll: () => void;
  /** Callback to collapse all groups */
  onCollapseAll: () => void;
  /** Current month being viewed */
  currentMonth: MonthKey;
}

export function CategoryTree({
  groups,
  expandedGroups,
  onToggleGroup,
  onExpandAll,
  onCollapseAll,
  currentMonth,
}: CategoryTreeProps) {
  const allExpanded = groups.length > 0 && groups.every(g => expandedGroups.has(g.id));
  const allCollapsed = expandedGroups.size === 0;

  if (groups.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}
      >
        <div className="text-lg font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          No categories found
        </div>
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          Connect to Monarch Money to see your categories here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header with expand/collapse controls */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--monarch-text-muted)' }}>
          Category Notes
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onExpandAll}
            disabled={allExpanded}
            className={`p-1.5 rounded hover:bg-[var(--monarch-bg-hover)] transition-colors ${
              allExpanded ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-label="Expand all groups"
            title="Expand all"
          >
            <Maximize2 size={14} />
          </button>
          <button
            type="button"
            onClick={onCollapseAll}
            disabled={allCollapsed}
            className={`p-1.5 rounded hover:bg-[var(--monarch-bg-hover)] transition-colors ${
              allCollapsed ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-label="Collapse all groups"
            title="Collapse all"
          >
            <Minimize2 size={14} />
          </button>
        </div>
      </div>

      {/* Category groups */}
      <div className="space-y-2">
        {groups.map((group, index) => {
          const isExpanded = expandedGroups.has(group.id);

          return (
            <div
              key={group.id}
              className="rounded-xl overflow-hidden list-item-enter"
              style={{
                backgroundColor: 'var(--monarch-bg-card)',
                border: '1px solid var(--monarch-border)',
                animationDelay: `${index * 30}ms`,
              }}
            >
              {/* Group header */}
              <button
                type="button"
                onClick={() => onToggleGroup(group.id)}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[var(--monarch-bg-hover)] transition-colors"
                aria-expanded={isExpanded}
                aria-controls={`group-${group.id}-categories`}
              >
                <span style={{ color: 'var(--monarch-text-muted)' }}>
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
                <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                  {group.name}
                </span>
                <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                  ({group.categories.length})
                </span>
                {group.effectiveNote.note && (
                  <span
                    className="ml-auto px-2 py-0.5 text-xs rounded-full"
                    style={{
                      backgroundColor: group.effectiveNote.isInherited
                        ? 'var(--monarch-bg-hover)'
                        : 'var(--monarch-orange-light)',
                      color: group.effectiveNote.isInherited
                        ? 'var(--monarch-text-muted)'
                        : 'var(--monarch-orange)',
                    }}
                  >
                    {group.effectiveNote.isInherited ? 'inherited' : 'note'}
                  </span>
                )}
              </button>

              {/* Group note row */}
              <CategoryGroupRow
                group={group}
                currentMonth={currentMonth}
                isExpanded={isExpanded}
              />

              {/* Categories */}
              {isExpanded && (
                <div
                  id={`group-${group.id}-categories`}
                  className="border-t"
                  style={{ borderColor: 'var(--monarch-border)' }}
                >
                  {group.categories.map(category => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      groupId={group.id}
                      groupName={group.name}
                      currentMonth={currentMonth}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
