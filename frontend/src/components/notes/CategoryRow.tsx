/**
 * Category Row
 *
 * Displays a single category with its note.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { NoteDisplay } from './NoteDisplay';
import { NoteEditorModal } from './NoteEditorModal';
import type { CategoryWithNotes, MonthKey } from '../../types/notes';

interface CategoryRowProps {
  /** The category */
  category: CategoryWithNotes;
  /** Parent group ID */
  groupId: string;
  /** Parent group name */
  groupName: string;
  /** Current month being viewed */
  currentMonth: MonthKey;
}

export function CategoryRow({ category, groupId, groupName, currentMonth }: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { effectiveNote } = category;
  const hasNote = effectiveNote.note !== null;

  return (
    <>
      <div
        className="flex items-start gap-3 px-4 py-3 border-t hover:bg-[var(--monarch-bg-hover)] transition-colors"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        {/* Category icon/name */}
        <div className="flex items-center gap-2 min-w-[140px]">
          {category.icon && (
            <span className="text-base" aria-hidden="true">
              {category.icon}
            </span>
          )}
          <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {category.name}
          </span>
        </div>

        {/* Note content or add button */}
        <div className="flex-1">
          {hasNote ? (
            <NoteDisplay
              effectiveNote={effectiveNote}
              currentMonth={currentMonth}
              categoryType="category"
              categoryId={category.id}
              categoryName={category.name}
              groupId={groupId}
              groupName={groupName}
              onEdit={() => setIsEditing(true)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
              style={{ color: 'var(--monarch-text-muted)' }}
              aria-label={`Add note for ${category.name}`}
            >
              <Plus size={14} />
              Add note
            </button>
          )}
        </div>
      </div>

      {/* Editor modal */}
      {isEditing && (
        <NoteEditorModal
          categoryType="category"
          categoryId={category.id}
          categoryName={category.name}
          groupId={groupId}
          groupName={groupName}
          monthKey={currentMonth}
          initialContent={effectiveNote.note?.content ?? ''}
          isInherited={effectiveNote.isInherited}
          sourceMonth={effectiveNote.sourceMonth}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  );
}
