/**
 * ReadyToAssign - Sidebar component showing budget status and monthly savings
 *
 * Accessibility features:
 * - aria-label on interactive elements
 * - aria-describedby for progress bars
 * - Tooltips with hover interaction
 */

import { useMemo, useId } from 'react';
import type {
  ReadyToAssign as ReadyToAssignData,
  RecurringItem,
  DashboardSummary,
  RollupData,
} from '../../types';
import { formatCurrency } from '../../utils';
import { calculateBurndownData } from '../charts';
import { TargetIcon } from '../icons';
import { LeftToBudgetBadge } from '../LeftToBudgetBadge';
import { MobileReadyToAssign } from './MobileReadyToAssign';
import { StabilizationTimeline } from './StabilizationTimeline';

interface ReadyToAssignProps {
  data: ReadyToAssignData;
  summary: DashboardSummary;
  items: RecurringItem[];
  rollup: RollupData;
  variant?: 'mobile' | 'sidebar';
}

export function ReadyToAssign({
  data,
  summary: _summary,
  items,
  rollup,
  variant = 'sidebar',
}: ReadyToAssignProps) {
  const progressBarId = useId();

  // Calculate current monthly cost as sum of frozen targets - this is what you
  // actually need to budget THIS month. Future months use max(frozen, ideal).
  const currentMonthlyCost = useMemo(() => {
    const enabledItems = items.filter((i) => i.is_enabled && !i.is_in_rollup);
    const itemsTotal = enabledItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0);
    const rollupItems = items.filter((i) => i.is_in_rollup);
    const rollupTotal = rollupItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0);
    return itemsTotal + rollupTotal;
  }, [items]);

  // Calculate burndown data and stabilization in one pass - single source of truth
  const { stabilization, points: burndownPoints } = useMemo(
    () => calculateBurndownData(items, currentMonthlyCost),
    [items, currentMonthlyCost]
  );

  const catchUpAmount = currentMonthlyCost - stabilization.stableMonthlyRate;
  const itemsBehind = items.filter((i) => i.is_enabled && i.progress_percent < 100);

  // Calculate monthly targets and progress for the widget
  // "saved" = total budgeted this month (planned_budget), "to go" = target - saved
  // Uses frozen_monthly_target - what you actually need to budget THIS month
  const monthlyTargets = useMemo(() => {
    const enabledItems = items.filter((i) => i.is_enabled && !i.is_in_rollup);
    const rollupItems = items.filter((i) => i.is_in_rollup);
    const totalTargets =
      enabledItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0) +
      rollupItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0);
    // "saved" is total budgeted this month across all categories
    // Note: rollup.budgeted is the actual amount budgeted in the rollup category - this is correct
    const totalBudgeted =
      enabledItems.reduce((sum, item) => sum + item.planned_budget, 0) +
      (rollup.enabled ? rollup.budgeted : 0);
    const toGo = Math.max(0, totalTargets - totalBudgeted);
    return { totalTargets, totalBudgeted, toGo };
  }, [items, rollup]);

  // Determine if monthly target is fully funded (to go <= 0)
  const isMonthlyFunded = monthlyTargets.toGo <= 0;

  // Calculate untracked (disabled) recurring total
  const untrackedCategories = useMemo(() => {
    const disabledItems = items.filter((i) => !i.is_enabled);
    return { total: disabledItems.reduce((sum, item) => sum + item.amount, 0) };
  }, [items]);

  // Generate month labels with projected amounts for the stabilization timeline
  // Each month shows the "Needed for THAT MONTH" value when that month arrives
  const timelineMonths = useMemo(() => {
    if (!stabilization.hasCatchUp || stabilization.monthsUntilStable <= 0) return [];
    const months: { month: string; year: string; showYear: boolean; amount: number }[] = [];
    const now = new Date();
    let lastYear = now.getFullYear();

    for (let i = 1; i <= stabilization.monthsUntilStable; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = date.getFullYear();
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const burndownPoint = burndownPoints.find((p) => p.month === monthLabel);
      const amount = burndownPoint?.amount ?? currentMonthlyCost;
      const showYear = year !== lastYear;
      months.push({
        month: monthLabel,
        year: `'${year.toString().slice(-2)}`,
        showYear,
        amount: Math.round(amount),
      });
      lastYear = year;
    }
    return months;
  }, [
    stabilization.hasCatchUp,
    stabilization.monthsUntilStable,
    burndownPoints,
    currentMonthlyCost,
  ]);

  // Mobile horizontal layout
  if (variant === 'mobile') {
    return <MobileReadyToAssign data={data} currentMonthlyCost={currentMonthlyCost} />;
  }

  // Sidebar vertical layout
  return (
    <div className="stats-sidebar-content">
      {/* Left to Budget Badge */}
      <LeftToBudgetBadge data={data} variant="sidebar" />

      {/* Monthly Targets */}
      <div
        className={`rounded-xl px-4 pt-4 text-center relative ${isMonthlyFunded ? 'bg-(--monarch-success-bg)' : 'bg-monarch-orange-light'} ${stabilization.hasCatchUp ? 'pb-4 rounded-b-none border-x border-t border-monarch-border' : 'pb-6'}`}
        data-tour="current-monthly"
      >
        {/* Centered target icon at top */}
        <div className="flex justify-center mb-2">
          <TargetIcon
            size={28}
            className={isMonthlyFunded ? 'text-(--monarch-success)' : 'text-monarch-orange'}
            aria-hidden="true"
          />
        </div>
        <div
          className={`text-2xl font-bold mb-1 ${isMonthlyFunded ? 'text-(--monarch-success)' : 'text-monarch-orange'}`}
        >
          <span>
            {formatCurrency(monthlyTargets.totalTargets, { maximumFractionDigits: 0 })}
            {untrackedCategories.total > 0 && (
              <sup className="text-xs font-normal ml-0.5" aria-hidden="true">
                &dagger;
              </sup>
            )}
          </span>
        </div>
        <div className="text-sm text-monarch-text-dark">
          <span>Needed for {new Date().toLocaleDateString('en-US', { month: 'long' })}</span>
        </div>
        {/* Progress bar showing amount budgeted vs target */}
        {monthlyTargets.totalTargets > 0 && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-valuenow={Math.round(
                (monthlyTargets.totalBudgeted / monthlyTargets.totalTargets) * 100
              )}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Monthly savings progress: ${formatCurrency(monthlyTargets.totalBudgeted, { maximumFractionDigits: 0 })} saved of ${formatCurrency(monthlyTargets.totalTargets, { maximumFractionDigits: 0 })} needed`}
              aria-describedby={progressBarId}
              className={`h-2 rounded-full overflow-hidden ${isMonthlyFunded ? 'bg-(--monarch-success)/20' : 'bg-monarch-orange/20'}`}
            >
              <div
                className={`h-full rounded-full transition-all ${isMonthlyFunded ? 'bg-(--monarch-success)' : 'bg-monarch-orange'}`}
                style={{
                  width: `${Math.min(100, (monthlyTargets.totalBudgeted / monthlyTargets.totalTargets) * 100)}%`,
                }}
              />
            </div>
            <div
              id={progressBarId}
              className="flex justify-between mt-1 text-xs text-monarch-text-dark"
            >
              <span>
                {formatCurrency(monthlyTargets.totalBudgeted, { maximumFractionDigits: 0 })} saved
              </span>
              <span>{formatCurrency(monthlyTargets.toGo, { maximumFractionDigits: 0 })} to go</span>
            </div>
          </div>
        )}
      </div>

      {/* Stabilization Timeline */}
      <StabilizationTimeline
        stabilization={stabilization}
        timelineMonths={timelineMonths}
        catchUpAmount={catchUpAmount}
        itemsBehindCount={itemsBehind.length}
        currentMonthlyCost={currentMonthlyCost}
      />

      {/* Footnotes */}
      {untrackedCategories.total > 0 && (
        <p className="text-[10px] text-monarch-text-muted mt-3 px-1 leading-relaxed">
          <span aria-hidden="true">&dagger;</span> Excludes{' '}
          {formatCurrency(untrackedCategories.total, { maximumFractionDigits: 0 })} in categories
          not linked to recurring items
        </p>
      )}
    </div>
  );
}
