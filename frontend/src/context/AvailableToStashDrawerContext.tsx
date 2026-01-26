/**
 * AvailableToStashDrawerContext
 *
 * Manages the global state of the Available Funds drawer.
 * Allows components (like budget inputs) to temporarily open the drawer.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AvailableToStashDrawerContextValue {
  /** Whether the drawer is expanded */
  isExpanded: boolean;
  /** Toggle the drawer state */
  toggle: () => void;
  /** Temporarily open the drawer (e.g., when budget input is focused) */
  temporarilyOpen: () => void;
  /** Close temporary expansion */
  closeTemporary: () => void;
}

const AvailableToStashDrawerContext = createContext<AvailableToStashDrawerContextValue | undefined>(
  undefined
);

interface ProviderProps {
  readonly children: ReactNode;
}

export function AvailableToStashDrawerProvider({ children }: ProviderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTemporary, setIsTemporary] = useState(false);

  const toggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
    setIsTemporary(false); // Clear temporary state on manual toggle
  }, []);

  const temporarilyOpen = useCallback(() => {
    if (!isExpanded) {
      setIsExpanded(true);
      setIsTemporary(true);
    }
  }, [isExpanded]);

  const closeTemporary = useCallback(() => {
    if (isTemporary) {
      setIsExpanded(false);
      setIsTemporary(false);
    }
  }, [isTemporary]);

  return (
    <AvailableToStashDrawerContext.Provider
      value={{
        isExpanded,
        toggle,
        temporarilyOpen,
        closeTemporary,
      }}
    >
      {children}
    </AvailableToStashDrawerContext.Provider>
  );
}

export function useAvailableToStashDrawer() {
  const context = useContext(AvailableToStashDrawerContext);
  if (!context) {
    throw new Error('useAvailableToStashDrawer must be used within AvailableToStashDrawerProvider');
  }
  return context;
}

/**
 * Optional version of the hook that returns undefined if not in a provider context.
 * Use this in components that may or may not be wrapped in the drawer provider.
 */
export function useAvailableToStashDrawerOptional() {
  return useContext(AvailableToStashDrawerContext);
}
