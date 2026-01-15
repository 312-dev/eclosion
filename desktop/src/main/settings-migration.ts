/**
 * Settings Migration Module
 *
 * Handles migration of legacy settings to new schema.
 * Runs once on startup before any settings are read.
 */

import { getStore } from './store';
import { debugLog } from './logger';

/**
 * Migrate legacy settings to new schema.
 *
 * Migrations:
 * - menuBarMode (boolean) → desktop.closeToTray, desktop.showInDock
 *
 * This function is idempotent - it only runs if legacy settings exist,
 * and deletes them after migration to prevent re-running.
 */
export function migrateSettings(): void {
  const store = getStore();

  // Migrate menuBarMode → new desktop.* settings
  const oldMenuBarMode = store.get('menuBarMode');

  if (oldMenuBarMode !== undefined) {
    debugLog(`Migrating menuBarMode=${oldMenuBarMode} to new settings`);

    if (oldMenuBarMode === true) {
      // Menu bar mode enabled: close to tray, hide from dock
      store.set('desktop.closeToTray', true);
      store.set('desktop.showInDock', false);
    } else {
      // Menu bar mode disabled: don't close to tray, show in dock
      store.set('desktop.closeToTray', false);
      store.set('desktop.showInDock', true);
    }

    // Set defaults for new settings that didn't exist before
    if (store.get('desktop.minimizeToTray') === undefined) {
      store.set('desktop.minimizeToTray', true);
    }
    if (store.get('desktop.startMinimized') === undefined) {
      store.set('desktop.startMinimized', false);
    }
    if (store.get('desktop.launchAtLogin') === undefined) {
      store.set('desktop.launchAtLogin', false);
    }
    if (store.get('desktop.showInTaskbar') === undefined) {
      store.set('desktop.showInTaskbar', true);
    }

    // Remove old setting to prevent re-migration
    store.delete('menuBarMode');

    debugLog('Settings migration complete');
  }
}
