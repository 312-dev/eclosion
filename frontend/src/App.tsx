/**
 * App - Root component with routing and providers
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from './components/ui/Tooltip';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { UnlockPage } from './pages/UnlockPage';
import { DashboardTab } from './components/tabs/DashboardTab';
import { RecurringTab } from './components/tabs/RecurringTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { RateLimitError, AuthRequiredError } from './api/client';
import { ErrorPage } from './components/ui/ErrorPage';

const LANDING_PAGE_KEY = 'eclosion-landing-page';

export function getLandingPage(): string {
  const stored = localStorage.getItem(LANDING_PAGE_KEY);
  return stored === 'recurring' ? '/recurring' : '/dashboard';
}

export function setLandingPage(page: 'dashboard' | 'recurring'): void {
  localStorage.setItem(LANDING_PAGE_KEY, page);
}

function DefaultRedirect() {
  return <Navigate to={getLandingPage()} replace />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry on rate limit or auth errors - these won't resolve with retries
      retry: (failureCount, error) => {
        if (error instanceof RateLimitError || error instanceof AuthRequiredError) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes default
    },
    mutations: {
      // Same retry logic for mutations
      retry: (failureCount, error) => {
        if (error instanceof RateLimitError || error instanceof AuthRequiredError) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

/**
 * Inner component that handles auth errors
 * Must be inside AuthProvider to access useAuth
 */
function AppRoutes() {
  const { loading, error, checkAuth } = useAuth();

  // Show error page if auth check failed
  if (!loading && error) {
    return (
      <ErrorPage
        title="Connection Error"
        message={error}
        onRetry={() => {
          checkAuth();
        }}
      />
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unlock" element={<UnlockPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DefaultRedirect />} />
          <Route path="/dashboard" element={<DashboardTab />} />
          <Route path="/recurring" element={<RecurringTab />} />
          <Route path="/settings" element={<SettingsTab />} />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TooltipProvider>
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
