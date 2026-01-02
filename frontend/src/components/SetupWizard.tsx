import { useState, useEffect, useCallback } from 'react';
import { TourProvider } from '@reactour/tour';
import type { CategoryGroup, RecurringItem, UnmappedCategory } from '../types';
import {
  getCategoryGroups,
  setConfig,
  getDashboard,
  toggleItemTracking,
  triggerSync,
  linkToCategory,
  getUnmappedCategories,
  linkRollupToCategory,
  createRollupCategory,
} from '../api/client';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { LinkCategoryModal, type PendingLink } from './LinkCategoryModal';
import { RecurringIcon, TourController, wizardTourStyles } from './wizards/WizardComponents';
import { formatDueDate, formatCurrency, formatFrequency } from '../utils';
import {
  AppIcon,
  EmptyInboxIcon,
  PackageIcon,
  CheckCircleIcon,
  DownloadIcon,
  BookmarkIcon,
  CheckIcon,
  LinkIcon,
  FrequencyIcon,
} from './wizards/SetupWizardIcons';

interface SetupWizardProps {
  onComplete: () => void;
}

// Tour steps for guided experience
const TOUR_STEPS = [
  {
    selector: '[data-tour="link-icon"]',
    content: () => (
      <div>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--monarch-text-dark)' }}>
          Link to Existing Category
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)', marginBottom: '12px' }}>
          Already have a category in Monarch for this expense? Click this icon to link to it instead of creating a new one.
        </p>
        <p style={{ fontSize: '13px', color: 'var(--monarch-text-muted)', fontStyle: 'italic' }}>
          This helps keep your existing budget organization intact.
        </p>
      </div>
    ),
    position: 'left' as const,
  },
];

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'category', title: 'Category' },
  { id: 'items', title: 'Items' },
  { id: 'rollup', title: 'Rollup' },
  { id: 'finish', title: 'Finish' },
];

