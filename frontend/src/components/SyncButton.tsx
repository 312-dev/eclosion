import { useState, useEffect } from 'react';

interface SyncButtonProps {
  onSync: () => void;
  isSyncing: boolean;
  lastSync: string | null;
  compact?: boolean;
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

export function SyncButton({ onSync, isSyncing, lastSync, compact = false }: SyncButtonProps) {
  const [formattedTime, setFormattedTime] = useState(() => formatLastSync(lastSync));

  useEffect(() => {
    setFormattedTime(formatLastSync(lastSync));

    if (!lastSync) return;

    const interval = setInterval(() => {
      setFormattedTime(formatLastSync(lastSync));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [lastSync]);

  if (compact) {
    const syncStatus = lastSync ? `Synced ${formattedTime}` : 'Not yet synced';
    return (
      <button
        onClick={onSync}
        disabled={isSyncing}
        className="flex items-center gap-1.5 text-xs disabled:opacity-60 disabled:cursor-not-allowed transition-colors hover:opacity-70"
        style={{ color: 'var(--monarch-text-muted)' }}
        title="Click to sync"
      >
        {isSyncing ? (
          <svg
            className="animate-spin h-3.5 w-3.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="h-3.5 w-3.5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
        <span>{isSyncing ? 'Syncing...' : syncStatus}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        {formattedTime}
      </span>
      <button
        onClick={onSync}
        disabled={isSyncing}
        className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors btn-hover-lift"
        style={{ backgroundColor: isSyncing ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)' }}
        onMouseEnter={(e) => { if (!isSyncing) e.currentTarget.style.backgroundColor = 'var(--monarch-orange-hover)'; }}
        onMouseLeave={(e) => { if (!isSyncing) e.currentTarget.style.backgroundColor = 'var(--monarch-orange)'; }}
      >
        {isSyncing ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Syncing...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Sync Now
          </>
        )}
      </button>
    </div>
  );
}
