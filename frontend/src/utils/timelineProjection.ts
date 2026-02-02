/** Timeline Projection - generates multi-item projections for the timeline emulator. */

import type {
  TimelineResolution,
  NamedEvent,
  TimelineDataPoint,
  TimelineItemConfig,
  TimelineZoomState,
  ProjectedCardState,
  TimelineProjectionInput,
  TimelineProjectionResult,
} from '../types/timeline';
import type { ItemStatus } from '../types/common';
import { formatDateForResolution } from './timelineDateUtils';

// Re-export date utilities for convenience
export {
  formatDateForResolution,
  parseDateString,
  monthsDiff,
  addMonths,
  formatDateDisplay,
  getItemColor,
} from './timelineDateUtils';

/** Generate timeline projection for multiple items. Main entry point. */
export function generateTimelineProjection(
  input: TimelineProjectionInput
): TimelineProjectionResult {
  const { items, events, zoom, cursorDate } = input;
  const dates = generateDateRange(zoom);
  const eventsByMonth = buildEventLookup(events);
  const itemProjections = new Map<string, Array<{ balance: number; interestEarned: number }>>();

  for (const item of items) {
    const projection = projectSingleItem(
      item,
      dates.length,
      zoom.resolution,
      eventsByMonth.get(item.itemId) ?? new Map()
    );
    itemProjections.set(item.itemId, projection);
  }

  const dataPoints = mergeProjects(dates, items, itemProjections, events);
  const cursorProjections = cursorDate
    ? calculateCursorProjections(cursorDate, dates, items, itemProjections)
    : null;

  return { dataPoints, itemConfigs: items, cursorProjections };
}

function generateDateRange(zoom: TimelineZoomState): string[] {
  const dates: string[] = [];
  const current = new Date(zoom.startDate + 'T00:00:00');
  const endDate = new Date(zoom.endDate + 'T00:00:00');

  while (current <= endDate) {
    dates.push(formatDateForResolution(current, zoom.resolution));
    if (zoom.resolution === 'daily') current.setDate(current.getDate() + 1);
    else if (zoom.resolution === 'monthly') current.setMonth(current.getMonth() + 1);
    else current.setFullYear(current.getFullYear() + 1);
  }
  return dates;
}

function buildEventLookup(events: NamedEvent[]): Map<string, Map<string, NamedEvent[]>> {
  const lookup = new Map<string, Map<string, NamedEvent[]>>();
  for (const event of events) {
    if (!lookup.has(event.itemId)) lookup.set(event.itemId, new Map());
    const itemEvents = lookup.get(event.itemId)!;
    const monthKey = event.date.slice(0, 7);
    if (!itemEvents.has(monthKey)) itemEvents.set(monthKey, []);
    itemEvents.get(monthKey)!.push(event);
  }
  return lookup;
}

function getInterestRate(apy: number, resolution: TimelineResolution): number {
  if (resolution === 'yearly') return apy;
  if (resolution === 'daily') return apy / 365;
  return apy / 12;
}

function getContribution(monthlyRate: number, resolution: TimelineResolution): number {
  if (resolution === 'yearly') return monthlyRate * 12;
  if (resolution === 'daily') return monthlyRate / 30;
  return monthlyRate;
}

function applyEvents(events: NamedEvent[] | undefined, balance: number, monthlyRate: number) {
  if (!events) return { balance, monthlyRate };
  for (const event of events) {
    if (event.type === 'deposit') balance += event.amount;
    else if (event.type === 'rate_change') monthlyRate = event.amount;
  }
  return { balance, monthlyRate };
}

