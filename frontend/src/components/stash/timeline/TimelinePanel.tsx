/**
 * TimelinePanel - Container for timeline visualization
 *
 * Orchestrates the chart, zoom controls, and sidebar with live projections.
 * Always visible in hypothesize mode, positioned above the card grid.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Plus, Calendar } from 'lucide-react';
import type { StashItem } from '../../../types';
import type { NamedEvent, ProjectedCardState } from '../../../types/timeline';
import { useDistributionMode } from '../../../context/DistributionModeContext';
import { useTimelineProjection } from '../../../hooks/useTimelineProjection';
import { useTimelineZoom } from '../../../hooks/useTimelineZoom';
import { TimelineChart } from './TimelineChart';
import { TimelineZoomControls } from './TimelineZoomControls';
import { TimelineSidebar } from './TimelineSidebar';
import { TimelineEditPopover } from './TimelineEditPopover';
import { TimelineEventsTooltip } from './TimelineEventsTooltip';

interface TimelinePanelProps {
  readonly items: StashItem[];
  readonly formatCurrency: (amount: number) => string;
}

export function TimelinePanel({ items, formatCurrency }: TimelinePanelProps) {
  const {
    mode,
    cursorDate,
    setCursorDate,
    setItemApy,
    addTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
    timelineEvents,
  } = useDistributionMode();

  const { dataPoints, itemConfigs, cursorProjections } = useTimelineProjection({ items });

  const { resolution, setDateRange, rangeMonths } = useTimelineZoom();

  const [showEventPopover, setShowEventPopover] = useState(false);
  const [editingEvent, setEditingEvent] = useState<NamedEvent | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [doubleClickDate, setDoubleClickDate] = useState<string | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [showEventsTooltip, setShowEventsTooltip] = useState(false);
  const eventsTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addEventButtonRef = useRef<HTMLDivElement>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (eventsTooltipTimeoutRef.current) {
        clearTimeout(eventsTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Display priority: locked cursor > hover
  const displayDate = cursorDate || hoverDate;
  const isLocked = cursorDate !== null;

  // Build projections for hover from dataPoints (cursor projections come from useTimelineProjection)
  const displayProjections = useMemo((): Record<string, ProjectedCardState> | null => {
    if (cursorDate && cursorProjections) return cursorProjections;
    if (!hoverDate || dataPoints.length === 0) return null;

    const dataPoint = dataPoints.find((dp) => dp.date === hoverDate);
    if (!dataPoint) return null;

    const projections: Record<string, ProjectedCardState> = {};
    for (const config of itemConfigs) {
      const balance = dataPoint.balances[config.itemId] ?? 0;
      const status = balance >= config.targetAmount ? 'funded' : 'on_track';
      const progress = config.targetAmount > 0 ? (balance / config.targetAmount) * 100 : 0;
      projections[config.itemId] = {
        itemId: config.itemId,
        projectedBalance: balance,
        projectedStatus: status,
        projectedProgressPercent: progress,
        monthsFromNow: 0,
        interestEarned: dataPoint.interestEarned?.[config.itemId] ?? 0,
        projectedMonthlyTarget: config.monthlyRate,
      };
    }
    return projections;
  }, [cursorDate, cursorProjections, hoverDate, dataPoints, itemConfigs]);

  const handleCursorChange = useCallback(
    (date: string | null) => {
      setCursorDate(date);
    },
    [setCursorDate]
  );

  const handleApyChange = useCallback(
    (itemId: string, apy: number) => {
      setItemApy(itemId, apy);
    },
    [setItemApy]
  );

  const handleSaveEvent = useCallback(
    (eventData: Omit<NamedEvent, 'id' | 'createdAt'>) => {
      if (editingEvent) {
        // Update existing event
        updateTimelineEvent(editingEvent.id, eventData);
        setEditingEvent(null);
      } else {
        // Create new event
        addTimelineEvent(eventData);
        setShowEventPopover(false);
      }
    },
    [editingEvent, updateTimelineEvent, addTimelineEvent]
  );

  const handleEditEvent = useCallback((event: NamedEvent) => {
    setEditingEvent(event);
    setShowEventPopover(false); // Close create popover if open
  }, []);

  const handleDeleteEvent = useCallback(
    (eventId: string) => {
      deleteTimelineEvent(eventId);
    },
    [deleteTimelineEvent]
  );

  const handleClosePopover = useCallback(() => {
    setShowEventPopover(false);
    setEditingEvent(null);
    setDoubleClickDate(null);
    setClickPosition(null);
  }, []);

  const handleHover = useCallback((date: string | null) => {
    setHoverDate(date);
  }, []);

  const handleClearCursor = useCallback(() => {
    setCursorDate(null);
  }, [setCursorDate]);

  const handleRangeChange = useCallback(
    (months: number) => {
      const today = new Date().toISOString().slice(0, 10);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);
      setDateRange(today, endDate.toISOString().slice(0, 10));
    },
    [setDateRange]
  );

  const handleAddEventClick = useCallback(() => {
    setClickPosition(null); // Clear click position so it anchors to button
    setShowEventPopover(!showEventPopover);
  }, [showEventPopover]);

  // Normalize year-only dates to a valid month, ensuring it's not in the past
  const normalizeToMonth = useCallback((date: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentYear = currentMonth.slice(0, 4);

    // If it's a year-only date (e.g., "2027")
    if (/^\d{4}$/.test(date)) {
      // If current year, use current month; otherwise use January
      return date === currentYear ? currentMonth : `${date}-01`;
    }

    // If it's a full month date, ensure it's not before current month
    return date < currentMonth ? currentMonth : date;
  }, []);

  // Double-click on chart opens add event modal with that date at click position
  const handleChartDoubleClick = useCallback(
    (date: string, position: { x: number; y: number }) => {
      setDoubleClickDate(normalizeToMonth(date));
      setClickPosition(position);
      setEditingEvent(null);
      setShowEventPopover(true);
    },
    [normalizeToMonth]
  );

  // Only show in hypothesize mode
  if (mode !== 'hypothesize') {
    return null;
  }

  // Get current month for new events
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div
      className="rounded-lg mb-6"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        overflow: 'visible', // Allow tooltips to escape
      }}
    >
      {/* Header with zoom controls */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--monarch-border)' }}
      >
        {/* Left: Title + events count */}
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
            Timeline Projection
          </span>
          {timelineEvents.length > 0 && (
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover container for tooltip; button inside handles keyboard/click
            <div
              className="relative"
              onMouseEnter={() => {
                if (eventsTooltipTimeoutRef.current) {
                  clearTimeout(eventsTooltipTimeoutRef.current);
                  eventsTooltipTimeoutRef.current = null;
                }
                setShowEventsTooltip(true);
              }}
              onMouseLeave={() => {
                eventsTooltipTimeoutRef.current = setTimeout(() => {
                  setShowEventsTooltip(false);
                }, 150);
              }}
            >
              <button
                type="button"
                onClick={() => setShowEventsTooltip((prev) => !prev)}
                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-colors hover:bg-(--monarch-bg-hover)"
                style={{
                  backgroundColor: 'var(--monarch-bg-page)',
                  color: 'var(--monarch-text-muted)',
                }}
                aria-label="View timeline events"
                aria-expanded={showEventsTooltip}
              >
                <Calendar size={12} />
                {timelineEvents.length} event{timelineEvents.length === 1 ? '' : 's'}
              </button>
              {showEventsTooltip && (
                <TimelineEventsTooltip
                  events={timelineEvents}
                  itemConfigs={itemConfigs}
                  onEventClick={handleCursorChange}
                />
              )}
            </div>
          )}
        </div>

        {/* Center: Zoom controls */}
        <TimelineZoomControls rangeMonths={rangeMonths} onRangeChange={handleRangeChange} />

        {/* Right: Add Event button */}
        <div ref={addEventButtonRef} className="relative">
          <button
            onClick={handleAddEventClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              backgroundColor: 'var(--hypothesize-accent, #8b5cf6)',
              color: 'white',
            }}
          >
            <Plus size={14} />
            Add Event
          </button>

          {(showEventPopover || editingEvent) && (
            <TimelineEditPopover
              event={editingEvent}
              initialDate={
                editingEvent?.date ??
                doubleClickDate ??
                (cursorDate ? normalizeToMonth(cursorDate) : currentMonth)
              }
              itemConfigs={itemConfigs}
              onSave={handleSaveEvent}
              onClose={handleClosePopover}
              onDelete={handleDeleteEvent}
              {...(clickPosition ? { clickPosition } : { anchorRef: addEventButtonRef })}
            />
          )}
        </div>
      </div>

      {/* Main content area - chart and sidebar with fixed height (3 items max visible) */}
      <div className="flex" style={{ overflow: 'visible', height: 280 }}>
        {/* Chart area */}
        <div className="flex-1 px-4 py-3 min-w-0 h-full" style={{ overflow: 'visible' }}>
          <TimelineChart
            dataPoints={dataPoints}
            itemConfigs={itemConfigs}
            cursorDate={cursorDate}
            resolution={resolution}
            onCursorChange={handleCursorChange}
            onHover={handleHover}
            onDoubleClick={handleChartDoubleClick}
            formatCurrency={formatCurrency}
            events={timelineEvents}
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        </div>

        {/* Sidebar with live projections */}
        <TimelineSidebar
          itemConfigs={itemConfigs}
          displayDate={displayDate}
          isLocked={isLocked}
          projections={displayProjections}
          resolution={resolution}
          onApyChange={handleApyChange}
          onClearCursor={handleClearCursor}
          formatCurrency={formatCurrency}
          events={timelineEvents}
          onEditEvent={handleEditEvent}
        />
      </div>
    </div>
  );
}
