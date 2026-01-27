/* eslint-disable max-lines */
/** TimelineChart - Multi-line projection visualization with interactive cursor */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Z_INDEX } from '../../../constants';
import type {
  TimelineDataPoint,
  TimelineItemConfig,
  TimelineResolution,
  NamedEvent,
} from '../../../types/timeline';
import { formatDateDisplay } from '../../../utils/timelineProjection';
import { TimelineEventMarkers } from './TimelineEventMarkers';

/** Tooltip width for viewport calculations */
const TOOLTIP_WIDTH = 256; // max-w-64 = 16rem = 256px
const TOOLTIP_MARGIN = 20;

interface TimelineChartProps {
  readonly dataPoints: TimelineDataPoint[];
  readonly itemConfigs: TimelineItemConfig[];
  readonly cursorDate: string | null;
  readonly resolution: TimelineResolution;
  readonly onCursorChange: (date: string | null) => void;
  /** Called when hovering over the chart (for live sidebar updates) */
  readonly onHover?: (date: string | null) => void;
  /** Called when user double-clicks on the chart, includes click position for popover */
  readonly onDoubleClick?: (date: string, position: { x: number; y: number }) => void;
  readonly formatCurrency: (amount: number) => string;
  /** All timeline events for rendering markers */
  readonly events?: NamedEvent[];
  /** Called when user clicks edit on an event marker */
  readonly onEditEvent?: (event: NamedEvent) => void;
  /** Called when user clicks delete on an event marker */
  readonly onDeleteEvent?: (eventId: string) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
    color: string;
    name: string;
  }>;
  label?: string;
  coordinate?: { x: number; y: number };
  viewBox?: { x: number; y: number; width: number; height: number };
  itemConfigs: TimelineItemConfig[];
  formatCurrency: (amount: number) => string;
  resolution: TimelineResolution;
}

