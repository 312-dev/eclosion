import { useState } from 'react';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { Modal } from './ui/Modal';
import { ChangelogDisplay } from './ChangelogDisplay';

export function UpdateBanner() {
  const {
    updateAvailable,
    serverVersion,
    updateType,
    dismissed,
    dismissUpdate,
  } = useUpdateCheck();

  const [showChangelog, setShowChangelog] = useState(false);

  if (!updateAvailable || dismissed) {
    return null;
  }

  const updateTypeLabel = {
    major: 'Major update',
    minor: 'New features',
    patch: 'Bug fixes',
  }[updateType ?? 'patch'];

  return (
    <>
      <div className="update-banner">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>
            <strong>{updateTypeLabel}</strong> available (v{serverVersion})
          </span>
          <button
            onClick={() => setShowChangelog(true)}
            className="underline hover:no-underline text-sm"
          >
            What's new?
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={dismissUpdate}
            className="px-3 py-1 text-sm rounded hover-bg-white-alpha-10-to-20"
          >
            Later
          </button>
          <button
            onClick={() => setShowChangelog(true)}
            className="px-3 py-1 text-sm rounded font-medium hover-bg-white-to-gray"
            style={{ color: 'var(--monarch-orange)' }}
          >
            View Update
          </button>
        </div>
      </div>

      <Modal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
        title={`What's New in v${serverVersion}`}
        maxWidth="lg"
        footer={
          <button
            onClick={() => setShowChangelog(false)}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--monarch-bg-input)',
              color: 'var(--monarch-text)',
            }}
          >
            Close
          </button>
        }
      >
        <ChangelogDisplay version={serverVersion ?? undefined} showUpdateInstructions />
      </Modal>
    </>
  );
}
