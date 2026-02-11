/**
 * SelectionActionBar
 *
 * Floating bar that appears when transactions are selected.
 * Portalled to document.body and centered above the footer,
 * showing selection count + amount and contextual action buttons.
 *
 * Buttons shown depend on selection state:
 * - unmatched → Match, Skip
 * - matched   → Unmatch
 * - skipped   → Restore
 * - mixed     → (no actions, just Clear)
 */

import { createPortal } from 'react-dom';
import { SearchCheck, FlagOff, Undo2, X } from 'lucide-react';
import { Z_INDEX } from '../../constants';
import type { SelectionState } from './useRefundablesSelection';

interface SelectionActionBarProps {
  readonly count: number;
  readonly selectedAmount: number;
  readonly selectionState: SelectionState;
  readonly onMatch: () => void;
  readonly onSkip: () => void;
  readonly onUnmatch: () => void;
  readonly onRestore: () => void;
  readonly onClear: () => void;
}

function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SelectionActionBar({
  count,
  selectedAmount,
  selectionState,
  onMatch,
  onSkip,
  onUnmatch,
  onRestore,
  onClear,
}: SelectionActionBarProps): React.JSX.Element {
  const plural = count === 1 ? '' : 's';
  return createPortal(
    <>
      {/* Vignette gradient behind the bar */}
      <div
        className="fixed bottom-0 left-0 md:left-55 right-0 h-48 pointer-events-none"
        style={{
          zIndex: Z_INDEX.DROPDOWN,
          background:
            'linear-gradient(to top, var(--monarch-bg-page) 0%, var(--monarch-bg-page) 30%, transparent 100%)',
        }}
      />
      {/* Floating centered bar */}
      <div
        className="fixed left-0 right-0 md:left-55 bottom-20 md:bottom-18 flex justify-center px-4 md:px-0 pointer-events-none"
        style={{ zIndex: Z_INDEX.POPOVER }}
      >
        <div
          className="pointer-events-auto rounded-xl px-4 py-2.5 flex items-center gap-4 slide-up"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            boxShadow:
              '0 -12px 48px color-mix(in srgb, var(--monarch-bg-page) 60%, transparent), 0 -4px 16px color-mix(in srgb, var(--monarch-bg-page) 40%, transparent), 0 0 80px color-mix(in srgb, var(--monarch-bg-page) 25%, transparent)',
          }}
          role="toolbar"
          aria-label="Selection actions"
        >
          <span className="text-sm text-(--monarch-text-muted) whitespace-nowrap">
            <span className="font-medium text-(--monarch-orange)">{count}</span> selected
            {' · '}
            <span className="font-medium text-(--monarch-orange)">
              {formatCurrency(selectedAmount)}
            </span>
          </span>
          <div className="flex items-center gap-2">
            {selectionState === 'unmatched' && (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer bg-(--monarch-success)/10 text-(--monarch-success) hover:bg-(--monarch-success)/20"
                  onClick={onMatch}
                  aria-label={`Match ${count} selected transaction${plural}`}
                >
                  <SearchCheck size={14} />
                  Match Refund{count > 1 ? ` (${count})` : ''}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer bg-(--monarch-text-muted)/10 text-(--monarch-text-muted) hover:bg-(--monarch-text-muted)/20"
                  onClick={onSkip}
                  aria-label={`Skip ${count} selected transaction${plural}`}
                >
                  <FlagOff size={14} />
                  Skip{count > 1 ? ` ${count}` : ''}
                </button>
              </>
            )}
            {selectionState === 'matched' && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer bg-(--monarch-orange)/10 text-(--monarch-orange) hover:bg-(--monarch-orange)/20"
                onClick={onUnmatch}
                aria-label={`Unmatch ${count} selected transaction${plural}`}
              >
                <X size={14} />
                Unmatch{count > 1 ? ` ${count}` : ''}
              </button>
            )}
            {selectionState === 'skipped' && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer bg-(--monarch-orange)/10 text-(--monarch-orange) hover:bg-(--monarch-orange)/20"
                onClick={onRestore}
                aria-label={`Restore ${count} selected transaction${plural}`}
              >
                <Undo2 size={14} />
                Restore{count > 1 ? ` ${count}` : ''}
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer text-(--monarch-text-muted) hover:bg-(--monarch-bg-hover)"
              onClick={onClear}
              aria-label="Clear selection"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
