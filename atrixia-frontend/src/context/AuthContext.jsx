// context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const profileResult = await authService.getUserProfile();
          if (profileResult.success) {
            setUser(profileResult.data);
            setIsAuthenticated(true);
          } else {
            // Token might be expired
            localStorage.removeItem('accessToken');
          }
        }
      } catch (error) {
        console.error('[AuthContext] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const result = await authService.signin({ email, password });
    
    if (result.success && result.data?.user) {
      setUser(result.data.user);
      setIsAuthenticated(true);
    }
    
    return result;
  };

  const signup = async (userData) => {
    const result = await authService.signup(userData);
    return result;
  };

  const verifyEmail = async (email, code) => {
    return await authService.verifyEmail({ email, code });
  };

  const resendCode = async (email) => {
    return await authService.resendCode(email);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('accessToken');
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    verifyEmail,
    resendCode,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;