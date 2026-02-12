/**
 * SelectionActionBar
 *
 * Floating bar that appears when transactions are selected.
 * Portalled to document.body and centered above the footer,
 * showing selection count + amount and contextual action buttons.
 *
 * Buttons shown depend on selection state:
 * - unmatched → Match (with Expected Refund dropdown), Skip
 * - expected  → Match, Clear Expected
 * - matched   → Unmatch
 * - skipped   → Restore
 * - mixed     → (no actions, just Clear)
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SearchCheck, FlagOff, Undo2, X, ChevronDown, Clock } from 'lucide-react';
import { Z_INDEX } from '../../constants';
import type { SelectionState } from './useRefundsSelection';

interface SelectionActionBarProps {
  readonly count: number;
  readonly selectedAmount: number;
  readonly selectionState: SelectionState;
  readonly onMatch: () => void;
  readonly onExpectedRefund: () => void;
  readonly onSkip: () => void;
  readonly onUnmatch: () => void;
  readonly onRestore: () => void;
  readonly onClearExpected: () => void;
  readonly onClear: () => void;
}

function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const BTN_BASE =
  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer';

export function SelectionActionBar({
  count,
  selectedAmount,
  selectionState,
  onMatch,
  onExpectedRefund,
  onSkip,
  onUnmatch,
  onRestore,
  onClearExpected,
  onClear,
}: SelectionActionBarProps): React.JSX.Element {
  const plural = count === 1 ? '' : 's';
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

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
                <div
                  className="relative inline-flex items-center rounded-lg border border-(--monarch-success)/30 bg-(--monarch-success)/10"
                  ref={dropdownRef}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-s-lg text-(--monarch-success) hover:bg-(--monarch-success)/10 transition-colors cursor-pointer"
                    onClick={onMatch}
                    aria-label={`Match ${count} selected transaction${plural}`}
                  >
                    <SearchCheck size={14} />
                    Match Refund
                  </button>
                  <div className="w-px self-stretch bg-(--monarch-success)/20" aria-hidden="true" />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center px-2 py-1.5 rounded-e-lg text-(--monarch-success) hover:bg-(--monarch-success)/10 transition-colors cursor-pointer self-stretch"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    aria-label="More match options"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="menu"
                  >
                    <ChevronDown size={12} />
                  </button>
                  {dropdownOpen && (
                    <div
                      className="absolute bottom-full right-0 mb-1 rounded-lg py-1 whitespace-nowrap"
                      style={{
                        backgroundColor: 'var(--monarch-bg-card)',
                        border: '1px solid var(--monarch-border)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: Z_INDEX.DROPDOWN,
                      }}
                      role="menu"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-(--monarch-bg-hover) transition-colors cursor-pointer"
                        style={{ color: 'var(--monarch-accent)' }}
                        role="menuitem"
                        onClick={() => {
                          onExpectedRefund();
                          setDropdownOpen(false);
                        }}
                      >
                        <Clock size={14} />
                        Expected Refund
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={`${BTN_BASE} bg-(--monarch-text-muted)/10 text-(--monarch-text-muted) hover:bg-(--monarch-text-muted)/20`}
                  onClick={onSkip}
                  aria-label={`Skip ${count} selected transaction${plural}`}
                >
                  <FlagOff size={14} />
                  Skip
                </button>
              </>
            )}
            {selectionState === 'expected' && (
              <>
                <button
                  type="button"
                  className={`${BTN_BASE} bg-(--monarch-success)/10 text-(--monarch-success) hover:bg-(--monarch-success)/20`}
                  onClick={onMatch}
                  aria-label={`Match ${count} selected transaction${plural}`}
                >
                  <SearchCheck size={14} />
                  Match Refund{count > 1 ? ` (${count})` : ''}
                </button>
                <button
                  type="button"
                  className={`${BTN_BASE} bg-(--monarch-accent)/10 hover:bg-(--monarch-accent)/20`}
                  style={{ color: 'var(--monarch-accent)' }}
                  onClick={onClearExpected}
                  aria-label={`Clear expected refund from ${count} transaction${plural}`}
                >
                  <X size={14} />
                  Clear Expected{count > 1 ? ` (${count})` : ''}
                </button>
              </>
            )}
            {selectionState === 'matched' && (
              <button
                type="button"
                className={`${BTN_BASE} bg-(--monarch-orange)/10 text-(--monarch-orange) hover:bg-(--monarch-orange)/20`}
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
                className={`${BTN_BASE} bg-(--monarch-orange)/10 text-(--monarch-orange) hover:bg-(--monarch-orange)/20`}
                onClick={onRestore}
                aria-label={`Restore ${count} selected transaction${plural}`}
              >
                <Undo2 size={14} />
                Restore{count > 1 ? ` ${count}` : ''}
              </button>
            )}
            <button
              type="button"
              className={`${BTN_BASE} text-(--monarch-text-muted) hover:bg-(--monarch-bg-hover)`}
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
