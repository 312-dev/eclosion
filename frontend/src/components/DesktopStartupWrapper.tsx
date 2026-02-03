/**
 * DesktopStartupWrapper
 *
 * Handles the desktop app startup flow:
 * 1. Shows loading screen while backend starts
 * 2. Listens for backend ready events
 * 3. Waits for any pending update downloads to complete
 * 4. Initializes API once backend is ready and no updates pending
 * 5. Renders the main app
 *
 * IMPORTANT: If an update is detected during startup, the app will:
 * - Block access to the main app
 * - Show download progress on the loading screen
 * - Automatically restart when download completes
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { StartupLoadingScreen } from './ui/StartupLoadingScreen';
import { initializeApi } from '../api/core/fetchApi';
import { initializeDesktopBetaDetection } from '../utils/environment';
import { isDesktopMode } from '../utils/apiBase';
import type { UpdateInfo, UpdateProgress } from '../types/electron';

interface DesktopStartupWrapperProps {
  children: ReactNode;
}

type StartupPhase = 'initializing' | 'spawning' | 'waiting_for_health' | 'ready' | 'failed';

interface StartupStatus {
  phase: StartupPhase;
  message: string;
  progress: number;
  error?: string;
}

// Check if we're in desktop mode (outside component to avoid re-renders)
const isDesktopEnvironment = isDesktopMode();

export function DesktopStartupWrapper({ children }: DesktopStartupWrapperProps) {
  // For non-desktop mode, start as ready immediately
  const [isReady, setIsReady] = useState(!isDesktopEnvironment);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  // Custom status message from backend (e.g., "Migrating backend to new version...")
  const [customStatus, setCustomStatus] = useState<{ message: string; progress: number } | null>(
    null
  );

  // Track if an update is blocking app access
  // When an update is available/downloading, we block transition to the main app
  const [isUpdateBlocking, setIsUpdateBlocking] = useState(false);
  const [isBackendReady, setIsBackendReady] = useState(false);

  // Mark backend as ready (but may still be blocked by update)
  const handleBackendReady = useCallback(() => {
    setIsBackendReady(true);
  }, []);

  // Handle timeout from loading screen
  const handleTimeout = useCallback(() => {
    setHasTimedOut(true);
  }, []);

  // Listen for update events to block app transition during downloads
  useEffect(() => {
    if (!isDesktopEnvironment || !globalThis.electron) {
      return;
    }

    // When an update is available, block transition until it completes or fails
    const unsubAvailable = globalThis.electron.onUpdateAvailable((_info: UpdateInfo) => {
      setIsUpdateBlocking(true);
    });

    // Track download progress (keep blocking)
    const unsubProgress = globalThis.electron.onUpdateProgress((_progress: UpdateProgress) => {
      setIsUpdateBlocking(true);
    });

    // When download completes, StartupLoadingScreen will trigger auto-restart
    // Keep blocking until restart happens
    const unsubDownloaded = globalThis.electron.onUpdateDownloaded((_info: UpdateInfo) => {
      // Keep blocking - StartupLoadingScreen will call quitAndInstall()
      setIsUpdateBlocking(true);
    });

    // On error, unblock and let the app proceed
    const unsubError = globalThis.electron.onUpdateError(() => {
      setIsUpdateBlocking(false);
    });

    // Check initial status - if update is already downloading/downloaded, block
    globalThis.electron.getUpdateStatus().then((status) => {
      if (status.updateDownloaded || status.updateAvailable) {
        setIsUpdateBlocking(true);
      }
    });

    return () => {
      unsubAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
    };
  }, []);

  // Transition to app when both backend is ready AND no update is blocking
  useEffect(() => {
    // Skip if already ready or if conditions aren't met
    if (isReady || !isBackendReady || isUpdateBlocking) {
      return;
    }

    const initializeAndTransition = async () => {
      try {
        // Initialize the API (fetches port and secret from Electron)
        await initializeApi();

        // Detect if running beta build
        await initializeDesktopBetaDetection();

        // Small delay for smooth transition
        await new Promise((resolve) => setTimeout(resolve, 300));

        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize API after backend ready:', error);
        setHasTimedOut(true);
      }
    };

    initializeAndTransition();
  }, [isReady, isBackendReady, isUpdateBlocking]);

  // Listen for backend startup status
  useEffect(() => {
    // Skip for non-desktop mode (already initialized above)
    if (!isDesktopEnvironment) {
      return;
    }

    // Check if backend is already ready (in case we loaded after startup completed)
    const checkIfAlreadyReady = async () => {
      try {
        const isComplete = await globalThis.electron!.isBackendStartupComplete();
        if (isComplete) {
          handleBackendReady();
          return true;
        }
      } catch {
        // IPC might not be ready yet, continue with listener
      }
      return false;
    };

    // Listen for backend startup status updates
    const unsubscribe = globalThis.electron!.onBackendStartupStatus((status: StartupStatus) => {
      if (status.phase === 'ready') {
        setCustomStatus(null);
        handleBackendReady();
      } else if (status.phase === 'failed') {
        setHasTimedOut(true);
      } else if (status.message) {
        // Track custom status messages (e.g., during backend migration)
        setCustomStatus({ message: status.message, progress: status.progress });
      }
    });

    // Check if already ready on mount
    checkIfAlreadyReady();

    return () => {
      unsubscribe();
    };
  }, [handleBackendReady]);

  // Show loading screen while waiting for backend or update
  // Always show immediately in desktop mode to ensure window has content for ready-to-show
  if (!isReady) {
    return (
      <StartupLoadingScreen
        onTimeout={handleTimeout}
        isConnected={false}
        customStatus={customStatus}
      />
    );
  }

  // Show timed out state
  if (hasTimedOut && !isReady) {
    return (
      <StartupLoadingScreen
        onTimeout={handleTimeout}
        isConnected={false}
        customStatus={customStatus}
      />
    );
  }

  // Backend is ready and no update blocking, render the app
  return <>{children}</>;
}
