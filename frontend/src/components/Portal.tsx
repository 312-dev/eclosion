import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: ReactNode;
}

export function Portal({ children }: PortalProps) {
  // In browser environment, render portal directly
  // This component is only used client-side
  if (typeof document === 'undefined') return null;

  return createPortal(children, document.body);
}