function projectSingleItem(
  item: TimelineItemConfig,
  numPeriods: number,
  resolution: TimelineResolution,
  itemEvents: Map<string, NamedEvent[]>
): Array<{ balance: number; interestEarned: number }> {
  const results: Array<{ balance: number; interestEarned: number }> = [];
  let balance = item.startingBalance,
    monthlyRate = item.monthlyRate,
    totalInterest = 0;
  const now = new Date();
  let currentYear = now.getFullYear(),
    currentMonth = now.getMonth();

  for (let i = 0; i < numPeriods; i++) {
    // For yearly resolution, check all 12 months for events in this year
    if (resolution === 'yearly') {
      for (let month = 0; month < 12; month++) {
        const monthKey = `${currentYear}-${String(month + 1).padStart(2, '0')}`;
        const updated = applyEvents(itemEvents.get(monthKey), balance, monthlyRate);
        balance = updated.balance;
        monthlyRate = updated.monthlyRate;
      }
    } else {
      const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      const updated = applyEvents(itemEvents.get(monthKey), balance, monthlyRate);
      balance = updated.balance;
      monthlyRate = updated.monthlyRate;
    }

    balance += getContribution(monthlyRate, resolution);
    const interest = balance * getInterestRate(item.apy, resolution);
    balance += interest;
    totalInterest += interest;
    results.push({ balance: Math.round(balance), interestEarned: Math.round(totalInterest) });

    if (resolution === 'monthly') {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
    } else if (resolution === 'yearly') currentYear++;
  }
  return results;
}

function mergeProjects(
  dates: string[],
  items: TimelineItemConfig[],
  itemProjections: Map<string, Array<{ balance: number; interestEarned: number }>>,
  allEvents: NamedEvent[]
): TimelineDataPoint[] {
  return dates.map((date, index) => {
    const balances: Record<string, number> = {},
      interestEarned: Record<string, number> = {};
    const eventIds: string[] = [];
    for (const item of items) {
      const projection = itemProjections.get(item.itemId);
      if (projection?.[index]) {
        balances[item.itemId] = projection[index].balance;
        interestEarned[item.itemId] = projection[index].interestEarned;
      }
    }
    const dateKey = date.slice(0, date.length <= 4 ? 4 : 7);
    for (const event of allEvents) {
      if (event.date.startsWith(dateKey)) eventIds.push(event.id);
    }
    return {
      date,
      timestamp: new Date(date + (date.length === 7 ? '-01' : '')).getTime(),
      balances,
      interestEarned,
      eventIds,
    };
  });
}

function calculateCursorProjections(
  cursorDate: string,
  dates: string[],
  items: TimelineItemConfig[],
  itemProjections: Map<string, Array<{ balance: number; interestEarned: number }>>
): Record<string, ProjectedCardState> {
  const result: Record<string, ProjectedCardState> = {};
  const cursorIndex = dates.findIndex((d) => d >= cursorDate);
  const effectiveIndex = cursorIndex === -1 ? dates.length - 1 : Math.max(0, cursorIndex);
  const now = new Date();
  const cursorDateObj = new Date(cursorDate + (cursorDate.length === 7 ? '-01' : ''));
  const monthsFromNow = Math.round(
    (cursorDateObj.getTime() - now.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
  );

  for (const item of items) {
    const projection = itemProjections.get(item.itemId);
    if (!projection?.[effectiveIndex]) continue;
    const { balance, interestEarned } = projection[effectiveIndex];
    // Open-ended goals (null targetAmount) have 0 progress percent
    const progressPercent =
      item.targetAmount !== null && item.targetAmount > 0 ? (balance / item.targetAmount) * 100 : 0;
    result[item.itemId] = {
      itemId: item.itemId,
      projectedBalance: balance,
      projectedStatus: calculateStatus(balance, item.targetAmount, item.monthlyRate),
      projectedProgressPercent: Math.min(100, progressPercent),
      monthsFromNow: Math.max(0, monthsFromNow),
      interestEarned,
      projectedMonthlyTarget: item.monthlyRate,
    };
  }
  return result;
}

function calculateStatus(
  balance: number,
  targetAmount: number | null,
  monthlyRate: number
): ItemStatus {
  // Open-ended goals (null targetAmount) default to on_track
  if (targetAmount === null) return monthlyRate > 0 ? 'on_track' : 'behind';
  if (balance >= targetAmount) return 'funded';
  if (monthlyRate > 0) return 'on_track';
  return 'behind';
}
