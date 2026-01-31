/**
 * Month Year Selector
 *
 * Styled navigation bar with HTML5 month input and navigation arrows.
 * Features a subtle card design with accent styling.
 */

import { useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { getCurrentMonthKey, navigateMonth, getMonthDifference } from '../../utils/dateRangeUtils';
import type { MonthKey } from '../../types/notes';

interface MonthYearSelectorProps {
  readonly currentMonth: MonthKey;
  readonly onMonthChange: (month: MonthKey) => void;
  readonly minMonth?: MonthKey;
  readonly maxMonth?: MonthKey;
}

export function MonthYearSelector({
  currentMonth,
  onMonthChange,
  minMonth,
  maxMonth,
}: MonthYearSelectorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const currentMonthKey = getCurrentMonthKey();
  const isCurrentMonth = currentMonth === currentMonthKey;
  const monthDiff = getMonthDifference(currentMonthKey, currentMonth);

  // Check if navigation is possible within bounds
  const canGoPrev = !minMonth || currentMonth > minMonth;
  const canGoNext = !maxMonth || currentMonth < maxMonth;

  const handlePrevMonth = () => {
    if (canGoPrev) {
      onMonthChange(navigateMonth(currentMonth, -1));
    }
  };
  const handleNextMonth = () => {
    if (canGoNext) {
      onMonthChange(navigateMonth(currentMonth, 1));
    }
  };
  const handleGoToToday = () => onMonthChange(currentMonthKey);

  const handleMonthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onMonthChange(value as MonthKey);
    }
  };

  // Format relative time indicator
  const relativeLabel = (() => {
    if (isCurrentMonth) return null;
    const abs = Math.abs(monthDiff);
    const dir = monthDiff > 0 ? 'ahead' : 'ago';
    if (abs === 1) {
      const singleMonthLabel = monthDiff > 0 ? 'Next month' : 'Last month';
      return singleMonthLabel;
    }
    if (abs < 12) {
      return `${abs} months ${dir}`;
    }
    const y = Math.floor(abs / 12);
    const m = abs % 12;
    if (m === 0) {
      const yearLabel = y === 1 ? 'year' : 'years';
      return `${y} ${yearLabel} ${dir}`;
    }
    return `${y}y ${m}m ${dir}`;
  })();

  return (
    <div
      className="flex-1 pb-4 mb-2"
      style={{ borderBottom: '1px solid var(--monarch-border)' }}
      data-tour="month-navigator"
    >
      <div className="flex items-center justify-between">
        {/* Left: Previous month button */}
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          className={`p-2 rounded-lg transition-colors ${
            canGoPrev
              ? 'hover:bg-(--monarch-bg-hover) icon-btn-hover'
              : 'opacity-30 cursor-not-allowed'
          }`}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} style={{ color: 'var(--monarch-text-muted)' }} />
        </button>

        {/* Center: Calendar icon + Month input */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--monarch-bg-hover)' }}>
              <Calendar size={18} style={{ color: 'var(--monarch-text-muted)' }} />
            </div>
            <input
              ref={inputRef}
              type="month"
              value={currentMonth}
              onChange={handleMonthInputChange}
              onClick={() => inputRef.current?.showPicker()}
              min={minMonth}
              max={maxMonth}
              className="text-xl font-semibold cursor-pointer bg-transparent border-none text-center focus:outline-none [&::-webkit-calendar-picker-indicator]:hidden"
              style={{ color: 'var(--monarch-text-dark)' }}
              aria-label="Select month and year"
            />
          </div>

          {/* Relative time indicator or current month badge */}
          {(() => {
            if (isCurrentMonth) {
              return (
                <span
                  className="mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: 'var(--monarch-success-bg)',
                    color: 'var(--monarch-success)',
                  }}
                >
                  Current Month
                </span>
              );
            }
            if (relativeLabel) {
              return (
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="mt-1 flex items-center gap-1 px-2 py-0.5 text-xs rounded-full hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--monarch-bg-page)',
                    color: 'var(--monarch-text-muted)',
                  }}
                  aria-label={`${relativeLabel}. Click to return to current month.`}
                >
                  <RotateCcw size={10} />
                  {relativeLabel}
                </button>
              );
            }
            return null;
          })()}
        </div>

        {/* Right: Next month button */}
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={!canGoNext}
          className={`p-2 rounded-lg transition-colors ${
            canGoNext
              ? 'hover:bg-(--monarch-bg-hover) icon-btn-hover'
              : 'opacity-30 cursor-not-allowed'
          }`}
          aria-label="Next month"
        >
          <ChevronRight size={20} style={{ color: 'var(--monarch-text-muted)' }} />
        </button>
      </div>
    </div>
  );
}
