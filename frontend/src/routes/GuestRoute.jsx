import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullScreenLoader from '../components/FullScreenLoader';
import { panelPathFor } from './paths';

/**
 * Inverse of ProtectedRoute: only signed-out visitors may see these pages.
 * An already-authenticated user who navigates to the login page is sent
 * straight back to their own panel.
 */
export function GuestRoute() {
  const { user, role, loading } = useAuth();

  // `user` arrives before `role` does. Redirecting on a half-resolved session
  // would send an admin to the worker panel, so wait for both.
  if (loading || (user && !role)) {
    return <FullScreenLoader />;
  }

  if (user) {
    return <Navigate to={panelPathFor(role)} replace />;
  }

  return <Outlet />;
}
