/**
 * StashReportsView - Reports tab content for stash progress
 *
 * Shows historical progress charts with controls for:
 * - Time range selection (3mo, 6mo, 12mo, all)
 * - Toggle balance lines on/off
 * - Toggle monthly contributions on/off
 * - Filter individual stashes
 */

import { useMemo } from 'react';
import { useStashHistoryQuery } from '../../api/queries';
import { useReportSettings } from './useReportSettings';
import { StashProgressChart } from './StashProgressChart';
import { PageLoadingSpinner } from '../ui/LoadingSpinner';
import { Icons } from '../icons';
import type { StashReportTimeRange } from '../../types';

const TIME_RANGE_OPTIONS: { value: StashReportTimeRange; label: string }[] = [
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '12mo', label: '1Y' },
  { value: 'all', label: 'All' },
];

/**
 * Format currency for the chart.
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function StashReportsView() {
  const {
    settings,
    setTimeRange,
    setShowBalanceLines,
    setShowMonthlyContributions,
    toggleStashVisibility,
    showAllStashes,
    isStashVisible,
  } = useReportSettings();

  const { data, isLoading, error } = useStashHistoryQuery(settings.timeRange, { enabled: true });

  // Get list of all stash IDs for visibility filtering
  const allStashIds = useMemo(() => data?.items.map((item) => item.id) ?? [], [data?.items]);

  // Visible stash IDs (all if hiddenStashIds is empty)
  const visibleStashIds = useMemo(() => {
    if (settings.hiddenStashIds.length === 0) {
      return allStashIds;
    }
    return allStashIds.filter((id) => !settings.hiddenStashIds.includes(id));
  }, [allStashIds, settings.hiddenStashIds]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-75">
        <PageLoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <Icons.AlertCircle
          size={48}
          className="mx-auto mb-4"
          style={{ color: 'var(--monarch-warning)' }}
        />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Error Loading History
        </h2>
        <p style={{ color: 'var(--monarch-text-muted)' }}>{error.message}</p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <Icons.BarChart2
          size={48}
          className="mx-auto mb-4"
          style={{ color: 'var(--monarch-text-muted)' }}
        />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          No History Yet
        </h2>
        <p style={{ color: 'var(--monarch-text-muted)' }}>
          Start tracking stashes to see your progress over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Time range selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Range:
            </span>
            <div
              className="flex rounded-md overflow-hidden"
              style={{ border: '1px solid var(--monarch-border)' }}
            >
              {TIME_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className="px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor:
                      settings.timeRange === option.value
                        ? 'var(--monarch-primary)'
                        : 'transparent',
                    color:
                      settings.timeRange === option.value ? 'white' : 'var(--monarch-text-dark)',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-6" style={{ backgroundColor: 'var(--monarch-border)' }} />

          {/* Toggle: Balance lines */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showBalanceLines}
              onChange={(e) => setShowBalanceLines(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
              Balance lines
            </span>
          </label>

          {/* Toggle: Monthly contributions */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showMonthlyContributions}
              onChange={(e) => setShowMonthlyContributions(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
              Monthly change
            </span>
          </label>

          {/* Divider */}
          <div className="w-px h-6" style={{ backgroundColor: 'var(--monarch-border)' }} />

          {/* Show all button */}
          {settings.hiddenStashIds.length > 0 && (
            <button
              onClick={showAllStashes}
              className="text-sm px-2 py-1 rounded transition-colors hover:bg-(--monarch-bg-page)"
              style={{ color: 'var(--monarch-primary)' }}
            >
              Show all ({settings.hiddenStashIds.length} hidden)
            </button>
          )}
        </div>

        {/* Stash filter chips */}
        {data.items.length > 1 && (
          <div
            className="flex flex-wrap gap-2 mt-3 pt-3"
            style={{ borderTop: '1px solid var(--monarch-border)' }}
          >
            <span className="text-sm self-center" style={{ color: 'var(--monarch-text-muted)' }}>
              Filter:
            </span>
            {data.items.map((item) => {
              const visible = isStashVisible(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleStashVisibility(item.id)}
                  className="px-3 py-1 rounded-full text-sm transition-colors"
                  style={{
                    backgroundColor: visible ? 'var(--monarch-primary)' : 'var(--monarch-bg-page)',
                    color: visible ? 'white' : 'var(--monarch-text-muted)',
                    border: `1px solid ${visible ? 'var(--monarch-primary)' : 'var(--monarch-border)'}`,
                  }}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart */}
      <div
        className="rounded-lg p-4"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <StashProgressChart
          items={data.items}
          months={data.months}
          visibleStashIds={visibleStashIds}
          showBalanceLines={settings.showBalanceLines}
          showMonthlyContributions={settings.showMonthlyContributions}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
}
