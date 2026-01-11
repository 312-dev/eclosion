/**
 * Demo Notes API
 *
 * LocalStorage-based implementation for the Monthly Notes feature.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type {
  MonthKey,
  Note,
  GeneralMonthNote,
  ArchivedNote,
  SaveCategoryNoteRequest,
  NoteVersion,
} from '../../types/notes';

// ============================================================================
// Types for API Responses (matching core/notes.ts)
// ============================================================================

interface MonthNotesResponse {
  month_key: MonthKey;
  last_updated: string | null;
  effective_notes: Record<
    string,
    {
      note: Note;
      source_month: MonthKey;
      is_inherited: boolean;
    }
  >;
  general_note: GeneralMonthNote | null;
}

interface SaveNoteResponse {
  success: boolean;
  note: Note;
}

interface SaveGeneralNoteResponse {
  success: boolean;
  note: GeneralMonthNote;
}

interface SyncCategoriesResponse {
  success: boolean;
  archived_count: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get effective note for a category/group at a given month (inheritance lookup)
 */
function getEffectiveNote(
  categoryType: 'group' | 'category',
  categoryId: string,
  targetMonth: MonthKey,
  notes: Record<string, Note>
): { note: Note; source_month: MonthKey; is_inherited: boolean } | null {
  // Filter notes for this category/group
  const categoryNotes = Object.values(notes).filter(
    (n) => n.categoryRef.id === categoryId && n.categoryRef.type === categoryType
  );

  // Sort by month descending
  categoryNotes.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  // Find most recent note at or before target month
  for (const note of categoryNotes) {
    if (note.monthKey <= targetMonth) {
      return {
        note,
        source_month: note.monthKey,
        is_inherited: note.monthKey !== targetMonth,
      };
    }
  }

  return null;
}

// ============================================================================
// Month Notes
// ============================================================================

/**
 * Get all notes for a specific month with inheritance resolved.
 */
export async function getMonthNotes(monthKey: MonthKey): Promise<MonthNotesResponse> {
  await simulateDelay(100);

  const state = getDemoState();
  const notes = state.notes;

  // Get all unique category/group references from notes
  const categoryRefs = new Set<string>();
  for (const note of Object.values(notes.notes)) {
    categoryRefs.add(`${note.categoryRef.type}:${note.categoryRef.id}`);
  }

  // Get effective note for each
  const effectiveNotes: MonthNotesResponse['effective_notes'] = {};
  for (const ref of categoryRefs) {
    const [catType, catId] = ref.split(':') as ['group' | 'category', string];
    const effective = getEffectiveNote(catType, catId, monthKey, notes.notes);
    if (effective) {
      effectiveNotes[ref] = effective;
    }
  }

  return {
    month_key: monthKey,
    last_updated: notes.monthLastUpdated[monthKey] ?? null,
    effective_notes: effectiveNotes,
    general_note: notes.generalNotes[monthKey] ?? null,
  };
}

// ============================================================================
// Category/Group Notes
// ============================================================================

/**
 * Save or update a note for a category or group.
 */
export async function saveCategoryNote(
  params: SaveCategoryNoteRequest
): Promise<SaveNoteResponse> {
  await simulateDelay(150);

  const now = new Date().toISOString();
  let savedNote: Note | null = null;

  updateDemoState((state) => {
    // Check if note already exists for this category/group and month
    let existingNoteId: string | null = null;
    for (const [noteId, note] of Object.entries(state.notes.notes)) {
      if (
        note.categoryRef.id === params.categoryId &&
        note.categoryRef.type === params.categoryType &&
        note.monthKey === params.monthKey
      ) {
        existingNoteId = noteId;
        break;
      }
    }

    if (existingNoteId) {
      // Update existing note
      state.notes.notes[existingNoteId] = {
        ...state.notes.notes[existingNoteId],
        content: params.content,
        updatedAt: now,
        categoryRef: {
          ...state.notes.notes[existingNoteId].categoryRef,
          name: params.categoryName,
          groupId: params.groupId,
          groupName: params.groupName,
        },
      };
      savedNote = state.notes.notes[existingNoteId];
    } else {
      // Create new note
      const noteId = generateId();
      const newNote: Note = {
        id: noteId,
        categoryRef: {
          type: params.categoryType,
          id: params.categoryId,
          name: params.categoryName,
          groupId: params.groupId,
          groupName: params.groupName,
        },
        monthKey: params.monthKey,
        content: params.content,
        createdAt: now,
        updatedAt: now,
      };
      state.notes.notes[noteId] = newNote;
      savedNote = newNote;
    }

    // Update known categories
    state.notes.knownCategoryIds[params.categoryId] = params.categoryName;

    // Update month timestamp
    state.notes.monthLastUpdated[params.monthKey] = now;

    return state;
  });

  return {
    success: true,
    note: savedNote!,
  };
}

