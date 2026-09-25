import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/ui/LoadingState';

export const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <LoadingState type="spinner" message="Memeriksa status aplikasi..." />
      </div>
    );
  }

  // Allow guest and authenticated users to proceed into layout
  return children;
};
