import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { ForbiddenPage } from '../pages/error/ForbiddenPage';
import { LoadingState } from '../components/ui/LoadingState';

interface RoleGuardProps {
  children: React.ReactElement;
  allowedRoles: UserRole[];
  allowGuest?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  allowGuest = false,
}) => {
  const { actualRole, effectiveRole, isOwnerAdmin, accessMode, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <LoadingState type="spinner" message="Memvalidasi hak akses..." />
      </div>
    );
  }

  // 1. If route explicitly permits guest access in read-only mode
  if (allowGuest && accessMode === 'GUEST') {
    return children;
  }

  // 2. Owner admin has full access to ADMIN routes
  if (isOwnerAdmin && allowedRoles.includes('ADMIN')) {
    return children;
  }

  // 3. Authenticated user with matching role or role preview
  if (user) {
    const isActualAllowed = actualRole ? allowedRoles.includes(actualRole) : false;
    const isEffectiveAllowed = effectiveRole ? allowedRoles.includes(effectiveRole) : false;

    if (isActualAllowed || isEffectiveAllowed) {
      return children;
    }

    return <ForbiddenPage />;
  }

  // 4. Guest trying to access restricted admin route -> redirect to public dashboard
  return <Navigate to="/dashboard" replace />;
};
