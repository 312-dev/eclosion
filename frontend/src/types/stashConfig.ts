/**
 * Stash Configuration Types
 *
 * Types for stash feature configuration including browser sync
 * settings and auto-archive preferences.
 */

import type { BrowserType } from './bookmarks';

/**
 * Persisted stash configuration from backend.
 */
export interface StashConfig {
  /** Whether the stash wizard has been completed */
  isConfigured: boolean;
  /** Default category group ID for new stash items */
  defaultCategoryGroupId: string | null;
  /** Default category group name for display */
  defaultCategoryGroupName: string | null;
  /** Selected browser for bookmark sync */
  selectedBrowser: BrowserType | null;
  /** Selected bookmark folder IDs to sync */
  selectedFolderIds: string[];
  /** Selected bookmark folder names for display */
  selectedFolderNames: string[];
  /** Auto-archive items when their bookmark is deleted */
  autoArchiveOnBookmarkDelete: boolean;
  /** Auto-archive items at the start of the month after being fully funded */
  autoArchiveOnGoalMet: boolean;
  /** Include expected income in Available Funds calculation */
  includeExpectedIncome: boolean;
  /** Selected cash account IDs for Available to Stash calculation.
   * null = all accounts included (default).
   * empty array = no accounts (edge case).
   * array with IDs = only those accounts included.
   */
  selectedCashAccountIds: string[] | null;
  /** Show Monarch savings goals in Stash grid */
  showMonarchGoals: boolean;
  /** Reserved buffer amount for Available to Stash calculation.
   * This amount is subtracted from Available to Stash as a safety margin.
   */
  bufferAmount: number;
}

/**
 * Wizard state for the stash onboarding flow.
 */
export interface StashWizardState {
  /** Currently selected browser */
  selectedBrowser: BrowserType | null;
  /** Whether browser permission has been granted (especially for Safari) */
  browserPermissionGranted: boolean;
  /** Selected category group ID */
  selectedGroupId: string;
  /** Selected category group name */
  selectedGroupName: string;
  /** Selected bookmark folder IDs */
  selectedFolderIds: string[];
}

/**
 * Category mapping choice when linking a stash item to Monarch.
 */
export type CategoryMappingChoice = 'create_new' | 'link_existing';

/**
 * Request to map a stash item to a Monarch category.
 */
export interface CategoryMappingRequest {
  /** Stash item ID */
  itemId: string;
  /** Whether to create new or link existing */
  choice: CategoryMappingChoice;
  /** Existing category ID (when choice is 'link_existing') */
  existingCategoryId?: string;
  /** Whether to sync item name to category name */
  syncName?: boolean;
}

/**
 * Result of an image upload operation.
 */
export interface StashImageUploadResult {
  /** Whether the upload succeeded */
  success: boolean;
  /** Path to the saved image (on success) */
  imagePath?: string;
  /** Error message (on failure) */
  error?: string;
}
