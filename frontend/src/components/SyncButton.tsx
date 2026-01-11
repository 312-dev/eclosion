import { useState, useEffect } from 'react';
import { UI } from '../constants';
import { SpinnerIcon, SyncIcon } from './icons';

interface SyncButtonProps {
  onSync: () => void;
  isSyncing: boolean;
  lastSync: string | null;
  compact?: boolean;
  /** Whether sync is blocked (e.g., due to auth issues) */
  syncBlocked?: boolean;
}

function formatLastSync(timestamp: string | null): string {
  if (!timestamp) return 'Never synced';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

export function SyncButton({ onSync, isSyncing, lastSync, compact = false, syncBlocked = false }: SyncButtonProps) {
  const [formattedTime, setFormattedTime] = useState(() => formatLastSync(lastSync));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync derived state with prop
    setFormattedTime(formatLastSync(lastSync));

    if (!lastSync) return;

    const interval = setInterval(() => {
      setFormattedTime(formatLastSync(lastSync));
    }, UI.INTERVAL.SYNC_STATUS);

    return () => clearInterval(interval);
  }, [lastSync]);

  if (compact) {
    const syncStatus = lastSync ? `Synced ${formattedTime}` : 'Not yet synced';
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors hover:opacity-70"
          style={{ color: syncBlocked ? 'var(--monarch-warning)' : 'var(--monarch-text-muted)' }}
          aria-label={isSyncing ? 'Syncing data with Monarch' : `Sync now. Last synced: ${syncStatus}`}
          aria-busy={isSyncing}
        >
          {isSyncing ? (
            <SpinnerIcon size={14} />
          ) : (
            <SyncIcon size={14} />
          )}
          <span aria-live="polite">
            {isSyncing ? 'Syncing...' : (
              lastSync ? (
                <>
                  <span className="hidden sm:inline">Synced </span>
                  {formattedTime}
                </>
              ) : 'Never synced'
            )}
          </span>
        </button>
        {syncBlocked && !isSyncing && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded"
            style={{ backgroundColor: 'var(--monarch-warning-bg)', color: 'var(--monarch-warning)' }}
            title="Sync is blocked - re-authentication required"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Stale
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm" style={{ color: syncBlocked ? 'var(--monarch-warning)' : 'var(--monarch-text-muted)' }}>
        {formattedTime}
      </span>
      {syncBlocked && !isSyncing && (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded"
          style={{ backgroundColor: 'var(--monarch-warning-bg)', color: 'var(--monarch-warning)' }}
          title="Sync is blocked - re-authentication required"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Stale
        </span>
      )}
      <button
        type="button"
        onClick={onSync}
        disabled={isSyncing}
        className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-colors btn-hover-lift hover-bg-orange-to-orange-hover"
        style={{ backgroundColor: isSyncing ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)' }}
        aria-label={isSyncing ? 'Syncing data' : 'Sync now'}
        aria-busy={isSyncing}
      >
        {isSyncing ? (
          <>
            <SpinnerIcon size={16} />
            <span>Syncing...</span>
          </>
        ) : (
          <>
            <SyncIcon size={16} />
            <span>Sync Now</span>
          </>
        )}
      </button>
    </div>
  );
}
