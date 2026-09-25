import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { ForbiddenPage } from '../pages/error/ForbiddenPage';
import { LoadingState } from '../components/ui/LoadingState';

interface RoleGuardProps {
  children: React.ReactElement;
  allowedRoles: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { actualRole, effectiveRole, profile, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <LoadingState type="spinner" message="Memvalidasi hak akses role..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 1. Authoritative check: If actual database role is in allowedRoles, always allow!
  // This ensures ADMIN can always open admin routes even when previewing another role.
  const isActualAllowed = actualRole ? allowedRoles.includes(actualRole) : false;

  // 2. Preview check: If user has preview permission for the current effectiveRole or target allowedRoles
  const isPreviewAllowed = Boolean(
    effectiveRole &&
      allowedRoles.includes(effectiveRole) &&
      (actualRole === 'ADMIN' || profile?.preview_roles?.some((pr) => allowedRoles.includes(pr)))
  );

  const canAccess = isActualAllowed || isPreviewAllowed;

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return children;
};
