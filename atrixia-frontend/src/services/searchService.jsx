// src/services/searchService.js
import { publicApi } from './api';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://atrixia.onrender.com/api';

export const searchService = {
  // Get available marketplaces (public endpoint)
  getMarketplaces: async () => {
    try {
      const response = await publicApi.get('/search/marketplaces');
      // Backend returns { success: true, data: [...] }
      // Map to consistent format
      if (response.data?.data) {
        return {
          success: true,
          data: response.data.data.map(m => ({
            id: m.id,
            label: m.label,
            region: m.region,
            description: m.description,
          }))
        };
      }
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to fetch marketplaces'
      };
    }
  },

  // Create search with SSE streaming (authenticated)
  createSearchStream: (query, marketplaces, context, callbacks) => {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      callbacks.onError?.('Authentication required. Please sign in.');
      return { abort: () => {} };
    }
    
    const abortController = new AbortController();
    
    fetch(`${BASE_URL}/search?stream=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        query,
        marketplaces,
        context
      }),
      signal: abortController.signal
    })
    .then(async response => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Search failed (${response.status})`);
      }
      
      if (!response.body) {
        throw new Error('Response body is not readable');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'progress':
                  callbacks.onProgress?.(data);
                  break;
                case 'product':
                  callbacks.onProductFound?.(data);
                  break;
                case 'report_update':
                  callbacks.onReportUpdate?.(data);
                  break;
                case 'complete':
                  callbacks.onComplete?.(data);
                  break;
                case 'result':
                  // Non-streaming result
                  callbacks.onComplete?.(data);
                  break;
                case 'error':
                  callbacks.onError?.(data.message || 'Search error');
                  break;
                default:
                  console.log('[Search] Unhandled event type:', data.type, data);
              }
            } catch (e) {
              console.warn('[Search] Failed to parse SSE data:', line, e);
            }
          }
        }
      }
    })
    .catch(error => {
      if (error.name !== 'AbortError') {
        callbacks.onError?.(error.message || 'Search failed');
      }
    });
    
    return abortController;
  },

  // Get search history (authenticated)
  getHistory: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${BASE_URL}/search/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      
      if (!response.ok) {
        throw new Error(`Failed to fetch history (${response.status})`);
      }

      console.log(response)
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch history'
      };
    }
  },

  // Get specific search (authenticated)
  getSearch: async (searchId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${BASE_URL}/search/${searchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Search not found (${response.status})`);
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Search not found'
      };
    }
  }
};