/**
 * useDropdown Hook
 *
 * Manages dropdown state, positioning, and click-outside behavior.
 * Eliminates duplicated dropdown logic across components.
 *
 * Usage:
 *   const dropdown = useDropdown<HTMLDivElement, HTMLButtonElement>();
 *   <button ref={dropdown.triggerRef} onClick={dropdown.toggle}>Open</button>
 *   {dropdown.isOpen && <div ref={dropdown.dropdownRef} style={dropdown.position}>...</div>}
 */

import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';

export interface DropdownPosition {
  top: number;
  left?: number;
  right?: number;
}

export interface UseDropdownOptions {
  /** Alignment of dropdown relative to trigger */
  alignment?: 'left' | 'right';
  /** Offset from trigger element */
  offset?: { x?: number; y?: number };
  /** Initial open state */
  initialOpen?: boolean;
}

export interface UseDropdownReturn<
  T extends HTMLElement = HTMLDivElement,
  B extends HTMLElement = HTMLButtonElement
> {
  /** Whether dropdown is currently open */
  isOpen: boolean;
  /** Set open state directly */
  setIsOpen: (open: boolean) => void;
  /** Toggle open state */
  toggle: () => void;
  /** Open the dropdown */
  open: () => void;
  /** Close the dropdown */
  close: () => void;
  /** Calculated position for the dropdown */
  position: DropdownPosition;
  /** Ref for the dropdown element */
  dropdownRef: RefObject<T | null>;
  /** Ref for the trigger element */
  triggerRef: RefObject<B | null>;
  /** Manually update position */
  updatePosition: () => void;
}

/**
 * Hook for managing dropdown state and positioning.
 *
 * @param options - Configuration options
 * @returns Dropdown state and controls
 */
export function useDropdown<
  T extends HTMLElement = HTMLDivElement,
  B extends HTMLElement = HTMLButtonElement
>(options: UseDropdownOptions = {}): UseDropdownReturn<T, B> {
  const { alignment = 'left', offset = {}, initialOpen = false } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0 });

  const dropdownRef = useRef<T | null>(null);
  const triggerRef = useRef<B | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const offsetX = offset.x ?? 0;
    const offsetY = offset.y ?? 4;

    const newPosition: DropdownPosition = {
      top: rect.bottom + offsetY,
    };

    if (alignment === 'right') {
      newPosition.right = window.innerWidth - rect.right + offsetX;
    } else {
      newPosition.left = rect.left + offsetX;
    }

    setPosition(newPosition);
  }, [alignment, offset.x, offset.y]);

  const toggle = useCallback(() => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  }, [isOpen, updatePosition]);

  const open = useCallback(() => {
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const isOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node);
      const isOutsideTrigger =
        triggerRef.current && !triggerRef.current.contains(event.target as Node);

      if (isOutsideDropdown && isOutsideTrigger) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  return {
    isOpen,
    setIsOpen,
    toggle,
    open,
    close,
    position,
    dropdownRef,
    triggerRef,
    updatePosition,
  };
}
