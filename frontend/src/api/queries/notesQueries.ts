/**
 * Notes Queries
 *
 * React Query hooks for monthly notes feature.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { MonthKey, SaveCategoryNoteRequest } from '../../types/notes';

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all notes for a specific month with inheritance resolved.
 */
export function useMonthNotesQuery(monthKey: MonthKey) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.monthNotes, isDemo), monthKey],
    queryFn: () => (isDemo ? demoApi.getMonthNotes(monthKey) : api.getMonthNotes(monthKey)),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get all archived notes.
 */
export function useArchivedNotesQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.archivedNotes, isDemo),
    queryFn: isDemo ? demoApi.getArchivedNotes : api.getArchivedNotes,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get revision history for a category or group.
 */
export function useNoteHistoryQuery(
  categoryType: 'group' | 'category',
  categoryId: string,
  options?: { enabled?: boolean }
) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.noteHistory, isDemo), categoryType, categoryId],
    queryFn: () =>
      isDemo
        ? demoApi.getNoteHistory(categoryType, categoryId)
        : api.getNoteHistory(categoryType, categoryId),
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Save or update a category/group note.
 */
export function useSaveCategoryNoteMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SaveCategoryNoteRequest) =>
      isDemo ? demoApi.saveCategoryNote(params) : api.saveCategoryNote(params),
    onSuccess: (_data, variables) => {
      // Invalidate the month notes for this month and all future months
      // Since notes inherit forward, we need to invalidate all months >= this one
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.monthNotes, isDemo),
      });
      // Also invalidate history for this category
      queryClient.invalidateQueries({
        queryKey: [
          ...getQueryKey(queryKeys.noteHistory, isDemo),
          variables.categoryType,
          variables.categoryId,
        ],
      });
    },
  });
}

/**
 * Delete a category/group note.
 */
export function useDeleteCategoryNoteMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) =>
      isDemo ? demoApi.deleteCategoryNote(noteId) : api.deleteCategoryNote(noteId),
    onSuccess: () => {
      // Invalidate all month notes since we don't know which months are affected
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.monthNotes, isDemo),
      });
      // Invalidate all history queries
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.noteHistory, isDemo),
      });
    },
  });
}

/**
 * Save or update a general month note.
 */
export function useSaveGeneralNoteMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ monthKey, content }: { monthKey: MonthKey; content: string }) =>
      isDemo ? demoApi.saveGeneralNote(monthKey, content) : api.saveGeneralNote(monthKey, content),
    onSuccess: (_data, variables) => {
      // Invalidate the specific month
      queryClient.invalidateQueries({
        queryKey: [...getQueryKey(queryKeys.monthNotes, isDemo), variables.monthKey],
      });
    },
  });
}

/**
 * Delete a general month note.
 */
export function useDeleteGeneralNoteMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (monthKey: MonthKey) =>
      isDemo ? demoApi.deleteGeneralNote(monthKey) : api.deleteGeneralNote(monthKey),
    onSuccess: (_data, monthKey) => {
      queryClient.invalidateQueries({
        queryKey: [...getQueryKey(queryKeys.monthNotes, isDemo), monthKey],
      });
    },
  });
}

/**
 * Delete an archived note.
 */
export function useDeleteArchivedNoteMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) =>
      isDemo ? demoApi.deleteArchivedNote(noteId) : api.deleteArchivedNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.archivedNotes, isDemo),
      });
    },
  });
}

/**
 * Sync categories and archive notes for deleted categories.
 */
export function useSyncNotesCategoriesMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => (isDemo ? demoApi.syncNotesCategories() : api.syncNotesCategories()),
    onSuccess: () => {
      // Invalidate both month notes and archived notes
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.monthNotes, isDemo),
      });
      queryClient.invalidateQueries({
        queryKey: getQueryKey(queryKeys.archivedNotes, isDemo),
      });
    },
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Helper to invalidate all notes-related queries.
 */
export function useInvalidateNotes() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.monthNotes, isDemo),
    });
    queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.archivedNotes, isDemo),
    });
    queryClient.invalidateQueries({
      queryKey: getQueryKey(queryKeys.noteHistory, isDemo),
    });
  };
}