// Step Indicator Component
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300"
            style={{
              backgroundColor: index <= currentStep ? 'var(--monarch-orange)' : 'var(--monarch-bg-page)',
              color: index <= currentStep ? 'white' : 'var(--monarch-text-muted)',
              border: index === currentStep ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
              transform: index === currentStep ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            {index + 1}
          </div>
          {index < STEPS.length - 1 && (
            <div
              className="w-6 h-0.5 transition-colors duration-300"
              style={{
                backgroundColor: index < currentStep ? 'var(--monarch-orange)' : 'var(--monarch-border)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          {title}
        </div>
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {description}
        </div>
      </div>
    </div>
  );
}

// Welcome Step
function WelcomeStep() {
  return (
    <div className="text-center animate-fade-in">
      <div className="mb-4 flex justify-center">
        <AppIcon size={64} />
      </div>
      <h2 className="text-xl mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Welcome to <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 600 }}>Eclosion</span>
      </h2>
      <p className="mb-4" style={{ color: 'var(--monarch-orange)', fontStyle: 'italic' }}>
        A toolkit to evolve your Monarch experience
      </p>
      <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        Eclosion extends Monarch Money with additional features and automation. Here's what's available:
      </p>

      <div className="space-y-3 text-left">
        <div
          className="text-xs font-medium uppercase tracking-wide px-3 pt-2"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Available Modules
        </div>
        <FeatureCard
          icon={<RecurringIcon />}
          title="Recurring Expenses"
          description="Track subscriptions and bills with smart budgeting, automatic catch-up calculations, and rollup categories."
        />
      </div>
    </div>
  );
}

// Category Step
function CategoryStep({
  groups,
  selectedGroupId,
  onSelectGroup,
  loading,
  onRefresh,
  error,
}: {
  groups: CategoryGroup[];
  selectedGroupId: string;
  onSelectGroup: (id: string, name: string) => void;
  loading: boolean;
  onRefresh: () => void;
  error: string | null;
}) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Select Category Group
      </h2>
      <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        Choose where your recurring savings categories will be created in Monarch Money.
      </p>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center" style={{ color: 'var(--monarch-text-muted)' }}>
          Loading category groups...
        </div>
      ) : groups.length === 0 ? (
        <div className="py-4">
          <p className="mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
            No category groups found. Please create a category group in Monarch Money first.
          </p>
          <a
            href="https://app.monarchmoney.com/settings/categories"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:underline"
            style={{ color: 'var(--monarch-orange)' }}
          >
            Open Monarch Money Categories Settings
          </a>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="category-group" className="block text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Default Category Group
            </label>
            <a
              href="https://app.monarchmoney.com/settings/categories"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm hover:underline"
              style={{ color: 'var(--monarch-orange)' }}
            >
              Create New
            </a>
          </div>
          <select
            id="category-group"
            value={selectedGroupId}
            onChange={(e) => {
              const group = groups.find((g) => g.id === e.target.value);
              if (group) onSelectGroup(group.id, group.name);
            }}
            className="w-full rounded-lg px-3 py-2"
            style={{
              border: '1px solid var(--monarch-border)',
              backgroundColor: 'var(--monarch-bg-card)',
              color: 'var(--monarch-text-dark)',
            }}
          >
            <option value="">Select a group...</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-sm px-3 py-1 rounded transition-colors hover:underline"
        style={{ color: 'var(--monarch-orange)' }}
      >
        {loading ? 'Refreshing...' : 'Refresh groups'}
      </button>
    </div>
  );
}

// Frequency group order for display
const FREQUENCY_ORDER = ['weekly', 'every_two_weeks', 'twice_a_month', 'monthly', 'quarterly', 'semiyearly', 'yearly'];

// Merchant Logo Component with fallback
function MerchantLogo({ item, size = 40 }: { item: RecurringItem; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const displayName = item.merchant_name || item.name;
  const initial = displayName.charAt(0).toUpperCase();

  // Generate a consistent color based on name
  const colors = [
    '#FF692D', '#4A90D9', '#50C878', '#9B59B6', '#E74C3C',
    '#3498DB', '#1ABC9C', '#F39C12', '#E91E63', '#00BCD4'
  ];
  const colorIndex = displayName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const bgColor = colors[colorIndex];

  if (item.logo_url && !imgError) {
    return (
      <img
        src={item.logo_url}
        alt=""
        className="rounded-lg object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="rounded-lg flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, backgroundColor: bgColor, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

// Item Card Component
function ItemCard({
  item,
  checked,
  onChange,
  onLinkClick,
  onUnlink,
  pendingLink,
}: {
  item: RecurringItem;
  checked: boolean;
  onChange: () => void;
  onLinkClick: (() => void) | undefined;
  onUnlink: (() => void) | undefined;
  pendingLink: PendingLink | undefined;
}) {
  const displayName = item.merchant_name || item.name.split(' (')[0];
  const isLinked = !!pendingLink;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
      style={{
        backgroundColor: checked ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-card)',
        border: checked ? '1px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
      }}
      onClick={onChange}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--monarch-orange)';
          e.currentTarget.style.backgroundColor = 'rgba(255, 105, 45, 0.04)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.borderColor = 'var(--monarch-border)';
          e.currentTarget.style.backgroundColor = 'var(--monarch-bg-card)';
        }
      }}
    >
      <div
        className="shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: checked ? 'var(--monarch-orange)' : 'var(--monarch-border)',
          backgroundColor: checked ? 'var(--monarch-orange)' : 'transparent',
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <MerchantLogo item={item} size={40} />

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" style={{ color: 'var(--monarch-text-dark)' }}>
          {displayName}
        </div>
        <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          {isLinked ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnlink?.();
              }}
              className="inline-flex items-center gap-1 hover:underline"
              style={{ color: 'var(--monarch-success)' }}
              title="Click to unlink"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {pendingLink.categoryIcon && <span>{pendingLink.categoryIcon}</span>}
              {pendingLink.categoryName}
              <span style={{ color: 'var(--monarch-text-muted)' }}>×</span>
            </button>
          ) : (
            formatDueDate(item.next_due_date)
          )}
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-2">
        {checked && onLinkClick && !isLinked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLinkClick();
            }}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--monarch-text-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--monarch-orange)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 105, 45, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--monarch-text-muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Link to existing category"
            data-tour="link-icon"
          >
            <LinkIcon size={16} />
          </button>
        )}
        <div>
          <div className="font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatCurrency(item.monthly_contribution)}/mo
          </div>
          <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            {formatCurrency(item.amount)} {formatFrequency(item.frequency).toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Frequency Group Component
function FrequencyGroup({
  frequency,
  items,
  selectedIds,
  pendingLinks,
  onToggleItem,
  onToggleGroup,
  onLinkClick,
  onUnlink,
}: {
  frequency: string;
  items: RecurringItem[];
  selectedIds: Set<string>;
  pendingLinks: Map<string, PendingLink>;
  onToggleItem: (id: string) => void;
  onToggleGroup: (ids: string[], select: boolean) => void;
  onLinkClick: (item: RecurringItem) => void;
  onUnlink: (itemId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const groupIds = items.map(i => i.id);
  const selectedCount = groupIds.filter(id => selectedIds.has(id)).length;
  const allSelected = selectedCount === items.length;
  const someSelected = selectedCount > 0 && selectedCount < items.length;
  const totalMonthly = items.reduce((sum, i) => sum + i.monthly_contribution, 0);

  return (
    <div className="mb-4">
      <div
        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <button
          className="p-1"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(!collapsed);
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--monarch-text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <FrequencyIcon frequency={frequency} />

        <div className="flex-1">
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatFrequency(frequency)}
          </span>
          <span className="text-sm ml-2" style={{ color: 'var(--monarch-text-muted)' }}>
            ({items.length} item{items.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {formatCurrency(totalMonthly)}/mo
        </div>

        <button
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{
            color: allSelected ? 'var(--monarch-text-muted)' : 'var(--monarch-orange)',
            backgroundColor: 'transparent',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleGroup(groupIds, !allSelected);
          }}
        >
          {allSelected ? 'Deselect' : someSelected ? 'Select all' : 'Select all'}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2 mt-2 pl-2">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              checked={selectedIds.has(item.id)}
              onChange={() => onToggleItem(item.id)}
              onLinkClick={() => onLinkClick(item)}
              onUnlink={() => onUnlink(item.id)}
              pendingLink={pendingLinks.get(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Item Selection Step
function ItemSelectionStep({
  items,
  selectedIds,
  pendingLinks,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
  onRefresh,
  loading,
  error,
  onToggleGroup,
  onLinkClick,
  onUnlink,
  categoryGroupName,
  onChangeGroup,
}: {
  items: RecurringItem[];
  selectedIds: Set<string>;
  pendingLinks: Map<string, PendingLink>;
  onToggleItem: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRefresh: () => void;
  loading: boolean;
  error: string | null;
  onToggleGroup: (ids: string[], select: boolean) => void;
  onLinkClick: (item: RecurringItem) => void;
  onUnlink: (itemId: string) => void;
  categoryGroupName: string;
  onChangeGroup: () => void;
}) {
  // Group items by frequency and sort by amount (largest first)
  const groupedItems = items.reduce((groups, item) => {
    const freq = item.frequency || 'monthly';
    if (!groups[freq]) groups[freq] = [];
    groups[freq].push(item);
    return groups;
  }, {} as Record<string, RecurringItem[]>);

  // Sort each group by amount descending
  Object.keys(groupedItems).forEach(freq => {
    const group = groupedItems[freq];
    if (group) {
      group.sort((a, b) => b.amount - a.amount);
    }
  });

  // Sort groups by frequency order
  const sortedFrequencies = Object.keys(groupedItems).filter(f => {
    const group = groupedItems[f];
    return group && group.length > 0;
  });

  // Calculate totals
  const totalMonthly = items.reduce((sum, i) => sum + i.monthly_contribution, 0);
  const selectedMonthly = items
    .filter(i => selectedIds.has(i.id))
    .reduce((sum, i) => sum + i.monthly_contribution, 0);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Loading Recurring Items...
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div
                className="h-10 rounded-lg animate-pulse mb-2"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              />
              <div className="space-y-2 pl-2">
                {[1, 2].map((j) => (
                  <div
                    key={j}
                    className="h-16 rounded-lg animate-pulse"
                    style={{ backgroundColor: 'var(--monarch-bg-page)', opacity: 0.6 }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Create Dedicated Categories
        </h2>
        <div
          className="p-4 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
        >
          {error}
        </div>
        <button
          onClick={onRefresh}
          className="mt-4 text-sm px-4 py-2 rounded-lg transition-colors"
          style={{
            color: 'var(--monarch-orange)',
            border: '1px solid var(--monarch-orange)',
            backgroundColor: 'transparent',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="animate-fade-in text-center py-8">
        <div className="mb-4 flex justify-center">
          <EmptyInboxIcon size={48} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          No Recurring Items Found
        </h2>
        <p style={{ color: 'var(--monarch-text-muted)' }}>
          You don't have any recurring transactions in Monarch Money yet, or they're all already being tracked.
        </p>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="mt-4 text-sm px-4 py-2 rounded-lg transition-colors"
          style={{
            color: 'var(--monarch-orange)',
            border: '1px solid var(--monarch-orange)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 105, 45, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh from Monarch'}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Create Dedicated Categories
      </h2>
      <p className="mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
        Each selected item will get its own budget category.
      </p>

      {/* Summary bar */}
      <div
        className="flex items-center justify-between p-3 rounded-lg mb-4"
        style={{ backgroundColor: 'rgba(255, 105, 45, 0.08)', border: '1px solid var(--monarch-border)' }}
      >
        <div>
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {selectedIds.size} of {items.length}
          </span>
          <span className="text-sm ml-1" style={{ color: 'var(--monarch-text-muted)' }}>
            items selected
          </span>
        </div>
        <div className="text-right">
          <span className="font-semibold" style={{ color: 'var(--monarch-orange)' }}>
            {formatCurrency(selectedMonthly)}
          </span>
          <span className="text-sm ml-1" style={{ color: 'var(--monarch-text-muted)' }}>
            / {formatCurrency(totalMonthly)} monthly
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={onSelectAll}
          className="text-xs px-3 py-1.5 rounded-full transition-colors"
          style={{
            color: 'var(--monarch-orange)',
            border: '1px solid var(--monarch-orange)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 105, 45, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Select All
        </button>
        <button
          onClick={onDeselectAll}
          className="text-xs px-3 py-1.5 rounded-full transition-colors"
          style={{
            color: 'var(--monarch-text-muted)',
            border: '1px solid var(--monarch-border)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--monarch-bg-page)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Deselect All
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-full transition-colors ml-auto"
          style={{
            color: 'var(--monarch-text-muted)',
            border: '1px solid var(--monarch-border)',
            backgroundColor: 'transparent',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Category group info */}
      <div
        className="flex items-center gap-2 mb-4 text-sm"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span>Creating in:</span>
        <button
          onClick={onChangeGroup}
          className="font-medium hover:underline"
          style={{ color: 'var(--monarch-orange)' }}
        >
          {categoryGroupName || 'Select a group'}
        </button>
      </div>

      {/* Grouped items */}
      <div
        className="max-h-64 overflow-y-auto pr-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {sortedFrequencies.map(frequency => (
          <FrequencyGroup
            key={frequency}
            frequency={frequency}
            items={groupedItems[frequency] ?? []}
            selectedIds={selectedIds}
            pendingLinks={pendingLinks}
            onToggleItem={onToggleItem}
            onToggleGroup={onToggleGroup}
            onLinkClick={onLinkClick}
            onUnlink={onUnlink}
          />
        ))}
      </div>
    </div>
  );
}

// Rollup Configuration Step
function RollupConfigStep({
  mode,
  onModeChange,
  categories,
  selectedCategoryId,
  onCategorySelect,
  syncName,
  onSyncNameChange,
  loading,
  groupName,
}: {
  mode: 'new' | 'existing';
  onModeChange: (mode: 'new' | 'existing') => void;
  categories: UnmappedCategory[];
  selectedCategoryId: string;
  onCategorySelect: (id: string) => void;
  syncName: boolean;
  onSyncNameChange: (sync: boolean) => void;
  loading: boolean;
  groupName: string;
}) {
  // Group categories by group_name for dropdown
  const groupedCategories = categories.reduce((acc, cat) => {
    const group = cat.group_name || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(cat);
    return acc;
  }, {} as Record<string, UnmappedCategory[]>);

  return (
    <div className="text-center animate-fade-in">
      <div className="mb-4 flex justify-center">
        <PackageIcon size={48} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        The Rollup Category
      </h2>
      <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        The rollup is a single catch-all category for smaller recurring charges. Would you like to use an existing category or create a new one?
      </p>

      {/* Mode selection */}
      <div className="space-y-3 mb-6">
        {/* Create new option */}
        <label
          className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all"
          style={{
            backgroundColor: mode === 'new' ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-page)',
            border: mode === 'new' ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
          }}
        >
          <input
            type="radio"
            name="rollupMode"
            checked={mode === 'new'}
            onChange={() => onModeChange('new')}
            className="mt-1"
            style={{ accentColor: 'var(--monarch-orange)' }}
          />
          <div className="text-left">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Create new category
            </div>
            <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              A new "Recurring Rollup" category will be created in <strong>{groupName}</strong>
            </div>
          </div>
        </label>

        {/* Use existing option */}
        <label
          className="flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all"
          style={{
            backgroundColor: mode === 'existing' ? 'rgba(255, 105, 45, 0.08)' : 'var(--monarch-bg-page)',
            border: mode === 'existing' ? '2px solid var(--monarch-orange)' : '1px solid var(--monarch-border)',
          }}
        >
          <input
            type="radio"
            name="rollupMode"
            checked={mode === 'existing'}
            onChange={() => onModeChange('existing')}
            className="mt-1"
            style={{ accentColor: 'var(--monarch-orange)' }}
          />
          <div className="text-left flex-1">
            <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Use existing category
            </div>
            <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Link the rollup to a category you already have in Monarch
            </div>
          </div>
        </label>
      </div>

      {/* Category selection (when existing mode) */}
      {mode === 'existing' && (
        <div
          className="rounded-lg p-4 text-left mb-6"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {loading ? (
            <div className="text-center py-4" style={{ color: 'var(--monarch-text-muted)' }}>
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-4" style={{ color: 'var(--monarch-text-muted)' }}>
              No available categories found
            </div>
          ) : (
            <>
              <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Select a category:
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => onCategorySelect(e.target.value)}
                className="w-full p-3 rounded-lg mb-3"
                style={{
                  backgroundColor: 'var(--monarch-bg-card)',
                  border: '1px solid var(--monarch-border)',
                  color: 'var(--monarch-text-dark)',
                }}
              >
                <option value="">Choose a category...</option>
                {Object.entries(groupedCategories).map(([groupName, cats]) => (
                  <optgroup key={groupName} label={groupName}>
                    {cats.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name} — ${cat.planned_budget || 0} budgeted
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncName}
                  onChange={(e) => onSyncNameChange(e.target.checked)}
                  style={{ accentColor: 'var(--monarch-orange)' }}
                />
                <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                  Rename category to "Recurring Rollup"
                </span>
              </label>
            </>
          )}
        </div>
      )}

      <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        You can configure which items go into the rollup from the dashboard after setup.
      </p>
    </div>
  );
}

// Finish Step with Install/Bookmark Nudge
function FinishStep({
  canInstall,
  isInstalled,
  isIOS,
  onInstall,
}: {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  onInstall: () => void;
}) {
  const baseUrl = window.location.origin;

  return (
    <div className="text-center animate-fade-in">
      <div className="mb-4 flex justify-center">
        <CheckCircleIcon size={48} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        You're All Set!
      </h2>
      <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        Your recurring savings tracker is ready to go. Before you dive in, save this app for easy access.
      </p>

      <div className="space-y-4 text-left">
        {/* Install App Option */}
        {!isInstalled && (canInstall || isIOS) && (
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'rgba(255, 105, 45, 0.08)',
              border: '1px solid var(--monarch-orange)',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0" style={{ color: 'var(--monarch-orange)' }}>
                <DownloadIcon size={24} />
              </div>
              <div className="flex-1">
                <div className="font-medium mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
                  Install as App
                </div>
                <div className="text-sm mb-3" style={{ color: 'var(--monarch-text-muted)' }}>
                  {isIOS
                    ? 'Add to your home screen for quick access like a native app.'
                    : 'Install on your device for quick access and offline support.'}
                </div>
                {canInstall ? (
                  <button
                    onClick={onInstall}
                    className="px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium"
                    style={{ backgroundColor: 'var(--monarch-orange)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--monarch-orange-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--monarch-orange)';
                    }}
                  >
                    Install App
                  </button>
                ) : isIOS ? (
                  <div
                    className="text-sm p-3 rounded"
                    style={{ backgroundColor: 'var(--monarch-bg-page)' }}
                  >
                    <div style={{ color: 'var(--monarch-text-dark)' }}>
                      Tap the <strong>Share</strong> button{' '}
                      <span style={{ fontFamily: 'system-ui' }}>⎙</span> then select{' '}
                      <strong>"Add to Home Screen"</strong>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Already Installed */}
        {isInstalled && (
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: 'var(--monarch-success-bg)',
              border: '1px solid var(--monarch-success)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="shrink-0" style={{ color: 'var(--monarch-success)' }}>
                <CheckIcon size={24} />
              </div>
              <div>
                <div className="font-medium" style={{ color: 'var(--monarch-success)' }}>
                  App Installed
                </div>
                <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                  You're running Eclosion as an installed app.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookmark Option */}
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0" style={{ color: 'var(--monarch-text-muted)' }}>
              <BookmarkIcon size={24} />
            </div>
            <div className="flex-1">
              <div className="font-medium mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
                Bookmark This Page
              </div>
              <div className="text-sm mb-2" style={{ color: 'var(--monarch-text-muted)' }}>
                Save to your bookmarks for easy access.
              </div>
              <div
                className="text-xs p-2 rounded font-mono break-all"
                style={{
                  backgroundColor: 'var(--monarch-bg-card)',
                  color: 'var(--monarch-text-muted)',
                  border: '1px solid var(--monarch-border)',
                }}
              >
                {baseUrl}
              </div>
              <div className="text-xs mt-2" style={{ color: 'var(--monarch-text-muted)' }}>
                Press <kbd className="px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}>
                  {navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl'}+D
                </kbd> to bookmark
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Navigation Component
function WizardNavigation({
  onBack,
  onNext,
  onSkip,
  canGoBack,
  canProceed,
  isLastStep,
  isSaving,
}: {
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  canGoBack: boolean;
  canProceed: boolean;
  isLastStep: boolean;
  isSaving: boolean;
}) {
  return (
    <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--monarch-border)' }}>
      <div className="flex justify-center mb-4">
        <button
          onClick={onSkip}
          disabled={isSaving}
          className="text-sm px-4 py-1 rounded transition-colors hover:underline disabled:opacity-50"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Skip setup
        </button>
      </div>

      <div className="flex gap-3">
        {canGoBack && (
          <button
            onClick={onBack}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg transition-colors btn-hover-lift disabled:opacity-50"
            style={{
              border: '1px solid var(--monarch-border)',
              color: 'var(--monarch-text-dark)',
              backgroundColor: 'var(--monarch-bg-card)',
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!canProceed || isSaving}
          className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift"
          style={{
            backgroundColor: !canProceed || isSaving ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
          }}
          onMouseEnter={(e) => {
            if (canProceed && !isSaving) e.currentTarget.style.backgroundColor = 'var(--monarch-orange-hover)';
          }}
          onMouseLeave={(e) => {
            if (canProceed && !isSaving) e.currentTarget.style.backgroundColor = 'var(--monarch-orange)';
          }}
        >
          {isSaving ? 'Setting up...' : isLastStep ? 'Get Started' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

// Main Wizard Component
export function SetupWizard({ onComplete }: SetupWizardProps) {
  // Step state
  const [currentStep, setCurrentStep] = useState(0);

  // PWA install state
  const pwaInstall = usePwaInstall();

  // Category group state
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupsFetched, setGroupsFetched] = useState(false);

  // Items state
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [itemsFetched, setItemsFetched] = useState(false);

  // Linking state - store pending links (not saved to DB until next step)
  const [pendingLinks, setPendingLinks] = useState<Map<string, PendingLink>>(new Map());
  const [linkModalItem, setLinkModalItem] = useState<RecurringItem | null>(null);

  // Tour state
  const [showLinkTour, setShowLinkTour] = useState(false);
  const [linkTourShown, setLinkTourShown] = useState(false);

  // Rollup tip toast state
  const [rollupTipShown, setRollupTipShown] = useState(false);
  const [showRollupTip, setShowRollupTip] = useState(false);

  // Rollup configuration state
  const [rollupMode, setRollupMode] = useState<'new' | 'existing'>('new');
  const [rollupCategories, setRollupCategories] = useState<UnmappedCategory[]>([]);
  const [selectedRollupCategoryId, setSelectedRollupCategoryId] = useState('');
  const [rollupSyncName, setRollupSyncName] = useState(true);
  const [loadingRollupCategories, setLoadingRollupCategories] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch category groups
  const fetchGroups = async () => {
    setLoadingGroups(true);
    setGroupError(null);
    try {
      const data = await getCategoryGroups();
      setGroups(data);
      setGroupsFetched(true);
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch recurring items
  const fetchItems = async () => {
    setLoadingItems(true);
    setItemsError(null);
    try {
      const data = await getDashboard();
      // Filter to only non-enabled items (not already being tracked)
      const availableItems = data.items.filter((item) => !item.is_enabled);
      setItems(availableItems);
      setItemsFetched(true);
    } catch (err) {
      setItemsError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoadingItems(false);
    }
  };

  // Load groups when entering category step
  useEffect(() => {
    // Don't refetch if we already fetched, are loading, or have an error
    if (currentStep === 1 && !groupsFetched && !loadingGroups && !groupError) {
      fetchGroups();
    }
  }, [currentStep, groupsFetched, loadingGroups, groupError]);

  // Load items when entering items step
  useEffect(() => {
    // Don't refetch if we already fetched, are loading, or have an error
    if (currentStep === 2 && !itemsFetched && !loadingItems && !itemsError) {
      fetchItems();
    }
  }, [currentStep, itemsFetched, loadingItems, itemsError]);

  // Fetch rollup categories when entering rollup step and existing mode is selected
  const fetchRollupCategories = async () => {
    setLoadingRollupCategories(true);
    try {
      const categories = await getUnmappedCategories();
      setRollupCategories(categories);
    } catch (err) {
      console.error('Failed to fetch rollup categories:', err);
    } finally {
      setLoadingRollupCategories(false);
    }
  };

  // Load rollup categories when entering rollup step
  useEffect(() => {
    if (currentStep === 3 && rollupCategories.length === 0 && !loadingRollupCategories) {
      fetchRollupCategories();
    }
  }, [currentStep, rollupCategories.length, loadingRollupCategories]);

  // Check if can proceed to next step
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return true; // Welcome - always can proceed
      case 1:
        return !!selectedGroupId; // Must select a group
      case 2:
        return true; // Item selection is optional
      case 3:
        // Rollup config - if existing mode, must select a category
        return rollupMode === 'new' || !!selectedRollupCategoryId;
      case 4:
        return true; // Finish step - always can proceed
      default:
        return false;
    }
  };

  // Handle group selection
  const handleSelectGroup = (id: string, name: string) => {
    setSelectedGroupId(id);
    setSelectedGroupName(name);
  };

  // Handle item toggle
  const handleToggleItem = useCallback((id: string) => {
    // Find the item to check its amount
    const item = items.find(i => i.id === id);

    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      const wasEmpty = prev.size === 0;

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);

        // Show link tour on first item selection (if not shown before)
        if (wasEmpty && !linkTourShown) {
          // Small delay to let the link icon render
          setTimeout(() => {
            setShowLinkTour(true);
            setLinkTourShown(true);
          }, 300);
        }

        // Show rollup tip when selecting a small item (< $60) for the first time
        if (item && item.amount < 60 && !rollupTipShown) {
          setRollupTipShown(true);
          setShowRollupTip(true);
        }
      }
      return next;
    });
  }, [items, linkTourShown, rollupTipShown]);

  // Handle select all
  const handleSelectAll = () => {
    setSelectedItemIds(new Set(items.map((item) => item.id)));

    // Show rollup tip if any items are < $60 and tip hasn't been shown
    if (!rollupTipShown && items.some(item => item.amount < 60)) {
      setRollupTipShown(true);
      setShowRollupTip(true);
    }
  };

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  // Handle toggle group (select/deselect all items in a frequency group)
  const handleToggleGroup = (ids: string[], select: boolean) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (select) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  // Handle refresh items (force refresh from Monarch)
  const handleRefreshItems = async () => {
    setLoadingItems(true);
    setItemsError(null);
    setItemsFetched(false);
    try {
      // Call sync endpoint first to refresh cache from Monarch
      await triggerSync();
      // Then fetch updated dashboard
      const data = await getDashboard();
      const availableItems = data.items.filter((item) => !item.is_enabled);
      setItems(availableItems);
      setItemsFetched(true);
    } catch (err) {
      setItemsError(err instanceof Error ? err.message : 'Failed to refresh items');
    } finally {
      setLoadingItems(false);
    }
  };

  // Handle opening link modal
  const handleOpenLinkModal = (item: RecurringItem) => {
    setLinkModalItem(item);
  };

  // Handle link result from modal (deferred save)
  const handleLinkSuccess = (link?: PendingLink) => {
    if (link && linkModalItem) {
      setPendingLinks((prev) => {
        const next = new Map(prev);
        next.set(linkModalItem.id, link);
        return next;
      });
    }
    setLinkModalItem(null);
  };

  // Handle unlinking an item
  const handleUnlink = (itemId: string) => {
    setPendingLinks((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  };

  // Handle going back to category step to change group
  const handleChangeGroup = () => {
    setCurrentStep(1);
  };

  // Handle completion
  const handleComplete = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      // Save the category group config
      if (selectedGroupId && selectedGroupName) {
        await setConfig(selectedGroupId, selectedGroupName);
      }

      // Set up rollup category based on user choice
      if (rollupMode === 'existing' && selectedRollupCategoryId) {
        // Link to existing category - inherits its budget
        await linkRollupToCategory(selectedRollupCategoryId, rollupSyncName);
      } else {
        // Create new rollup category with $0 budget
        await createRollupCategory(0);
      }

      // Save pending category links
      const linkPromises = Array.from(pendingLinks.entries()).map(([itemId, link]) =>
        linkToCategory(itemId, link.categoryId, link.syncName).catch((err) => ({
          itemId,
          error: err instanceof Error ? err.message : 'Failed to link',
        }))
      );

      await Promise.all(linkPromises);

      // Enable selected items (that aren't linked - linked items are auto-enabled)
      // Use $0 initial budget for newly created categories
      const linkedItemIds = new Set(pendingLinks.keys());
      const enablePromises = Array.from(selectedItemIds)
        .filter((id) => !linkedItemIds.has(id))
        .map((id) =>
          toggleItemTracking(id, true, { initialBudget: 0 }).catch((err) => ({
            id,
            error: err instanceof Error ? err.message : 'Failed',
          }))
        );

      await Promise.all(enablePromises);

      // Complete the wizard
      onComplete();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save configuration');
      setSaving(false);
    }
  };

  // Handle skip
  const handleSkip = async () => {
    setSaving(true);
    try {
      // If a group was selected, still save it
      if (selectedGroupId && selectedGroupName) {
        await setConfig(selectedGroupId, selectedGroupName);
      }
      onComplete();
    } catch {
      // Even if save fails, proceed to dashboard
      onComplete();
    }
  };

  // Handle next
  const handleNext = () => {
    if (currentStep === STEPS.length - 1) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  // Handle back
  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  // Handle PWA install
  const handleInstall = async () => {
    await pwaInstall.promptInstall();
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case 1:
        return (
          <CategoryStep
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={handleSelectGroup}
            loading={loadingGroups}
            onRefresh={fetchGroups}
            error={groupError}
          />
        );
      case 2:
        return (
          <ItemSelectionStep
            items={items}
            selectedIds={selectedItemIds}
            pendingLinks={pendingLinks}
            onToggleItem={handleToggleItem}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onRefresh={handleRefreshItems}
            loading={loadingItems}
            error={itemsError}
            onToggleGroup={handleToggleGroup}
            onLinkClick={handleOpenLinkModal}
            onUnlink={handleUnlink}
            categoryGroupName={selectedGroupName}
            onChangeGroup={handleChangeGroup}
          />
        );
      case 3:
        return (
          <RollupConfigStep
            mode={rollupMode}
            onModeChange={setRollupMode}
            categories={rollupCategories}
            selectedCategoryId={selectedRollupCategoryId}
            onCategorySelect={setSelectedRollupCategoryId}
            syncName={rollupSyncName}
            onSyncNameChange={setRollupSyncName}
            loading={loadingRollupCategories}
            groupName={selectedGroupName}
          />
        );
      case 4:
        return (
          <FinishStep
            canInstall={pwaInstall.canInstall}
            isInstalled={pwaInstall.isInstalled}
            isIOS={pwaInstall.isIOS}
            onInstall={handleInstall}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TourProvider
      steps={TOUR_STEPS}
      styles={wizardTourStyles}
      showNavigation={false}
      showBadge={false}
      disableInteraction
      onClickMask={() => setShowLinkTour(false)}
      onClickClose={() => setShowLinkTour(false)}
      scrollSmooth
    >
      <TourController isOpen={showLinkTour} onClose={() => setShowLinkTour(false)} />
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <div
          className="rounded-xl shadow-lg w-full max-w-lg p-6"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <StepIndicator currentStep={currentStep} />

          {saveError && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            >
              {saveError}
            </div>
          )}

          {renderStepContent()}

          <WizardNavigation
            onBack={handleBack}
            onNext={handleNext}
            onSkip={handleSkip}
            canGoBack={currentStep > 0}
            canProceed={canProceed()}
            isLastStep={currentStep === STEPS.length - 1}
            isSaving={saving}
          />
        </div>

        {/* Bottom right: Help and GitHub links */}
        <div className="fixed bottom-4 right-4 flex items-center gap-2">
          {/* Help button - triggers tour (only visible on items step with selections) */}
          {currentStep === 2 && selectedItemIds.size > 0 && (
            <button
              onClick={() => setShowLinkTour(true)}
              className="p-2 rounded-full transition-colors"
              style={{ color: 'var(--monarch-text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--monarch-text-dark)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--monarch-text-muted)'; }}
              title="Show tutorial"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          )}

          {/* GitHub source link */}
          <a
            href="https://github.com/graysonhead/eclosion"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--monarch-text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--monarch-text-dark)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--monarch-text-muted)'; }}
            title="View source on GitHub"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>

        {/* Link Category Modal */}
        {linkModalItem && (
          <LinkCategoryModal
            item={linkModalItem}
            isOpen={!!linkModalItem}
            onClose={() => setLinkModalItem(null)}
            onSuccess={handleLinkSuccess}
            deferSave={true}
            reservedCategories={new Map(
              Array.from(pendingLinks.entries()).map(([itemId, link]) => {
                const linkedItem = items.find(i => i.id === itemId);
                const itemName = linkedItem?.merchant_name || linkedItem?.name || 'Unknown item';
                return [link.categoryId, itemName];
              })
            )}
          />
        )}

        {/* Rollup tip tour modal */}
        {showRollupTip && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-(--z-index-modal-backdrop)"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            />
            {/* Modal */}
            <div
              className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center p-4"
            >
              <div
                className="rounded-xl p-5"
                style={{
                  backgroundColor: 'var(--monarch-bg-card)',
                  border: '1px solid var(--monarch-border)',
                  maxWidth: '340px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div className="font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                  Here's a tip!
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
                  Smaller recurring items can be left unchecked here and combined into a shared rollup category in the next step.
                </p>
                <button
                  onClick={() => setShowRollupTip(false)}
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--monarch-orange)',
                    color: 'white',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--monarch-orange-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--monarch-orange)'; }}
                >
                  Got it
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </TourProvider>
  );
}
