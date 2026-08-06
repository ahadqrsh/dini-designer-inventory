import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullScreenLoader from '../components/FullScreenLoader';
import { LOGIN_PATH } from './paths';

const WORKER_FALLBACK = '/my-tasks';

export function ProtectedRoute({ allowedRoles }) {
  const { role, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!user) {
    return <Navigate to={LOGIN_PATH} replace />;
  }

  // Normalize role to handle lowercase casing
  const userRole = role ? role.toLowerCase() : '';
  const normalizedAllowedRoles = allowedRoles ? allowedRoles.map(r => r.toLowerCase()) : [];

  if (allowedRoles && !normalizedAllowedRoles.includes(userRole)) {
    // A role that isn't in the worker list either (e.g. a custom role) would
    // bounce from /my-tasks straight back to /my-tasks forever. Break the loop.
    if (location.pathname === WORKER_FALLBACK) {
      return <Navigate to="/unauthorized" replace />;
    }

    // If worker tries to visit an admin route, send them to /my-tasks
    return <Navigate to={WORKER_FALLBACK} replace />;
  }

  return <Outlet />;
}
