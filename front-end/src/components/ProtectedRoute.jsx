
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute - Ensures user is authenticated before rendering children
 * For role-based access, use RoleGuard component instead
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, sessionError, refreshUserProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (sessionError) {
    return <main className="min-h-screen grid place-items-center p-6"><div role="alert">
      <h1 className="text-xl font-semibold">Session verification unavailable</h1>
      <p>{sessionError}</p>
      <button type="button" className="mt-4 rounded bg-green-700 px-4 py-2 text-white" onClick={refreshUserProfile}>Retry</button>
    </div></main>;
  }
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
