/**
 * TimelineSidebar - Vertical legend with live projection values
 *
 * Shows each stash item's projected balance at the cursor/hover position,
 * along with APY controls. Replaces the horizontal TimelineLegend.
 */

import { useState, useCallback } from 'react';
import type { TimelineItemConfig, ProjectedCardState } from '../../../types/timeline';
import { formatAPY } from '../../../utils/hysaCalculations';
import { parseDateString } from '../../../utils/timelineProjection';
import type { TimelineResolution } from '../../../types/timeline';

/** Format date with full month name and year for sidebar display */
function formatSidebarDate(dateStr: string, resolution: TimelineResolution): string {
  const { year, month, day } = parseDateString(dateStr);
  const date = new Date(year, month - 1, day);

  if (resolution === 'yearly') {
    return String(year);
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

interface TimelineSidebarProps {
  readonly itemConfigs: TimelineItemConfig[];
  /** The date to display projections for (locked cursor or hover) */
  readonly displayDate: string | null;
  /** Whether the current date is a locked cursor (true) or just hover (false) */
  readonly isLocked: boolean;
  /** Projections at the display date */
  readonly projections: Record<string, ProjectedCardState> | null;
  /** Current resolution for date formatting */
  readonly resolution: TimelineResolution;
  /** Called when APY is changed for an item */
  readonly onApyChange: (itemId: string, apy: number) => void;
  /** Called when user clicks Clear Selection */
  readonly onClearCursor: () => void;
  /** Currency formatter */
  readonly formatCurrency: (amount: number) => string;
}

interface ApyEditorProps {
  readonly currentApy: number;
  readonly onSave: (apy: number) => void;
  readonly onCancel: () => void;
}

function ApyEditor({ currentApy, onSave, onCancel }: ApyEditorProps) {
  const [value, setValue] = useState(String(currentApy * 100));

  const handleSave = useCallback(() => {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      onSave(parsed / 100);
    }
    onCancel();
  }, [value, onSave, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    },
    [handleSave, onCancel]
  );

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        className="w-14 px-1.5 py-0.5 text-xs rounded text-right"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
          color: 'var(--monarch-text-dark)',
        }}
        min="0"
        max="100"
        step="0.1"
        autoFocus
        aria-label="APY percentage"
      />
      <span className="text-[10px]" style={{ color: 'var(--monarch-text-muted)' }}>
        %
      </span>
    </div>
  );
}

interface SidebarItemProps {
  readonly config: TimelineItemConfig;
  readonly projection: ProjectedCardState | undefined;
  readonly onApyChange: (itemId: string, apy: number) => void;
  readonly formatCurrency: (amount: number) => string;
}

function SidebarItem({ config, projection, onApyChange, formatCurrency }: SidebarItemProps) {
  const [isEditingApy, setIsEditingApy] = useState(false);

  const handleApySave = useCallback(
    (apy: number) => {
      onApyChange(config.itemId, apy);
      setIsEditingApy(false);
    },
    [config.itemId, onApyChange]
  );

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 border-b"
      style={{ borderColor: 'var(--monarch-border-subtle, var(--monarch-border))' }}
    >
      {/* Color dot */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: config.color }}
      />

      {/* Name - takes available space */}
      <span
        className="text-sm font-medium truncate flex-1 min-w-0"
        style={{ color: 'var(--monarch-text-dark)' }}
        title={config.name}
      >
        {config.name}
      </span>

      {/* Projected balance - fixed width for alignment */}
      <span
        className="text-sm font-semibold tabular-nums shrink-0 text-right w-16"
        style={{ color: 'var(--monarch-text-dark)' }}
      >
        {projection ? formatCurrency(projection.projectedBalance) : '—'}
      </span>

      {/* APY control */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          APY:
        </span>
        {isEditingApy ? (
          <ApyEditor
            currentApy={config.apy}
            onSave={handleApySave}
            onCancel={() => setIsEditingApy(false)}
          />
        ) : (
          <button
            onClick={() => setIsEditingApy(true)}
            className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-(--monarch-bg-hover)"
            style={{
              color: config.apy > 0 ? 'var(--monarch-success)' : 'var(--monarch-text-muted)',
              border: `1px solid ${config.apy > 0 ? 'var(--monarch-success)' : 'var(--monarch-border)'}`,
            }}
            title={`Click to edit APY for ${config.name}`}
            aria-label={`Edit APY for ${config.name}, currently ${formatAPY(config.apy)}`}
          >
            {config.apy > 0 ? formatAPY(config.apy) : 'Set'}
          </button>
        )}
      </div>
    </div>
  );
}

export function TimelineSidebar({
  itemConfigs,
  displayDate,
  isLocked,
  projections,
  resolution,
  onApyChange,
  onClearCursor,
  formatCurrency,
}: TimelineSidebarProps) {
  const visibleItems = itemConfigs.filter((c) => c.isVisible);

  return (
    <div
      className="w-80 border-l flex flex-col shrink-0 h-full"
      style={{
        borderColor: 'var(--monarch-border)',
        backgroundColor: 'var(--monarch-bg-card)',
      }}
    >
      {/* Header - shows cursor date or hint */}
      <div
        className="px-3 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        {displayDate ? (
          <>
            <span className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              {formatSidebarDate(displayDate, resolution)}
            </span>
            {isLocked && (
              <button
                onClick={onClearCursor}
                className="text-[10px] px-1.5 py-0.5 rounded transition-colors hover:bg-(--monarch-bg-page)"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                Clear
              </button>
            )}
          </>
        ) : (
          <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            Hover chart to see projections
          </span>
        )}
      </div>

      {/* Item list - scrollable when items exceed container height */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {visibleItems.map((config) => (
          <SidebarItem
            key={config.itemId}
            config={config}
            projection={projections?.[config.itemId]}
            onApyChange={onApyChange}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>
    </div>
  );
}
