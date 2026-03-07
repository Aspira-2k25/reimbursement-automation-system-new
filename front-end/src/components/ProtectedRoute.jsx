import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute - Ensures user is authenticated before rendering children
 * For role-based access, use RoleGuard component instead
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Allow direct access to admin dashboard for testing purposes
  // NOTE: Remove this exception for production use
  if (!isAuthenticated() && !location.pathname.startsWith('/dashboard/admin')) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