/**
 * Delete a category note.
 */
export async function deleteCategoryNote(noteId: string): Promise<{ success: boolean }> {
  await simulateDelay(100);

  let found = false;

  updateDemoState((state) => {
    if (state.notes.notes[noteId]) {
      const monthKey = state.notes.notes[noteId].monthKey;
      delete state.notes.notes[noteId];
      state.notes.monthLastUpdated[monthKey] = new Date().toISOString();
      found = true;
    }
    return state;
  });

  return { success: found };
}

// ============================================================================
// General Month Notes
// ============================================================================

/**
 * Get the general note for a specific month.
 */
export async function getGeneralNote(
  monthKey: MonthKey
): Promise<{ note: GeneralMonthNote | null }> {
  await simulateDelay(50);

  const state = getDemoState();
  return { note: state.notes.generalNotes[monthKey] ?? null };
}

/**
 * Save or update a general note for a month.
 */
export async function saveGeneralNote(
  monthKey: MonthKey,
  content: string
): Promise<SaveGeneralNoteResponse> {
  await simulateDelay(150);

  const now = new Date().toISOString();
  let savedNote: GeneralMonthNote | null = null;

  updateDemoState((state) => {
    if (state.notes.generalNotes[monthKey]) {
      // Update existing
      state.notes.generalNotes[monthKey] = {
        ...state.notes.generalNotes[monthKey],
        content,
        updatedAt: now,
      };
      savedNote = state.notes.generalNotes[monthKey];
    } else {
      // Create new
      const newNote: GeneralMonthNote = {
        id: generateId(),
        monthKey,
        content,
        createdAt: now,
        updatedAt: now,
      };
      state.notes.generalNotes[monthKey] = newNote;
      savedNote = newNote;
    }

    state.notes.monthLastUpdated[monthKey] = now;
    return state;
  });

  return {
    success: true,
    note: savedNote!,
  };
}

/**
 * Delete the general note for a month.
 */
export async function deleteGeneralNote(monthKey: MonthKey): Promise<{ success: boolean }> {
  await simulateDelay(100);

  let found = false;

  updateDemoState((state) => {
    if (state.notes.generalNotes[monthKey]) {
      delete state.notes.generalNotes[monthKey];
      state.notes.monthLastUpdated[monthKey] = new Date().toISOString();
      found = true;
    }
    return state;
  });

  return { success: found };
}

// ============================================================================
// Archived Notes
// ============================================================================

/**
 * Get all archived notes.
 */
export async function getArchivedNotes(): Promise<ArchivedNote[]> {
  await simulateDelay(50);

  const state = getDemoState();
  return state.notes.archivedNotes;
}

/**
 * Permanently delete an archived note.
 */
export async function deleteArchivedNote(noteId: string): Promise<{ success: boolean }> {
  await simulateDelay(100);

  let found = false;

  updateDemoState((state) => {
    const index = state.notes.archivedNotes.findIndex((n) => n.id === noteId);
    if (index !== -1) {
      state.notes.archivedNotes.splice(index, 1);
      found = true;
    }
    return state;
  });

  return { success: found };
}

// ============================================================================
// Category Sync
// ============================================================================

/**
 * Sync known categories with current categories.
 * In demo mode, this doesn't do much since we don't delete categories.
 */
export async function syncNotesCategories(): Promise<SyncCategoriesResponse> {
  await simulateDelay(100);

  // In demo mode, we don't actually have category deletion,
  // so just return success with 0 archived
  return {
    success: true,
    archived_count: 0,
  };
}

// ============================================================================
// Revision History
// ============================================================================

/**
 * Get revision history for a category or group's notes.
 */
export async function getNoteHistory(
  categoryType: 'group' | 'category',
  categoryId: string
): Promise<NoteVersion[]> {
  await simulateDelay(100);

  const state = getDemoState();

  // Filter notes for this category/group
  const categoryNotes = Object.values(state.notes.notes).filter(
    (n) => n.categoryRef.id === categoryId && n.categoryRef.type === categoryType
  );

  // Sort by month ascending
  categoryNotes.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  // Convert to version history
  return categoryNotes.map((note) => ({
    monthKey: note.monthKey,
    content: note.content,
    contentPreview: note.content.length > 100 ? note.content.slice(0, 100) + '...' : note.content,
    isCurrent: false, // Will be set by the caller based on current month
    createdAt: note.createdAt,
  }));
}
