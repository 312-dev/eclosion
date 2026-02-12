/**
 * SelectionActionBar
 *
 * Floating bar that appears when transactions are selected.
 * Portalled to document.body and centered above the footer,
 * showing selection count + amount and contextual action buttons.
 *
 * Actions (except Clear) are consolidated into a split-button dropdown:
 * - Primary action is the button label (e.g. Match Refund)
 * - Secondary actions + Export appear in the dropdown menu
 * - Clear remains a standalone button
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SearchCheck, FlagOff, Undo2, X, ChevronDown, Clock, Download } from 'lucide-react';
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
  readonly onExport: () => void;
}

function formatCurrency(amount: number): string {
  return `$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}

interface PrimaryAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  colorClass: string;
  borderClass: string;
  bgClass: string;
}

function getActions(
  state: SelectionState,
  handlers: {
    onMatch: () => void;
    onExpectedRefund: () => void;
    onSkip: () => void;
    onUnmatch: () => void;
    onRestore: () => void;
    onClearExpected: () => void;
    onExport: () => void;
  }
): { primary: PrimaryAction | null; menuItems: MenuItem[] } {
  const exportItem: MenuItem = {
    label: 'Print / Export',
    icon: <Download size={14} />,
    onClick: handlers.onExport,
  };

  switch (state) {
    case 'unmatched':
      return {
        primary: {
          label: 'Match Refund',
          icon: <SearchCheck size={14} />,
          onClick: handlers.onMatch,
          colorClass: 'text-(--monarch-success)',
          borderClass: 'border-(--monarch-success)/30',
          bgClass: 'bg-(--monarch-success)/10',
        },
        menuItems: [
          {
            label: 'Expected Refund',
            icon: <Clock size={14} />,
            onClick: handlers.onExpectedRefund,
            color: 'var(--monarch-accent)',
          },
          exportItem,
          {
            label: 'Ignore',
            icon: <FlagOff size={14} />,
            onClick: handlers.onSkip,
          },
        ],
      };
    case 'expected':
      return {
        primary: {
          label: 'Match Refund',
          icon: <SearchCheck size={14} />,
          onClick: handlers.onMatch,
          colorClass: 'text-(--monarch-success)',
          borderClass: 'border-(--monarch-success)/30',
          bgClass: 'bg-(--monarch-success)/10',
        },
        menuItems: [
          {
            label: 'Clear Expected',
            icon: <X size={14} />,
            onClick: handlers.onClearExpected,
            color: 'var(--monarch-accent)',
          },
          exportItem,
        ],
      };
    case 'matched':
      return {
        primary: {
          label: 'Unmatch',
          icon: <X size={14} />,
          onClick: handlers.onUnmatch,
          colorClass: 'text-(--monarch-orange)',
          borderClass: 'border-(--monarch-orange)/30',
          bgClass: 'bg-(--monarch-orange)/10',
        },
        menuItems: [exportItem],
      };
    case 'skipped':
      return {
        primary: {
          label: 'Restore',
          icon: <Undo2 size={14} />,
          onClick: handlers.onRestore,
          colorClass: 'text-(--monarch-orange)',
          borderClass: 'border-(--monarch-orange)/30',
          bgClass: 'bg-(--monarch-orange)/10',
        },
        menuItems: [exportItem],
      };
    case 'mixed':
      return {
        primary: null,
        menuItems: [exportItem],
      };
  }
}

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
  onExport,
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

  const { primary, menuItems } = getActions(selectionState, {
    onMatch,
    onExpectedRefund,
    onSkip,
    onUnmatch,
    onRestore,
    onClearExpected,
    onExport,
  });

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
            {/* Split-button: primary action + dropdown */}
            {primary ? (
              <div
                className={`relative inline-flex items-center rounded-lg border ${primary.borderClass} ${primary.bgClass}`}
                ref={dropdownRef}
              >
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-s-lg ${primary.colorClass} hover:brightness-110 transition-colors cursor-pointer`}
                  onClick={primary.onClick}
                  aria-label={`${primary.label} ${count} selected transaction${plural}`}
                >
                  {primary.icon}
                  {primary.label}
                </button>
                <div
                  className={`w-px self-stretch ${primary.colorClass.replace('text-', 'bg-')}/20`}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className={`inline-flex items-center justify-center px-2 py-1.5 rounded-e-lg ${primary.colorClass} hover:brightness-110 transition-colors cursor-pointer self-stretch`}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-label="More actions"
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
                    {menuItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-(--monarch-bg-hover) transition-colors cursor-pointer"
                        style={
                          item.color ? { color: item.color } : { color: 'var(--monarch-text-dark)' }
                        }
                        role="menuitem"
                        onClick={() => {
                          item.onClick();
                          setDropdownOpen(false);
                        }}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* mixed state: just an Export button, no split */
              <div ref={dropdownRef}>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-(--monarch-text-muted)/10 text-(--monarch-text-muted) hover:bg-(--monarch-text-muted)/20 transition-colors cursor-pointer"
                  onClick={onExport}
                  aria-label={`Print / Export ${count} selected transaction${plural}`}
                >
                  <Download size={14} />
                  Print / Export
                </button>
              </div>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-(--monarch-text-muted) hover:bg-(--monarch-bg-hover) transition-colors cursor-pointer"
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
