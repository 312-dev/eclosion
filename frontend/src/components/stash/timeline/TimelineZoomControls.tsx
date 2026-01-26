/**
 * TimelineZoomControls - Range presets
 *
 * Provides range presets (1Y, 5Y, 15Y, 25Y, 50Y).
 */

interface TimelineZoomControlsProps {
  readonly rangeMonths: number;
  readonly onRangeChange: (months: number) => void;
}

const RANGE_PRESETS = [
  { label: '1Y', months: 12 },
  { label: '5Y', months: 60 },
  { label: '15Y', months: 180 },
  { label: '25Y', months: 300 },
  { label: '50Y', months: 600 },
];

export function TimelineZoomControls({ rangeMonths, onRangeChange }: TimelineZoomControlsProps) {
  return (
    <div className="flex items-center gap-1">
      {RANGE_PRESETS.map((preset) => {
        const isActive = rangeMonths === preset.months;

        return (
          <button
            key={preset.label}
            onClick={() => onRangeChange(preset.months)}
            className="px-2 py-1 text-xs font-medium rounded transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--monarch-bg-page)' : 'transparent',
              color: isActive ? 'var(--monarch-text-dark)' : 'var(--monarch-text-muted)',
            }}
            title={`${preset.months / 12} year range`}
            aria-label={`${preset.label} range`}
            aria-pressed={isActive}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
