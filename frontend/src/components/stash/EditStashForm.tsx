/**
 * EditStashForm Component
 *
 * Form content for editing a stash.
 * Uses the same layout pattern as NewStashForm for consistency.
 */

import { useState, useMemo, useCallback } from 'react';
import { useStashConfigQuery } from '../../api/queries';
import { StashCategoryModal, type CategorySelection } from './StashCategoryModal';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { calculateStashMonthlyTarget, getQuickPickDates } from '../../utils/savingsCalculations';
import { StashImageUpload } from './StashImageUpload';
import { EditStashProgress } from './EditStashProgress';
import { DeleteStashConfirmModal } from './DeleteStashConfirmModal';
import {
  NameInputWithEmoji,
  UrlInput,
  AmountInput,
  TargetDateInput,
  GoalTypeSelector,
  CategoryInfoDisplay,
} from './StashFormFields';
import { useEditStashHandlers } from './useEditStashHandlers';
import type { StashItem, StashGoalType } from '../../types';

/** Validate form and return first error message or null if valid */
function getFormValidationError(name: string, amount: string, targetDate: string): string | null {
  if (!name.trim()) return 'Please enter a name';
  const amountNum = Number.parseFloat(amount);
  if (!amountNum || amountNum <= 0) return 'Please enter a valid amount';
  if (!targetDate) return 'Please select a target date';
  return null;
}

/** Get the target date, adjusting for archived items with past dates */
function getInitialTargetDate(item: StashItem): string {
  const today = new Date().toISOString().split('T')[0] ?? '';
  return item.is_archived && item.target_date < today ? today : item.target_date;
}

interface EditStashFormProps {
  readonly item: StashItem;
  readonly onSuccess?: (() => void) | undefined;
  readonly onClose: () => void;
  readonly renderFooter: (props: {
    isArchived: boolean;
    isDisabled: boolean;
    isSubmitting: boolean;
    onArchive: () => void;
    onDelete: () => void;
    onSaveAndRestore: () => void;
    onSubmit: () => void;
  }) => React.ReactNode;
}

