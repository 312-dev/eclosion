/* eslint-disable sonarjs/no-nested-conditional */
/* eslint-disable max-lines */
/**
 * NewStashForm Component
 *
 * Form content for creating a new stash.
 * Uses key prop for resetting state when modal reopens.
 */

import { useState, useMemo, useCallback } from 'react';
import { useModalFooter } from '../ui/Modal';
import {
  useCreateStashMutation,
  useStashConfigQuery,
  useAvailableToStash,
  useCategoryBalanceQuery,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useStashImageUpload } from '../../hooks';
import { handleApiError } from '../../utils';
import {
  calculateStashMonthlyTarget,
  getQuickPickDates,
  calculateMonthsRemaining,
  formatMonthsRemaining,
} from '../../utils/savingsCalculations';
import { getLocalDateString } from '../../utils/dateRangeUtils';
import { InlineCategorySelector, type CategorySelectionResult } from './InlineCategorySelector';
import { NewStashImageUpload } from './NewStashImageUpload';
import { SavingsProgressBar } from '../shared';
import {
  NameInputWithEmoji,
  UrlDisplay,
  AmountInput,
  TargetDateInput,
  GoalTypeSelector,
  StartingBalanceInput,
} from './StashFormFields';
import { DebtAccountSelectorModal } from './DebtAccountSelectorModal';
import type { StashGoalType, ImageSelection } from '../../types';

