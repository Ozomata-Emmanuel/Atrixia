// src/services/authService.js
import api, { publicApi } from './api';

export const authService = {
  // --- SIGNUP ---
  signup: async (userData) => {
    try {
      const response = await publicApi.post('/auth/signup', {
        fullName: userData.fullName,
        email: userData.email,
        password: userData.password
      });
      
      // Store email for verification step
      if (response.data?.data?.email) {
        localStorage.setItem('pendingVerificationEmail', response.data.data.email);
      }
      console.log("Full response:",response)
      return response.data;
    } catch (error) {
      console.log("Error response:".error)
      return {
        success: false,
        message: error.response?.data?.error || 'Signup failed'
      };
    }
  },

  // --- VERIFY EMAIL ---
  verifyEmail: async ({ email, code }) => {
    try {
      const response = await publicApi.post('/auth/verify-email', {
        email,
        code: String(code)
      });
      
      localStorage.removeItem('pendingVerificationEmail');
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Verification failed'
      };
    }
  },

  // --- RESEND VERIFICATION CODE ---
  resendCode: async (email) => {
    try {
      const response = await publicApi.post('/auth/resend-code', { email });
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to resend code'
      };
    }
  },

  // --- LOGIN ---
  signin: async (credentials) => {
    try {
      const response = await publicApi.post('/auth/login', {
        email: credentials.email,
        password: credentials.password
      });
      
      if (response.data?.success && response.data?.data) {
        const { token, user } = response.data.data;
        
        // Store token
        if (token) {
          localStorage.setItem('accessToken', token);
        }
        
        // Store user data if needed
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        
        console.log("Full response:",response)
        return response.data;
      }
      console.log(response)
      return response.data;

    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Login failed',
      };
    }
  },

  // --- LOGOUT ---
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout request failed:', e);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('pendingVerificationEmail');
    }
  },

  // --- GET USER PROFILE ---
  getUserProfile: async () => {
    try {
      const response = await api.get('/user/profile');
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to fetch profile'
      };
    }
  },

  // --- GET USER PREFERENCES ---
  getUserPreferences: async () => {
    try {
      const response = await api.get('/user/preferences');
      return response.data; // Returns { currency, budgetMin, budgetMax, prioritizePrice, prioritizeQuality, prioritizeShipping, prioritizeSeller }
    } catch (error) {
      console.error('[AUTH SERVICE] Get preferences error:', error);
      return {
        currency: 'USD',
        budgetMin: 0,
        budgetMax: 500,
        prioritizePrice: true,
        prioritizeQuality: false,
        prioritizeShipping: false,
        prioritizeSeller: false,
      };
    }
  },

  // --- UPDATE USER PREFERENCES (only send changed fields) ---
  updateUserPreferences: async (preferencesData) => {
    try {
      // Only send fields that are actually provided
      const payload = {};
      if (preferencesData.currency !== undefined) payload.currency = preferencesData.currency;
      if (preferencesData.budgetMin !== undefined) payload.budgetMin = preferencesData.budgetMin;
      if (preferencesData.budgetMax !== undefined) payload.budgetMax = preferencesData.budgetMax;
      if (preferencesData.prioritizePrice !== undefined) payload.prioritizePrice = preferencesData.prioritizePrice;
      if (preferencesData.prioritizeQuality !== undefined) payload.prioritizeQuality = preferencesData.prioritizeQuality;
      if (preferencesData.prioritizeShipping !== undefined) payload.prioritizeShipping = preferencesData.prioritizeShipping;
      if (preferencesData.prioritizeSeller !== undefined) payload.prioritizeSeller = preferencesData.prioritizeSeller;
      
      const response = await api.put('/user/preferences', payload);
      console.log('[AUTH SERVICE] Preferences updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('[AUTH SERVICE] Update preferences error:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to update preferences'
      };
    }
  },


  // --- GET CURRENT USER ---
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // --- CHECK AUTH ---
  isAuthenticated: () => {
    return !!localStorage.getItem('accessToken');
  }
};