export function EditStashForm({
  item,
  onSuccess,
  onClose,
  renderFooter,
}: EditStashFormProps) {
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const { data: stashConfig } = useStashConfigQuery();

  // Initialize form state from item
  const [name, setName] = useState(item.name);
  const [url, setUrl] = useState(item.source_url || '');
  const [amount, setAmount] = useState(item.amount.toString());
  const [targetDate, setTargetDate] = useState(getInitialTargetDate(item));
  const [emoji, setEmoji] = useState(item.emoji || '');
  const [customImagePath, setCustomImagePath] = useState<string | null>(
    item.custom_image_path || null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryMissingItemId, setCategoryMissingItemId] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<StashGoalType>(item.goal_type ?? 'one_time');

  const quickPicks = useMemo(() => getQuickPickDates(), []);

  const monthlyTarget = useMemo(() => {
    const amountNum = Number.parseFloat(amount) || 0;
    const isValid = amountNum > 0 && targetDate;
    return isValid
      ? calculateStashMonthlyTarget(amountNum, item.current_balance, targetDate)
      : 0;
  }, [amount, targetDate, item.current_balance]);

  const handleImageUploaded = useCallback((imagePath: string) => setCustomImagePath(imagePath), []);
  const handleImageRemoved = useCallback(() => setCustomImagePath(null), []);

  const handleCategoryMissing = useCallback(
    (itemId: string) => {
      setCategoryMissingItemId(itemId);
      setShowCategoryModal(true);
      toast.info('The linked category was deleted. Please select a new category.');
    },
    [toast]
  );

  const validateForm = useCallback((): boolean => {
    const error = getFormValidationError(name, amount, targetDate);
    if (error) {
      toast.error(error);
      return false;
    }
    return true;
  }, [name, amount, targetDate, toast]);

  const buildUpdates = useCallback(
    () => ({
      name: name.trim(),
      amount: Number.parseFloat(amount),
      target_date: targetDate,
      emoji: emoji || '🎯',
      source_url: url.trim() || null,
      custom_image_path: customImagePath || null,
      goal_type: goalType,
    }),
    [name, amount, targetDate, emoji, url, customImagePath, goalType]
  );

  const {
    handleSubmit,
    handleSaveAndRestore,
    handleArchive,
    handleCategorySelection,
    handleDelete,
    handleComplete,
    handleUncomplete,
    isSubmitting,
    isLinkingCategory,
    isDeletingItem,
    isCompletingItem,
  } = useEditStashHandlers({
    itemId: item.id,
    isArchived: item.is_archived,
    buildUpdates,
    validateForm,
    onCategoryMissing: handleCategoryMissing,
    onSuccess,
    onClose,
  });

  const isDisabled = isSubmitting || isRateLimited;

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const amountNum = Number.parseFloat(amount) || 0;

  const editQuickPicks = [
    { label: '3mo', date: quickPicks.threeMonths },
    { label: '6mo', date: quickPicks.sixMonths },
    { label: '1yr', date: quickPicks.oneYear },
  ];

  const onCategoryConfirm = (selection: CategorySelection) =>
    handleCategorySelection(selection, categoryMissingItemId);
  const onCategoryClose = () => {
    setShowCategoryModal(false);
    setCategoryMissingItemId(null);
  };

  return (
    <>
      <div className="space-y-4">
        <div>
          <StashImageUpload
            itemId={item.id}
            currentImagePath={customImagePath}
            onImageUploaded={handleImageUploaded}
            onImageRemoved={handleImageRemoved}
          />
          {item.logo_url && !customImagePath && (
            <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Using logo from source URL. Upload a custom image to override.
            </p>
          )}
        </div>

        <NameInputWithEmoji
          id="edit-stash-name"
          value={name}
          onChange={setName}
          emoji={emoji}
          onEmojiChange={setEmoji}
        />
        <UrlInput id="edit-stash-url" value={url} onChange={setUrl} />

        {/* Sentence-style intention input: "Save $[amount] by [date] as a [goal type]" */}
        <div className="space-y-3">
          {/* "Save $[amount] by [date]" */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: 'var(--monarch-text)' }}
            >
              Save
            </span>
            <div className="w-28">
              <AmountInput id="edit-stash-amount" value={amount} onChange={setAmount} hideLabel />
            </div>
            <span
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: 'var(--monarch-text)' }}
            >
              by
            </span>
            <div className="flex-1 min-w-32">
              <TargetDateInput
                id="edit-stash-date"
                value={targetDate}
                onChange={setTargetDate}
                minDate={today}
                quickPickOptions={editQuickPicks}
                hideLabel
              />
            </div>
          </div>

          {/* "as a [goal type]" */}
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: 'var(--monarch-text)' }}
            >
              as a
            </span>
            <div className="flex-1">
              <GoalTypeSelector value={goalType} onChange={setGoalType} hideLabel />
            </div>
          </div>
        </div>

        {/* Progress section - edit-specific */}
        {amount && amountNum > 0 && targetDate && (
          <EditStashProgress
            item={item}
            goalAmount={amountNum}
            monthlyTarget={monthlyTarget}
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
            isCompletingItem={isCompletingItem}
          />
        )}

        {/* Category info - edit-specific */}
        {item.category_name && item.category_id && (
          <CategoryInfoDisplay
            categoryName={item.category_name}
            categoryId={item.category_id}
            {...(item.category_group_name && { categoryGroupName: item.category_group_name })}
          />
        )}
      </div>

      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-(--monarch-border)">
        {renderFooter({
          isArchived: item.is_archived,
          isDisabled,
          isSubmitting,
          onArchive: handleArchive,
          onDelete: () => setShowDeleteModal(true),
          onSaveAndRestore: handleSaveAndRestore,
          onSubmit: handleSubmit,
        })}
      </div>

      <DeleteStashConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        item={item}
        isDeleting={isDeletingItem}
      />

      <StashCategoryModal
        isOpen={showCategoryModal}
        onClose={onCategoryClose}
        onConfirm={onCategoryConfirm}
        {...(stashConfig?.defaultCategoryGroupId && {
          defaultCategoryGroupId: stashConfig.defaultCategoryGroupId,
        })}
        isSubmitting={isLinkingCategory}
      />
    </>
  );
}
