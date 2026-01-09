/**
 * Auto-Update Management
 *
 * Handles checking for updates, downloading, and installation.
 * Uses electron-updater with GitHub Releases as the update source.
 *
 * Channel is determined at build time - no runtime switching.
 * Beta builds see all releases (prereleases + stable).
 * Stable builds see only stable releases.
 */

import { autoUpdater, UpdateInfo } from 'electron-updater';
import { app } from 'electron';
import { showNotification } from './tray';
import { getMainWindow } from './window';

// Update channels
type UpdateChannel = 'stable' | 'beta';

let updateAvailable = false;
let updateDownloaded = false;
let updateInfo: UpdateInfo | null = null;

/**
 * Get the build-time release channel.
 * Defaults to 'stable' if not defined (dev builds).
 */
function getBuildTimeChannel(): UpdateChannel {
  if (typeof __RELEASE_CHANNEL__ !== 'undefined' && __RELEASE_CHANNEL__ === 'beta') {
    return 'beta';
  }
  return 'stable';
}

/**
 * Initialize the auto-updater.
 * Channel is determined at build time - beta builds see prereleases.
 */
export function initializeUpdater(): void {
  // Use build-time channel - no runtime switching
  const channel = getBuildTimeChannel();
  const isBeta = channel === 'beta';

  // Beta builds can see prereleases, stable builds cannot
  autoUpdater.allowPrerelease = isBeta;
  autoUpdater.allowDowngrade = false;

  // Configure auto-updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  console.log(`Update channel: ${channel} (allowPrerelease: ${isBeta})`);

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('Update available:', info.version);
    updateAvailable = true;
    updateInfo = info;
    notifyRenderer('update-available', info);
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    console.log('No update available. Current version:', info.version);
    updateAvailable = false;
    updateInfo = null;
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent.toFixed(1)}%`);
    notifyRenderer('update-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('Update downloaded:', info.version);
    updateDownloaded = true;
    updateInfo = info;

    // Show notification
    showNotification(
      'Update Ready',
      `Version ${info.version} is ready to install. Restart Eclosion to apply the update.`
    );

    notifyRenderer('update-downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err);
    notifyRenderer('update-error', { message: err.message });
  });
}

/**
 * Get the current update channel.
 * Returns the build-time channel (no runtime switching).
 */
export function getUpdateChannel(): UpdateChannel {
  return getBuildTimeChannel();
}

/**
 * Check for updates.
 */
export async function checkForUpdates(): Promise<{ updateAvailable: boolean; version?: string }> {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo) {
      return {
        updateAvailable: result.updateInfo.version !== app.getVersion(),
        version: result.updateInfo.version,
      };
    }
    return { updateAvailable: false };
  } catch (err) {
    console.error('Failed to check for updates:', err);
    return { updateAvailable: false };
  }
}

/**
 * Download and install the update.
 * This will quit the app and install the update.
 */
export function quitAndInstall(): void {
  if (updateDownloaded) {
    console.log('Installing update...');
    autoUpdater.quitAndInstall(false, true);
  }
}

/**
 * Get current update status.
 */
export function getUpdateStatus(): {
  updateAvailable: boolean;
  updateDownloaded: boolean;
  updateInfo: UpdateInfo | null;
  currentVersion: string;
  channel: UpdateChannel;
} {
  return {
    updateAvailable,
    updateDownloaded,
    updateInfo,
    currentVersion: app.getVersion(),
    channel: getUpdateChannel(),
  };
}

/**
 * Notify the renderer process about update events.
 */
function notifyRenderer(event: string, data: unknown): void {
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(`updater:${event}`, data);
  }
}

/**
 * Schedule periodic update checks.
 * Checks every 6 hours by default.
 */
export function scheduleUpdateChecks(intervalHours = 6): NodeJS.Timeout {
  const intervalMs = intervalHours * 60 * 60 * 1000;

  // Check immediately on startup
  checkForUpdates();

  // Then check periodically
  return setInterval(() => {
    checkForUpdates();
  }, intervalMs);
}
