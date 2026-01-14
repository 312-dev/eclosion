/**
 * Auth Context Hooks
 *
 * Convenience hooks for accessing auth state and actions.
 */

import { useContext } from 'react';
import { AuthContext } from './AuthContext';
import type { AuthContextValue } from './authTypes';

/**
 * Access auth state and actions.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/** Check if user is authenticated (convenience hook) */
export function useIsAuthenticated(): boolean {
  const { authenticated } = useAuth();
  return authenticated === true;
}

/** Check if auth is still loading */
export function useAuthLoading(): boolean {
  const { loading } = useAuth();
  return loading;
}
