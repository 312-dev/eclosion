/**
 * EventRow Component
 *
 * A single event row within a stash item in the Distribute wizard.
 * Shows: [-] [$ amount] [/mo or 1x dropdown] [Month picker]
 *
 * Uses native <input type="month"> where supported (Chrome, Firefox, Edge).
 * Falls back to custom dropdown for Safari.
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../icons';
import { Z_INDEX } from '../../constants';
import type { StashEvent, StashEventType } from '../../types';
import { getAvailableMonths, formatMonthKeyShort, getCurrentMonthKey } from '../../utils/eventProjection';

interface EventRowProps {
  readonly event: StashEvent;
  readonly onUpdate: (updates: Partial<StashEvent>) => void;
  readonly onRemove: () => void;
}

/**
 * Detect if native month input is supported.
 * Safari doesn't support type="month" and falls back to text.
 */
function isNativeMonthInputSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const input = document.createElement('input');
  input.setAttribute('type', 'month');
  // If the browser doesn't support month, it falls back to "text"
  return input.type === 'month';
}

export function EventRow({ event, onUpdate, onRemove }: EventRowProps) {
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [typeDropdownStyle, setTypeDropdownStyle] = useState<React.CSSProperties>({});
  const [monthDropdownStyle, setMonthDropdownStyle] = useState<React.CSSProperties>({});

  const typeRef = useRef<HTMLButtonElement>(null);
  const monthRef = useRef<HTMLButtonElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const monthMenuRef = useRef<HTMLDivElement>(null);

  const typeMenuId = useId();
  const monthMenuId = useId();

  // Check native support once
  const supportsNativeMonth = useMemo(() => isNativeMonthInputSupported(), []);

  // Get available months - for /mo events, exclude current month (use main input instead)
  const currentMonth = useMemo(() => getCurrentMonthKey(), []);
  const allAvailableMonths = useMemo(() => getAvailableMonths(), []);
  const availableMonths = useMemo(
    () => event.type === 'mo'
      ? allAvailableMonths.filter((m) => m.value !== currentMonth)
      : allAvailableMonths,
    [event.type, allAvailableMonths, currentMonth]
  );
  const minMonth = availableMonths[0]?.value ?? '';
  const maxMonth = availableMonths.at(-1)?.value ?? '';

  // Position type dropdown when opened
  useLayoutEffect(() => {
    if (isTypeOpen && typeRef.current) {
      const rect = typeRef.current.getBoundingClientRect();
      setTypeDropdownStyle({
        position: 'fixed',
        left: rect.left,
        top: rect.bottom + 2,
        width: rect.width,
        zIndex: Z_INDEX.TOOLTIP,
      });
    }
  }, [isTypeOpen]);

  // Position month dropdown when opened (Safari fallback only)
  useLayoutEffect(() => {
    if (isMonthOpen && monthRef.current) {
      const rect = monthRef.current.getBoundingClientRect();
      setMonthDropdownStyle({
        position: 'fixed',
        left: rect.left,
        top: rect.bottom + 2,
        width: rect.width,
        maxHeight: 160,
        overflowY: 'auto',
        zIndex: Z_INDEX.TOOLTIP,
      });
    }
  }, [isMonthOpen]);

  // Close on outside click (for dropdowns)
  useEffect(() => {
    if (!isTypeOpen && !isMonthOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        isTypeOpen &&
        typeRef.current &&
        !typeRef.current.contains(target) &&
        typeMenuRef.current &&
        !typeMenuRef.current.contains(target)
      ) {
        setIsTypeOpen(false);
      }
      if (
        isMonthOpen &&
        monthRef.current &&
        !monthRef.current.contains(target) &&
        monthMenuRef.current &&
        !monthMenuRef.current.contains(target)
      ) {
        setIsMonthOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTypeOpen, isMonthOpen]);

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = Number.parseInt(e.target.value, 10);
      const amount = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
      onUpdate({ amount });
    },
    [onUpdate]
  );

  const handleTypeSelect = useCallback(
    (type: StashEventType) => {
      // If switching to /mo and currently on current month, bump to next month
      if (type === 'mo' && event.month === currentMonth) {
        const nextMonth = allAvailableMonths[1]?.value;
        if (nextMonth) {
          onUpdate({ type, month: nextMonth });
        } else {
          onUpdate({ type });
        }
      } else {
        onUpdate({ type });
      }
      setIsTypeOpen(false);
    },
    [onUpdate, event.month, currentMonth, allAvailableMonths]
  );

  const handleMonthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const month = e.target.value;
      if (month) {
        onUpdate({ month });
      }
    },
    [onUpdate]
  );

  const handleMonthSelect = useCallback(
    (month: string) => {
      onUpdate({ month });
      setIsMonthOpen(false);
    },
    [onUpdate]
  );

  const typeLabel = event.type === 'mo' ? '/mo' : '1x';
  const monthLabel = formatMonthKeyShort(event.month);

  return (
    <div className="flex items-center gap-1 py-1 justify-end">
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-0.5 rounded transition-colors text-monarch-text-muted hover:text-monarch-error"
        aria-label="Remove event"
      >
        <Icons.CircleMinus size={12} />
      </button>

      {/* Amount input with type dropdown */}
      <div className="flex items-center w-28 rounded border border-monarch-border bg-monarch-bg-card text-xs">
        <span className="pl-1.5 text-monarch-text-muted">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={event.amount || ''}
          onChange={handleAmountChange}
          placeholder="0"
          className="w-14 text-right font-medium bg-transparent outline-none text-monarch-text-dark placeholder:text-monarch-text-muted tabular-nums pl-0.5 pr-1.5 py-0.5"
          aria-label="Event amount"
        />
        <button
          ref={typeRef}
          onClick={() => {
            setIsTypeOpen(!isTypeOpen);
            setIsMonthOpen(false);
          }}
          className="flex items-center justify-center min-w-8 px-1 py-0.5 font-medium text-monarch-text-muted hover:text-monarch-text-dark transition-colors border-l border-monarch-border"
          aria-haspopup="listbox"
          aria-expanded={isTypeOpen}
          aria-controls={typeMenuId}
        >
          {typeLabel}
          <Icons.ChevronDown size={8} />
        </button>
      </div>

      {/* Month selector - native input with label trigger, or custom dropdown for Safari */}
      {supportsNativeMonth ? (
        <div
          className="relative flex items-center justify-center w-18 gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded border border-monarch-border bg-monarch-bg-card text-monarch-text-muted hover:text-monarch-text-dark hover:bg-monarch-bg-hover transition-colors cursor-pointer"
          onClick={() => {
            // showPicker() requires user gesture - this click handler provides it
            monthInputRef.current?.showPicker();
          }}
        >
          {monthLabel}
          <Icons.ChevronDown size={8} />
          {/* Hidden input - showPicker() opens the native picker */}
          <input
            ref={monthInputRef}
            type="month"
            value={event.month}
            onChange={handleMonthChange}
            min={minMonth}
            max={maxMonth}
            className="absolute inset-0 opacity-0 pointer-events-none"
            aria-label="Event month"
            tabIndex={-1}
          />
        </div>
      ) : (
        <button
          ref={monthRef}
          onClick={() => {
            setIsMonthOpen(!isMonthOpen);
            setIsTypeOpen(false);
          }}
          className="flex items-center justify-center w-18 gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded border border-monarch-border bg-monarch-bg-card text-monarch-text-muted hover:text-monarch-text-dark hover:bg-monarch-bg-hover transition-colors"
          aria-haspopup="listbox"
          aria-expanded={isMonthOpen}
          aria-controls={monthMenuId}
        >
          {monthLabel}
          <Icons.ChevronDown size={8} />
        </button>
      )}

      {/* Type dropdown portal */}
      {isTypeOpen &&
        createPortal(
          <div
            ref={typeMenuRef}
            role="listbox"
            id={typeMenuId}
            className="py-0.5 rounded shadow-lg text-xs bg-monarch-bg-card border border-monarch-border min-w-10"
            style={typeDropdownStyle}
          >
            <button
              role="option"
              aria-selected={event.type === 'mo'}
              onClick={() => handleTypeSelect('mo')}
              className={`w-full text-left px-1.5 py-0.5 transition-colors ${
                event.type === 'mo'
                  ? 'bg-monarch-bg-hover text-monarch-text-dark'
                  : 'text-monarch-text-muted hover:bg-monarch-bg-hover hover:text-monarch-text-dark'
              }`}
            >
              /mo
            </button>
            <button
              role="option"
              aria-selected={event.type === '1x'}
              onClick={() => handleTypeSelect('1x')}
              className={`w-full text-left px-1.5 py-0.5 transition-colors ${
                event.type === '1x'
                  ? 'bg-monarch-bg-hover text-monarch-text-dark'
                  : 'text-monarch-text-muted hover:bg-monarch-bg-hover hover:text-monarch-text-dark'
              }`}
            >
              1x
            </button>
          </div>,
          document.body
        )}

      {/* Month dropdown portal (Safari fallback only) */}
      {!supportsNativeMonth &&
        isMonthOpen &&
        createPortal(
          <div
            ref={monthMenuRef}
            role="listbox"
            id={monthMenuId}
            className="py-0.5 rounded shadow-lg text-xs bg-monarch-bg-card border border-monarch-border"
            style={monthDropdownStyle}
          >
            {availableMonths.map((m) => (
              <button
                key={m.value}
                role="option"
                aria-selected={event.month === m.value}
                onClick={() => handleMonthSelect(m.value)}
                className={`w-full text-left px-1.5 py-0.5 transition-colors ${
                  event.month === m.value
                    ? 'bg-monarch-bg-hover text-monarch-text-dark'
                    : 'text-monarch-text-muted hover:bg-monarch-bg-hover hover:text-monarch-text-dark'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
