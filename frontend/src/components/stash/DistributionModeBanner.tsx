/**
 * Distribution Mode Banner
 *
 * A fixed banner that appears below the app header when in Distribute or Hypothesize mode.
 * Shows mode indicator, action buttons, and dismiss functionality.
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../icons';
import { useDistributionMode } from '../../context/DistributionModeContext';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useAllocateStashBatchMutation } from '../../api/queries/stashQueries';
import { Z_INDEX } from '../../constants';

interface ConfirmDialogProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function ConfirmDialog({ isOpen, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
    >
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Backdrop overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- Portal-based dialog */}
      <div
        className="relative rounded-xl p-6 max-w-sm mx-4 shadow-xl"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          zIndex: Z_INDEX.MODAL,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2
          id="confirm-title"
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          Discard changes?
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
          You have unsaved changes. Are you sure you want to exit?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg btn-press"
            style={{
              backgroundColor: 'var(--monarch-bg-hover)',
              color: 'var(--monarch-text-dark)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg btn-press"
            style={{
              backgroundColor: 'var(--monarch-error)',
              color: '#fff',
            }}
          >
            Discard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function DistributionModeBanner() {
  const { mode, stashedAllocations, hasChanges, exitMode, setScenarioSidebarOpen } =
    useDistributionMode();

  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const allocateBatchMutation = useAllocateStashBatchMutation();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handleDismiss = useCallback(() => {
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      exitMode();
    }
  }, [hasChanges, exitMode]);

  // Handle Escape key to exit mode
  useEffect(() => {
    if (!mode) return;

    function handleEscape(event: KeyboardEvent) {
      // Don't trigger if confirm dialog is open (it has its own Escape handler)
      if (event.key === 'Escape' && !showConfirmDialog) {
        handleDismiss();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mode, showConfirmDialog, handleDismiss]);

  const handleApply = useCallback(async () => {
    // Convert stashed allocations to batch format, filtering out zero/empty allocations
    // Stashed allocations represent balance changes that draw from Cash to Stash
    const batchAllocations = Object.entries(stashedAllocations)
      .filter(([, amount]) => amount > 0)
      .map(([id, budget]) => ({ id, budget }));

    if (batchAllocations.length === 0) {
      toast.info('No allocations to apply');
      exitMode();
      return;
    }

    setIsApplying(true);
    try {
      await allocateBatchMutation.mutateAsync(batchAllocations);
      toast.success(
        `Updated ${batchAllocations.length} stash item${batchAllocations.length === 1 ? '' : 's'}`
      );
      exitMode();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply allocations';
      toast.error(message);
    } finally {
      setIsApplying(false);
    }
  }, [stashedAllocations, allocateBatchMutation, exitMode, toast]);

  const handleOpenScenarios = useCallback(() => {
    setScenarioSidebarOpen(true);
  }, [setScenarioSidebarOpen]);

  const handleConfirmExit = useCallback(() => {
    setShowConfirmDialog(false);
    exitMode(true);
  }, [exitMode]);

  const handleCancelExit = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  if (!mode) return null;

  const isDistribute = mode === 'distribute';
  const isHypothesize = mode === 'hypothesize';

  // Banner colors
  const bannerBg = isDistribute ? 'var(--monarch-success-bg)' : 'rgba(147, 51, 234, 0.15)'; // Purple with opacity
  const bannerBorder = isDistribute ? 'var(--monarch-success)' : '#9333ea'; // Purple-600
  const iconColor = isDistribute ? 'var(--monarch-success)' : '#d8b4fe'; // Purple-300 for high contrast
  const textColor = '#ffffff'; // White for high contrast
  const descriptionColor = 'rgba(255, 255, 255, 0.8)'; // Slightly muted white

  return (
    <>
      <div
        className="distribution-mode-banner w-full px-4 py-2 flex items-center justify-between gap-4 animate-slide-down"
        style={{
          backgroundColor: bannerBg,
          borderBottom: `1px solid ${bannerBorder}`,
        }}
      >
        {/* Left: Mode indicator */}
        <div className="flex items-center gap-3">
          {isDistribute ? (
            <Icons.Split size={18} style={{ color: iconColor }} />
          ) : (
            <Icons.FlaskConical size={18} style={{ color: iconColor }} />
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: textColor }}>
              {isDistribute ? 'Distribute' : 'Hypothesize'}
            </span>
            <span className="text-sm" style={{ color: descriptionColor }}>
              {isDistribute
                ? 'Allocate available funds across your stash items'
                : 'Plan future contributions and events to see projected balances'}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isDistribute && (
            <button
              onClick={handleApply}
              disabled={isApplying || isRateLimited}
              className="px-3 py-1.5 text-sm font-medium rounded-lg btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--monarch-success)',
                color: '#fff',
              }}
            >
              {isApplying ? 'Applying...' : 'Apply'}
            </button>
          )}
          {isHypothesize && (
            <button
              onClick={handleOpenScenarios}
              className="px-3 py-1.5 text-sm font-medium rounded-lg btn-press flex items-center gap-1.5"
              style={{
                backgroundColor: '#9333ea',
                color: '#fff',
              }}
            >
              <Icons.FolderOpen size={14} />
              Scenarios
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
            aria-label="Exit mode"
          >
            <Icons.X size={18} style={{ color: textColor }} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />
    </>
  );
}
