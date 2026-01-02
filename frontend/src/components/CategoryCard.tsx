import type { RecurringItem, ItemStatus } from '../types';
import { formatCurrency as formatCurrencyBase } from '../utils';

interface CategoryCardProps {
  item: RecurringItem;
}

/** Format currency with no decimals for compact display */
const formatCurrency = (amount: number) =>
  formatCurrencyBase(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatusStyles(status: ItemStatus): {
  bg: string;
  text: string;
  label: string;
  progressColor: string;
} {
  switch (status) {
    case 'funded':
      return {
        bg: 'var(--monarch-success-bg)',
        text: 'var(--monarch-success)',
        label: 'Funded',
        progressColor: 'var(--monarch-success)',
      };
    case 'ahead':
      return {
        bg: 'var(--monarch-info-bg)',
        text: 'var(--monarch-info)',
        label: 'Ahead',
        progressColor: 'var(--monarch-info)',
      };
    case 'on_track':
      return {
        bg: 'var(--monarch-bg-hover)',
        text: 'var(--monarch-text-muted)',
        label: 'On Track',
        progressColor: 'var(--monarch-text-muted)',
      };
    case 'behind':
      return {
        bg: 'var(--monarch-warning-bg)',
        text: 'var(--monarch-warning)',
        label: 'Catching Up',
        progressColor: 'var(--monarch-warning)',
      };
    case 'due_now':
      return {
        bg: 'var(--monarch-error-bg)',
        text: 'var(--monarch-error)',
        label: 'Due Now',
        progressColor: 'var(--monarch-error)',
      };
    case 'inactive':
      return {
        bg: 'var(--monarch-bg-hover)',
        text: 'var(--monarch-text-light)',
        label: 'Inactive',
        progressColor: 'var(--monarch-border)',
      };
    default:
      return {
        bg: 'var(--monarch-bg-hover)',
        text: 'var(--monarch-text-muted)',
        label: status,
        progressColor: 'var(--monarch-text-muted)',
      };
  }
}

export function CategoryCard({ item }: CategoryCardProps) {
  const statusStyles = getStatusStyles(item.status);
  const isInactive = item.status === 'inactive';

  return (
    <div
      className={`rounded-lg shadow p-4 ${isInactive ? 'opacity-60' : ''}`}
      style={{ backgroundColor: 'var(--monarch-bg-card)' }}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {item.name}
          </h3>
          <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            {formatDate(item.next_due_date)} ({item.frequency_months}mo cycle)
          </p>
        </div>
        <span
          className="px-2 py-1 text-xs font-medium rounded-full"
          style={{ backgroundColor: statusStyles.bg, color: statusStyles.text }}
        >
          {statusStyles.label}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span style={{ color: 'var(--monarch-text-muted)' }}>
            {formatCurrency(item.current_balance)} of{' '}
            {formatCurrency(item.amount)}
          </span>
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {item.progress_percent.toFixed(0)}%
          </span>
        </div>
        <div className="rounded-full h-2" style={{ backgroundColor: 'var(--monarch-border)' }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{
              backgroundColor: statusStyles.progressColor,
              width: `${Math.min(100, item.progress_percent)}%`,
            }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <div>
          <span style={{ color: 'var(--monarch-text-muted)' }}>Monthly: </span>
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatCurrency(item.frozen_monthly_target)}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--monarch-text-muted)' }}>
            {item.months_until_due} month{item.months_until_due !== 1 ? 's' : ''}{' '}
            left
          </span>
        </div>
      </div>

      {item.over_contribution > 0 && (
        <div className="mt-2 text-xs" style={{ color: 'var(--monarch-info)' }}>
          +{formatCurrency(item.over_contribution)} over-contributed
        </div>
      )}
    </div>
  );
}
