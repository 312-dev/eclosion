/**
 * DistributeWizard Component
 *
 * Two-screen wizard for distributing funds across stash items.
 * Makes the two-phase distribution explicit:
 *
 * Screen 1: "Distribute Existing Savings" (if availableAmount > leftToBudget)
 *   - Amount: availableAmount - leftToBudget
 *   - Goes to: Category starting balances (one-time boost)
 *
 * Screen 2: "Distribute Monthly Income"
 *   - Amount: leftToBudget (or $100 default if 0)
 *   - Goes to: Monthly budgets (recurring)
 *   - Shows "at this rate" projections
 *
 * Supports two activeModes:
 * - distribute: Saves allocations to Monarch
 * - hypothesize: What-if planning, no save
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { DistributeScreen } from './DistributeScreen';
import { DistributeReviewScreen } from './DistributeReviewScreen';
import { StepIndicator } from '../wizards/StepIndicator';
import { Icons } from '../icons';
import { Tooltip } from '../ui';
import { UI } from '../../constants';
import { distributeAmountByRatios } from '../../utils/calculations';
import {
  useAllocateStashBatchMutation,
  useUpdateCategoryRolloverMutation,
  useDashboardQuery,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import type { StashItem } from '../../types';

type WizardStep = 'savings' | 'monthly' | 'review';

const DISTRIBUTE_STEPS = [
  { id: 'savings', title: 'Savings' },
  { id: 'monthly', title: 'Monthly' },
  { id: 'review', title: 'Review' },
];

/** Mode for the wizard */
export type DistributeMode = 'distribute' | 'hypothesize';

interface DistributeWizardProps {
  /** Whether the modal is open */
  readonly isOpen: boolean;
  /** Callback to close the modal */
  readonly onClose: () => void;
  /** Mode: 'distribute' for real allocation, 'hypothesize' for what-if planning */
  readonly mode: DistributeMode;
  /** Available funds to distribute (after buffer) - max amount in distribute mode */
  readonly availableAmount: number;
  /** Left to Budget amount (ready_to_assign from Monarch) - determines split */
  readonly leftToBudget: number;
  /** List of stash items to distribute to */
  readonly items: StashItem[];
}

