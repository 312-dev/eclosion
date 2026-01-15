import { Monitor, AppWindow, Keyboard } from 'lucide-react';
import { SettingsRow } from '../SettingsRow';
import { ToggleSwitch } from '../ToggleSwitch';
import type { DesktopSettings, DesktopSettingKey, HotkeyConfig } from '../../../types/electron';

// Re-export sections from other files for convenience
export { SyncScheduleSection, BackgroundSyncSection } from './DesktopSyncSections';
export { SecuritySection, DataFolderSection } from './DesktopSecuritySections';

interface StartupSectionProps {
  settings: DesktopSettings | null;
  loading: boolean;
  onSettingToggle: (key: DesktopSettingKey) => void;
}

export function StartupSection({
  settings,
  loading,
  onSettingToggle,
}: Readonly<StartupSectionProps>) {
  return (
    <>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
            <Monitor size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
          <div>
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Startup
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Control how Eclosion launches
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

      <SettingsRow label="Launch at Login" description="Automatically start Eclosion when you log in">
        <ToggleSwitch
          checked={settings?.launchAtLogin ?? false}
          onChange={() => onSettingToggle('launchAtLogin')}
          disabled={loading}
          ariaLabel="Toggle launch at login"
        />
      </SettingsRow>

      <SettingsRow label="Start Minimized" description="Launch to tray instead of showing the window">
        <ToggleSwitch
          checked={settings?.startMinimized ?? false}
          onChange={() => onSettingToggle('startMinimized')}
          disabled={loading}
          ariaLabel="Toggle start minimized"
        />
      </SettingsRow>
    </>
  );
}

interface WindowBehaviorSectionProps {
  settings: DesktopSettings | null;
  loading: boolean;
  isMac: boolean;
  onSettingToggle: (key: DesktopSettingKey) => void;
}

export function WindowBehaviorSection({
  settings,
  loading,
  isMac,
  onSettingToggle,
}: Readonly<WindowBehaviorSectionProps>) {
  return (
    <>
      <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
            <AppWindow size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
          <div>
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Window Behavior
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Control how the window behaves when minimized or closed
            </div>
          </div>
        </div>
      </div>

      <SettingsRow label="Minimize to Tray" description="Hide to system tray instead of taskbar when minimized">
        <ToggleSwitch
          checked={settings?.minimizeToTray ?? true}
          onChange={() => onSettingToggle('minimizeToTray')}
          disabled={loading}
          ariaLabel="Toggle minimize to tray"
        />
      </SettingsRow>

      <SettingsRow label="Close to Tray" description="Hide to system tray instead of quitting when closed">
        <ToggleSwitch
          checked={settings?.closeToTray ?? true}
          onChange={() => onSettingToggle('closeToTray')}
          disabled={loading}
          ariaLabel="Toggle close to tray"
        />
      </SettingsRow>

      {isMac && (
        <SettingsRow label="Show in Dock" description="Display Eclosion icon in the macOS Dock">
          <ToggleSwitch
            checked={settings?.showInDock ?? true}
            onChange={() => onSettingToggle('showInDock')}
            disabled={loading}
            ariaLabel="Toggle show in Dock"
          />
        </SettingsRow>
      )}
    </>
  );
}

interface KeyboardShortcutSectionProps {
  hotkeyConfig: HotkeyConfig | null;
  loading: boolean;
  isMac: boolean;
  onToggle: () => void;
}

/**
 * Format an Electron accelerator string for display.
 * Converts "CommandOrControl+Shift+E" to "⌘⇧E" on Mac or "Ctrl+Shift+E" on Windows/Linux.
 */
function formatShortcut(accelerator: string, isMac: boolean): string {
  if (!accelerator) return '';

  let result = accelerator;

  if (isMac) {
    result = result
      .replaceAll('CommandOrControl', '⌘')
      .replaceAll('Command', '⌘')
      .replaceAll('Control', '⌃')
      .replaceAll('Shift', '⇧')
      .replaceAll('Alt', '⌥')
      .replaceAll('+', '');
  } else {
    result = result
      .replaceAll('CommandOrControl', 'Ctrl')
      .replaceAll('Command', 'Ctrl')
      .replaceAll('Control', 'Ctrl');
  }

  return result;
}

export function KeyboardShortcutSection({
  hotkeyConfig,
  loading,
  isMac,
  onToggle,
}: Readonly<KeyboardShortcutSectionProps>) {
  const shortcutDisplay = hotkeyConfig?.accelerator
    ? formatShortcut(hotkeyConfig.accelerator, isMac)
    : 'Not set';

  return (
    <>
      <div style={{ borderTop: '1px solid var(--monarch-border)' }} />

      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
            <Keyboard size={20} style={{ color: 'var(--monarch-text-muted)' }} />
          </div>
          <div>
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Keyboard Shortcut
            </div>
            <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
              Global hotkey to show/hide Eclosion
            </div>
          </div>
        </div>
      </div>

      <SettingsRow
        label="Toggle Window"
        description={`Press ${shortcutDisplay} anywhere to show/hide`}
      >
        <ToggleSwitch
          checked={hotkeyConfig?.enabled ?? true}
          onChange={onToggle}
          disabled={loading}
          ariaLabel="Toggle keyboard shortcut"
        />
      </SettingsRow>
    </>
  );
}
