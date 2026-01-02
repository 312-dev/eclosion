/**
 * Login Page
 *
 * Wrapper for LoginForm that handles navigation after successful login.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../components/LoginForm';
import { useEffect } from 'react';
import { usePageTitle } from '../hooks';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authenticated } = useAuth();

  // Get the intended destination (if redirected from protected route)
  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  // Set page title (no user name on login page)
  usePageTitle('Login');

  // Redirect if already authenticated
  useEffect(() => {
    if (authenticated === true) {
      navigate(from, { replace: true });
    }
  }, [authenticated, navigate, from]);

  const handleSuccess = () => {
    // Navigate to passphrase setup after successful login
    // The LoginForm handles setting up the passphrase internally,
    // so we navigate to the intended destination
    navigate(from, { replace: true });
  };

  return <LoginForm onSuccess={handleSuccess} />;
}
