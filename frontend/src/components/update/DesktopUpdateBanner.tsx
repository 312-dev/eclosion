/**
 * DesktopUpdateBanner Component
 *
 * Unified, non-dismissible banner for desktop update notifications.
 * Shows download progress during download, "Quit & Relaunch" button when ready.
 *
 * Behavior:
 * - Downloading: Shows progress bar with percentage
 * - Ready: Shows green banner with "Quit & Relaunch" button
 * - Not dismissible - update is expected to be installed
 */

import { useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { useUpdate } from '../../context/UpdateContext';

// eslint-disable-next-line sonarjs/cognitive-complexity -- Update state machine with multiple UI states
export function DesktopUpdateBanner() {
  const {
    isDesktop,
    updateAvailable,
    updateDownloaded,
    isDownloading,
    downloadProgress,
    updateInfo,
    quitAndInstall,
  } = useUpdate();

  const [isRestarting, setIsRestarting] = useState(false);

  // Only show on desktop when there's an update in progress
  if (!isDesktop || (!updateAvailable && !updateDownloaded)) {
    return null;
  }

  const version = updateInfo?.version || 'new version';
  const progress = Math.round(downloadProgress);
  const isBeta = version.includes('-beta');

  const handleQuitAndRelaunch = () => {
    setIsRestarting(true);
    // Small delay to show loading state
    setTimeout(() => {
      quitAndInstall();
    }, 200);
  };

  // Update downloaded - show "Quit & Relaunch" banner
  if (updateDownloaded) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
        style={{
          // Use darker colors for better contrast with white text (WCAG AA)
          backgroundColor: isBeta ? '#7c3aed' : '#166534',
          color: 'white',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-3">
          <Download size={18} className="shrink-0" aria-hidden="true" />
          <span>
            <strong>v{version}</strong> is ready to install
          </span>
        </div>

        <button
          type="button"
          onClick={handleQuitAndRelaunch}
          disabled={isRestarting}
          className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded transition-colors disabled:opacity-70"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }}
          aria-label={
            isRestarting ? 'Restarting application' : 'Quit and relaunch to install update'
          }
        >
          <RotateCcw size={14} className={isRestarting ? 'animate-spin' : ''} />
          {isRestarting ? 'Restarting...' : 'Quit & Relaunch'}
        </button>
      </div>
    );
  }

  // Update downloading - show progress
  if (updateAvailable && (isDownloading || progress > 0)) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={`Downloading update v${version}: ${progress}% complete`}
        className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          borderBottom: '1px solid var(--monarch-border)',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Download
            size={16}
            className="shrink-0"
            style={{ color: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-orange)' }}
            aria-hidden="true"
          />

          <span style={{ color: 'var(--monarch-text-dark)' }}>
            Downloading v{version}... {progress}%
          </span>

          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden max-w-50"
            style={{ backgroundColor: 'var(--monarch-border)' }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                backgroundColor: isBeta ? 'var(--monarch-accent)' : 'var(--monarch-orange)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Update available but not yet downloading (shouldn't happen with auto-download)
  return null;
}
