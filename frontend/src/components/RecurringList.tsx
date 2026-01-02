import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { RecurringItem, CategoryGroup, ItemStatus } from '../types';
import { toggleItemTracking, allocateFunds, recreateCategory, getCategoryGroups, changeCategoryGroup, addToRollup, updateCategoryEmoji, refreshItem, updateCategoryName } from '../api/client';
import { EmojiPicker } from './EmojiPicker';
import { LinkCategoryModal } from './LinkCategoryModal';
import { Tooltip } from './Tooltip';
import { MerchantIcon } from './ui';
import { useToast } from '../context/ToastContext';
import { useClickOutside, useDropdown } from '../hooks';
import {
  formatCurrency,
  formatFrequency,
  formatFrequencyShort,
  formatDateRelative,
  getStatusLabel,
  getStatusStyles,
  formatErrorMessage,
  FREQUENCY_ORDER,
} from '../utils';
import { Filter, Inbox, Eye, EyeOff } from 'lucide-react';

interface RecurringListProps {
  readonly items: RecurringItem[];
  readonly onRefresh: () => void;
}

type SortField = 'due_date' | 'amount' | 'name' | 'monthly';
type SortDirection = 'asc' | 'desc';

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--monarch-warning)" className="shrink-0">
      <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
    </svg>
  );
}

function LinkedCategoryIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

interface CategoryGroupDropdownProps {
  readonly currentGroupName: string | null;
  readonly onChangeGroup: (groupId: string, groupName: string) => Promise<void>;
  readonly disabled?: boolean;
}

