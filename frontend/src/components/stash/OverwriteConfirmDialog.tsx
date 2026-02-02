/**
 * Overwrite Confirm Dialog
 *
 * Confirmation dialog when saving a scenario with a name that already exists.
 */

import { createPortal } from 'react-dom';
import { Z_INDEX } from '../../constants';
import { Icons } from '../icons';

interface OverwriteConfirmDialogProps {
  readonly isOpen: boolean;
  readonly scenarioName: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly isSaving?: boolean;
}

export function OverwriteConfirmDialog({
  isOpen,
  scenarioName,
  onConfirm,
  onCancel,
  isSaving,
}: OverwriteConfirmDialogProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={isSaving ? undefined : onCancel}
        aria-hidden="true"
      />
      {/* Modal content */}
      <div
        className="relative rounded-xl p-5 shadow-2xl max-w-sm w-full mx-4 animate-scale-in"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid #9333ea',
          zIndex: Z_INDEX.MODAL,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(147, 51, 234, 0.15)' }}>
            <Icons.Warning size={20} style={{ color: '#a855f7' }} />
          </div>
          <h3 className="text-base font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
            Overwrite Scenario?
          </h3>
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
          A scenario named "
          <span style={{ color: 'var(--monarch-text-dark)' }}>{scenarioName}</span>" already exists.
          Do you want to replace it with your current allocation?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--monarch-bg-hover)',
              color: 'var(--monarch-text-dark)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{
              backgroundColor: '#9333ea',
              color: '#fff',
            }}
          >
            {isSaving ? 'Saving...' : 'Overwrite'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
