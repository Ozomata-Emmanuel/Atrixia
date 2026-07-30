// components/PublicRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f8f8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#009FB8] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#666666]">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, redirect to /ai
  if (isAuthenticated) {
    return <Navigate to="/ai" replace />;
  }

  return children;
};

export default PublicRoute;