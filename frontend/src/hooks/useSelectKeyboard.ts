/**
 * useSelectKeyboard Hook
 *
 * Handles keyboard navigation for select/combobox components.
 */

import { useState, useCallback } from 'react';

interface UseSelectKeyboardOptions {
  optionCount: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  onFocusTrigger: () => void;
}

export function useSelectKeyboard({
  optionCount,
  onSelect,
  onClose,
  onFocusTrigger,
}: UseSelectKeyboardOptions) {
  const [activeIndex, setActiveIndex] = useState(-1);

  const resetActiveIndex = useCallback(() => setActiveIndex(-1), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          onFocusTrigger();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1 < optionCount ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : optionCount - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < optionCount) {
            onSelect(activeIndex);
          }
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(optionCount - 1);
          break;
      }
    },
    [optionCount, activeIndex, onSelect, onClose, onFocusTrigger]
  );

  return {
    activeIndex,
    setActiveIndex,
    resetActiveIndex,
    handleKeyDown,
  };
}
