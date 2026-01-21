/**
 * Stash Bookmark Sync Hook
 *
 * Handles browser bookmark synchronization for the stash feature.
 */

import { useState, useCallback } from 'react';
import { useBookmarks } from './useBookmarks';
import { useImportBookmarksMutation } from '../api/queries';
import { useToast } from '../context/ToastContext';
import { handleApiError } from '../utils';
import { collectBookmarksFromFolder } from '../components/stash';
import type { BrowserType } from '../types';

interface UseStashSyncOptions {
  selectedBrowser: BrowserType | null;
  selectedFolderIds: string[] | null;
  isBrowserConfigured: boolean;
  onShowSetupWizard: () => void;
}

export function useStashSync({
  selectedBrowser,
  selectedFolderIds,
  isBrowserConfigured,
  onShowSetupWizard,
}: UseStashSyncOptions) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { getBookmarkTree } = useBookmarks();
  const importMutation = useImportBookmarksMutation();
  const toast = useToast();

  const syncBookmarks = useCallback(async () => {
    if (!isBrowserConfigured) {
      onShowSetupWizard();
      return;
    }

    if (!selectedBrowser || !selectedFolderIds?.length) return;

    setIsSyncing(true);
    try {
      const tree = await getBookmarkTree(selectedBrowser);
      if (!tree) {
        toast.error('Failed to read bookmarks');
        return;
      }

      const bookmarks = collectBookmarksFromFolder(tree, selectedFolderIds, selectedBrowser);
      if (bookmarks.length === 0) {
        toast.success('No bookmarks found in folder');
        return;
      }

      const result = await importMutation.mutateAsync(bookmarks);
      if (result.imported > 0) {
        toast.success(
          `Imported ${result.imported} new bookmark${result.imported === 1 ? '' : 's'}`
        );
      } else {
        toast.success('All bookmarks already imported');
      }
    } catch (err) {
      toast.error(handleApiError(err, 'Syncing bookmarks'));
    } finally {
      setIsSyncing(false);
    }
  }, [
    isBrowserConfigured,
    selectedBrowser,
    selectedFolderIds,
    getBookmarkTree,
    importMutation,
    toast,
    onShowSetupWizard,
  ]);

  return { isSyncing, syncBookmarks };
}
