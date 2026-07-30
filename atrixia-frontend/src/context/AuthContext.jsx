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
  const [isLoading, setIsLoading] = useState(true); // Only for initial auth check
  const [isLoginLoading, setIsLoginLoading] = useState(false); // For login/signup operations

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
    setIsLoginLoading(true); // Use separate loading state
    try {
      const response = await authService.signin({ email, password });
      
      if (response.success) {
        const user = authService.getCurrentUser();
        setUser(user);
        setIsAuthenticated(true);
        return { success: true };
      }

      return { 
        success: false, 
        message: response.message || 'Login failed' 
      };
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      return { 
        success: false, 
        message: error.message || 'An unexpected error occurred' 
      };
    } finally {
      setIsLoginLoading(false);
    }
  };

  const signup = async (userData) => {
    setIsLoginLoading(true);
    try {
      const result = await authService.signup(userData);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setIsLoginLoading(false);
    }
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
    isLoading, // Only for initial auth check
    isLoginLoading, // For login/signup operations
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