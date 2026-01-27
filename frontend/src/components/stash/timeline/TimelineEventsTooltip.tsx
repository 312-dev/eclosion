/**
 * TimelineEventsTooltip - Hoverable tooltip showing list of timeline events
 *
 * Displays on hover over the events badge, allowing users to click
 * an event to highlight that date on the timeline chart.
 */

import type { NamedEvent } from '../../../types/timeline';
import { Z_INDEX } from '../../../constants';

interface EventsTooltipProps {
  readonly events: NamedEvent[];
  readonly itemConfigs: { itemId: string; name: string; color: string }[];
  readonly onEventClick: (date: string) => void;
}

/** Format event date for display */
function formatEventDate(dateStr: string): string {
  // dateStr is YYYY-MM format
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function TimelineEventsTooltip({ events, itemConfigs, onEventClick }: EventsTooltipProps) {
  const getItemName = (itemId: string) => {
    return itemConfigs.find((c) => c.itemId === itemId)?.name ?? 'Unknown';
  };

  const getItemColor = (itemId: string) => {
    return itemConfigs.find((c) => c.itemId === itemId)?.color ?? '#8b5cf6';
  };

  return (
    <div
      className="absolute left-0 top-full mt-1 rounded-md shadow-lg text-xs min-w-48 max-w-64"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        zIndex: Z_INDEX.TOOLTIP,
      }}
    >
      <div
        className="px-3 py-1.5 text-[11px] font-medium border-b"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          borderColor: 'var(--monarch-border)',
          color: 'var(--monarch-text-muted)',
        }}
      >
        Timeline Events
      </div>
      <div className="max-h-48 overflow-y-auto">
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onEventClick(event.date)}
            className="w-full px-3 py-2 text-left flex items-start gap-2 transition-colors hover:bg-(--monarch-bg-hover) border-b last:border-b-0"
            style={{ borderColor: 'var(--monarch-border-subtle, var(--monarch-border))' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{
                backgroundColor: getItemColor(event.itemId),
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate" style={{ color: 'var(--monarch-text-dark)' }}>
                {event.name}
              </div>
              <div
                className="flex items-center gap-1.5 mt-0.5"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                <span>{formatEventDate(event.date)}</span>
                <span>·</span>
                <span className="truncate">{getItemName(event.itemId)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
