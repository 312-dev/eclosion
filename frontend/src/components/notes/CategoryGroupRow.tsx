/**
 * Category Group Row
 *
 * Displays note content for a category group.
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { NoteDisplay } from './NoteDisplay';
import { NoteEditorModal } from './NoteEditorModal';
import type { CategoryGroupWithNotes, MonthKey } from '../../types/notes';

interface CategoryGroupRowProps {
  /** The category group */
  group: CategoryGroupWithNotes;
  /** Current month being viewed */
  currentMonth: MonthKey;
  /** Whether the group is expanded */
  isExpanded: boolean;
}

export function CategoryGroupRow({ group, currentMonth, isExpanded }: CategoryGroupRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { effectiveNote } = group;
  const hasNote = effectiveNote.note !== null;

  // Only show the group note row when expanded or when there's a note
  if (!isExpanded && !hasNote) {
    return null;
  }

  return (
    <>
      <div
        className="px-4 py-2 border-t"
        style={{
          borderColor: 'var(--monarch-border)',
          backgroundColor: 'var(--monarch-bg-page)',
        }}
      >
        {hasNote ? (
          <NoteDisplay
            effectiveNote={effectiveNote}
            currentMonth={currentMonth}
            categoryType="group"
            categoryId={group.id}
            categoryName={group.name}
            onEdit={() => setIsEditing(true)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-label={`Add note for ${group.name} group`}
          >
            <Plus size={14} />
            Add group note
          </button>
        )}
      </div>

      {/* Editor modal */}
      {isEditing && (
        <NoteEditorModal
          categoryType="group"
          categoryId={group.id}
          categoryName={group.name}
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