function CustomTooltip({
  active,
  payload,
  label,
  coordinate,
  viewBox,
  itemConfigs,
  formatCurrency,
  resolution,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const formattedDate = label ? formatDateDisplay(label, resolution, true) : '';

  // Calculate if tooltip would overflow right edge of viewport
  // If so, shift it left
  let translateX = 0;
  if (coordinate && viewBox) {
    const tooltipRightEdge = coordinate.x + TOOLTIP_MARGIN + TOOLTIP_WIDTH;
    const viewportRight = viewBox.x + viewBox.width;
    if (tooltipRightEdge > viewportRight) {
      // Flip to left side of cursor
      translateX = -(TOOLTIP_WIDTH + TOOLTIP_MARGIN * 2);
    }
  }

  return (
    <div
      className="rounded-md shadow-lg text-xs max-w-64 overflow-hidden"
      style={{
        backgroundColor: 'var(--monarch-bg-card)',
        border: '1px solid var(--monarch-border)',
        transform: translateX ? `translateX(${translateX}px)` : undefined,
      }}
    >
      <div
        className="px-3 py-1.5 text-[11px] font-medium"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          borderBottom: '1px solid var(--monarch-border)',
        }}
      >
        {formattedDate}
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {payload.map((entry) => {
          const itemId = entry.dataKey.replace('balances.', '');
          const config = itemConfigs.find((c) => c.itemId === itemId);
          if (!config) return null;

          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="truncate max-w-32" style={{ color: 'var(--monarch-text-dark)' }}>
                  {config.name}
                </span>
              </div>
              <span
                className="font-medium tabular-nums"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                {formatCurrency(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function useChartColors() {
  const [colors, setColors] = useState({
    textMuted: '#7e7b78',
    border: '#e8e6e3',
    bgCard: '#ffffff',
    cursor: '#8b5cf6', // Purple for hypothesize mode
  });

  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      setColors({
        textMuted: style.getPropertyValue('--monarch-text-muted').trim() || '#7e7b78',
        border: style.getPropertyValue('--monarch-border').trim() || '#e8e6e3',
        bgCard: style.getPropertyValue('--monarch-bg-card').trim() || '#ffffff',
        cursor: '#8b5cf6',
      });
    };

    updateColors();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          updateColors();
          break;
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  return colors;
}

/** Double-click threshold in milliseconds */
const DOUBLE_CLICK_THRESHOLD = 300;

export function TimelineChart({
  dataPoints,
  itemConfigs,
  cursorDate,
  resolution,
  onCursorChange,
  onHover,
  onDoubleClick,
  formatCurrency,
  events = [],
  onEditEvent,
  onDeleteEvent,
}: TimelineChartProps) {
  const colors = useChartColors();
  const lastClickRef = useRef<{ time: number; label: string } | null>(null);
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  // Track mouse position for double-click popover placement
  const handleMousePositionUpdate = useCallback((e: React.MouseEvent) => {
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleChartClick = useCallback(
    (data: { activeLabel?: string | number | undefined } | null) => {
      if (data?.activeLabel !== undefined && data.activeLabel !== null) {
        const label = String(data.activeLabel);
        const now = Date.now();

        // Check for double-click
        if (
          onDoubleClick &&
          lastClickRef.current &&
          lastClickRef.current.label === label &&
          now - lastClickRef.current.time < DOUBLE_CLICK_THRESHOLD
        ) {
          onDoubleClick(label, mousePositionRef.current);
          lastClickRef.current = null;
          return;
        }

        // Single click - set cursor and track for potential double-click
        lastClickRef.current = { time: now, label };
        onCursorChange(label);
      }
    },
    [onCursorChange, onDoubleClick]
  );

  const handleMouseMove = useCallback(
    (data: { activeLabel?: string | number | undefined } | null) => {
      if (onHover && data?.activeLabel !== undefined && data.activeLabel !== null) {
        onHover(String(data.activeLabel));
      }
    },
    [onHover]
  );

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  if (dataPoints.length < 2 || itemConfigs.length === 0) {
    return (
      <div
        className="h-48 flex items-center justify-center text-sm"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        Not enough data to display timeline
      </div>
    );
  }

  // Calculate Y-axis domain (use actual min/max without padding)
  const allBalances = dataPoints.flatMap((dp) => Object.values(dp.balances));
  const minBalance = Math.min(...allBalances, 0);
  const maxBalance = Math.max(...allBalances);

  // Calculate Y-axis width based on the largest formatted value
  // This prevents clipping when values are in millions
  const calculateYAxisWidth = (): number => {
    const maxAbsValue = Math.max(Math.abs(minBalance), Math.abs(maxBalance));
    const sampleFormatted = formatCurrency(maxAbsValue);
    // Estimate ~7px per character for the 10px font, plus padding
    const estimatedWidth = sampleFormatted.length * 7 + 10;
    return Math.max(45, estimatedWidth);
  };
  const yAxisWidth = calculateYAxisWidth();

  // Calculate tick interval for X-axis based on data points and resolution
  // Daily needs more aggressive tick skipping since there are many points
  const calculateTickInterval = (): number => {
    if (resolution === 'daily') {
      return Math.max(1, Math.floor(dataPoints.length / 15)); // ~15 ticks for daily
    }
    if (dataPoints.length > 24) {
      return Math.floor(dataPoints.length / 12);
    }
    if (dataPoints.length > 12) {
      return 2;
    }
    return 0;
  };
  const tickInterval = calculateTickInterval();

  // Only enable horizontal scroll for monthly/yearly with many data points
  // Daily resolution always fits to container width (uses tick interval to manage labels)
  const needsScroll = resolution !== 'daily' && dataPoints.length > 60;
  const minChartWidth = needsScroll ? dataPoints.length * 50 : '100%';

  return (
    <div
      ref={chartContainerRef}
      className="h-full **:outline-none"
      style={{
        overflowX: needsScroll ? 'auto' : 'visible',
        overflowY: 'visible',
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/prefer-tag-over-role -- Chart requires mouse tracking for cursor */}
      <div
        role="figure"
        aria-label="Timeline chart showing projected stash balances"
        className="outline-none"
        style={{
          width: typeof minChartWidth === 'number' ? `${minChartWidth}px` : minChartWidth,
          height: '100%',
        }}
        onMouseMove={handleMousePositionUpdate}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={dataPoints}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            onClick={handleChartClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.border}
              horizontal={true}
              vertical={true}
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              axisLine={{ stroke: colors.border }}
              tickLine={{ stroke: colors.border }}
              tick={{ fontSize: 10, fill: colors.textMuted }}
              interval={tickInterval}
              tickFormatter={(date) => formatDateDisplay(date, resolution)}
              dy={5}
            />
            <YAxis
              domain={[minBalance, maxBalance]}
              axisLine={{ stroke: colors.border }}
              tickLine={{ stroke: colors.border }}
              tick={{ fontSize: 10, fill: colors.textMuted }}
              tickFormatter={(value) => formatCurrency(value)}
              width={yAxisWidth}
              orientation="left"
            />
            <RechartsTooltip
              content={
                <CustomTooltip
                  itemConfigs={itemConfigs}
                  formatCurrency={formatCurrency}
                  resolution={resolution}
                />
              }
              cursor={{ stroke: colors.border, strokeDasharray: '3 3' }}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: Z_INDEX.TOOLTIP }}
              offset={20}
            />

            {/* Render a line for each visible item */}
            {itemConfigs
              .filter((config) => config.isVisible)
              .map((config) => (
                <Line
                  key={config.itemId}
                  type="linear"
                  dataKey={`balances.${config.itemId}`}
                  stroke={config.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: config.color,
                    stroke: colors.bgCard,
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                  name={config.name}
                />
              ))}

            {/* Cursor line */}
            {cursorDate && (
              <ReferenceLine
                x={cursorDate}
                stroke={colors.cursor}
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            )}

            {/* Event markers - rendered using ReferenceDot for each event date */}
            {events.length > 0 && onEditEvent && onDeleteEvent && (
              <TimelineEventMarkers
                dataPoints={dataPoints}
                events={events}
                itemConfigs={itemConfigs}
                onEditEvent={onEditEvent}
                onDeleteEvent={onDeleteEvent}
                formatCurrency={formatCurrency}
                markerYValue={minBalance}
                chartRef={chartContainerRef}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
