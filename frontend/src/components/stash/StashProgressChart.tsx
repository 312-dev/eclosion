/**
 * StashProgressChart - Progress visualization for stash items
 *
 * Shows cumulative balance lines for each stash item and
 * monthly contribution bars (total across all visible stashes).
 */

import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Z_INDEX } from '../../constants';
import type { StashHistoryItem } from '../../types';

// Color palette for stash lines (distinct, colorblind-friendly)
const LINE_COLORS = [
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
  '#F44336', // Red
  '#00BCD4', // Cyan
  '#795548', // Brown
  '#607D8B', // Blue Grey
];

interface ChartDataPoint {
  month: string;
  monthLabel: string;
  totalContribution: number;
  [key: string]: string | number; // Dynamic keys for each stash balance
}

interface StashProgressChartProps {
  items: StashHistoryItem[];
  months: string[];
  visibleStashIds: string[];
  showBalanceLines: boolean;
  showMonthlyContributions: boolean;
  formatCurrency: (amount: number) => string;
}

/**
 * Hook to get CSS variable values for Recharts.
 */
function useChartColors() {
  const [colors, setColors] = useState({
    textMuted: '#7e7b78',
    border: '#e8e6e3',
    bgCard: '#ffffff',
    barColor: '#94a3b8', // Neutral slate for contribution bars
  });

  useEffect(() => {
    const updateColors = () => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      setColors({
        textMuted: style.getPropertyValue('--monarch-text-muted').trim() || '#7e7b78',
        border: style.getPropertyValue('--monarch-border').trim() || '#e8e6e3',
        bgCard: style.getPropertyValue('--monarch-bg-card').trim() || '#ffffff',
        barColor: style.getPropertyValue('--monarch-text-muted').trim() || '#94a3b8',
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

/**
 * Format month string (YYYY-MM) to short label (Jan, Feb, etc.)
 */
function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(Number(year), Number(monthNum) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}

/**
 * Custom tooltip for the chart.
 */
function CustomTooltip({
  active,
  payload,
  label,
  items,
  formatCurrency,
  colors,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  items: StashHistoryItem[];
  formatCurrency: (amount: number) => string;
  colors: ReturnType<typeof useChartColors>;
}) {
  if (!active || !payload || !label) return null;

  // Find the month data
  const monthLabel = formatMonthLabel(label);

  // Group payload into balances and contribution
  const balances = payload.filter((p) => p.dataKey !== 'totalContribution');
  const contributionEntry = payload.find((p) => p.dataKey === 'totalContribution');

  return (
    <div
      className="rounded-md shadow-lg text-xs max-w-64 overflow-hidden"
      style={{
        backgroundColor: colors.bgCard,
        border: `1px solid ${colors.border}`,
      }}
    >
      <div className="px-3 py-2">
        <div className="font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          {monthLabel} {label.split('-')[0]}
        </div>

        {/* Stash balances */}
        {balances.map((entry) => {
          const item = items.find((i) => `balance_${i.id}` === entry.dataKey);
          return (
            <div key={entry.dataKey} className="flex justify-between items-center gap-3 mb-1">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span style={{ color: 'var(--monarch-text-muted)' }}>
                  {item?.name ?? 'Unknown'}
                </span>
              </div>
              <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                {formatCurrency(entry.value)}
              </span>
            </div>
          );
        })}

        {/* Total contribution */}
        {contributionEntry && contributionEntry.value !== 0 && (
          <div
            className="flex justify-between items-center gap-3 pt-1.5 mt-1.5"
            style={{ borderTop: `1px solid ${colors.border}` }}
          >
            <span style={{ color: 'var(--monarch-text-muted)' }}>Monthly change</span>
            <span
              className="font-medium"
              style={{
                color:
                  contributionEntry.value >= 0
                    ? 'var(--monarch-success)'
                    : 'var(--monarch-warning)',
              }}
            >
              {contributionEntry.value >= 0 ? '+' : ''}
              {formatCurrency(contributionEntry.value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function StashProgressChart({
  items,
  months,
  visibleStashIds,
  showBalanceLines,
  showMonthlyContributions,
  formatCurrency,
}: StashProgressChartProps) {
  const colors = useChartColors();

  // Filter to visible items
  const visibleItems = useMemo(
    () => items.filter((item) => visibleStashIds.includes(item.id)),
    [items, visibleStashIds]
  );

  // Transform data for Recharts
  const chartData = useMemo((): ChartDataPoint[] => {
    return months.map((month) => {
      const point: ChartDataPoint = {
        month,
        monthLabel: formatMonthLabel(month),
        totalContribution: 0,
      };

      // Add balance for each visible stash
      for (const item of visibleItems) {
        const monthData = item.months.find((m) => m.month === month);
        point[`balance_${item.id}`] = monthData?.balance ?? 0;
        point.totalContribution += monthData?.contribution ?? 0;
      }

      return point;
    });
  }, [months, visibleItems]);

  // Assign colors to stashes
  const stashColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    visibleItems.forEach((item, index) => {
      colorMap[item.id] = LINE_COLORS[index % LINE_COLORS.length]!;
    });
    return colorMap;
  }, [visibleItems]);

  // Calculate Y-axis domain for balances
  const maxBalance = useMemo(() => {
    let max = 0;
    for (const point of chartData) {
      for (const item of visibleItems) {
        const value = point[`balance_${item.id}`];
        if (typeof value === 'number' && value > max) {
          max = value;
        }
      }
    }
    return max;
  }, [chartData, visibleItems]);

  // Calculate Y-axis domain for contributions
  const [minContribution, maxContribution] = useMemo(() => {
    let min = 0;
    let max = 0;
    for (const point of chartData) {
      if (point.totalContribution < min) min = point.totalContribution;
      if (point.totalContribution > max) max = point.totalContribution;
    }
    return [min, max];
  }, [chartData]);

  if (months.length === 0 || visibleItems.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-64 rounded-lg"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <p style={{ color: 'var(--monarch-text-muted)' }}>No data to display</p>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: 350 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <XAxis
            dataKey="monthLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: colors.textMuted }}
            dy={10}
          />

          {/* Left Y-axis for balances */}
          <YAxis
            yAxisId="balance"
            orientation="left"
            domain={[0, maxBalance * 1.1]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: colors.textMuted }}
            tickFormatter={(value) => formatCurrency(value)}
            width={60}
          />

          {/* Right Y-axis for contributions (only if showing contributions) */}
          {showMonthlyContributions && (
            <YAxis
              yAxisId="contribution"
              orientation="right"
              domain={[minContribution * 1.2, maxContribution * 1.2]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: colors.textMuted }}
              tickFormatter={(value) =>
                value >= 0 ? `+${formatCurrency(value)}` : formatCurrency(value)
              }
              width={70}
            />
          )}

          <RechartsTooltip
            content={
              <CustomTooltip items={items} formatCurrency={formatCurrency} colors={colors} />
            }
            cursor={{ stroke: colors.border, strokeDasharray: '3 3' }}
            wrapperStyle={{ zIndex: Z_INDEX.TOOLTIP }}
          />

          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => {
              if (value === 'totalContribution') return 'Monthly Change';
              const itemId = value.replace('balance_', '');
              const item = items.find((i) => i.id === itemId);
              return item?.name ?? value;
            }}
          />

          {/* Contribution bars */}
          {showMonthlyContributions && (
            <Bar
              yAxisId="contribution"
              dataKey="totalContribution"
              fill={colors.barColor}
              fillOpacity={0.4}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          )}

          {/* Balance lines for each visible stash */}
          {showBalanceLines &&
            visibleItems.map((item) => {
              const color = stashColors[item.id] ?? LINE_COLORS[0]!;
              return (
                <Line
                  key={item.id}
                  yAxisId="balance"
                  type="monotone"
                  dataKey={`balance_${item.id}`}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: color }}
                  activeDot={{ r: 5, fill: color }}
                />
              );
            })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
