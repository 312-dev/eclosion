/**
 * Electron Title Bar
 *
 * Provides a draggable region at the top of fullscreen pages for macOS Electron.
 * This allows users to drag the window when there's no visible header (e.g., login/unlock pages).
 *
 * On macOS with `titleBarStyle: 'hiddenInset'`, the traffic lights are embedded
 * in the content area. Without a drag region, users cannot move the window.
 */

import { useMacOSElectron } from '../hooks';

interface ElectronTitleBarProps {
  /** Height of the drag region (default: 28px, matching traffic light area) */
  height?: number;
}

export function ElectronTitleBar({ height = 28 }: ElectronTitleBarProps) {
  const isMacOSElectron = useMacOSElectron();

  // Only render on macOS Electron
  if (!isMacOSElectron) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        height: `${height}px`,
        // @ts-expect-error - WebKit-specific CSS property for Electron
        WebkitAppRegion: 'drag',
      }}
      aria-hidden="true"
    />
  );
}