export function DistributeWizard({
  isOpen,
  onClose,
  mode: initialMode,
  availableAmount,
  leftToBudget,
  items,
}: DistributeWizardProps) {
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const batchAllocateMutation = useAllocateStashBatchMutation();
  const rolloverMutation = useUpdateCategoryRolloverMutation();

  // Internal activeMode state - can switch from distribute to hypothesize
  const [activeMode, setActiveMode] = useState<DistributeMode>(initialMode);

  // For refreshing left to budget on the monthly step
  const { refetch: refetchDashboard, isFetching: isRefreshingLeftToBudget } = useDashboardQuery();

  // Warning dialog state for when user tries to edit in distribute activeMode
  const [showEditWarning, setShowEditWarning] = useState(false);

  // Copy preview modal state
  const [showCopyPreview, setShowCopyPreview] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState('');
  const previewTextRef = useRef<HTMLPreElement>(null);

  // Calculate the two pools
  const existingSavings = Math.max(0, availableAmount - leftToBudget);
  const monthlyIncome = leftToBudget > 0 ? leftToBudget : 100; // Default $100 if no leftToBudget
  const hasSavingsStep = existingSavings > 0;

  // Step state
  const [step, setStep] = useState<WizardStep>('savings');

  // Separate allocations for each step
  const [savingsAllocations, setSavingsAllocations] = useState<Record<string, number>>({});
  const [monthlyAllocations, setMonthlyAllocations] = useState<Record<string, number>>({});

  // Current step's allocations
  const currentAllocations = step === 'savings' ? savingsAllocations : monthlyAllocations;

  // For hypothesize activeMode, allow editing both amounts
  const [customSavingsAmount, setCustomSavingsAmount] = useState<number>(existingSavings);
  const [customMonthlyAmount, setCustomMonthlyAmount] = useState<number>(monthlyIncome);
  const effectiveSavingsAmount = activeMode === 'hypothesize' ? customSavingsAmount : existingSavings;
  const effectiveMonthlyAmount = activeMode === 'hypothesize' ? customMonthlyAmount : monthlyIncome;

  // Refresh handler for left to budget
  const handleRefreshLeftToBudget = useCallback(async () => {
    const result = await refetchDashboard();
    if (result.data) {
      const newLeftToBudget = result.data.ready_to_assign?.ready_to_assign ?? 0;
      setCustomMonthlyAmount(newLeftToBudget > 0 ? newLeftToBudget : 100);
      toast.success('Left to Budget updated');
    }
  }, [refetchDashboard, toast]);

  // Handler for when user tries to edit in distribute activeMode
  const handleEditAttempt = useCallback(() => {
    if (activeMode === 'distribute') {
      setShowEditWarning(true);
    }
  }, [activeMode]);

  // Handler for switching to hypothetical activeMode
  const handleSwitchToHypothetical = useCallback(() => {
    setShowEditWarning(false);
    setActiveMode('hypothesize');
    // Navigate to savings step (screen 1) so they can edit the amount
    setStep('savings');
    // Pre-populate with existing savings amount so they can edit
    setCustomSavingsAmount(existingSavings > 0 ? existingSavings : 100);
    toast.info('Switched to Hypothetical mode - you can now edit the amount');
  }, [existingSavings, toast]);

  // Calculate totals for current step
  const totalAllocated = Object.values(currentAllocations).reduce((sum, val) => sum + val, 0);
  const stepAmount = step === 'savings' ? effectiveSavingsAmount : effectiveMonthlyAmount;
  const remaining = stepAmount - totalAllocated;
  // Use rounded comparison to handle floating point precision issues
  const isFullyAllocated = Math.round(remaining) === 0 && stepAmount > 0;

  // Validation
  const isOverMax = activeMode === 'distribute' && step === 'savings' && totalAllocated > existingSavings;

  // Handlers for current step
  const handleAllocationChange = useCallback(
    (id: string, amount: number) => {
      if (step === 'savings') {
        setSavingsAllocations((prev) => ({ ...prev, [id]: amount }));
      } else {
        setMonthlyAllocations((prev) => ({ ...prev, [id]: amount }));
      }
    },
    [step]
  );

  const handleReset = useCallback(() => {
    if (step === 'savings') {
      setSavingsAllocations({});
    } else {
      setMonthlyAllocations({});
    }
  }, [step]);

  const handleTotalChange = useCallback(
    (amount: number) => {
      // In hypothesize mode, allow editing the amount for both steps
      if (step === 'savings') {
        setCustomSavingsAmount(amount);
      } else if (step === 'monthly') {
        setCustomMonthlyAmount(amount);
      }
    },
    [step]
  );

  // Navigate to next step (savings -> monthly)
  const handleNextStep = useCallback(() => {
    // Carry over ratios from savings to monthly (unless leftToBudget was 0)
    if (leftToBudget > 0) {
      const totalSavings = Object.values(savingsAllocations).reduce((a, b) => a + b, 0);
      if (totalSavings > 0) {
        // Convert amounts to ratios
        const ratios: Record<string, number> = {};
        for (const [id, amount] of Object.entries(savingsAllocations)) {
          ratios[id] = amount / totalSavings;
        }
        // Use largest remainder method to ensure sum equals effectiveMonthlyAmount exactly
        const newMonthly = distributeAmountByRatios(effectiveMonthlyAmount, ratios);
        setMonthlyAllocations(newMonthly);
      }
    }
    // If leftToBudget === 0, start fresh with no predefined ratios
    setStep('monthly');
  }, [leftToBudget, savingsAllocations, effectiveMonthlyAmount]);

  // Navigate to review step (monthly -> review)
  const handleGoToReview = useCallback(() => {
    setStep('review');
  }, []);

  // Navigate back
  const handleBackStep = useCallback(() => {
    if (step === 'review') {
      setStep('monthly');
    } else if (step === 'monthly' && hasSavingsStep) {
      setStep('savings');
    }
  }, [step, hasSavingsStep]);

  const handleConfirm = useCallback(async () => {
    if (activeMode !== 'distribute') return;

    try {
      let rolloverTotal = 0;
      let budgetTotal = 0;

      // Step 1: Apply savings allocations to rollover balances
      for (const [itemId, amount] of Object.entries(savingsAllocations)) {
        if (amount <= 0) continue;
        const item = items.find((i) => i.id === itemId);
        if (item?.category_id) {
          await rolloverMutation.mutateAsync({
            categoryId: item.category_id,
            amount,
          });
          rolloverTotal += amount;
        }
      }

      // Step 2: Apply monthly allocations to budgets
      const budgetUpdates = Object.entries(monthlyAllocations)
        .filter(([, amount]) => amount > 0)
        .map(([id, budget]) => ({ id, budget }));

      if (budgetUpdates.length > 0) {
        await batchAllocateMutation.mutateAsync(budgetUpdates);
        budgetTotal = budgetUpdates.reduce((sum, u) => sum + u.budget, 0);
      }

      // Success message
      if (rolloverTotal > 0 && budgetTotal > 0) {
        toast.success(
          `Distributed $${rolloverTotal} to savings and $${budgetTotal} to budgets`
        );
      } else if (rolloverTotal > 0) {
        toast.success(`Added $${rolloverTotal} to category savings`);
      } else if (budgetTotal > 0) {
        toast.success(`Updated budgets for ${budgetUpdates.length} stash items`);
      } else {
        toast.warning('No allocations to save');
        return;
      }

      onClose();
    } catch {
      toast.error('Failed to distribute funds. Please try again.');
    }
  }, [
    activeMode,
    savingsAllocations,
    monthlyAllocations,
    items,
    rolloverMutation,
    batchAllocateMutation,
    toast,
    onClose,
  ]);

  // Reset state when modal opens (via rAF to avoid synchronous setState in effect)
  useEffect(() => {
    if (isOpen) {
      const frame = requestAnimationFrame(() => {
        // Reset to initial mode (in case user switched to hypothetical last time)
        setActiveMode(initialMode);
        // Start at savings step if there are existing savings, otherwise skip to monthly
        setStep(hasSavingsStep ? 'savings' : 'monthly');
        setSavingsAllocations({});
        setMonthlyAllocations({});
        setCustomSavingsAmount(existingSavings);
        setCustomMonthlyAmount(leftToBudget > 0 ? leftToBudget : 100);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen, hasSavingsStep, leftToBudget, existingSavings, initialMode]);

  // Determine if current step is complete (fully allocated)
  const isStepComplete = isFullyAllocated && !isOverMax;

  // Determine if we can proceed to review (on monthly step, fully allocated)
  const canGoToReview =
    activeMode === 'distribute' &&
    step === 'monthly' &&
    isStepComplete;

  // Determine if confirm is enabled (on review step)
  const canConfirm =
    activeMode === 'distribute' &&
    step === 'review' &&
    !rolloverMutation.isPending &&
    !batchAllocateMutation.isPending &&
    !isRateLimited;

  const isSubmitting = rolloverMutation.isPending || batchAllocateMutation.isPending;

  // Shake animation state for invalid submit attempts
  const [shouldShake, setShouldShake] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle Enter key to attempt submit or shake if invalid
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (step === 'savings' && isStepComplete) {
          handleNextStep();
        } else if (step === 'monthly' && canGoToReview) {
          handleGoToReview();
        } else if (step === 'review' && canConfirm) {
          handleConfirm();
        } else if (step !== 'review' && !isStepComplete) {
          // Invalid - trigger shake
          setShouldShake(true);
          setTimeout(() => setShouldShake(false), UI.ANIMATION.SLOW);
        }
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, isStepComplete, canGoToReview, canConfirm, handleNextStep, handleGoToReview, handleConfirm]);

  // Get current step index for step indicator
  const getCurrentStepIndex = () => {
    if (step === 'savings') return 0;
    if (step === 'monthly') return hasSavingsStep ? 1 : 0;
    // review step
    return hasSavingsStep ? 2 : 1;
  };

  // Step title and description (shown inside the modal, above the amount)
  const getStepTitle = () => {
    if (step === 'savings') return 'Distribute Existing Savings';
    if (step === 'monthly') return 'Distribute Monthly Income';
    return 'Review Your Changes';
  };

  const getStepDescription = () => {
    if (step === 'savings') {
      return 'This money will be added to your stash balances as a one-time boost.';
    }
    if (step === 'monthly') {
      return 'This is your recurring monthly contribution. Projections are based on this rate.';
    }
    if (activeMode === 'hypothesize') {
      return 'Review your hypothetical distribution. Use Copy to save the summary.';
    }
    return 'Confirm your distribution before applying changes.';
  };

  // Action button content based on allocation state
  const getActionButtonState = () => {
    if (isStepComplete) {
      return {
        content: step === 'savings' ? 'Continue' : 'Review Changes',
        icon: null,
        colorClass: 'bg-monarch-orange text-white',
        needsTooltip: false,
      };
    }
    if (remaining < 0) {
      return {
        content: 'Over!',
        icon: <Icons.Warning size={16} />,
        colorClass: 'bg-monarch-bg-hover text-monarch-error',
        needsTooltip: true,
      };
    }
    return {
      content: 'Keep going!',
      icon: <Icons.TrendingUpDown size={16} />,
      colorClass: 'bg-monarch-bg-hover text-monarch-text-muted',
      needsTooltip: true,
    };
  };

  const actionButton = getActionButtonState();

  // Format currency for display
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  // Modal title with icon matching the mode
  const title = activeMode === 'distribute' ? (
    <span className="flex items-center gap-2">
      <Icons.Split size={18} />
      Distribute
    </span>
  ) : (
    <span className="flex items-center gap-2">
      <Icons.FlaskConical size={18} />
      Hypothesize
    </span>
  );

  // Helper to format markdown tables with proper alignment
  const formatTable = useCallback((headers: string[], rows: string[][]): string[] => {
    const colWidths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map(r => r[i]?.length ?? 0))
    );
    const tableLines: string[] = [];
    tableLines.push('| ' + headers.map((h, i) => h.padEnd(colWidths[i] ?? 0)).join(' | ') + ' |');
    tableLines.push('| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |');
    for (const row of rows) {
      tableLines.push('| ' + row.map((cell, i) => cell.padEnd(colWidths[i] ?? 0)).join(' | ') + ' |');
    }
    return tableLines;
  }, []);

  // Generate markdown for CURRENT screen only
  const generateCurrentScreenMarkdown = useCallback(() => {
    const lines: string[] = [];

    if (step === 'savings') {
      const hasSavingsAllocations = Object.values(savingsAllocations).some(v => v > 0);
      if (hasSavingsAllocations) {
        const totalSavings = Object.values(savingsAllocations).reduce((sum, v) => sum + v, 0);
        lines.push('# Distribute Existing Savings');
        lines.push('');
        lines.push(`**Total:** ${formatCurrency(effectiveSavingsAmount)}`);
        lines.push(`**Allocated:** ${formatCurrency(totalSavings)}`);
        lines.push('');

        const headers = ['Stash', 'Allocation'];
        const rows = items
          .filter(item => (savingsAllocations[item.id] ?? 0) > 0)
          .map(item => [item.name, formatCurrency(savingsAllocations[item.id] ?? 0)]);

        if (rows.length > 0) {
          lines.push(...formatTable(headers, rows));
        }
      } else {
        lines.push('*No allocations configured yet.*');
      }
    } else if (step === 'monthly') {
      const hasMonthlyAllocations = Object.values(monthlyAllocations).some(v => v > 0);
      if (hasMonthlyAllocations) {
        const totalMonthly = Object.values(monthlyAllocations).reduce((sum, v) => sum + v, 0);
        lines.push('# Distribute Monthly Income');
        lines.push('');
        lines.push(`**Total:** ${formatCurrency(effectiveMonthlyAmount)}/mo`);
        lines.push(`**Allocated:** ${formatCurrency(totalMonthly)}/mo`);
        lines.push('');

        const headers = ['Stash', 'Contribution'];
        const rows = items
          .filter(item => (monthlyAllocations[item.id] ?? 0) > 0)
          .map(item => [item.name, `${formatCurrency(monthlyAllocations[item.id] ?? 0)}/mo`]);

        if (rows.length > 0) {
          lines.push(...formatTable(headers, rows));
        }
      } else {
        lines.push('*No allocations configured yet.*');
      }
    }

    return lines.join('\n');
  }, [step, savingsAllocations, monthlyAllocations, items, effectiveSavingsAmount, effectiveMonthlyAmount, formatCurrency, formatTable]);

  // Generate FULL markdown summary (for review screen)
  const generateFullSummary = useCallback(() => {
    const lines: string[] = ['# Hypothesize Summary', ''];

    // Screen 1: Existing Savings (if there are allocations)
    const hasSavingsAllocations = Object.values(savingsAllocations).some(v => v > 0);
    if (hasSavingsAllocations) {
      const totalSavings = Object.values(savingsAllocations).reduce((sum, v) => sum + v, 0);
      lines.push('## Distribute Existing Savings');
      lines.push('');
      lines.push(`**Total:** ${formatCurrency(effectiveSavingsAmount)}`);
      lines.push(`**Allocated:** ${formatCurrency(totalSavings)}`);
      lines.push('');

      const headers = ['Stash', 'Allocation'];
      const rows = items
        .filter(item => (savingsAllocations[item.id] ?? 0) > 0)
        .map(item => [item.name, formatCurrency(savingsAllocations[item.id] ?? 0)]);

      if (rows.length > 0) {
        lines.push(...formatTable(headers, rows));
      }
      lines.push('');
    }

    // Screen 2: Monthly Income (if there are allocations)
    const hasMonthlyAllocations = Object.values(monthlyAllocations).some(v => v > 0);
    if (hasMonthlyAllocations) {
      const totalMonthly = Object.values(monthlyAllocations).reduce((sum, v) => sum + v, 0);
      lines.push('## Distribute Monthly Income');
      lines.push('');
      lines.push(`**Total:** ${formatCurrency(effectiveMonthlyAmount)}/mo`);
      lines.push(`**Allocated:** ${formatCurrency(totalMonthly)}/mo`);
      lines.push('');

      const headers = ['Stash', 'Contribution'];
      const rows = items
        .filter(item => (monthlyAllocations[item.id] ?? 0) > 0)
        .map(item => [item.name, `${formatCurrency(monthlyAllocations[item.id] ?? 0)}/mo`]);

      if (rows.length > 0) {
        lines.push(...formatTable(headers, rows));
      }
      lines.push('');
    }

    // If no allocations at all
    if (!hasSavingsAllocations && !hasMonthlyAllocations) {
      lines.push('*No allocations configured yet.*');
    }

    return lines.join('\n');
  }, [savingsAllocations, monthlyAllocations, items, effectiveSavingsAmount, effectiveMonthlyAmount, formatCurrency, formatTable]);

  // Copy current screen to clipboard - shows preview modal
  const handleCopyCurrentScreen = useCallback(async () => {
    const markdown = generateCurrentScreenMarkdown();
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedMarkdown(markdown);
      setShowCopyPreview(true);
      // Select text after modal renders
      setTimeout(() => {
        if (previewTextRef.current) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(previewTextRef.current);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 50);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [generateCurrentScreenMarkdown, toast]);

  // Copy full summary to clipboard (for review screen)
  const handleCopyFullSummary = useCallback(async () => {
    const markdown = generateFullSummary();
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedMarkdown(markdown);
      setShowCopyPreview(true);
      // Select text after modal renders
      setTimeout(() => {
        if (previewTextRef.current) {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(previewTextRef.current);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 50);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [generateFullSummary, toast]);

  // Tooltip message for "Keep going" button
  const keepGoingTooltip = remaining > 0
    ? `Allocate ${formatCurrency(remaining)} more to continue`
    : remaining < 0
      ? `Over-allocated by ${formatCurrency(Math.abs(remaining))}`
      : '';

  // Check if there are any allocations for the current screen
  const hasCurrentScreenAllocations = step === 'savings'
    ? Object.values(savingsAllocations).some(v => v > 0)
    : Object.values(monthlyAllocations).some(v => v > 0);
  const hasAnyAllocations =
    Object.values(savingsAllocations).some(v => v > 0) ||
    Object.values(monthlyAllocations).some(v => v > 0);
  const canCopy = step === 'review' ? hasAnyAllocations : hasCurrentScreenAllocations;

  // Header actions for hypothesize mode (copy button in header)
  const headerActions = activeMode === 'hypothesize' ? (
    <button
      onClick={step === 'review' ? handleCopyFullSummary : handleCopyCurrentScreen}
      disabled={!canCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        canCopy
          ? 'text-monarch-text-muted hover:text-monarch-text-dark hover:bg-monarch-bg-hover'
          : 'text-monarch-text-muted/50 cursor-not-allowed'
      }`}
      aria-label="Copy to clipboard"
    >
      <Icons.Upload size={16} />
      Copy
    </button>
  ) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="lg" headerActions={headerActions}>
      <div ref={modalRef} className={`flex flex-col min-h-0 flex-1 ${shouldShake ? 'animate-error-shake' : ''}`}>
        {/* Step indicator - only show in distribute activeMode */}
        {activeMode === 'distribute' && (
          <div className="px-4 pt-4">
            <StepIndicator
              steps={hasSavingsStep ? DISTRIBUTE_STEPS : DISTRIBUTE_STEPS.slice(1)}
              currentStep={getCurrentStepIndex()}
            />
          </div>
        )}

        {/* Step title and description - above the amount */}
        <div className="px-4 pb-2 text-center">
          <h3 className="text-base font-semibold text-monarch-text-dark mb-1">{getStepTitle()}</h3>
          <p className="text-xs text-monarch-text-muted">{getStepDescription()}</p>
        </div>

        {step !== 'review' && (
          <DistributeScreen
            mode={activeMode}
            screenType={step}
            totalAmount={stepAmount}
            {...(activeMode === 'distribute' && step === 'savings' && { maxAmount: existingSavings })}
            isTotalEditable={activeMode === 'hypothesize'}
            onTotalChange={handleTotalChange}
            allocations={currentAllocations}
            onAllocationChange={handleAllocationChange}
            items={items}
            onReset={handleReset}
            leftToBudget={leftToBudget}
            {...(step === 'monthly' && { rolloverAllocations: savingsAllocations })}
            showForecast={step === 'monthly'}
            availableAmount={availableAmount}
            {...(step === 'monthly' && {
              onRefreshLeftToBudget: handleRefreshLeftToBudget,
              isRefreshingLeftToBudget,
            })}
            {...(activeMode === 'distribute' && { onEditAttempt: handleEditAttempt })}
            isDistributeMode={activeMode === 'distribute'}
          />
        )}

        {step === 'review' && (
          <DistributeReviewScreen
            savingsAllocations={savingsAllocations}
            monthlyAllocations={monthlyAllocations}
            items={items}
          />
        )}

        {/* Footer buttons */}
        <div className="flex items-center justify-between p-4 border-t border-monarch-border">
          {/* Left side: Back button */}
          <div>
            {((step === 'monthly' && hasSavingsStep) || step === 'review') && (
              <button
                onClick={handleBackStep}
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-monarch-text-muted hover:bg-monarch-bg-hover"
              >
                ← Go Back
              </button>
            )}
          </div>

          {/* Right side: Cancel/Close and Next/Confirm */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-monarch-text-muted hover:bg-monarch-bg-hover"
            >
              {activeMode === 'hypothesize' && step === 'monthly' ? 'Close' : 'Cancel'}
            </button>

            {/* Savings step: Next button with status */}
            {step === 'savings' && (
              actionButton.needsTooltip ? (
                <Tooltip content={keepGoingTooltip}>
                  <button
                    disabled={!isStepComplete}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed flex items-center gap-2 ${actionButton.colorClass}`}
                  >
                    {actionButton.icon}
                    {actionButton.content}
                  </button>
                </Tooltip>
              ) : (
                <button
                  onClick={handleNextStep}
                  disabled={!isStepComplete}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed flex items-center gap-2 ${actionButton.colorClass}`}
                >
                  {actionButton.icon}
                  {actionButton.content}
                </button>
              )
            )}

            {/* Monthly step: Review Changes button (distribute activeMode only) */}
            {step === 'monthly' && activeMode === 'distribute' && (
              actionButton.needsTooltip ? (
                <Tooltip content={keepGoingTooltip}>
                  <button
                    disabled={!canGoToReview}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed flex items-center gap-2 ${actionButton.colorClass}`}
                  >
                    {actionButton.icon}
                    {actionButton.content}
                  </button>
                </Tooltip>
              ) : (
                <button
                  onClick={handleGoToReview}
                  disabled={!canGoToReview}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed flex items-center gap-2 ${actionButton.colorClass}`}
                >
                  {actionButton.icon}
                  {actionButton.content}
                </button>
              )
            )}

            {/* Monthly step: Review button (hypothesize mode) */}
            {step === 'monthly' && activeMode === 'hypothesize' && (
              <button
                onClick={handleGoToReview}
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors bg-monarch-orange text-white hover:bg-monarch-orange/90"
              >
                Review
              </button>
            )}

            {/* Review step: Apply button (distribute mode only) */}
            {step === 'review' && activeMode === 'distribute' && (
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed bg-monarch-orange text-white hover:bg-monarch-orange/90"
              >
                {isSubmitting ? (
                  <>
                    <Icons.Spinner size={16} className="animate-spin inline mr-2" />
                    Applying...
                  </>
                ) : (
                  'Apply'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Warning dialog for edit attempt in distribute mode */}
      {showEditWarning && (
        <div
          className="fixed inset-0 z-toast flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowEditWarning(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowEditWarning(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-warning-title"
        >
          <div
            className="bg-monarch-bg-card rounded-xl p-5 max-w-sm w-full shadow-xl border border-monarch-border"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-monarch-warning/15">
                <Icons.Lock size={24} className="text-monarch-warning" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center mb-5">
              <h3
                id="edit-warning-title"
                className="text-base font-semibold text-monarch-text-dark mb-2"
              >
                Cannot Edit This Amount
              </h3>
              <p className="text-sm text-monarch-text-muted">
                This value reflects your "Left to Budget" in Monarch. To change it, adjust your
                budget allocations in Monarch first.
              </p>
              <p className="text-sm text-monarch-text-muted mt-2">
                Want to play with theoretical numbers? Use Hypothetical mode instead.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSwitchToHypothetical}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-monarch-orange text-white hover:bg-monarch-orange/90 transition-colors"
              >
                <Icons.FlaskConical size={16} />
                Enter Hypothetical Mode
              </button>
              <button
                onClick={() => {
                  globalThis.open('https://app.monarchmoney.com/plan', '_blank');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-monarch-bg-page text-monarch-text-dark border border-monarch-border hover:bg-monarch-bg-hover transition-colors"
              >
                <Icons.ExternalLink size={16} />
                Open Monarch Budget
              </button>
              <button
                onClick={() => setShowEditWarning(false)}
                className="w-full px-4 py-2 text-sm font-medium text-monarch-text-muted hover:bg-monarch-bg-hover rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy preview modal */}
      {showCopyPreview && (
        <div
          className="fixed inset-0 z-toast flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowCopyPreview(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowCopyPreview(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="copy-preview-title"
        >
          <div
            className="bg-monarch-bg-card rounded-xl max-w-lg w-full shadow-xl border border-monarch-border max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-monarch-border">
              <div className="flex items-center gap-2">
                <Icons.Check size={18} className="text-monarch-success" />
                <h3
                  id="copy-preview-title"
                  className="text-base font-semibold text-monarch-text-dark"
                >
                  Copied to Clipboard
                </h3>
              </div>
              <button
                onClick={() => setShowCopyPreview(false)}
                className="p-1 rounded text-monarch-text-muted hover:text-monarch-text-dark hover:bg-monarch-bg-hover transition-colors"
                aria-label="Close"
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              <pre
                ref={previewTextRef}
                className="text-xs font-mono whitespace-pre-wrap text-monarch-text-dark bg-monarch-bg-page p-4 rounded-lg border border-monarch-border select-all"
              >
                {copiedMarkdown}
              </pre>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-monarch-border">
              <button
                onClick={() => setShowCopyPreview(false)}
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors text-monarch-text-muted hover:bg-monarch-bg-hover"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
