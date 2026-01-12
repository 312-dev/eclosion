/**
 * Category Group Row
 *
 * Displays note content for a category group with inline editing.
 * Auto-saves on blur and with debounce.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, History } from 'lucide-react';
import { NoteEditorMDX } from './NoteEditorMDX';
import { MarkdownRenderer } from './MarkdownRenderer';
import { RevisionHistoryModal } from './RevisionHistoryModal';
import { useSaveCategoryNoteMutation } from '../../api/queries';
import { useCheckboxState } from '../../hooks';
import type { CategoryGroupWithNotes, MonthKey } from '../../types/notes';

/** Debounce delay for auto-save in ms */
const AUTO_SAVE_DELAY = 1000;

interface CategoryGroupRowProps {
  /** The category group */
  group: CategoryGroupWithNotes;
  /** Current month being viewed */
  currentMonth: MonthKey;
}

/**
 * Format month key for display (e.g., "Oct 2024")
 */
function formatSourceMonth(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function CategoryGroupRow({ group, currentMonth }: CategoryGroupRowProps) {
  const { effectiveNote } = group;
  const hasNote = effectiveNote.note !== null;
  const noteContent = effectiveNote.note?.content ?? '';

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(noteContent);
  const [showHistory, setShowHistory] = useState(false);
  const lastSavedRef = useRef(noteContent);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const saveMutation = useSaveCategoryNoteMutation();

  // Checkbox state management
  const { checkboxStates, toggleCheckbox } = useCheckboxState({
    noteId: effectiveNote.note?.id,
    viewingMonth: currentMonth,
    enabled: hasNote,
  });

  // Sync content when note changes externally
  useEffect(() => {
    if (!isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync from props
      setContent(noteContent);
      lastSavedRef.current = noteContent;
    }
  }, [noteContent, isEditing]);

  // Auto-save function
  const saveNote = useCallback(async (newContent: string) => {
    const trimmedContent = newContent.trim();
    if (trimmedContent === lastSavedRef.current.trim()) return;
    if (!trimmedContent) return; // Don't save empty notes

    try {
      await saveMutation.mutateAsync({
        categoryType: 'group',
        categoryId: group.id,
        categoryName: group.name,
        monthKey: currentMonth,
        content: trimmedContent,
      });
      lastSavedRef.current = trimmedContent;
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  }, [saveMutation, group.id, group.name, currentMonth]);

  // Debounced auto-save on content change
  useEffect(() => {
    if (!isEditing) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote(content);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, isEditing, saveNote]);

  // Handle blur - save and exit edit mode
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't exit if focus is still within the container (e.g., toolbar)
    if (containerRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }

    // Save immediately on blur
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveNote(content);
    setIsEditing(false);
  }, [content, saveNote]);

  // Handle click outside - exit edit mode when clicking on non-focusable elements
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveNote(content);
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, content, saveNote]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Handle immediate save (e.g., after math insertion)
  const handleCommit = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveNote(newContent);
  }, [saveNote]);

  // Enter edit mode
  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  // Render note content
  const renderNoteContent = () => {
    if (isEditing) {
      return (
        <NoteEditorMDX
          value={content}
          onChange={handleContentChange}
          onCommit={handleCommit}
          placeholder={`Write a note for ${group.name} group...`}
          autoFocus
          minHeight={80}
        />
      );
    }

    if (hasNote) {
      return (
        <div className="relative group/note">
          {/* Inheritance badge */}
          {effectiveNote.isInherited && effectiveNote.sourceMonth && (
            <div
              className="text-xs mb-1"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              from {formatSourceMonth(effectiveNote.sourceMonth)}
            </div>
          )}
          <MarkdownRenderer
            content={effectiveNote.note!.content}
            checkboxStates={checkboxStates}
            onCheckboxToggle={toggleCheckbox}
            onDoubleClick={handleStartEdit}
          />
          {/* History button - shows on hover */}
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="absolute top-0 right-0 p-1 rounded opacity-0 group-hover/note:opacity-100 hover:bg-[var(--monarch-bg-card)] transition-opacity icon-btn-hover"
            style={{ color: 'var(--monarch-text-muted)' }}
            aria-label="View revision history"
            title="History"
          >
            <History size={14} />
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={handleStartEdit}
        className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity icon-btn-hover"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label={`Add note for ${group.name} group`}
      >
        <Plus size={14} />
        Add group note
      </button>
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        className="px-4 py-3"
        onBlur={handleBlur}
      >
        {/* Inner card for note content */}
        <div
          className="rounded-lg p-3 section-enter"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {renderNoteContent()}
        </div>
      </div>

      {/* Revision history modal */}
      {showHistory && (
        <RevisionHistoryModal
          categoryType="group"
          categoryId={group.id}
          categoryName={group.name}
          currentMonth={currentMonth}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}
