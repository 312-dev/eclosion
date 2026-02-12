/**
 * DateRangeFilter
 *
 * Dropdown for selecting date range presets (last week, month, quarter, etc.)
 * with optional custom date range inputs.
 */

import { useState, useCallback } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { Portal } from '../Portal';
import { useDropdown } from '../../hooks';
import { Z_INDEX } from '../../constants';
import type { DateRangePreset, DateRangeFilter as DateRangeFilterType } from '../../types/refunds';

interface DateRangeFilterProps {
  readonly value: DateRangeFilterType;
  readonly onChange: (filter: DateRangeFilterType) => void;
}

interface PresetOption {
  value: DateRangePreset;
  label: string;
}

const PRESETS: PresetOption[] = [
  { value: 'last_week', label: 'Last week' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'last_year', label: 'Last year' },
  { value: 'all_time', label: 'All time' },
  { value: 'custom', label: 'Custom range...' },
];

function getPresetLabel(preset: DateRangePreset): string {
  return PRESETS.find((p) => p.value === preset)?.label ?? 'Last month';
}

/** Calculate start/end dates from a preset. */
export function getDateRangeFromPreset(preset: DateRangePreset): {
  startDate: string | null;
  endDate: string | null;
} {
  if (preset === 'all_time') return { startDate: null, endDate: null };

  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  let start: Date;

  switch (preset) {
    case 'last_week':
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case 'last_month':
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case 'last_quarter':
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      break;
    case 'last_year':
      start = new Date(now);
      start.setDate(start.getDate() - 365);
      break;
    default:
      return { startDate: null, endDate: null };
  }

  return { startDate: start.toISOString().slice(0, 10), endDate: end };
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const { isOpen, toggle, close, position, triggerRef, dropdownRef } = useDropdown<
    HTMLDivElement,
    HTMLButtonElement
  >({ alignment: 'left' });
  const [customStart, setCustomStart] = useState(value.startDate ?? '');
  const [customEnd, setCustomEnd] = useState(value.endDate ?? '');

  const handlePresetSelect = useCallback(
    (preset: DateRangePreset) => {
      if (preset === 'custom') {
        onChange({ preset: 'custom', startDate: customStart || null, endDate: customEnd || null });
      } else {
        const dates = getDateRangeFromPreset(preset);
        onChange({ preset, ...dates });
        close();
      }
    },
    [onChange, customStart, customEnd, close]
  );

  const handleCustomApply = useCallback(() => {
    onChange({
      preset: 'custom',
      startDate: customStart || null,
      endDate: customEnd || null,
    });
    close();
  }, [onChange, customStart, customEnd, close]);

  const displayLabel = (() => {
    if (value.preset !== 'custom') return getPresetLabel(value.preset);
    if (value.startDate && value.endDate) {
      const fmt = (iso: string): string => {
        const [y, m, d] = iso.split('-');
        const dt = new Date(Number(y), Number(m) - 1, Number(d));
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      };
      return `${fmt(value.startDate)} – ${fmt(value.endDate)}`;
    }
    return 'Custom range';
  })();

  return (
    <div className="relative self-stretch">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 px-3 h-full text-sm rounded-lg border border-(--monarch-border) bg-(--monarch-bg-page) hover:border-(--monarch-text-muted) transition-colors"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select date range"
      >
        <span className="relative shrink-0">
          <Calendar size={14} className="text-(--monarch-text-muted)" aria-hidden="true" />
          {value.preset !== 'all_time' && (
            <span
              className="sm:hidden absolute -top-1 -right-1 w-2 h-2 rounded-full bg-(--monarch-orange)"
              aria-hidden="true"
            />
          )}
        </span>
        <span className="hidden sm:inline text-(--monarch-text-dark)">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`hidden sm:block text-(--monarch-text-muted) transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-(--z-index-dropdown)"
            onClick={() => close()}
            aria-hidden="true"
          />
          <div
            ref={dropdownRef}
            className="fixed rounded-lg shadow-lg border border-(--monarch-border) bg-(--monarch-bg-card) overflow-hidden z-(--z-index-dropdown)"
            style={{
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              right: position.right,
              width: 180,
              zIndex: Z_INDEX.DROPDOWN,
            }}
          >
            <nav aria-label="Date range presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-(--monarch-bg-hover) ${
                    value.preset === preset.value
                      ? 'text-(--monarch-orange) bg-(--monarch-orange)/10'
                      : 'text-(--monarch-text-dark)'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </nav>

            {value.preset === 'custom' && (
              <div className="border-t border-(--monarch-border) p-3 space-y-2">
                <div className="space-y-1.5">
                  <div>
                    <div className="text-[11px] text-(--monarch-text-muted)">From</div>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 text-sm rounded border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark)"
                      aria-label="Start date"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-(--monarch-text-muted)">To</div>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1 text-sm rounded border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark)"
                      aria-label="End date"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCustomApply}
                  className="w-full px-3 py-1.5 text-sm font-medium rounded-lg bg-(--monarch-orange) text-white hover:opacity-90 transition-opacity"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </Portal>
      )}
    </div>
  );
}
