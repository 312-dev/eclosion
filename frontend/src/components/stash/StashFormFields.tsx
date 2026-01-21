/**
 * Stash Form Field Components
 *
 * Shared form input fields for New and Edit stash modals.
 */

import { useMemo, useCallback, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '../icons';
import { EmojiPicker } from '../EmojiPicker';
import { getSafeHref } from '../../utils';
import { getQuickPickDates } from '../../utils/savingsCalculations';
import type { StashGoalType } from '../../types';

// Re-export modal-specific components for backward compatibility
export {
  MonthlyTargetPreview,
  ModalFooterButtons,
  CategoryInfoDisplay,
} from './StashModalComponents';

interface NameInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  emoji: string;
  onEmojiChange: (emoji: string) => void;
  placeholder?: string;
}

export function NameInputWithEmoji({
  id,
  value,
  onChange,
  emoji,
  onEmojiChange,
  placeholder = 'What are you saving for?',
}: NameInputProps) {
  const handleEmojiSelect = useCallback(
    async (selectedEmoji: string) => {
      onEmojiChange(selectedEmoji);
    },
    [onEmojiChange]
  );

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1"
        style={{ color: 'var(--monarch-text)' }}
      >
        Name
      </label>
      <div className="flex gap-2 items-center">
        <div
          className="w-12 h-10 flex items-center justify-center text-lg rounded-md"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <EmojiPicker currentEmoji={emoji || '🎯'} onSelect={handleEmojiSelect} />
        </div>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-md"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text)',
          }}
        />
      </div>
    </div>
  );
}

interface UrlInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export function UrlInput({ id, value, onChange }: UrlInputProps) {
  const safeHref = getSafeHref(value);
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1"
        style={{ color: 'var(--monarch-text)' }}
      >
        URL{' '}
        <span style={{ color: 'var(--monarch-text-muted)', fontWeight: 'normal' }}>(optional)</span>
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com/product"
          className="flex-1 px-3 py-2 rounded-md"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text)',
          }}
        />
        {safeHref && (
          <button
            type="button"
            onClick={() => window.open(safeHref, '_blank', 'noopener,noreferrer')}
            className="flex items-center justify-center w-10 rounded-md hover:opacity-70"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
              color: 'var(--monarch-teal)',
            }}
            aria-label="Open URL in new tab"
          >
            <Icons.ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface AmountInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Hide the label for inline/sentence layouts */
  hideLabel?: boolean;
}

export function AmountInput({
  id,
  value,
  onChange,
  label = 'Amount',
  hideLabel = false,
}: AmountInputProps) {
  const handleChange = (inputValue: string) => {
    const cleaned = inputValue.replaceAll(/\D/g, '');
    onChange(cleaned);
  };

  // Auto-size: min 3ch, grows with content
  const inputWidth = Math.max(3, (value || '').length + 1);

  return (
    <div className={hideLabel ? 'inline-flex' : ''}>
      {!hideLabel && (
        <label
          htmlFor={id}
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--monarch-text)' }}
        >
          {label}
        </label>
      )}
      <div className="relative inline-flex">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0"
          className="pl-7 pr-3 py-2 rounded-md"
          style={{
            width: hideLabel ? `${inputWidth + 3}ch` : '100%',
            minWidth: hideLabel ? '5ch' : undefined,
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text)',
          }}
        />
      </div>
    </div>
  );
}

interface TargetDateInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string | undefined;
  quickPickOptions?: Array<{ label: string; date: string }> | undefined;
  /** Hide the label for inline/sentence layouts */
  hideLabel?: boolean;
}

