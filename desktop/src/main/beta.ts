/**
 * Beta Channel Detection and Configuration
 *
 * Provides utilities for detecting beta builds and returning
 * channel-specific configuration like app names and folder paths.
 *
 * This ensures complete isolation between production and beta installations:
 * - Different app display names
 * - Different storage directories
 * - Different Electron userData paths
 */

/**
 * Check if this is a beta build.
 * Determined at build time via RELEASE_CHANNEL environment variable.
 *
 * Both 'beta' and 'dev' builds are treated as beta:
 * - 'beta': Official beta releases (dist:beta:* scripts)
 * - 'dev': Local development builds (npm run dev, no RELEASE_CHANNEL set)
 * - 'stable': Production releases (dist:* scripts)
 */
export function isBetaBuild(): boolean {
  if (typeof __RELEASE_CHANNEL__ !== 'undefined') {
    return __RELEASE_CHANNEL__ === 'beta' || __RELEASE_CHANNEL__ === 'dev';
  }
  return false;
}

/**
 * Get the display name for the app.
 * Used in window titles, dialogs, notifications, etc.
 *
 * @returns "Eclosion (Beta)" for beta builds, "Eclosion" otherwise
 */
export function getAppDisplayName(): string {
  return isBetaBuild() ? 'Eclosion (Beta)' : 'Eclosion';
}

/**
 * Get the folder name for app data storage.
 * Used for Application Support (macOS), AppData (Windows), .config (Linux).
 *
 * @returns "Eclosion Beta" for beta builds, "Eclosion" otherwise
 */
export function getAppFolderName(): string {
  return isBetaBuild() ? 'Eclosion Beta' : 'Eclosion';
}

/**
 * Get the lowercase folder name for Linux config directories.
 *
 * @returns "eclosion-beta" for beta builds, "eclosion" otherwise
 */
export function getAppFolderNameLower(): string {
  return isBetaBuild() ? 'eclosion-beta' : 'eclosion';
}
