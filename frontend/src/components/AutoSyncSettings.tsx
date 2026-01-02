import { useState } from 'react';
import type { AutoSyncStatus } from '../types';
import { formatInterval, formatDateTime } from '../utils';
import { AutoSyncSecurityModal } from './AutoSyncSecurityModal';

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
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--monarch-text-muted)' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--monarch-orange)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Disabling...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--monarch-error)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {status.last_sync && status.last_sync_success === true && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--monarch-success)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
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