export function TargetDateInput({
  id,
  value,
  onChange,
  minDate,
  quickPickOptions,
  hideLabel = false,
}: TargetDateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const quickPicks = useMemo(() => getQuickPickDates(), []);
  const defaultQuickPicks = [
    { label: 'in 2 months', date: quickPicks.twoMonths },
    { label: 'in 3 months', date: quickPicks.threeMonths },
    { label: 'in 6 months', date: quickPicks.sixMonths },
    { label: 'in 1 year', date: quickPicks.oneYear },
  ];
  const picks = quickPickOptions || defaultQuickPicks;

  // Format date as MM/DD/YY
  const formattedDate = useMemo(() => {
    if (!value) return '';
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return '';
    return `${month}/${day}/${year.slice(-2)}`;
  }, [value]);

  const handleContainerClick = () => {
    inputRef.current?.showPicker();
  };

  return (
    <div>
      {!hideLabel && (
        <label
          htmlFor={id}
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--monarch-text)' }}
        >
          Deadline
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          className="w-full px-3 py-2 rounded-md cursor-pointer text-left"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: value ? 'var(--monarch-text)' : 'var(--monarch-text-muted)',
          }}
          onClick={handleContainerClick}
        >
          {formattedDate || 'Select date'}
        </button>
        <input
          ref={inputRef}
          id={id}
          type="date"
          value={value}
          min={minDate}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {picks.map((pick) => (
          <button
            key={pick.label}
            type="button"
            onClick={() => onChange(pick.date)}
            className={`px-2 py-1 text-xs rounded-md btn-press ${value === pick.date ? 'ring-2 ring-(--monarch-teal)' : ''}`}
            style={{
              backgroundColor:
                value === pick.date ? 'var(--monarch-teal-light)' : 'var(--monarch-bg-page)',
              color: value === pick.date ? 'var(--monarch-teal)' : 'var(--monarch-text-muted)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            {pick.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface GoalTypeSelectorProps {
  readonly value: StashGoalType;
  readonly onChange: (value: StashGoalType) => void;
  /** Hide the label for inline/sentence layouts */
  readonly hideLabel?: boolean;
}

const GOAL_TYPE_OPTIONS: Array<{
  value: StashGoalType;
  title: string;
  description: string;
  examples: string;
  icon: 'Gift' | 'PiggyBank';
}> = [
  {
    value: 'one_time',
    title: 'one-time purchase',
    description: 'Save up to buy something. Mark complete when done.',
    examples: 'e.g. New laptop, vacation, furniture',
    icon: 'Gift',
  },
  {
    value: 'savings_buffer',
    title: 'savings buffer',
    description: 'A fund to dip into and refill. Spending reduces progress.',
    examples: 'e.g. Emergency fund, car maintenance, gifts',
    icon: 'PiggyBank',
  },
];

/**
 * Goal type selector dropdown for stash items.
 * Allows choosing between one-time purchase and savings buffer goals.
 */
export function GoalTypeSelector({ value, onChange, hideLabel = false }: GoalTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = GOAL_TYPE_OPTIONS.find((opt) => opt.value === value) ?? GOAL_TYPE_OPTIONS[0]!;

  // Calculate dropdown position when opening - useLayoutEffect for synchronous DOM measurements
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 220; // Approximate height of dropdown
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      // Find parent row container to get full width
      const parentRow = triggerRef.current.closest('.flex.gap-3')?.parentElement;
      const parentRect = parentRow?.getBoundingClientRect();
      const dropdownLeft = parentRect?.left ?? triggerRect.left;
      const dropdownWidth = parentRect?.width ?? triggerRect.width;

      // eslint-disable-next-line react-hooks/set-state-in-effect -- useLayoutEffect is correct for synchronous DOM measurements
      setDropdownStyle({
        position: 'fixed',
        left: dropdownLeft,
        width: dropdownWidth,
        ...(openUpward
          ? { bottom: window.innerHeight - triggerRect.top + 4 }
          : { top: triggerRect.bottom + 4 }),
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const dropdownMenu = isOpen
    ? createPortal(
        <div
          ref={dropdownRef}
          className="z-50 rounded-md shadow-lg"
          style={{
            ...dropdownStyle,
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {GOAL_TYPE_OPTIONS.map((option) => {
            const IconComponent = option.icon === 'Gift' ? Icons.Gift : Icons.PiggyBank;
            const iconColor = option.icon === 'Gift' ? '#60a5fa' : '#a78bfa';
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-3 text-left hover:bg-(--monarch-bg-page) first:rounded-t-md last:rounded-b-md"
                style={{
                  backgroundColor: isSelected ? 'var(--monarch-bg-page)' : 'transparent',
                }}
              >
                <div className="flex items-start gap-3">
                  <IconComponent
                    className="w-5 h-5 mt-0.5 shrink-0"
                    style={{ color: iconColor }}
                  />
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                      {option.title}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                      {option.description}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                      {option.examples}
                    </div>
                  </div>
                  {isSelected && (
                    <Icons.Check className="w-4 h-4 mt-0.5" style={{ color: 'var(--monarch-teal)' }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div>
      {!hideLabel && (
        <label
          htmlFor="goal-type-selector"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--monarch-text)' }}
        >
          Intention
        </label>
      )}
      <div className="relative">
        {/* Trigger button */}
        <button
          ref={triggerRef}
          id="goal-type-selector"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3 py-2 rounded-md text-left flex items-center justify-between"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
            color: 'var(--monarch-text)',
          }}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-2">
            {selectedOption.icon === 'Gift' ? (
              <Icons.Gift className="w-4 h-4" style={{ color: '#60a5fa' }} />
            ) : (
              <Icons.PiggyBank className="w-4 h-4" style={{ color: '#a78bfa' }} />
            )}
            {selectedOption.title}
          </span>
          <Icons.ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--monarch-text-muted)' }}
          />
        </button>
      </div>
      {dropdownMenu}
    </div>
  );
}