interface NewStashFormProps {
  readonly prefill?:
    | {
        name?: string | undefined;
        sourceUrl?: string | undefined;
        sourceBookmarkId?: string | undefined;
      }
    | undefined;
  readonly pendingBookmarkId?: string | undefined;
  readonly onPendingConverted?: ((id: string) => Promise<void>) | undefined;
  readonly onSuccess?: (() => void) | undefined;
  readonly onClose: () => void;
  readonly renderFooter: (props: {
    isDisabled: boolean;
    isSubmitting: boolean;
    onSubmit: () => void | Promise<void>;
  }) => React.ReactNode;
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- Form has multiple fields with validation; complexity is justified
export function NewStashForm({
  prefill,
  pendingBookmarkId,
  onPendingConverted,
  onSuccess,
  onClose,
  renderFooter,
}: NewStashFormProps) {
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const renderInFooter = useModalFooter();
  const createMutation = useCreateStashMutation();
  const { data: stashConfig } = useStashConfigQuery();
  const { uploadImage, isUploading } = useStashImageUpload();
  const quickPicks = useMemo(() => getQuickPickDates(), []);

  // Initialize state from prefill
  const [name, setName] = useState(prefill?.name || '');
  const [url, setUrl] = useState(prefill?.sourceUrl || '');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState(quickPicks.threeMonths);
  const [emoji, setEmoji] = useState('');
  const [goalType, setGoalType] = useState<StashGoalType>('one_time');
  const [categorySelection, setCategorySelection] = useState<CategorySelectionResult>({
    mode: 'create_new',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [openverseImage, setOpenverseImage] = useState<ImageSelection | null>(null);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [startingBalance, setStartingBalance] = useState('');
  const [isStartingBalanceFocused, setIsStartingBalanceFocused] = useState(false);
  const [isDebtSelectorOpen, setIsDebtSelectorOpen] = useState(false);
  // Track if user explicitly cleared amount/date (makes them optional)
  const [isAmountCleared, setIsAmountCleared] = useState(false);
  const [isDateCleared, setIsDateCleared] = useState(false);
  // Track if user has attempted to submit (for showing validation errors)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Get available to stash amount for validation
  // Use the same options as the widget so the numbers match
  const { data: availableData, isLoading: isLoadingAvailable } = useAvailableToStash({
    includeExpectedIncome: stashConfig?.includeExpectedIncome ?? false,
    bufferAmount: stashConfig?.bufferAmount ?? 0,
  });

  // Get the balance of the selected existing category (if any)
  // Only query when using an existing category (not flexible group)
  const selectedCategoryId =
    categorySelection.mode === 'use_existing' && categorySelection.categoryId
      ? categorySelection.categoryId
      : null;
  const { data: existingCategoryBalance } = useCategoryBalanceQuery(selectedCategoryId);

  // Track whether the starting balance field should be disabled
  // It's disabled when using an existing category that has a balance > 0
  const isExistingCategoryWithBalance =
    selectedCategoryId !== null &&
    existingCategoryBalance !== undefined &&
    existingCategoryBalance > 0;

  // Compute the effective starting balance:
  // - If selecting an existing category with a balance, use that balance (field is disabled)
  // - Otherwise, use the user-entered value (field is editable)
  const effectiveStartingBalance = isExistingCategoryWithBalance
    ? existingCategoryBalance.toString()
    : startingBalance;

  const today = useMemo(() => getLocalDateString(), []);

  const startingBalanceNum = Number.parseInt(effectiveStartingBalance, 10) || 0;

  // Monthly target is only calculated when both amount and date are defined
  const monthlyTarget = useMemo(() => {
    const amountNum = Number.parseFloat(amount) || 0;
    if (amountNum <= 0 || !targetDate) return null;
    return calculateStashMonthlyTarget(amountNum, startingBalanceNum, targetDate);
  }, [amount, targetDate, startingBalanceNum]);

  const monthsRemaining = targetDate ? calculateMonthsRemaining(targetDate) : null;

  const handleImageSelect = useCallback((file: File) => {
    setSelectedImage(file);
    setOpenverseImage(null); // Clear Openverse selection when local file is selected
  }, []);
  const handleImageRemove = useCallback(() => {
    setSelectedImage(null);
    setOpenverseImage(null);
  }, []);
  const handleOpenverseSelect = useCallback((selection: ImageSelection) => {
    // Clear local file when Openverse image is selected
    if (selection.url) {
      setSelectedImage(null);
      setOpenverseImage(selection);
    } else {
      setOpenverseImage(null);
    }
  }, []);

  // eslint-disable-next-line sonarjs/cognitive-complexity -- Form validation requires multiple checks
  const handleSubmit = useCallback(async () => {
    // Mark that user has attempted to submit (triggers inline validation display)
    setHasAttemptedSubmit(true);

    const amountNum = Number.parseFloat(amount);

    // Validate form
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    // Amount and target date are now optional (for open-ended goals)
    // But if amount is provided, it must be positive
    if (amount && amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Validate category selection
    const { mode, categoryGroupId, categoryId, flexibleGroupId } = categorySelection;
    if (mode === 'create_new' && !categoryGroupId) {
      toast.error('Please select a category group');
      return;
    }
    if (mode === 'use_existing' && !categoryId && !flexibleGroupId) {
      toast.error('Please select a category');
      return;
    }

    try {
      let customImagePath: string | undefined;

      // Handle local file upload
      if (selectedImage) {
        const tempId = `temp-${Date.now()}`;
        customImagePath = (await uploadImage(tempId, selectedImage)) ?? undefined;
      }
      // Handle Openverse image URL (store URL directly)
      else if (openverseImage?.url) {
        customImagePath = openverseImage.url;
      }

      const baseRequest = {
        name: name.trim(),
        amount: isAmountCleared ? null : amountNum, // null for open-ended goals
        target_date: isDateCleared ? null : targetDate || null, // null for no deadline
        goal_type: goalType,
        ...(url.trim() && { source_url: url.trim() }),
        ...(prefill?.sourceBookmarkId && { source_bookmark_id: prefill.sourceBookmarkId }),
        ...(emoji && { emoji }),
        ...(customImagePath && { custom_image_path: customImagePath }),
        // Store Openverse attribution if using an Openverse image
        ...(openverseImage?.attribution && { image_attribution: openverseImage.attribution }),
        // Starting balance - set initial rollover balance
        // Only send for new categories - existing categories already have their balance in Monarch
        ...(startingBalanceNum > 0 &&
          !isExistingCategoryWithBalance && { starting_balance: startingBalanceNum }),
      };

      let request;
      if (mode === 'create_new' && categoryGroupId) {
        request = { ...baseRequest, category_group_id: categoryGroupId };
      } else if (flexibleGroupId) {
        // use_flexible_group - link to the group directly for group-level rollover
        request = { ...baseRequest, flexible_group_id: flexibleGroupId };
      } else if (categoryId) {
        request = { ...baseRequest, existing_category_id: categoryId };
      } else {
        toast.error('Please select a category');
        return;
      }

      await createMutation.mutateAsync(request);
      toast.success('Stash created');

      if (pendingBookmarkId && onPendingConverted) {
        await onPendingConverted(pendingBookmarkId);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(handleApiError(err, 'Creating stash'));
    }
  }, [
    amount,
    name,
    targetDate,
    url,
    emoji,
    goalType,
    categorySelection,
    selectedImage,
    openverseImage,
    prefill,
    createMutation,
    uploadImage,
    toast,
    pendingBookmarkId,
    onPendingConverted,
    onSuccess,
    onClose,
    startingBalanceNum,
    isAmountCleared,
    isDateCleared,
    isExistingCategoryWithBalance,
  ]);

  const isSubmitting = createMutation.isPending || isUploading;
  const amountNum = Number.parseFloat(amount) || 0;

  // Category validation
  const isCategoryValid =
    categorySelection.mode === 'create_new'
      ? Boolean(categorySelection.categoryGroupId)
      : Boolean(categorySelection.categoryId) || Boolean(categorySelection.flexibleGroupId);

  // Starting balance validation - cannot exceed available to stash
  const availableAmount = availableData?.available;
  const isStartingBalanceOverAvailable =
    availableAmount !== undefined && startingBalanceNum > availableAmount;

  // Form is valid when:
  // - Name is provided
  // - Amount is either cleared (open-ended) OR a positive number
  // - Category is selected
  // - Starting balance doesn't exceed available
  const isFormValid =
    name.trim() &&
    (isAmountCleared || amountNum > 0) && // Required unless explicitly cleared
    isCategoryValid &&
    !isStartingBalanceOverAvailable;
  const isDisabled = isSubmitting || isRateLimited || !isFormValid;

  return (
    <div className="space-y-3">
      <NewStashImageUpload
        sourceUrl={prefill?.sourceUrl}
        selectedImage={selectedImage}
        imagePreview={imagePreview}
        onImageSelect={handleImageSelect}
        onImageRemove={handleImageRemove}
        onPreviewChange={setImagePreview}
        onOpenverseSelect={handleOpenverseSelect}
        openverseImageUrl={openverseImage?.thumbnail}
      />

      <div>
        <NameInputWithEmoji
          id="stash-name"
          value={name}
          onChange={setName}
          emoji={emoji}
          onEmojiChange={setEmoji}
          onFocusChange={setIsNameFocused}
          error={hasAttemptedSubmit && !name.trim()}
        />
        {/* Aligned with text input (after emoji picker w-12 + gap-2) */}
        <div
          className={`pl-14 transition-all duration-200 overflow-hidden ${
            isNameFocused || url || isUrlModalOpen
              ? 'opacity-100 translate-y-0 mt-1 h-auto'
              : 'opacity-0 -translate-y-1 pointer-events-none h-0'
          }`}
        >
          <UrlDisplay value={url} onChange={setUrl} onModalOpenChange={setIsUrlModalOpen} />
        </div>
      </div>

      {/* Category Selection */}
      <InlineCategorySelector
        value={categorySelection}
        onChange={setCategorySelection}
        defaultCategoryGroupId={stashConfig?.defaultCategoryGroupId ?? undefined}
      />

      {/* Goal container - intention inputs + progress preview */}
      <div
        className="p-4 rounded-lg relative overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        {/* Decorative opening quotation mark */}
        <span
          className="absolute pointer-events-none select-none"
          style={{
            top: '0.75rem',
            left: '-0.5rem',
            fontSize: '12rem',
            lineHeight: 0.7,
            opacity: 0.06,
            color: 'var(--monarch-text-muted)',
            fontFamily: 'Georgia, serif',
          }}
          aria-hidden="true"
        >
          {'\u201C'}
        </span>
        {/* Sentence-style intention input: "Save $X as a [type] by [date]" */}
        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap justify-center relative">
          <span
            className="h-10 inline-flex items-center"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            I intend to save
          </span>
          <AmountInput
            id="stash-amount"
            value={amount}
            onChange={setAmount}
            hideLabel
            showSearchButton={goalType === 'debt'}
            onSearchClick={() => setIsDebtSelectorOpen(true)}
            allowNull
            isCleared={isAmountCleared}
            onClear={() => {
              setAmount('');
              setIsAmountCleared(true);
            }}
            onRestore={() => setIsAmountCleared(false)}
            error={hasAttemptedSubmit && !isAmountCleared && amountNum <= 0}
          />
          {/* Show "regularly" when amount is cleared (open-ended) */}
          {isAmountCleared && (
            <span
              className="h-10 inline-flex items-center"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              regularly
            </span>
          )}
          <span
            className="h-10 inline-flex items-center"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            {goalType === 'one_time' ? 'for a' : goalType === 'debt' ? 'towards a' : 'as a'}
          </span>
          <div className="basis-full h-0" />
          <GoalTypeSelector
            value={goalType}
            onChange={setGoalType}
            hideLabel
            suffix={
              isDateCleared ? (
                <span style={{ color: 'var(--monarch-text-muted)' }}>.</span>
              ) : undefined
            }
          />
          {/* Conditionally show "+ add deadline" link or "by [date]." */}
          {isDateCleared ? (
            <button
              type="button"
              onClick={() => {
                setTargetDate(quickPicks.threeMonths);
                setIsDateCleared(false);
              }}
              className="h-10 inline-flex items-center px-2 text-sm hover:underline"
              style={{ color: 'var(--monarch-orange)' }}
            >
              + add deadline
            </button>
          ) : (
            <>
              <span
                className="h-10 inline-flex items-center"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                by
              </span>
              <TargetDateInput
                id="stash-date"
                value={targetDate}
                onChange={setTargetDate}
                minDate={today}
                quickPickOptions={[]}
                hideLabel
                allowNull
                onClear={() => {
                  setTargetDate('');
                  setIsDateCleared(true);
                }}
                suffix={<span style={{ color: 'var(--monarch-text-muted)' }}>.</span>}
              />
            </>
          )}
          <div className="basis-full h-0" />
          <span
            className="h-10 inline-flex items-center self-start"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            I&apos;ve already saved
          </span>
          <StartingBalanceInput
            value={effectiveStartingBalance}
            onChange={setStartingBalance}
            availableAmount={availableAmount}
            isLoading={isLoadingAvailable}
            isFocused={isStartingBalanceFocused}
            onFocusChange={setIsStartingBalanceFocused}
            disabled={isExistingCategoryWithBalance}
            disabledTooltip="This category already has a balance. You can adjust it after creation."
            suffix={<span style={{ color: 'var(--monarch-text-muted)' }}>.</span>}
          />
          {/* Decorative closing quotation mark */}
          <span
            className="absolute pointer-events-none select-none"
            style={{
              bottom: '-7rem',
              right: '-1.5rem',
              fontSize: '12rem',
              lineHeight: 0.7,
              opacity: 0.06,
              color: 'var(--monarch-text-muted)',
              fontFamily: 'Georgia, serif',
            }}
            aria-hidden="true"
          >
            {'\u201D'}
          </span>
        </div>

        {/* Progress Preview - only shows when both amount and date are defined */}
        {amountNum > 0 && targetDate && monthlyTarget !== null && monthsRemaining !== null && (
          <>
            <div className="my-3 border-t" style={{ borderColor: 'var(--monarch-border)' }} />
            <SavingsProgressBar
              totalSaved={startingBalanceNum}
              targetAmount={amountNum}
              progressPercent={
                amountNum > 0 ? Math.min(100, (startingBalanceNum / amountNum) * 100) : 0
              }
              displayStatus={startingBalanceNum >= amountNum ? 'funded' : 'behind'}
              isEnabled={true}
              savedLabel="committed"
            />
            <div
              className="flex justify-between text-sm mt-3 pt-3 border-t"
              style={{ borderColor: 'var(--monarch-border)' }}
            >
              <div>
                <span style={{ color: 'var(--monarch-text-muted)' }}>Monthly: </span>
                <span style={{ color: 'var(--monarch-orange)', fontWeight: 500 }}>
                  ${monthlyTarget}/mo
                </span>
              </div>
              <div style={{ color: 'var(--monarch-text-muted)' }}>
                {formatMonthsRemaining(monthsRemaining)} to go
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer portaled to Modal's sticky footer area */}
      {renderInFooter(
        <div className="p-4 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
          {renderFooter({
            isDisabled,
            isSubmitting,
            onSubmit: handleSubmit,
          })}
        </div>
      )}

      {/* Debt Account Selector Modal */}
      <DebtAccountSelectorModal
        isOpen={isDebtSelectorOpen}
        onClose={() => setIsDebtSelectorOpen(false)}
        onSelect={(account) => {
          setAmount(Math.abs(account.balance).toString());
        }}
      />
    </div>
  );
}
