
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

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (sessionError) {
    return (
      <main className="min-h-screen grid place-items-center p-6 bg-slate-50">
        <div role="alert" className="max-w-md w-full bg-white p-6 rounded-2xl shadow-lg border border-slate-200 text-center">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">!</div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Session verification unavailable</h1>
          <p className="text-sm text-slate-600 mb-6">{sessionError}</p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              className="rounded-xl bg-[#3B945E] hover:bg-[#2e744a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition"
              onClick={refreshUserProfile}
            >
              Retry
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-300 hover:bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition"
              onClick={() => {
                localStorage.removeItem('user');
                window.location.href = '/login';
              }}
            >
              Sign In Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return children;
};

export default ProtectedRoute;
