/**
 * useInheritanceWarning Hook
 *
 * Checks if saving a note will affect checkbox states in other months.
 * Two scenarios:
 * 1. Breaking inheritance: Creating a new note for a month that inherits from an earlier month
 * 2. Modifying source: Editing a source note that future months inherit from
 */

import { useState, useCallback } from 'react';
import * as api from '../api/core';
import * as demoApi from '../api/demo';
import { useDemo } from '../context/DemoContext';

export interface InheritanceImpact {
  affectedMonths: string[];
  monthsWithCheckboxStates: Record<string, number>;
  /** Whether this is about modifying a source note (vs breaking inheritance) */
  isSourceNoteEdit?: boolean;
}

interface UseInheritanceWarningParams {
  /** Whether the current note is inherited from an earlier month */
  isInherited: boolean;
  /** Whether there's an existing note for this exact month (source note) */
  hasExistingNote?: boolean;
  /** Category type (for category/group notes) */
  categoryType?: 'group' | 'category';
  /** Category ID (for category/group notes) */
  categoryId?: string;
  /** Current month key */
  monthKey: string;
  /** Whether this is a general note */
  isGeneral?: boolean;
}

interface UseInheritanceWarningResult {
  /** Whether the warning is currently shown */
  showWarning: boolean;
  /** Impact data when warning is shown */
  impact: InheritanceImpact | null;
  /** Whether checking is in progress */
  isChecking: boolean;
  /**
   * Check inheritance impact before saving.
   * Returns true if OK to proceed, false if warning is shown.
   */
  checkBeforeSave: () => Promise<boolean>;
  /** Confirm and proceed with save despite warning */
  confirmSave: () => void;
  /** Cancel and dismiss warning */
  cancelWarning: () => void;
}

/**
 * Get the next month from a month key (YYYY-MM format)
 */
function getNextMonth(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number.parseInt(yearStr ?? '2026', 10);
  const month = Number.parseInt(monthStr ?? '1', 10);

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

export function useInheritanceWarning({
  isInherited,
  hasExistingNote = false,
  categoryType,
  categoryId,
  monthKey,
  isGeneral = false,
}: UseInheritanceWarningParams): UseInheritanceWarningResult {
  const isDemo = useDemo();
  const [showWarning, setShowWarning] = useState(false);
  const [impact, setImpact] = useState<InheritanceImpact | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<(() => void) | null>(null);

  const checkBeforeSave = useCallback(async (): Promise<boolean> => {
    // Determine which check to perform:
    // 1. If inherited: check if breaking inheritance affects checkbox states
    // 2. If not inherited but has existing note: check if modifying source affects future months
    const shouldCheckInherited = isInherited;
    const shouldCheckSourceEdit = !isInherited && hasExistingNote;

    if (!shouldCheckInherited && !shouldCheckSourceEdit) {
      return true; // No check needed (creating new note with no inheritance impact)
    }

    setIsChecking(true);
    try {
      const getImpact = isDemo ? demoApi.getInheritanceImpact : api.getInheritanceImpact;

      // For source note edits, check the NEXT month to find impact on inheriting months
      const checkMonthKey = shouldCheckSourceEdit ? getNextMonth(monthKey) : monthKey;

      // Build params conditionally to satisfy exactOptionalPropertyTypes
      let result;
      if (isGeneral) {
        result = await getImpact({ monthKey: checkMonthKey, isGeneral: true });
      } else if (categoryType && categoryId) {
        result = await getImpact({ categoryType, categoryId, monthKey: checkMonthKey });
      } else {
        // Missing required params for non-general notes
        return true;
      }

      const totalCheckboxes = Object.values(result.monthsWithCheckboxStates).reduce(
        (sum, count) => sum + count,
        0
      );

      if (totalCheckboxes > 0) {
        setImpact({
          affectedMonths: result.affectedMonths,
          monthsWithCheckboxStates: result.monthsWithCheckboxStates,
          isSourceNoteEdit: shouldCheckSourceEdit,
        });
        setShowWarning(true);
        return false; // Don't proceed - show warning first
      }

      return true; // OK to proceed
    } catch (err) {
      console.error('Failed to check inheritance impact:', err);
      return true; // On error, allow save
    } finally {
      setIsChecking(false);
    }
  }, [isInherited, hasExistingNote, isDemo, categoryType, categoryId, monthKey, isGeneral]);

  const confirmSave = useCallback(() => {
    setShowWarning(false);
    setImpact(null);
    pendingConfirm?.();
    setPendingConfirm(null);
  }, [pendingConfirm]);

  const cancelWarning = useCallback(() => {
    setShowWarning(false);
    setImpact(null);
    setPendingConfirm(null);
  }, []);

  return {
    showWarning,
    impact,
    isChecking,
    checkBeforeSave,
    confirmSave,
    cancelWarning,
  };
}