function CategoryGroupDropdown({ currentGroupName, onChangeGroup, disabled }: CategoryGroupDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside([dropdownRef], () => setIsOpen(false), isOpen);

  const handleOpen = async () => {
    if (disabled || isChanging) return;
    setIsOpen(!isOpen);
    if (!isOpen && groups.length === 0) {
      setIsLoading(true);
      try {
        const data = await getCategoryGroups();
        setGroups(data);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSelect = async (group: CategoryGroup) => {
    setIsChanging(true);
    setIsOpen(false);
    try {
      await onChangeGroup(group.id, group.name);
    } finally {
      setIsChanging(false);
    }
  };

  if (!currentGroupName) return null;

  return (
    <div className="relative inline-flex items-center gap-1 min-w-0 max-w-full" ref={dropdownRef}>
      <span className="truncate">{currentGroupName}</span>
      <Tooltip content="Change category group">
        <button
          onClick={handleOpen}
          disabled={disabled || isChanging}
          className="hover:opacity-70 transition-opacity disabled:opacity-50"
        >
          {isChanging ? (
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>
      </Tooltip>
      {isOpen && (
        <div
          className="absolute left-0 top-6 z-50 py-1 rounded-lg shadow-lg text-sm max-h-64 overflow-y-auto dropdown-menu"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            minWidth: '180px',
          }}
        >
          {isLoading ? (
            <div className="px-3 py-2" style={{ color: 'var(--monarch-text-light)' }}>
              Loading...
            </div>
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleSelect(group)}
                className="w-full text-left px-3 py-2 hover:opacity-80 transition-opacity"
                style={{
                  color: group.name === currentGroupName ? 'var(--monarch-orange)' : 'var(--monarch-text-dark)',
                  backgroundColor: group.name === currentGroupName ? 'var(--monarch-bg-hover)' : 'transparent',
                }}
              >
                {group.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface ActionsDropdownProps {
  readonly item: RecurringItem;
  readonly onToggle: () => void;
  readonly onLinkCategory: () => void;
  readonly onRecreate: () => void;
  readonly onAddToRollup?: () => void;
  readonly onRefresh: () => void;
  readonly isToggling: boolean;
  readonly isRecreating: boolean;
  readonly isAddingToRollup: boolean;
  readonly isRefreshing: boolean;
}

function ActionsDropdown({
  item,
  onToggle,
  onLinkCategory,
  onRecreate,
  onAddToRollup,
  onRefresh,
  isToggling,
  isRecreating,
  isAddingToRollup,
  isRefreshing,
}: ActionsDropdownProps) {
  const dropdown = useDropdown<HTMLDivElement, HTMLButtonElement>({
    alignment: 'right',
    offset: { y: 4 },
  });

  const isLoading = isToggling || isRecreating || isAddingToRollup || isRefreshing;

  const handleToggle = () => {
    if (!isLoading) {
      dropdown.toggle();
    }
  };

  const handleAction = (action: () => void) => {
    dropdown.close();
    action();
  };

  return (
    <div className="relative">
      <Tooltip content="Actions">
        <button
          ref={dropdown.triggerRef}
          onClick={handleToggle}
          disabled={isLoading}
          className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/10 disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-text-muted)" strokeWidth="2">
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="12" cy="5" r="1" fill="currentColor" />
              <circle cx="12" cy="19" r="1" fill="currentColor" />
            </svg>
          )}
        </button>
      </Tooltip>

      {dropdown.isOpen && (
        <div
          ref={dropdown.dropdownRef}
          className="fixed z-[100] py-1 rounded-lg shadow-lg text-sm min-w-[180px] dropdown-menu"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            top: dropdown.position.top,
            right: dropdown.position.right,
          }}
        >
          {/* Enable/Disable */}
          <button
            onClick={() => handleAction(onToggle)}
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            {item.is_enabled ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Untrack
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--monarch-success)">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                Track
              </>
            )}
          </button>

          {/* Link to category - only for disabled items */}
          {!item.is_enabled && (
            <button
              onClick={() => handleAction(onLinkCategory)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors"
              style={{ color: 'var(--monarch-orange)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Link to existing category
            </button>
          )}

          {/* Recreate category - only when category is missing */}
          {item.is_enabled && item.category_missing && (
            <button
              onClick={() => handleAction(onRecreate)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors"
              style={{ color: 'var(--monarch-warning)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Recreate category
            </button>
          )}

          {/* Refresh/Recalculate - only for enabled items */}
          {item.is_enabled && !item.category_missing && (
            <button
              onClick={() => handleAction(onRefresh)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
              Recalculate target
            </button>
          )}

          {/* Add to rollup - only when item is enabled and handler is provided */}
          {item.is_enabled && onAddToRollup && (
            <>
              <div className="border-t my-1" style={{ borderColor: 'var(--monarch-border)' }} />
              <button
                onClick={() => handleAction(onAddToRollup)}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-black/5 transition-colors"
                style={{ color: 'var(--monarch-orange)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                Add to rollup
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface RecurringRowProps {
  readonly item: RecurringItem;
  readonly onToggle: (id: string, enabled: boolean) => Promise<void>;
  readonly onAllocate: (id: string, amount: number) => Promise<void>;
  readonly onRecreate: (id: string) => Promise<void>;
  readonly onChangeGroup: (id: string, groupId: string, groupName: string) => Promise<void>;
  readonly onAddToRollup?: (id: string) => Promise<void>;
  readonly onEmojiChange: (id: string, emoji: string) => Promise<void>;
  readonly onRefreshItem: (id: string) => Promise<void>;
  readonly onNameChange: (id: string, name: string) => Promise<void>;
  readonly onLinkCategory: (item: RecurringItem) => void;
  readonly highlightId?: string | null;
}

function RecurringRow({ item, onToggle, onAllocate, onRecreate, onChangeGroup, onAddToRollup, onEmojiChange, onRefreshItem, onNameChange, onLinkCategory, highlightId }: RecurringRowProps) {
  const [isToggling, setIsToggling] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Handle highlight when this row is the highlighted one
  useEffect(() => {
    if (highlightId === item.id && rowRef.current) {
      setIsHighlighted(true);
      // Remove highlight after animation
      const timer = setTimeout(() => setIsHighlighted(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [highlightId, item.id]);
  const [isAllocating, setIsAllocating] = useState(false);
  const [isRecreating, setIsRecreating] = useState(false);
  const [isAddingToRollup, setIsAddingToRollup] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllocateConfirm, setShowAllocateConfirm] = useState(false);
  const [budgetInput, setBudgetInput] = useState(item.planned_budget.toString());

  // Keep budgetInput in sync with item.planned_budget
  useEffect(() => {
    setBudgetInput(item.planned_budget.toString());
  }, [item.planned_budget]);

  // Keep nameValue in sync with item.name
  useEffect(() => {
    setNameValue(item.name);
  }, [item.name]);

  // Focus name input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSubmit = async () => {
    const trimmedName = nameValue.trim();
    if (trimmedName && trimmedName !== item.name) {
      setIsUpdatingName(true);
      try {
        await onNameChange(item.id, trimmedName);
      } catch (err) {
        console.error('Failed to update category name:', err);
        setNameValue(item.name);
      } finally {
        setIsUpdatingName(false);
        setIsEditingName(false);
      }
    } else {
      setNameValue(item.name);
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setNameValue(item.name);
      setIsEditingName(false);
    }
  };

  const progressPercent = Math.min(item.progress_percent, 100);
  // Override status based on what user has budgeted vs what's needed
  let displayStatus: ItemStatus = item.status;

  if (item.is_enabled && item.frozen_monthly_target > 0) {
    if (item.planned_budget > item.frozen_monthly_target) {
      // Budgeting more than needed - ahead
      displayStatus = 'ahead';
    } else if (item.planned_budget >= item.frozen_monthly_target) {
      // Budgeting exactly what's needed - on track (or funded if balance complete)
      displayStatus = item.current_balance >= item.amount ? 'funded' : 'on_track';
    } else {
      // Budgeting less than needed - behind
      displayStatus = 'behind';
    }
  } else if (item.is_enabled && item.current_balance >= item.amount) {
    // Balance meets or exceeds total target - treat as funded
    displayStatus = 'funded';
  }
  const { date, relative } = formatDateRelative(item.next_due_date);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(item.id, !item.is_enabled);
    } finally {
      setIsToggling(false);
    }
  };

  const handleRecreate = async () => {
    setIsRecreating(true);
    try {
      await onRecreate(item.id);
    } finally {
      setIsRecreating(false);
    }
  };

  const handleChangeGroup = async (groupId: string, groupName: string) => {
    await onChangeGroup(item.id, groupId, groupName);
  };

  const handleEmojiChange = async (emoji: string) => {
    await onEmojiChange(item.id, emoji);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshItem(item.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddToRollup = async () => {
    if (!onAddToRollup) return;
    setIsAddingToRollup(true);
    try {
      await onAddToRollup(item.id);
    } finally {
      setIsAddingToRollup(false);
    }
  };

  const handleAllocate = async () => {
    if (item.amount_needed_now <= 0) return;
    setIsAllocating(true);
    try {
      await onAllocate(item.id, item.amount_needed_now);
      setShowAllocateConfirm(false);
    } finally {
      setIsAllocating(false);
    }
  };

  const handleBudgetSubmit = async () => {
    const newAmount = parseFloat(budgetInput);
    if (isNaN(newAmount) || newAmount < 0) {
      // Reset to current value if invalid
      setBudgetInput(item.planned_budget.toString());
      return;
    }
    const diff = newAmount - item.planned_budget;
    if (Math.abs(diff) > 0.01) {
      setIsAllocating(true);
      try {
        await onAllocate(item.id, diff);
      } finally {
        setIsAllocating(false);
      }
    }
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setBudgetInput(item.planned_budget.toString());
      (e.target as HTMLInputElement).blur();
    }
  };

  const contentOpacity = item.is_enabled ? '' : 'opacity-50';
  const rowPadding = item.is_enabled ? 'py-4' : 'py-1.5';
  const isCritical = item.is_enabled && item.status === 'critical' && item.amount_needed_now > 0;

  return (
    <tr
      ref={rowRef}
      className={`group transition-all duration-300 border-b ${isHighlighted ? 'animate-highlight' : ''}`}
      style={{
        backgroundColor: isHighlighted ? 'var(--monarch-orange-light)' : 'var(--monarch-bg-card)',
        borderColor: 'var(--monarch-border)',
      }}
      onMouseEnter={(e) => !isHighlighted && (e.currentTarget.style.backgroundColor = 'var(--monarch-bg-hover)')}
      onMouseLeave={(e) => !isHighlighted && (e.currentTarget.style.backgroundColor = 'var(--monarch-bg-card)')}
    >
      <td className={`${rowPadding} pl-5 pr-2 max-w-40`}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <MerchantIcon logoUrl={item.logo_url} size="md" />
            {/* Sync status badge floating on merchant icon */}
            <Tooltip
              content={
                item.is_enabled
                  ? item.category_missing
                    ? 'Category missing - click to disable'
                    : 'Click to disable tracking'
                  : 'Click to enable tracking'
              }
            >
              <button
                onClick={handleToggle}
                disabled={isToggling}
                className="absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full transition-colors hover:opacity-80 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--monarch-bg-card)',
                  border: '1px solid var(--monarch-border)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                {isToggling ? (
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2.5">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                ) : item.is_enabled ? (
                  item.category_missing ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--monarch-warning)">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--monarch-success)">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  )
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-text-muted)" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4" y1="4" x2="20" y2="20" />
                  </svg>
                )}
              </button>
            </Tooltip>
          </div>
          <div className={`flex flex-col min-w-0 ${contentOpacity}`}>
            <div className="flex items-center gap-1">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={handleNameKeyDown}
                  disabled={isUpdatingName}
                  className="font-medium px-1 py-0.5 rounded text-sm"
                  style={{
                    color: 'var(--monarch-text-dark)',
                    backgroundColor: 'var(--monarch-bg-card)',
                    border: '1px solid var(--monarch-orange)',
                    outline: 'none',
                    minWidth: '120px',
                  }}
                />
              ) : (
                <>
                  {item.is_enabled && (
                    <EmojiPicker
                      currentEmoji={item.emoji || '🔄'}
                      onSelect={handleEmojiChange}
                      disabled={item.category_missing}
                    />
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    className="font-medium truncate cursor-pointer hover:bg-black/5 px-1 py-0.5 rounded"
                    style={{ color: 'var(--monarch-text-dark)' }}
                    onDoubleClick={() => item.is_enabled && !item.category_missing && setIsEditingName(true)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && item.is_enabled && !item.category_missing) {
                        setIsEditingName(true);
                      }
                    }}
                    title={item.is_enabled && !item.category_missing ? "Double-click to rename" : undefined}
                  >
                    {item.name}
                  </span>
                </>
              )}
              {item.is_enabled && item.category_id && !item.category_missing && (
                <Tooltip content="View linked category in Monarch">
                  <a
                    href={`https://app.monarchmoney.com/categories/${item.category_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--monarch-text-light)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LinkedCategoryIcon />
                  </a>
                </Tooltip>
              )}
              {item.is_stale && (
                <Tooltip content="This recurring item may be stale - last charge was missed or off from expected date">
                  <span className="cursor-help">
                    <WarningIcon />
                  </span>
                </Tooltip>
              )}
            </div>
            {item.category_group_name && (
              <div className="text-sm truncate" style={{ color: 'var(--monarch-text-light)' }}>
                {item.is_enabled && !item.category_missing ? (
                  <CategoryGroupDropdown
                    currentGroupName={item.category_group_name}
                    onChangeGroup={handleChangeGroup}
                  />
                ) : (
                  item.category_group_name
                )}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className={`${rowPadding} px-4 w-28 ${contentOpacity}`}>
        <div style={{ color: 'var(--monarch-text-dark)' }}>{date}</div>
        {relative && (
          <div className="text-sm" style={{ color: 'var(--monarch-text-light)' }}>
            {relative}
          </div>
        )}
      </td>
      <td className={`${rowPadding} px-4 text-right w-40 ${contentOpacity}`}>
        <div className="flex items-center justify-end gap-1">
          {/* Red/muted up arrow: catching up (frozen > ideal). For disabled items, only show if frozen > 0 (has real data) */}
          {item.frozen_monthly_target > item.ideal_monthly_rate && (item.is_enabled || item.frozen_monthly_target > 0) && (
            <Tooltip content={
              item.is_enabled
                ? `Catching up: ${formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → ${formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo after ${date} payment`
                : `Higher than usual: ${formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo needed to catch up → ${formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo after ${date} payment`
            }>
              <span className={item.is_enabled ? 'cursor-pointer hover:opacity-70' : 'cursor-help'} style={{ color: item.is_enabled ? 'var(--monarch-error)' : 'var(--monarch-text-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 7 10.5 15.5 15.5 10.5 22 17"></polyline>
                  <polyline points="8 7 2 7 2 13"></polyline>
                </svg>
              </span>
            </Tooltip>
          )}
          {/* Green/muted down arrow: ahead (frozen < ideal). For disabled items, only show if frozen > 0 (has real data) */}
          {item.frozen_monthly_target < item.ideal_monthly_rate && (item.is_enabled || item.frozen_monthly_target > 0) && (
            <Tooltip content={
              item.is_enabled
                ? `Ahead: ${formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → ${formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo after ${date} payment`
                : `Lower than usual: ${formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo needed → ${formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo after ${date} payment`
            }>
              <span className={item.is_enabled ? 'cursor-pointer hover:opacity-70' : 'cursor-help'} style={{ color: item.is_enabled ? 'var(--monarch-success)' : 'var(--monarch-text-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
                  <polyline points="16 17 22 17 22 11"></polyline>
                </svg>
              </span>
            </Tooltip>
          )}
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo
          </span>
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-light)' }}>
          {formatCurrency(item.amount, { maximumFractionDigits: 0 })} {formatFrequencyShort(item.frequency)}
        </div>
        {item.is_enabled && (
          <>
            <Tooltip content={`${formatCurrency(item.current_balance, { maximumFractionDigits: 0 })} of ${formatCurrency(item.amount, { maximumFractionDigits: 0 })} • Resets ${formatFrequencyShort(item.frequency)} after payment`}>
              <div className="w-full rounded-full h-1.5 mt-1.5 cursor-help" style={{ backgroundColor: 'var(--monarch-border)' }}>
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${progressPercent}%`, backgroundColor: getStatusStyles(displayStatus, item.is_enabled).color }}
                />
              </div>
            </Tooltip>
            <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-light)' }}>
              {formatCurrency(Math.max(0, item.amount - item.current_balance), { maximumFractionDigits: 0 })} to go
            </div>
          </>
        )}
      </td>
      <td className={`${rowPadding} px-4 text-right w-28 ${contentOpacity}`}>
        {item.is_enabled ? (
          <div className="flex justify-end">
            <div className="relative">
              <span
                className="absolute left-2 top-1/2 -translate-y-1/2 font-medium"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                $
              </span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={handleBudgetKeyDown}
                onBlur={handleBudgetSubmit}
                onFocus={(e) => e.target.select()}
                className="w-24 pl-6 pr-2 py-1 text-right rounded font-medium"
                style={{
                  color: 'var(--monarch-text-dark)',
                  backgroundColor: 'var(--monarch-bg-card)',
                  border: '1px solid var(--monarch-border)',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
        ) : (
          <span
            className="font-medium"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            {formatCurrency(item.planned_budget, { maximumFractionDigits: 0 })}
          </span>
        )}
      </td>
      <td className={`${rowPadding} px-5 text-center w-24`}>
        {isCritical && !showAllocateConfirm ? (
          <Tooltip content="Click to allocate funds">
            <button
              onClick={() => setShowAllocateConfirm(true)}
              className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer"
              style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
            >
              Off Track
            </button>
          </Tooltip>
        ) : isCritical && showAllocateConfirm ? (
          <div className="flex items-center gap-1 justify-center">
            <button
              onClick={handleAllocate}
              disabled={isAllocating}
              className="px-2 py-1 text-xs font-medium rounded text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--monarch-success)' }}
            >
              {isAllocating ? '...' : 'Allocate'}
            </button>
            <button
              onClick={() => setShowAllocateConfirm(false)}
              className="px-2 py-1 text-xs font-medium rounded transition-colors"
              style={{ backgroundColor: 'var(--monarch-bg-page)', color: 'var(--monarch-text-dark)' }}
            >
              ✕
            </button>
          </div>
        ) : (
          <span
            className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full"
            style={{
              backgroundColor: getStatusStyles(displayStatus, item.is_enabled).bg,
              color: getStatusStyles(displayStatus, item.is_enabled).color,
            }}
          >
            {getStatusLabel(displayStatus, item.is_enabled)}
          </span>
        )}
      </td>
      {/* Actions column */}
      <td className={`${rowPadding} px-3 w-12`}>
        {item.is_enabled ? (
          <ActionsDropdown
            item={item}
            onToggle={handleToggle}
            onLinkCategory={() => onLinkCategory(item)}
            onRecreate={handleRecreate}
            onAddToRollup={onAddToRollup ? handleAddToRollup : undefined}
            onRefresh={handleRefresh}
            isToggling={isToggling}
            isRecreating={isRecreating}
            isAddingToRollup={isAddingToRollup}
            isRefreshing={isRefreshing}
          />
        ) : (
          /* Add to rollover button for disabled rows - only visible on hover */
          onAddToRollup && (
            <Tooltip content="Add to rollover">
              <button
                onClick={handleAddToRollup}
                disabled={isAddingToRollup}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-all opacity-0 group-hover:opacity-100 hover:bg-black/10 disabled:opacity-50"
              >
                {isAddingToRollup ? (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                )}
              </button>
            </Tooltip>
          )
        )}
      </td>
    </tr>
  );
}

interface SortButtonProps {
  readonly field: SortField;
  readonly label: string;
  readonly currentField: SortField;
  readonly direction: SortDirection;
  readonly onClick: (field: SortField) => void;
  readonly align?: 'left' | 'right' | 'center';
}

function SortButton({ field, label, currentField, direction, onClick, align = 'left' }: SortButtonProps) {
  const isActive = currentField === field;
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <button
      onClick={() => onClick(field)}
      className={`flex items-center gap-1 text-sm font-medium ${alignClass} w-full`}
      style={{ color: isActive ? 'var(--monarch-text-dark)' : 'var(--monarch-text-light)' }}
    >
      {label}
      {isActive && (
        <span className="text-xs" style={{ color: 'var(--monarch-text-light)' }}>{direction === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );
}

export function RecurringList({ items, onRefresh }: RecurringListProps) {
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [linkModalItem, setLinkModalItem] = useState<RecurringItem | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [hideDisabled, setHideDisabled] = useState(false);
  const toast = useToast();

  const enabledCount = items.filter(item => item.is_enabled).length;
  const disabledCount = items.length - enabledCount;
  const filteredItems = hideDisabled ? items.filter(item => item.is_enabled) : items;

  const handleToggleItem = useCallback(async (id: string, enabled: boolean) => {
    try {
      await toggleItemTracking(id, enabled);
      setHighlightId(id);
      onRefresh();
      toast.success(enabled ? 'Tracking enabled' : 'Tracking disabled');
      // Clear highlight after animation completes
      setTimeout(() => setHighlightId(null), 2000);
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to toggle tracking'));
    }
  }, [onRefresh, toast]);

  const handleAllocateItem = useCallback(async (id: string, amount: number) => {
    try {
      await allocateFunds(id, amount);
      onRefresh();
      toast.success(amount > 0 ? `${formatCurrency(amount, { maximumFractionDigits: 0 })} allocated` : `${formatCurrency(Math.abs(amount), { maximumFractionDigits: 0 })} removed`);
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to allocate funds'));
    }
  }, [onRefresh, toast]);

  const handleRecreateItem = useCallback(async (id: string) => {
    try {
      await recreateCategory(id);
      onRefresh();
      toast.success('Category recreated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to recreate category'));
    }
  }, [onRefresh, toast]);

  const handleChangeGroupItem = useCallback(async (id: string, groupId: string, groupName: string) => {
    try {
      await changeCategoryGroup(id, groupId, groupName);
      onRefresh();
      toast.success(`Moved to ${groupName}`);
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to change group'));
    }
  }, [onRefresh, toast]);

  const handleAddToRollupItem = useCallback(async (id: string) => {
    try {
      await addToRollup(id);
      onRefresh();
      toast.success('Added to rollup');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to add to rollup'));
    }
  }, [onRefresh, toast]);

  const handleEmojiChangeItem = useCallback(async (id: string, emoji: string) => {
    try {
      await updateCategoryEmoji(id, emoji);
      onRefresh();
      toast.success('Emoji updated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to update emoji'));
    }
  }, [onRefresh, toast]);

  const handleRefreshItem = useCallback(async (id: string) => {
    try {
      await refreshItem(id);
      onRefresh();
      toast.success('Target recalculated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to recalculate target'));
    }
  }, [onRefresh, toast]);

  const handleNameChangeItem = useCallback(async (id: string, name: string) => {
    try {
      await updateCategoryName(id, name);
      onRefresh();
      toast.success('Name updated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to update name'));
    }
  }, [onRefresh, toast]);

  const handleLinkCategory = useCallback((item: RecurringItem) => {
    setLinkModalItem(item);
  }, []);

  const handleLinkSuccess = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // Sort items within each group - memoized to avoid recreation on every render
  const sortItems = useCallback((itemsToSort: RecurringItem[]) => {
    return [...itemsToSort].sort((a, b) => {
      // Primary sort: enabled items first, disabled items last
      if (a.is_enabled !== b.is_enabled) {
        return a.is_enabled ? -1 : 1;
      }

      // Secondary sort: by selected column
      let comparison = 0;
      switch (sortField) {
        case 'due_date':
          comparison = new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'monthly': {
          comparison = a.frozen_monthly_target - b.frozen_monthly_target;
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [sortField, sortDirection]);

  // Group items by frequency - memoized to avoid recalculation
  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const freq = item.frequency;
      if (!acc[freq]) acc[freq] = [];
      acc[freq].push(item);
      return acc;
    }, {} as Record<string, RecurringItem[]>);
  }, [filteredItems]);

  // Get sorted frequency groups (least frequent to most frequent) - memoized
  const sortedFrequencies = useMemo(() => {
    return Object.keys(groupedItems).sort(
      (a, b) => (FREQUENCY_ORDER[a] || 99) - (FREQUENCY_ORDER[b] || 99)
    );
  }, [groupedItems]);

  // True empty state - no categories at all
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--monarch-text-muted)' }}>
        <Inbox size={48} strokeWidth={1.5} className="mb-4 opacity-50" />
        <p className="text-lg font-medium mb-1" style={{ color: 'var(--monarch-text-light)' }}>
          No recurring items found
        </p>
        <p className="text-sm">
          Click "Sync Now" to fetch your recurring transactions from Monarch.
        </p>
      </div>
    );
  }

  // Filtered empty state - items exist but are hidden by filters
  if (filteredItems.length === 0) {
    return (
      <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}>
        {/* Section Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--monarch-bg-card)', borderBottom: '1px solid var(--monarch-border)' }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
                Dedicated Categories
              </span>
              <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                ({enabledCount})
              </span>
            </div>
            <span className="text-sm" style={{ color: 'var(--monarch-text-light)' }}>
              Larger recurring transactions that get their own budget category for better tracking
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Tooltip content={hideDisabled ? `Show ${disabledCount} untracked` : `Hide ${disabledCount} untracked`}>
              <button
                onClick={() => setHideDisabled(!hideDisabled)}
                className="p-1.5 rounded-md transition-colors hover:bg-(--monarch-bg-elevated)"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                {hideDisabled ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </Tooltip>
          </div>
        </div>
        {/* Filtered empty state content */}
        <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--monarch-text-muted)' }}>
          <Filter size={40} strokeWidth={1.5} className="mb-4 opacity-50" />
          <p className="text-base font-medium mb-1" style={{ color: 'var(--monarch-text-light)' }}>
            All items hidden by filters
          </p>
          <p className="text-sm">
            {disabledCount} disabled item{disabledCount !== 1 ? 's are' : ' is'} currently hidden
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}>
        {/* Section Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--monarch-bg-card)', borderBottom: '1px solid var(--monarch-border)' }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
                Dedicated Categories
              </span>
              <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                ({enabledCount})
              </span>
            </div>
            <span className="text-sm" style={{ color: 'var(--monarch-text-light)' }}>
              Larger recurring transactions that get their own budget category for better tracking
            </span>
          </div>
          <div className="flex items-center gap-4">
            {disabledCount > 0 && (
              <Tooltip content={hideDisabled ? `Show ${disabledCount} untracked` : `Hide ${disabledCount} untracked`}>
                <button
                  onClick={() => setHideDisabled(!hideDisabled)}
                  className="p-1.5 rounded-md transition-colors hover:bg-(--monarch-bg-elevated)"
                  style={{ color: 'var(--monarch-text-muted)' }}
                >
                  {hideDisabled ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        <table className="w-full animate-fade-in">
          <thead>
            <tr style={{ backgroundColor: 'var(--monarch-bg-page)', borderBottom: '1px solid var(--monarch-border)' }}>
              <th className="py-3 pl-5 pr-2 text-left" style={{ width: '280px', maxWidth: '280px' }}>
                <SortButton
                  field="name"
                  label="Recurring"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSort}
                />
              </th>
              <th className="py-3 px-4 text-left" style={{ width: '100px' }}>
                <SortButton
                  field="due_date"
                  label="Date"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSort}
                />
              </th>
              <th className="py-3 px-4 text-right">
                <SortButton
                  field="amount"
                  label="Total Cost"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSort}
                  align="right"
                />
              </th>
              <th className="py-3 px-4 text-right">
                <SortButton
                  field="monthly"
                  label="Budgeted"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSort}
                  align="right"
                />
              </th>
              <th className="py-3 px-5 text-center text-sm font-medium w-24" style={{ color: 'var(--monarch-text-light)' }}>
                Status
              </th>
              <th className="py-3 px-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {sortedFrequencies.map((frequency, index) => (
              <React.Fragment key={frequency}>
                <tr>
                  <td
                    colSpan={6}
                    className="py-2 px-5 text-xs font-medium uppercase tracking-wide"
                    style={{
                      backgroundColor: 'var(--monarch-bg-page)',
                      color: 'var(--monarch-text-muted)',
                      borderBottom: '1px solid var(--monarch-border)',
                      ...(index > 0 && { borderTop: '1px solid var(--monarch-border)' }),
                    }}
                  >
                    {formatFrequency(frequency)}
                  </td>
                </tr>
                {sortItems(groupedItems[frequency]).map((item) => (
                  <RecurringRow
                    key={item.id}
                    item={item}
                    onToggle={handleToggleItem}
                    onAllocate={handleAllocateItem}
                    onRecreate={handleRecreateItem}
                    onChangeGroup={handleChangeGroupItem}
                    onAddToRollup={handleAddToRollupItem}
                    onEmojiChange={handleEmojiChangeItem}
                    onRefreshItem={handleRefreshItem}
                    onNameChange={handleNameChangeItem}
                    onLinkCategory={handleLinkCategory}
                    highlightId={highlightId}
                  />
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Link Category Modal */}
      {linkModalItem && (
        <LinkCategoryModal
          item={linkModalItem}
          isOpen={true}
          onClose={() => setLinkModalItem(null)}
          onSuccess={handleLinkSuccess}
        />
      )}
    </div>
  );
}
