import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * RoleGuard - Ensures user has required role before rendering children
 * Usage: <RoleGuard allowedRoles={['Principal', 'HOD']}><Component /></RoleGuard>
 */
const RoleGuard = ({ allowedRoles, children, fallback = null }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check if user has required role (case-insensitive)
  const userRole = user?.role?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

  if (!normalizedAllowedRoles.includes(userRole)) {
    // User doesn't have required role
    if (fallback) {
      return fallback;
    }
    
    // Redirect to appropriate dashboard based on role
    const roleRedirects = {
      'student': '/student',
      'faculty': '/faculty',
      'coordinator': '/coordinator',
      'hod': '/hod',
      'principal': '/principal',
      'accounts': '/accounts'
    };
    
    const redirectPath = roleRedirects[userRole] || '/';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default RoleGuard;
