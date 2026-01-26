/**
 * TimelineEventTooltip
 *
 * Tooltip content shown when hovering over an event marker on the timeline.
 * Shows event name, date, type, and amount.
 */

import type { NamedEvent } from '../../../types/timeline';
import { formatDateDisplay } from '../../../utils/timelineProjection';

interface TimelineEventTooltipProps {
  readonly event: NamedEvent;
  readonly itemName: string;
  readonly formatCurrency: (amount: number) => string;
}

export function TimelineEventTooltip({
  event,
  itemName,
  formatCurrency,
}: TimelineEventTooltipProps) {
  const formattedDate = formatDateDisplay(event.date, 'monthly', true);

  return (
    <div className="text-sm min-w-48">
      <div
        className="font-medium pb-1.5 mb-1.5 border-b"
        style={{
          color: 'var(--monarch-text-dark)',
          borderColor: 'var(--monarch-border)',
        }}
      >
        {event.name}
      </div>
      <div className="space-y-1">
        <div
          className="flex justify-between text-xs"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          <span>Date</span>
          <span style={{ color: 'var(--monarch-text-dark)' }}>{formattedDate}</span>
        </div>
        <div
          className="flex justify-between text-xs"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          <span>Type</span>
          <span style={{ color: 'var(--monarch-text-dark)' }}>
            {event.type === 'deposit' ? 'One-time deposit' : 'Rate change'}
          </span>
        </div>
        <div
          className="flex justify-between text-xs"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          <span>{event.type === 'deposit' ? 'Amount' : 'New rate'}</span>
          <span style={{ color: 'var(--monarch-text-dark)' }}>
            {event.type === 'deposit'
              ? `+${formatCurrency(event.amount)}`
              : `${formatCurrency(event.amount)}/mo`}
          </span>
        </div>
        <div
          className="flex justify-between text-xs"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          <span>Affects</span>
          <span
            className="truncate max-w-24 text-right"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            {itemName}
          </span>
        </div>
      </div>
      <div
        className="mt-2 pt-1.5 border-t text-xs text-center"
        style={{
          color: 'var(--monarch-text-muted)',
          borderColor: 'var(--monarch-border)',
        }}
      >
        Click to edit
      </div>
    </div>
  );
}
