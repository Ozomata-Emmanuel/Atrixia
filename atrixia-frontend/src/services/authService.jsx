// src/services/authService.js
import api, { publicApi } from './api';

let currentUser = null;

export const authService = {
  // --- SIGNUP / REGISTER ---
  signup: async (userData) => {
    try {
      console.log('[AUTH SERVICE] Signup called with:', userData);
      // const response = await publicApi.post('/auth/signup', userData);
      // return response.data;
      
      // Simulated response for development
      return {
        success: true,
        message: 'Verification code sent to your email',
        data: { email: userData.email }
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Signup error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Signup failed'
      };
    }
  },

  // --- VERIFY OTP ---
  verifyOtp: async ({ email, otp }) => {
    try {
      console.log('[AUTH SERVICE] Verify OTP called with:', { email, otp });
      // const response = await publicApi.post('/auth/verify-otp', {
      //   email,
      //   otp: String(otp),
      // });
      // return response.data;
      
      // Simulated response
      return {
        success: true,
        message: 'Email verified successfully'
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Verify OTP error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Verification failed'
      };
    }
  },

  // --- RESEND OTP ---
  resendOtp: async (email) => {
    try {
      console.log('[AUTH SERVICE] Resend OTP called for:', email);
      // const response = await publicApi.post('/auth/resend-otp', { email });
      // return response.data;
      
      return {
        success: true,
        message: 'New verification code sent'
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Resend OTP error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to resend code'
      };
    }
  },

  // --- SIGNIN / LOGIN ---
  signin: async (credentials) => {
    try {
      console.log('[AUTH SERVICE] Signin called with:', credentials);
      // const response = await api.post('/auth/signin', credentials);
      // if (response.data.success) {
      //   currentUser = response.data?.data?.user || null;
      // }
      // return response.data;
      
      // Simulated response
      const user = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: credentials.email,
        fullName: 'John Doe',
        emailVerified: true,
        preferences: null
      };
      currentUser = user;
      
      return {
        success: true,
        message: 'Login successful',
        data: { user }
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Signin error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  },

  // --- REFRESH TOKEN ---
  refreshToken: async () => {
    try {
      console.log('[AUTH SERVICE] Refreshing token...');
      // const response = await publicApi.post('/auth/refresh-token');
      // return response.success;
      return true;
    } catch (error) {
      console.error('[AUTH SERVICE] Refresh token error:', error);
      return false;
    }
  },

  // --- LOGOUT ---
  logout: async () => {
    try {
      console.log('[AUTH SERVICE] Logging out...');
      // await api.post('/auth/logout');
    } catch (e) {
      console.warn('[AUTH SERVICE] Logout request failed:', e);
    }
    currentUser = null;
    return { status: 'success', message: 'Logged out' };
  },

  // --- FORGOT PASSWORD ---
  forgotPassword: async (email) => {
    try {
      console.log('[AUTH SERVICE] Forgot password called for:', email);
      // const response = await publicApi.post('/auth/forgot-password', { email });
      // return response.data;
      
      return {
        success: true,
        message: 'Password reset code sent to your email'
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Forgot password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send reset code'
      };
    }
  },

  // --- RESET PASSWORD ---
  resetPassword: async (email, otp, newPassword) => {
    try {
      console.log('[AUTH SERVICE] Reset password called');
      // const response = await publicApi.post('/auth/reset-password', { 
      //   email: email.trim(), 
      //   otp: String(otp).trim(), 
      //   new_password: newPassword 
      // });
      // return response.data;
      
      return {
        success: true,
        message: 'Password reset successful'
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Reset password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reset password'
      };
    }
  },

  // --- CHANGE PASSWORD (authenticated user) ---
  changePassword: async (oldPassword, newPassword) => {
    try {
      console.log('[AUTH SERVICE] Change password called');
      // const response = await api.post('/auth/change-password', { 
      //   old_password: oldPassword, 
      //   new_password: newPassword 
      // });
      // return response.data;
      
      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Change password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to change password'
      };
    }
  },

  // --- GET CURRENT USER PROFILE ---
  getCurrentUser: async () => {
    if (currentUser) return currentUser;

    try {
      console.log('[AUTH SERVICE] Fetching current user...');
      // const response = await api.get('/auth/me');
      // if (response.data.success) {
      //   currentUser = response.data?.data || response.data;
      //   return currentUser;
      // }
      return null;
    } catch (error) {
      console.error('[AUTH SERVICE] Get current user error:', error);
      return null;
    }
  },

  // --- GET USER PREFERENCES ---
  getUserPreferences: async () => {
    try {
      console.log('[AUTH SERVICE] Fetching user preferences...');
      // const response = await api.get('/preferences');
      // return response.data;
      
      // Simulated response matching the schema
      return {
        success: true,
        data: {
          id: '456e7890-e89b-12d3-a456-426614174000',
          userId: currentUser?.id,
          budgetMin: '500',
          budgetMax: '5000',
          preferredCurrency: 'USD',
          prioritizePrice: true,
          prioritizeQuality: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Get preferences error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch preferences'
      };
    }
  },

  // --- UPDATE USER PREFERENCES ---
  updateUserPreferences: async (preferencesData) => {
    try {
      console.log('[AUTH SERVICE] Updating preferences:', preferencesData);
      // const response = await api.put('/preferences', preferencesData);
      // return response.data;
      
      return {
        success: true,
        message: 'Preferences updated successfully',
        data: preferencesData
      };
    } catch (error) {
      console.error('[AUTH SERVICE] Update preferences error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update preferences'
      };
    }
  },

  // --- SEND AI QUERY (Search) ---
  sendAiQuery: async (query, filters, preferences) => {
    try {
      console.log('[AUTH SERVICE] Sending AI query:', { query, filters, preferences });
      
      const searchData = {
        query,
        filters: [
          ...filters.map(f => ({ name: f.name, value: f.value })),
          // Include constant preferences as filters
          preferences?.budgetMin && preferences?.budgetMax ? {
            name: 'Budget Range',
            value: `${preferences.preferredCurrency} ${preferences.budgetMin} - ${preferences.budgetMax}`
          } : null,
          preferences?.prioritizePrice ? {
            name: 'Priority',
            value: 'Best Price'
          } : null,
          preferences?.prioritizeQuality ? {
            name: 'Priority',
            value: 'Best Quality'
          } : null,
        ].filter(Boolean),
        results: []
      };
      
      // const response = await api.post('/searches', searchData);
      // return response.data;
      
      console.log('[AUTH SERVICE] Search data prepared:', searchData);
      
      return {
        success: true,
        message: 'Query processed',
        data: searchData
      };
    } catch (error) {
      console.error('[AUTH SERVICE] AI Query error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to process query'
      };
    }
  },

  // --- CHECK AUTHENTICATION ---
  isAuthenticated: async () => {
    try {
      const user = await authService.getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  },

  // --- ACCESSORS ---
  getCurrentUserData: () => {
    return currentUser;
  },

  clearUser: () => {
    currentUser = null;
  },

  // --- INITIALIZE AUTH STATE ---
  initializeAuth: async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        return { isAuthenticated: true, user };
      }
      return { isAuthenticated: false, user: null };
    } catch {
      return { isAuthenticated: false, user: null };
    }
  },
};