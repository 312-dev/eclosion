/**
 * Wishlist Form Field Components
 *
 * Shared form input fields for New and Edit wishlist modals.
 */

import { useMemo, useCallback } from 'react';
import { Icons } from '../icons';
import { EmojiPicker } from '../EmojiPicker';
import { getSafeHref } from '../../utils';
import { getQuickPickDates } from '../../utils/savingsCalculations';

// Re-export modal-specific components for backward compatibility
export {
  MonthlyTargetPreview,
  ModalFooterButtons,
  CategoryInfoDisplay,
} from './WishlistModalComponents';

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
}

export function AmountInput({ id, value, onChange, label = 'Amount' }: AmountInputProps) {
  const handleChange = (inputValue: string) => {
    const cleaned = inputValue.replaceAll(/\D/g, '');
    onChange(cleaned);
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1"
        style={{ color: 'var(--monarch-text)' }}
      >
        {label}
      </label>
      <div className="relative">
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
          className="w-full pl-7 pr-3 py-2 rounded-md"
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

interface TargetDateInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string | undefined;
  quickPickOptions?: Array<{ label: string; date: string }> | undefined;
}

export function TargetDateInput({
  id,
  value,
  onChange,
  minDate,
  quickPickOptions,
}: TargetDateInputProps) {
  const quickPicks = useMemo(() => getQuickPickDates(), []);
  const defaultQuickPicks = [
    { label: 'in 2 months', date: quickPicks.twoMonths },
    { label: 'in 3 months', date: quickPicks.threeMonths },
    { label: 'in 6 months', date: quickPicks.sixMonths },
    { label: 'in 1 year', date: quickPicks.oneYear },
  ];
  const picks = quickPickOptions || defaultQuickPicks;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1"
        style={{ color: 'var(--monarch-text)' }}
      >
        Goal Date
      </label>
      <input
        id={id}
        type="date"
        value={value}
        min={minDate}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
          color: 'var(--monarch-text)',
        }}
      />
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
