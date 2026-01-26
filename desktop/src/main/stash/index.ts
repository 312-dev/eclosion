/**
 * Stash Module
 *
 * IPC handlers for stash-related desktop functionality.
 * Includes image storage for custom item images.
 */

import { ipcMain } from 'electron';
import {
  saveStashImage,
  deleteStashImage,
  getImageUrl,
  type SaveImageResult,
} from './imageStorage';

// Re-export types
export type { SaveImageResult } from './imageStorage';

/**
 * Setup stash-related IPC handlers.
 * Call this from the main process initialization.
 */
export function setupStashIpcHandlers(): void {
  // =========================================================================
  // Image Storage
  // =========================================================================

  /**
   * Save a custom image for a stash item.
   * Accepts base64-encoded image data and stores it locally.
   */
  ipcMain.handle(
    'stash:save-image',
    (_event, itemId: string, base64Data: string): SaveImageResult => {
      return saveStashImage(itemId, base64Data);
    }
  );

  /**
   * Delete a custom image for a stash item.
   */
  ipcMain.handle('stash:delete-image', (_event, imagePath: string): boolean => {
    return deleteStashImage(imagePath);
  });

  /**
   * Get the file:// URL for displaying a local image.
   */
  ipcMain.handle('stash:get-image-url', (_event, imagePath: string): string => {
    return getImageUrl(imagePath);
  });
}
