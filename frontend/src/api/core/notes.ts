/**
 * Notes API Functions
 *
 * Monthly notes for categories and groups.
 */

import type {
  MonthKey,
  Note,
  GeneralMonthNote,
  ArchivedNote,
  SaveCategoryNoteRequest,
  NoteVersion,
} from '../../types/notes';
import { fetchApi } from './fetchApi';

// ============================================================================
// Types for API Responses
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

interface ArchivedNotesResponse {
  archived_notes: ArchivedNote[];
}

interface NoteHistoryResponse {
  history: NoteVersion[];
}

interface SyncCategoriesResponse {
  success: boolean;
  archived_count: number;
}

// ============================================================================
// Month Notes
// ============================================================================

/**
 * Get all notes for a specific month with inheritance resolved.
 */
export async function getMonthNotes(monthKey: MonthKey): Promise<MonthNotesResponse> {
  return fetchApi<MonthNotesResponse>(`/notes/month/${monthKey}`);
}

// ============================================================================
// Category/Group Notes
// ============================================================================

/**
 * Save or update a note for a category or group.
 */
export async function saveCategoryNote(params: SaveCategoryNoteRequest): Promise<SaveNoteResponse> {
  return fetchApi<SaveNoteResponse>('/notes/category', {
    method: 'POST',
    body: JSON.stringify({
      category_type: params.categoryType,
      category_id: params.categoryId,
      category_name: params.categoryName,
      group_id: params.groupId,
      group_name: params.groupName,
      month_key: params.monthKey,
      content: params.content,
    }),
  });
}

/**
 * Delete a category note.
 */
export async function deleteCategoryNote(noteId: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/notes/category/${noteId}`, {
    method: 'DELETE',
  });
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
  return fetchApi<{ note: GeneralMonthNote | null }>(`/notes/general/${monthKey}`);
}

/**
 * Save or update a general note for a month.
 */
export async function saveGeneralNote(
  monthKey: MonthKey,
  content: string
): Promise<SaveGeneralNoteResponse> {
  return fetchApi<SaveGeneralNoteResponse>('/notes/general', {
    method: 'POST',
    body: JSON.stringify({
      month_key: monthKey,
      content,
    }),
  });
}

/**
 * Delete the general note for a month.
 */
export async function deleteGeneralNote(monthKey: MonthKey): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/notes/general/${monthKey}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Archived Notes
// ============================================================================

/**
 * Get all archived notes.
 */
export async function getArchivedNotes(): Promise<ArchivedNote[]> {
  const response = await fetchApi<ArchivedNotesResponse>('/notes/archived');
  return response.archived_notes;
}

/**
 * Permanently delete an archived note.
 */
export async function deleteArchivedNote(noteId: string): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/notes/archived/${noteId}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// Category Sync
// ============================================================================

/**
 * Sync known categories with current Monarch categories.
 * Detects deleted categories and archives their notes.
 */
export async function syncNotesCategories(): Promise<SyncCategoriesResponse> {
  return fetchApi<SyncCategoriesResponse>('/notes/sync-categories', {
    method: 'POST',
  });
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
  const response = await fetchApi<NoteHistoryResponse>(
    `/notes/history/${categoryType}/${categoryId}`
  );
  return response.history;
}
