/**
 * useEditableField Hook
 *
 * Manages inline editable text field state and behavior.
 * Eliminates duplicated editable field logic in RecurringRow and RollupZone.
 *
 * Usage:
 *   const editor = useEditableField({
 *     initialValue: item.name,
 *     onSubmit: async (value) => await updateName(value),
 *   });
 *
 *   {editor.isEditing ? (
 *     <input
 *       ref={editor.inputRef}
 *       value={editor.value}
 *       onChange={(e) => editor.setValue(e.target.value)}
 *       onKeyDown={editor.handleKeyDown}
 *       onBlur={editor.handleSubmit}
 *     />
 *   ) : (
 *     <span onClick={editor.startEditing}>{item.name}</span>
 *   )}
 */

import { useState, useRef, useEffect, useCallback, type RefObject } from 'react';

export interface UseEditableFieldOptions {
  /** Initial value for the field */
  initialValue: string;
  /** Callback when value is submitted */
  onSubmit: (value: string) => Promise<void>;
  /** Minimum length for valid submission */
  minLength?: number;
  /** Whether to trim whitespace */
  trim?: boolean;
}

export interface UseEditableFieldReturn {
  /** Whether the field is in editing mode */
  isEditing: boolean;
  /** Current value of the field */
  value: string;
  /** Set the current value */
  setValue: (value: string) => void;
  /** Ref for the input element */
  inputRef: RefObject<HTMLInputElement | null>;
  /** Start editing mode */
  startEditing: () => void;
  /** Cancel editing and revert to original value */
  cancelEditing: () => void;
  /** Submit the current value */
  handleSubmit: () => Promise<void>;
  /** Handle keyboard events (Enter to submit, Escape to cancel) */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** Whether submission is in progress */
  isSubmitting: boolean;
  /** Whether the current value has changed from initial */
  hasChanged: boolean;
}

/**
 * Hook for managing inline editable text fields.
 *
 * @param options - Configuration options
 * @returns Editable field state and controls
 */
export function useEditableField(options: UseEditableFieldOptions): UseEditableFieldReturn {
  const { initialValue, onSubmit, minLength = 1, trim = true } = options;

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const originalValueRef = useRef(initialValue);

  // Update value when initialValue changes (e.g., after external update)
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue);
      originalValueRef.current = initialValue;
    }
  }, [initialValue, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    originalValueRef.current = value;
    setIsEditing(true);
  }, [value]);

  const cancelEditing = useCallback(() => {
    setValue(originalValueRef.current);
    setIsEditing(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    const finalValue = trim ? value.trim() : value;

    // Validate minimum length
    if (finalValue.length < minLength) {
      cancelEditing();
      return;
    }

    // Skip if value hasn't changed
    if (finalValue === originalValueRef.current) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(finalValue);
      originalValueRef.current = finalValue;
      setIsEditing(false);
    } catch {
      // Revert on error
      setValue(originalValueRef.current);
    } finally {
      setIsSubmitting(false);
    }
  }, [value, trim, minLength, onSubmit, cancelEditing, isSubmitting]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      }
    },
    [handleSubmit, cancelEditing]
  );

  const hasChanged = (trim ? value.trim() : value) !== originalValueRef.current;

  return {
    isEditing,
    value,
    setValue,
    inputRef,
    startEditing,
    cancelEditing,
    handleSubmit,
    handleKeyDown,
    isSubmitting,
    hasChanged,
  };
}
