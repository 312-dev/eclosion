/**
 * IdeaInputContext
 *
 * Coordinates the idea text input between IdeasBoard (hero) and CustomProblemCard (frustration section).
 * When the bottom input becomes visible, the top input fades out and transfers any content.
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface IdeaInputContextValue {
  /** Whether the bottom input (CustomProblemCard) is visible */
  isBottomInputVisible: boolean;
  /** Signal that the bottom input is now visible */
  setBottomInputVisible: (visible: boolean) => void;
  /** Content to transfer from top input to bottom input */
  transferredContent: string;
  /** Set content to be transferred (called by top input before hiding) */
  setTransferredContent: (content: string) => void;
  /** Clear the transferred content (called by bottom input after receiving) */
  clearTransferredContent: () => void;
}

const IdeaInputContext = createContext<IdeaInputContextValue | null>(null);

interface IdeaInputProviderProps {
  readonly children: React.ReactNode;
}

export function IdeaInputProvider({ children }: IdeaInputProviderProps) {
  const [isBottomInputVisible, setBottomInputVisible] = useState(false);
  const [transferredContent, setTransferredContent] = useState('');

  const clearTransferredContent = useCallback(() => {
    setTransferredContent('');
  }, []);

  const value = useMemo(
    () => ({
      isBottomInputVisible,
      setBottomInputVisible,
      transferredContent,
      setTransferredContent,
      clearTransferredContent,
    }),
    [isBottomInputVisible, transferredContent, clearTransferredContent]
  );

  return <IdeaInputContext.Provider value={value}>{children}</IdeaInputContext.Provider>;
}

export function useIdeaInput(): IdeaInputContextValue {
  const context = useContext(IdeaInputContext);
  if (!context) {
    throw new Error('useIdeaInput must be used within an IdeaInputProvider');
  }
  return context;
}

/**
 * Safe hook that returns null if not within provider.
 * Useful for components that may be used outside the landing page.
 */
export function useIdeaInputSafe(): IdeaInputContextValue | null {
  return useContext(IdeaInputContext);
}
