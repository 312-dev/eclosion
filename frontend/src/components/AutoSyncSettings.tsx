import { useState } from 'react';
import type { AutoSyncStatus } from '../types';
import { formatInterval, formatDateTime } from '../utils';
import { AutoSyncSecurityModal } from './AutoSyncSecurityModal';
import { SpinnerIcon, ClockIcon, XIcon, CheckSimpleIcon, AlertCircleIcon } from './icons';

interface AutoSyncSettingsProps {
  status: AutoSyncStatus | null;
  onEnable: (intervalMinutes: number, passphrase: string) => Promise<void>;
  onDisable: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function AutoSyncSettings({
  status,
  onEnable,
  onDisable,
  onRefresh,
}: AutoSyncSettingsProps) {
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const handleDisable = async () => {
    setDisabling(true);
    try {
      await onDisable();
      await onRefresh();
    } finally {
      setDisabling(false);
    }
  };

  const handleEnable = async (intervalMinutes: number, passphrase: string) => {
    await onEnable(intervalMinutes, passphrase);
    await onRefresh();
  };

  if (!status) {
    return (
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <SpinnerIcon size={20} color="var(--monarch-text-muted)" />
          <span style={{ color: 'var(--monarch-text-muted)' }}>Loading auto-sync status...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClockIcon size={20} color="var(--monarch-orange)" />
            <div>
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Automatic Background Sync
              </div>
              <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                {status.enabled
                  ? `Syncs every ${formatInterval(status.interval_minutes)}`
                  : 'Keep your budget in sync automatically'}
              </div>
            </div>
          </div>

          {status.enabled ? (
            <button
              onClick={handleDisable}
              disabled={disabling}
              className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              style={{
                backgroundColor: 'var(--monarch-bg-elevated)',
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              {disabling ? (
                <>
                  <SpinnerIcon size={16} />
                  Disabling...
                </>
              ) : (
                <>
                  <XIcon size={16} />
                  Disable
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setShowEnableModal(true)}
              className="px-4 py-2 rounded-lg flex items-center gap-2 text-white transition-colors"
              style={{ backgroundColor: 'var(--monarch-orange)' }}
            >
              <CheckSimpleIcon size={16} />
              Enable
            </button>
          )}
        </div>

        {/* Status info when enabled */}
        {status.enabled && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div style={{ color: 'var(--monarch-text-muted)' }}>Next sync</div>
                <div style={{ color: 'var(--monarch-text-dark)' }}>
                  {status.next_run ? formatDateTime(status.next_run) : 'Scheduled'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--monarch-text-muted)' }}>Last sync</div>
                <div className="flex items-center gap-1" style={{ color: 'var(--monarch-text-dark)' }}>
                  {formatDateTime(status.last_sync)}
                  {status.last_sync && status.last_sync_success === false && (
                    <AlertCircleIcon size={16} color="var(--monarch-error)" />
                  )}
                  {status.last_sync && status.last_sync_success === true && (
                    <CheckSimpleIcon size={16} color="var(--monarch-success)" />
                  )}
                </div>
              </div>
            </div>
            {status.last_sync_error && (
              <div className="mt-2 p-2 rounded text-sm" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
                Last error: {status.last_sync_error}
              </div>
            )}
          </div>
        )}
      </div>

      <AutoSyncSecurityModal
        isOpen={showEnableModal}
        onClose={() => setShowEnableModal(false)}
        onEnable={handleEnable}
      />
    </>
  );
}
