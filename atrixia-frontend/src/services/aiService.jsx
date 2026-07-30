// src/services/aiService.js

/**
 * AI Search Service
 * 
 * Handles Server-Sent Events (SSE) streaming for AI-powered product search.
 * Includes robust error handling, request cancellation, retry logic,
 * timeout support, and realistic progress simulation.
 * 
 * @module aiService
 * @version 2.0.0
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ============================================================================
// Configuration Constants
// ============================================================================

const CONFIG = {
  // Request timeout in milliseconds (30 seconds)
  REQUEST_TIMEOUT: 30000,
  
  // Maximum number of retry attempts for failed requests
  MAX_RETRIES: 3,
  
  // Base delay for exponential backoff (starts at 1 second)
  RETRY_BASE_DELAY: 1000,
  
  // HTTP status codes that warrant a retry
  RETRYABLE_STATUS_CODES: [500, 502, 503, 504],
  
  // Progress simulation stages with their weight (total = 100)
  PROGRESS_STAGES: [
    { label: 'Initializing search...', weight: 10, minDuration: 200 },
    { label: 'Connecting to marketplaces...', weight: 15, minDuration: 300 },
    { label: 'Fetching products from Jumia...', weight: 20, minDuration: 400 },
    { label: 'Fetching products from Konga...', weight: 15, minDuration: 350 },
    { label: 'Fetching products from eBay...', weight: 10, minDuration: 300 },
    { label: 'Ranking products...', weight: 15, minDuration: 500 },
    { label: 'Generating recommendation report...', weight: 10, minDuration: 400 },
    { label: 'Finalizing results...', weight: 5, minDuration: 300 },
  ],
};

// ============================================================================
// Error Message Mapping
// ============================================================================

/**
 * Maps technical error messages to user-friendly messages.
 * Original errors are logged to console for debugging.
 */
const ERROR_MESSAGES = {
  'Failed to fetch': 'Unable to connect to the server. Please check your internet connection and try again.',
  'NetworkError': 'A network error occurred. Please verify your connection and try again.',
  'AbortError': 'Request was cancelled.',
  'TimeoutError': 'The request took too long to complete. Please try again with more specific filters.',
  'default': 'Something went wrong while processing your request. Please try again.',
};

/**
 * Maps HTTP status codes to user-friendly error messages.
 */
const HTTP_ERROR_MESSAGES = {
  400: 'Invalid search request. Please check your filters and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You don\'t have permission to perform this search.',
  404: 'The search service is currently unavailable. Please try again later.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'The server encountered an error. Our team has been notified.',
  502: 'The service is temporarily unavailable. Please try again in a few minutes.',
  503: 'The service is under maintenance. Please try again shortly.',
  504: 'The server timed out. Please try again with more specific filters.',
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Returns a user-friendly error message for a given error or status code.
 * Falls back to the error's message or a default message.
 * 
 * @param {Error|number} error - The error object or HTTP status code
 * @returns {string} User-friendly error message
 */
function getUserFriendlyError(error) {
  // Handle numeric status codes
  if (typeof error === 'number') {
    return HTTP_ERROR_MESSAGES[error] || `Server error (${error}). Please try again.`;
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message || '';
    
    // Check for known error messages
    for (const [key, friendlyMessage] of Object.entries(ERROR_MESSAGES)) {
      if (message.includes(key)) {
        return friendlyMessage;
      }
    }
    
    // Check if message looks like an HTTP error status
    const httpMatch = message.match(/status:\s*(\d+)/i);
    if (httpMatch) {
      const status = parseInt(httpMatch[1], 10);
      return HTTP_ERROR_MESSAGES[status] || message;
    }
    
    return message || ERROR_MESSAGES.default;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || error;
  }
  
  return ERROR_MESSAGES.default;
}

/**
 * Delays execution for a specified number of milliseconds.
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculates exponential backoff delay for retries.
 * 
 * @param {number} attempt - Current attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
function getRetryDelay(attempt) {
  // Exponential backoff: 1s, 2s, 4s with some jitter
  const baseDelay = CONFIG.RETRY_BASE_DELAY * Math.pow(2, attempt);
  const jitter = Math.random() * 500; // Add up to 500ms jitter
  return baseDelay + jitter;
}

// ============================================================================
// SSE Parser
// ============================================================================

/**
 * Parses Server-Sent Events from a text buffer according to the SSE specification.
 * Handles multi-line data fields, blank line separators, and partial chunks.
 * 
 * Specification: https://html.spec.whatwg.org/multipage/server-sent-events.html
 */
class SSEParser {
  constructor() {
    /** @type {string} Buffer for accumulating partial chunks */
    this._buffer = '';
    /** @type {string} Accumulates data fields for the current event */
    this._dataBuffer = '';
    /** @type {string} Current event type */
    this._eventType = '';
  }

  /**
   * Feeds a new chunk of text into the parser and returns any complete events.
   * 
   * @param {string} chunk - New text chunk to parse
   * @returns {Array<{type: string, data: string}>} Array of parsed events
   */
  parse(chunk) {
    this._buffer += chunk;
    const events = [];
    
    // Process complete events (separated by double newlines)
    let blankLineIndex;
    while ((blankLineIndex = this._buffer.indexOf('\n\n')) !== -1) {
      // Extract the complete event block
      const eventBlock = this._buffer.substring(0, blankLineIndex);
      this._buffer = this._buffer.substring(blankLineIndex + 2);
      
      // Reset per-event accumulators
      this._dataBuffer = '';
      this._eventType = '';
      
      // Process each line in the event block
      const lines = eventBlock.split('\n');
      for (const line of lines) {
        this._processLine(line);
      }
      
      // If we accumulated data, emit an event
      if (this._dataBuffer) {
        events.push({
          type: this._eventType || 'message',
          data: this._dataBuffer,
        });
      }
    }
    
    return events;
  }

  /**
   * Processes a single line from an event block.
   * Handles comments, field parsing, and multi-line data accumulation.
   * 
   * @param {string} line - A single line from an event block
   * @private
   */
  _processLine(line) {
    // Ignore comments (lines starting with colon)
    if (line.startsWith(':')) {
      return;
    }
    
    // Parse field:value pairs
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      // Line without colon - treat entire line as field name with empty value
      const field = line;
      if (field === 'data') {
        this._dataBuffer += '\n';
      }
      return;
    }
    
    const field = line.substring(0, colonIndex);
    let value = line.substring(colonIndex + 1);
    
    // Remove leading space from value if present
    if (value.startsWith(' ')) {
      value = value.substring(1);
    }
    
    switch (field) {
      case 'data':
        // Append data with newline separator for multi-line data
        if (this._dataBuffer) {
          this._dataBuffer += '\n';
        }
        this._dataBuffer += value;
        break;
        
      case 'event':
        this._eventType = value;
        break;
        
      case 'id':
        // Store last event ID if needed for reconnection
        this._lastEventId = value;
        break;
        
      case 'retry':
        // Server-specified reconnection time
        const retryMs = parseInt(value, 10);
        if (!isNaN(retryMs)) {
          this._retryTime = retryMs;
        }
        break;
        
      default:
        // Ignore unknown fields per spec
        break;
    }
  }

  /**
   * Resets the parser state.
   */
  reset() {
    this._buffer = '';
    this._dataBuffer = '';
    this._eventType = '';
    this._lastEventId = undefined;
    this._retryTime = undefined;
  }
}

// ============================================================================
// Payload Validator
// ============================================================================

/**
 * Validates streamed event payloads to ensure required fields exist.
 * Prevents malformed events from crashing the application.
 */
const PayloadValidator = {
  /**
   * Validates a progress event payload.
   * 
   * @param {Object} data - The parsed event data
   * @returns {boolean} True if valid
   */
  validateProgress(data) {
    return data !== null && 
           typeof data === 'object' && 
           typeof data.progress === 'number' &&
           data.progress >= 0 && 
           data.progress <= 100;
  },

  /**
   * Validates a product event payload.
   * 
   * @param {Object} data - The parsed event data
   * @returns {boolean} True if valid
   */
  validateProduct(data) {
    return data !== null &&
           typeof data === 'object' &&
           data.product !== null &&
           typeof data.product === 'object' &&
           typeof data.product.id === 'string' &&
           typeof data.product.title === 'string';
  },

  /**
   * Validates a report update event payload.
   * 
   * @param {Object} data - The parsed event data
   * @returns {boolean} True if valid
   */
  validateReportUpdate(data) {
    return data !== null &&
           typeof data === 'object' &&
           data.report !== null &&
           typeof data.report === 'object';
  },

  /**
   * Validates a complete event payload.
   * 
   * @param {Object} data - The parsed event data
   * @returns {boolean} True if valid
   */
  validateComplete(data) {
    return data !== null &&
           typeof data === 'object' &&
           data.report !== null &&
           typeof data.report === 'object';
  },

  /**
   * Validates an error event payload.
   * 
   * @param {Object} data - The parsed event data
   * @returns {boolean} True if valid
   */
  validateError(data) {
    return data !== null &&
           typeof data === 'object' &&
           typeof data.message === 'string';
  },
};

// ============================================================================
// Main AI Service
// ============================================================================

export const aiService = {
  // Track active abort controllers to prevent multiple simultaneous streams
  _activeAbortController: null,
  _activeTimeoutId: null,
  _activeRetryCount: 0,

  /**
   * Cancels any currently active stream.
   * Called automatically when a new stream is started.
   */
  cancelActiveStream() {
    if (this._activeAbortController) {
      this._activeAbortController.abort();
      this._activeAbortController = null;
    }
    if (this._activeTimeoutId) {
      clearTimeout(this._activeTimeoutId);
      this._activeTimeoutId = null;
    }
  },

  /**
   * Sends an AI query with SSE streaming support.
   * Supports request cancellation, timeout, retries, and robust error handling.
   * 
   * @param {string} query - The search query string
   * @param {Array<{name: string, value: string}>} filters - Active filters
   * @param {Object} preferences - User preferences (budget, currency, etc.)
   * @param {Object} callbacks - Callback functions for stream events
   * @param {Function} callbacks.onProgress - Called with progress updates
   * @param {Function} callbacks.onProductFound - Called when a product is found
   * @param {Function} callbacks.onReportUpdate - Called with report updates
   * @param {Function} callbacks.onComplete - Called when the stream completes
   * @param {Function} callbacks.onError - Called when an error occurs
   * @returns {Promise<void>}
   */
  streamQuery: async (query, filters, preferences, callbacks) => {
    const {
      onProgress,
      onProductFound,
      onReportUpdate,
      onComplete,
      onError,
    } = callbacks;

    // Cancel any existing stream to prevent multiple simultaneous requests
    this.cancelActiveStream();
    this._activeRetryCount = 0;

    // Build search data payload
    const searchData = buildSearchData(query, filters, preferences);

    // Execute with retry logic
    await executeWithRetry(
      () => executeStream(searchData, callbacks, this),
      CONFIG.MAX_RETRIES,
      this
    ).catch(error => {
      // All retries exhausted or non-retryable error
      const friendlyMessage = getUserFriendlyError(error);
      console.error('[AI Service] Stream error:', error);
      onError?.(friendlyMessage);
    });
  },

  /**
   * Simulates streaming for development and testing.
   * Provides realistic progress stages and mock product data.
   * 
   * @param {string} query - The search query
   * @param {Array} filters - Active filters
   * @param {Object} preferences - User preferences
   * @param {Object} callbacks - Callback functions
   */
  simulateStream: (query, filters, preferences, callbacks) => {
    const { onProgress, onProductFound, onReportUpdate, onComplete, onError } = callbacks;
    
    // Cancel any active real stream
    aiService.cancelActiveStream();
    
    // Track intervals for cleanup
    const intervals = [];
    let isCancelled = false;

    try {
      // Generate simulated report data
      const simulatedReport = getSimulatedReport(query, filters, preferences);
      const totalStages = CONFIG.PROGRESS_STAGES.length;
      let cumulativeProgress = 0;

      /**
       * Processes a single progress stage and schedules the next one.
       * 
       * @param {number} stageIndex - Current stage index
       */
      function processStage(stageIndex) {
        if (isCancelled) return;
        
        if (stageIndex >= totalStages) {
          // All stages complete - ensure 100% is reported
          onProgress?.({
            progress: 100,
            message: 'Decision report compiled successfully.',
            marketplacesSearched: ['Jumia', 'Konga', 'eBay', 'Jiji'],
            totalProductsFound: simulatedReport.metadata?.totalProductsFound || 24,
          });
          
          // Begin streaming products
          streamProducts(simulatedReport);
          return;
        }

        const stage = CONFIG.PROGRESS_STAGES[stageIndex];
        const startProgress = cumulativeProgress;
        const endProgress = Math.min(cumulativeProgress + stage.weight, 100);
        cumulativeProgress = endProgress;

        // Calculate sub-steps for smooth progress within this stage
        const subSteps = 4;
        const stepIncrement = (endProgress - startProgress) / subSteps;
        const stepDuration = Math.max(stage.minDuration / subSteps, 50);
        let currentStep = 0;

        const stageInterval = setInterval(() => {
          if (isCancelled) {
            clearInterval(stageInterval);
            return;
          }

          currentStep++;
          
          if (currentStep >= subSteps) {
            clearInterval(stageInterval);
            
            // Report final progress for this stage
            onProgress?.({
              progress: Math.round(endProgress),
              message: stage.label,
              marketplacesSearched: getMarketplacesForStage(stageIndex),
              totalProductsFound: Math.floor(endProgress * 0.24),
            });
            
            // Schedule next stage
            setTimeout(() => processStage(stageIndex + 1), 100);
          } else {
            // Report incremental progress
            const currentProgress = startProgress + (stepIncrement * currentStep);
            onProgress?.({
              progress: Math.round(currentProgress),
              message: stage.label,
              marketplacesSearched: getMarketplacesForStage(stageIndex),
              totalProductsFound: Math.floor(currentProgress * 0.24),
            });
          }
        }, stepDuration);

        intervals.push(stageInterval);
      }

      /**
       * Returns marketplaces searched based on the current stage.
       * Provides realistic marketplace discovery progression.
       */
      function getMarketplacesForStage(stageIndex) {
        if (stageIndex <= 1) return ['Jumia'];
        if (stageIndex <= 3) return ['Jumia', 'Konga'];
        if (stageIndex <= 5) return ['Jumia', 'Konga', 'eBay'];
        return ['Jumia', 'Konga', 'eBay', 'Jiji'];
      }

      /**
       * Streams products one by one after progress reaches 100%.
       */
      function streamProducts(report) {
        if (isCancelled) return;
        
        const products = report.report?.rankedProducts || [];
        
        if (products.length === 0) {
          // No products to stream, complete immediately
          setTimeout(() => {
            if (!isCancelled) {
              onComplete?.(report);
            }
          }, 300);
          return;
        }

        let productIndex = 0;
        
        const productInterval = setInterval(() => {
          if (isCancelled) {
            clearInterval(productInterval);
            return;
          }
          
          if (productIndex < products.length) {
            // Stream individual product
            onProductFound?.({
              product: products[productIndex],
              type: 'product',
            });
            productIndex++;
          } else {
            // All products streamed, send completion
            clearInterval(productInterval);
            setTimeout(() => {
              if (!isCancelled) {
                onComplete?.(report);
              }
            }, 300);
          }
        }, 400);

        intervals.push(productInterval);
        setTimeout(() => {
          if (!isCancelled) {
            onComplete?.({
              success: true,
              data: report.report || report,
            });
          }
        }, 300);
      }

      // Add cancellation cleanup
      const originalCancel = aiService.cancelActiveStream.bind(aiService);
      aiService.cancelActiveStream = () => {
        isCancelled = true;
        intervals.forEach(clearInterval);
        originalCancel();
      };

      // Start the progression
      processStage(0);
      
    } catch (error) {
      // Clean up on error
      intervals.forEach(clearInterval);
      console.error('[AI Service] Simulation error:', error);
      onError?.('An error occurred during simulation.');
    }
  },

// Add to aiService:

  /**
   * Non-streaming search fallback.
   * Useful when SSE is not supported or for simpler queries.
   */
  searchQuery: async (query, filters, preferences) => {
    try {
      const token = localStorage.getItem('accessToken');
      const searchData = buildSearchData(query, filters, preferences);
      
      const response = await fetch(`${BASE_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        credentials: 'include',
        body: JSON.stringify(searchData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Search failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[AI Service] Search error:', error);
      throw error;
    }
  },
};

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Builds the search data payload from query, filters, and preferences.
 * 
 * @param {string} query - Search query
 * @param {Array} filters - Active filters
 * @param {Object} preferences - User preferences
 * @returns {Object} Formatted search data
 */
function buildSearchData(query, filters, preferences) {
  // Map filters to backend's expected format
  const marketplaces = (filters || [])
    .filter(f => f.name === 'Marketplace')
    .map(f => f.value.toLowerCase());

  return {
    query,
    // ✅ Match your backend's SearchRequestSchema
    marketplaces: marketplaces.length > 0 ? marketplaces : undefined,
    context: {
      // Include preferences as context
      preferences: preferences ? {
        budgetMin: preferences.budgetMin,
        budgetMax: preferences.budgetMax,
        preferredCurrency: preferences.preferredCurrency,
        prioritizePrice: preferences.prioritizePrice,
        prioritizeQuality: preferences.prioritizeQuality,
      } : undefined,
    },
  };
}

/**
 * Executes the actual SSE stream request with timeout and abort support.
 * 
 * @param {Object} searchData - The search payload
 * @param {Object} callbacks - Event callbacks
 * @param {Object} serviceInstance - Reference to the aiService instance
 * @returns {Promise<void>}
 */
async function executeStream(searchData, callbacks, serviceInstance) {
  const {
    onProgress,
    onProductFound,
    onReportUpdate,
    onComplete,
    onError,
  } = callbacks;

  const abortController = new AbortController();
  serviceInstance._activeAbortController = abortController;

  const timeoutId = setTimeout(() => {
    abortController.abort();
    const timeoutError = new Error('TimeoutError');
    timeoutError.name = 'TimeoutError';
    onError?.(getUserFriendlyError(timeoutError));
  }, CONFIG.REQUEST_TIMEOUT);
  serviceInstance._activeTimeoutId = timeoutId;

  try {
    // Get auth token from localStorage
    const token = localStorage.getItem('accessToken');
    
    // ✅ CORRECTED: Use /search?stream=true instead of /ai/search
    const response = await fetch(`${BASE_URL}/search?stream=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ✅ ADDED: Authorization header required by backend's authenticateToken middleware
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(searchData),
      signal: abortController.signal,
    });

    // Clear timeout since we got a response
    clearTimeout(timeoutId);
    serviceInstance._activeTimeoutId = null;

    // Check for HTTP errors - handle 401 specifically
    if (!response.ok) {
      // Try to parse error from backend (your backend uses AppError format)
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Couldn't parse JSON error response
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      throw error;
    }

    // ... rest of the SSE handling remains the same ...
    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const sseParser = new SSEParser();
    const eventHandlers = createEventHandlers(callbacks);

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const remainingEvents = sseParser.parse('');
        for (const event of remainingEvents) {
          processSSEEvent(event, eventHandlers);
        }
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const events = sseParser.parse(chunk);
      for (const event of events) {
        processSSEEvent(event, eventHandlers);
      }
    }

    try {
      reader.releaseLock();
    } catch (e) {
      // Reader may already be released
    }

  } catch (error) {
    clearTimeout(timeoutId);
    serviceInstance._activeTimeoutId = null;

    if (error.name === 'AbortError') {
      console.log('[AI Service] Request aborted');
      return;
    }

    // Handle 401 - token expired
    if (error.status === 401) {
      onError?.('Your session has expired. Please log in again.');
      // Optionally trigger token refresh or redirect
      return;
    }

    throw error;
  } finally {
    if (serviceInstance._activeAbortController === abortController) {
      serviceInstance._activeAbortController = null;
    }
    if (serviceInstance._activeTimeoutId === timeoutId) {
      clearTimeout(timeoutId);
      serviceInstance._activeTimeoutId = null;
    }
  }
}

/**
 * Creates an event handler map for processing different SSE event types.
 * This replaces the switch statement with a more maintainable pattern.
 * New event types can be added by simply adding entries to this map.
 * 
 * @param {Object} callbacks - The callback functions
 * @returns {Object} Map of event type to handler function
 */
function createEventHandlers(callbacks) {
  const { onProgress, onProductFound, onReportUpdate, onComplete, onError } = callbacks;

  return {
    // Progress updates during search
    progress: (data) => {
      onProgress?.({
        progress: data.progress || 0,
        message: data.message || 'Processing...',
        stage: data.stage,
        marketplacesSearched: data.marketplacesSearched || [],
        totalProductsFound: data.totalProductsFound || 0,
      });
    },

    // Individual product found
    product: (data) => {
      onProductFound?.(data.product || data);
    },

    // New event: products batch
    products: (data) => {
      if (data.products && Array.isArray(data.products)) {
        data.products.forEach(product => {
          onProductFound?.(product);
        });
      }
    },

    // Report updates during generation
    report_update: (data) => {
      onReportUpdate?.(data.report || data);
    },

    // Search complete
    complete: (data) => {
      if (data.report) {
        const validatedReport = validateRankingConsistency(data.report);
        onComplete?.({
          ...data,
          report: validatedReport,
        });
      } else {
        onComplete?.(data);
      }
    },

    // Search result (non-streaming fallback)
    result: (data) => {
      if (data.report) {
        onComplete?.(data);
      }
    },

    // Error event
    error: (data) => {
      const message = typeof data === 'string' ? data : (data.message || data.error || 'Search failed');
      console.error('[AI Service] Server error:', message);
      onError?.(getUserFriendlyError(message));
    },

    // Done event
    done: (data) => {
      console.log('[AI Service] Stream done:', data);
      // Usually the complete handler is called separately
    },

    // Default handler
    default: (data, eventType) => {
      console.log('[AI Service] Unhandled event type:', eventType, data);
    },
  };
}

/**
 * Processes a parsed SSE event using the handler map.
 * Gracefully handles JSON parsing errors and missing handlers.
 * 
 * @param {{type: string, data: string}} event - Parsed SSE event
 * @param {Object} handlers - Event handler map
 */
function processSSEEvent(event, handlers) {
  try {
    // Parse the JSON data from the event
    const data = JSON.parse(event.data);
    
    // Find and execute the appropriate handler
    const handler = handlers[data.type || event.type] || handlers.default;
    
    if (handler === handlers.default) {
      handler(data, data.type || event.type);
    } else {
      handler(data);
    }
  } catch (parseError) {
    console.warn('[AI Service] Failed to parse SSE event data:', event.data, parseError);
    // Non-critical parse error - log and continue
  }
}

/**
 * Executes an async function with retry logic and exponential backoff.
 * Only retries on network errors and specific HTTP status codes.
 * Does not retry aborted requests.
 * 
 * @param {Function} fn - Async function to execute
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {Object} serviceInstance - Reference to aiService
 * @returns {Promise<any>} Result of the function
 */
async function executeWithRetry(fn, maxRetries, serviceInstance) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry aborted requests
      if (error.name === 'AbortError') {
        throw error;
      }
      
      // Check if this error is retryable
      if (attempt < maxRetries && isRetryableError(error)) {
        const retryDelay = getRetryDelay(attempt);
        console.warn(
          `[AI Service] Attempt ${attempt + 1} failed, retrying in ${Math.round(retryDelay)}ms...`,
          error.message
        );
        await delay(retryDelay);
      } else {
        // Max retries exceeded or non-retryable error
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Determines if an error warrants a retry attempt.
 * Retries on network errors and server errors (5xx).
 * Does not retry client errors (4xx) or aborted requests.
 * 
 * @param {Error} error - The error to evaluate
 * @returns {boolean} True if the request should be retried
 */
function isRetryableError(error) {
  // Don't retry aborted requests
  if (error.name === 'AbortError') {
    return false;
  }
  
  // Check for HTTP status codes in the error message
  const statusMatch = error.message?.match(/status:\s*(\d+)/i);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    return CONFIG.RETRYABLE_STATUS_CODES.includes(status);
  }
  
  // Network errors (Failed to fetch, etc.) are retryable
  if (error.message?.includes('Failed to fetch') || 
      error.message?.includes('NetworkError') ||
      error.message?.includes('network')) {
    return true;
  }
  
  // Default: don't retry unknown errors
  return false;
}

/**
 * Validates that product rankings in the report are consistent with scores.
 * Ensures higher-ranked products have higher or equal overall scores.
 * If inconsistencies are found, they are corrected and logged.
 * 
 * @param {Object} report - The report object to validate
 * @returns {Object} The validated (and potentially corrected) report
 */
function validateRankingConsistency(report) {
  if (!report || !report.rankedProducts || !Array.isArray(report.rankedProducts)) {
    return report;
  }

  const products = report.rankedProducts;
  let hasInconsistency = false;

  // Check that each product's overallScore is consistent with its rank
  for (let i = 1; i < products.length; i++) {
    const currentScore = products[i].overallScore;
    const previousScore = products[i - 1].overallScore;
    
    // A lower rank (higher number) should not have a higher score than a higher rank
    if (currentScore > previousScore) {
      console.warn(
        `[AI Service] Ranking inconsistency: Product at rank ${products[i].rank} ` +
        `(score: ${currentScore}) has higher score than rank ${products[i - 1].rank} ` +
        `(score: ${previousScore}). Fixing...`
      );
      hasInconsistency = true;
      
      // Swap the scores to maintain consistency
      const tempScore = products[i].overallScore;
      products[i].overallScore = products[i - 1].overallScore;
      products[i - 1].overallScore = tempScore;
    }
  }

  if (hasInconsistency) {
    console.log('[AI Service] Ranking inconsistencies corrected.');
  }

  return {
    ...report,
    rankedProducts: products,
  };
}

// ============================================================================
// Simulated Report Generator
// ============================================================================

/**
 * Generates a simulated AI search report for development and testing.
 * 
 * @param {string} query - The search query
 * @param {Array} filters - Active filters
 * @param {Object} preferences - User preferences
 * @returns {Object} Complete simulated report
 */
function getSimulatedReport(query, filters, preferences) {
  const currency = preferences?.preferredCurrency || 'USD';

  const bestOverall = {
    id: "jumia_1785261626980_h4boy",
    marketplace: "Jumia",
    rank: 1,
    title: "HP ProBook 11 X360-TOUCHSCREEN Intel Celeron 128GB SSD-4GB RAM WINDOWS10 Pro & Free USB Light",
    brand: "HP",
    price: 126.63,
    currency: "USD",
    image: "https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/10/8161914/1.jpg?0643",
    productUrl: "https://www.jumia.com.ng/hp-probook-11-x360-touchscreen-intel-celeron-128gb-ssd-4gb-ram-windows10-pro-free-usb-light-419161801.html",
    seller: "Jumia Seller",
    sellerRating: 4.2,
    sellerReviewCount: 127,
    shippingCost: 0,
    shippingEstimate: "3-7 days",
    shippingFree: true,
    availability: true,
    condition: "new",
    category: "laptops",
    description: "Entry-level HP ProBook 11 X360 with touchscreen display and SSD storage, ideal for student productivity tasks and light entertainment.",
    specs: {
      cpu: "Intel Celeron",
      ram: "4GB DDR4",
      storage: "128GB SSD",
      screen: "11 inch FHD touchscreen",
      os: "Windows 10 Pro",
      keyboard: "Standard",
      connectivity: "WiFi 5, Bluetooth 4.2",
      weight: "1.4 kg"
    },
    pros: [
      "Touchscreen functionality for interactive use",
      "Fast SSD storage (128GB) for quick boot times",
      "Affordable price within budget",
      "Free shipping with quick delivery",
      "Professional Windows 10 Pro OS"
    ],
    cons: [
      "Weak Celeron processor - struggles with heavy multitasking",
      "Limited 4GB RAM - video editing/gaming not recommended",
      "Older processor generation"
    ],
    scoreBreakdown: {
      priceScore: 85,
      qualityScore: 78,
      sellerScore: 84,
      shippingScore: 90,
      overallScore: 84
    },
    confidence: 84,
    reason: "Selected as best overall due to exceptional balance: affordable price, seller reliability, fast free shipping, and practical touchscreen feature."
  };

  // Ranked products ordered by overallScore (highest first) - CONSISTENT RANKING
  const rankedProducts = [
    {
      rank: 1,
      id: "jumia_1785261626980_h4boy",
      marketplace: "Jumia",
      title: "HP ProBook 11 X360-TOUCHSCREEN Intel Celeron 128GB SSD-4GB RAM WINDOWS10 Pro",
      price: 126.63,
      specs: { cpu: "Intel Celeron", ram: "4GB", storage: "128GB SSD" },
      overallScore: 84,
      scoreBreakdown: { priceScore: 85, qualityScore: 78, sellerScore: 84, shippingScore: 90 }
    },
    {
      rank: 2,
      id: "jumia_1785261626983_gx7agi",
      marketplace: "Jumia",
      title: "HP EliteBook 840 G6 Intel Core I5-8GB RAM-256GB SSD-Backlit Keyboard Pro+BAG",
      price: 248.94,
      specs: { cpu: "Intel Core i5", ram: "8GB", storage: "256GB SSD" },
      overallScore: 83,
      scoreBreakdown: { priceScore: 70, qualityScore: 88, sellerScore: 84, shippingScore: 90 }
    },
    {
      rank: 3,
      id: "konga_5906563",
      marketplace: "Konga",
      title: "ProBook 11 X360 - Intel Celeron - SSD - 256GB - 4GB RAM - Windows 10 Pro",
      price: 144.05,
      specs: { cpu: "Intel Celeron", ram: "4GB", storage: "256GB SSD" },
      overallScore: 82,
      scoreBreakdown: { priceScore: 80, qualityScore: 80, sellerScore: 82, shippingScore: 95 }
    },
    {
      rank: 4,
      id: "ebay_456xyz",
      marketplace: "eBay",
      title: "HP PAVILION 15 Intel Core i3 8GB RAM 256GB SSD",
      price: 189.99,
      specs: { cpu: "Intel Core i3", ram: "8GB", storage: "256GB SSD" },
      overallScore: 81,
      scoreBreakdown: { priceScore: 75, qualityScore: 82, sellerScore: 80, shippingScore: 85 }
    },
    {
      rank: 5,
      id: "ebay_101def",
      marketplace: "eBay",
      title: "Lenovo IdeaPad 3 Intel Celeron 4GB RAM 256GB SSD",
      price: 135.75,
      specs: { cpu: "Intel Celeron", ram: "4GB", storage: "256GB SSD" },
      overallScore: 80,
      scoreBreakdown: { priceScore: 82, qualityScore: 76, sellerScore: 81, shippingScore: 88 }
    },
    {
      rank: 6,
      id: "jiji_789abc",
      marketplace: "Jiji",
      title: "ASUS VivoBook 15 Intel Pentium 4GB RAM 128GB SSD",
      price: 119.50,
      specs: { cpu: "Intel Pentium", ram: "4GB", storage: "128GB SSD" },
      overallScore: 79,
      scoreBreakdown: { priceScore: 88, qualityScore: 74, sellerScore: 78, shippingScore: 80 }
    }
  ];

  const report = {
    id: "report_abc123def456",
    executiveSummary: `Found 24 products matching your criteria across 4 marketplaces. Best Overall is the HP ProBook 11 X360 (${currency} ${bestOverall.price}) - exceptional balance of touchscreen feature, affordable price, and 4.2-star seller rating.`,
    
    bestOverall,
    
    bestBudget: {
      id: "jumia_1785261626985_chksop",
      marketplace: "Jumia",
      rank: 2,
      title: "HP CHROMEBOOK 11, INTEL CELERON, 4GB RAM, 16GB EMMC + USB LIGHT",
      brand: "HP",
      price: 56.95,
      currency: "USD",
      image: "https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/15/1504104/1.jpg?4769",
      productUrl: "https://www.jumia.com.ng/hp-chromebook-11-intel-celeron-4gb-ram16gb-emmc-usb-light-401405151.html",
      seller: "Jumia Seller",
      sellerRating: 4.3,
      sellerReviewCount: 94,
      shippingCost: 0,
      shippingEstimate: "3-7 days",
      shippingFree: true,
      availability: true,
      condition: "new",
      category: "laptops",
      description: "Basic HP Chromebook 11 designed for lightweight web browsing and cloud applications.",
      specs: {
        cpu: "Intel Celeron N3350",
        ram: "4GB LPDDR4",
        storage: "16GB eMMC",
        screen: "11.6 inch HD",
        os: "Chrome OS",
        keyboard: "Standard",
        connectivity: "WiFi 5, Bluetooth 4.2",
        weight: "1.2 kg"
      },
      pros: ["Lowest price", "Free shipping", "Fast boot times", "Lightweight", "Good seller rating"],
      cons: ["Limited storage", "Chrome OS only", "Not for demanding tasks", "Weak processor"],
      scoreBreakdown: { priceScore: 95, qualityScore: 62, sellerScore: 86, shippingScore: 90, overallScore: 83 },
      confidence: 88,
      reason: "Cheapest option meeting budget constraint with excellent seller reliability and free shipping."
    },

    bestPerformance: {
      id: "jumia_1785261626983_gx7agi",
      marketplace: "Jumia",
      rank: 3,
      title: "HP EliteBook 840 G6 Intel Core I5-8GB RAM-256GB SSD-Backlit Keyboard 11 Pro+BAG",
      brand: "HP",
      price: 248.94,
      currency: "USD",
      image: "https://ng.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/51/3459304/1.jpg?9552",
      productUrl: "https://www.jumia.com.ng/hp-elitebook-840-g6-intel-core-i5-8gb-ram-256gb-ssd-backlit-keyboard-pro-bag-mpg11932178.html",
      seller: "Jumia Seller",
      sellerRating: 4.2,
      sellerReviewCount: 156,
      shippingCost: 0,
      shippingEstimate: "3-7 days",
      shippingFree: true,
      availability: true,
      condition: "new",
      category: "laptops",
      description: "Professional-grade HP EliteBook 840 G6 featuring a powerful Intel Core i5 processor, 8GB RAM, and backlit keyboard.",
      specs: {
        cpu: "Intel Core i5-8265U (8th Gen)",
        ram: "8GB DDR4",
        storage: "256GB SSD NVMe",
        screen: "14 inch FHD (1920x1080)",
        os: "Windows 10 Pro",
        keyboard: "Backlit",
        connectivity: "WiFi 6, Bluetooth 5.0",
        weight: "1.55 kg",
        battery: "9-10 hours"
      },
      pros: ["Core i5 processor", "8GB RAM", "256GB SSD", "Backlit keyboard", "Great battery life", "WiFi 6", "Includes bag"],
      cons: ["Higher price", "8th gen processor", "Heavier"],
      scoreBreakdown: { priceScore: 70, qualityScore: 88, sellerScore: 84, shippingScore: 90, overallScore: 83 },
      confidence: 81,
      reason: "Highest performance specs available under budget with professional features."
    },

    bestValue: {
      id: "konga_5906563",
      marketplace: "Konga",
      rank: 4,
      title: "ProBook 11 X360 - Intel Celeron - SSD - 256GB - 4GB RAM - Windows 10 Pro + Touchscreen - Grey",
      brand: "HP",
      price: 144.05,
      currency: "USD",
      image: "https://www-konga-com-res.cloudinary.com/media/catalog/product/L/O/95468_1665539935.jpg",
      productUrl: "https://www.konga.com/product/hp-probook-11-x360-intel-celeron-ssd-256gb-4gb-ram-windows-10-pro-touchscreen-grey-5906563",
      seller: "PREMIUM VENTURES INC",
      sellerRating: 4.1,
      sellerReviewCount: 89,
      shippingCost: null,
      shippingEstimate: "1-3 days",
      shippingFree: true,
      availability: true,
      condition: "new",
      category: "laptops",
      description: "HP ProBook 11 X360 with touchscreen and dual-storage option.",
      specs: {
        cpu: "Intel Celeron N5100",
        ram: "4GB DDR4",
        storage: "256GB SSD",
        screen: "11.6 inch HD touchscreen",
        os: "Windows 10 Pro",
        keyboard: "Standard",
        connectivity: "WiFi 5, Bluetooth 4.2",
        weight: "1.4 kg"
      },
      pros: ["256GB storage", "Touchscreen + Windows Pro", "Fast delivery", "Good value", "Modern Celeron"],
      cons: ["Only 4GB RAM", "Celeron processor", "Close to EliteBook price"],
      scoreBreakdown: { priceScore: 80, qualityScore: 80, sellerScore: 82, shippingScore: 95, overallScore: 82 },
      confidence: 79,
      reason: "Best value proposition with double storage and fastest shipping."
    },

    pros: [
      "Comprehensive search across 4 marketplaces returned 24 products",
      "Best Overall option balances performance, price, and reliability",
      "Wide price range options for different budgets",
      "All top recommendations have free shipping",
      "Average seller rating 4.2/5"
    ],

    cons: [
      "Budget options limited to Celeron processors",
      "Some sellers have lower review counts",
      "16GB RAM options require higher budget"
    ],

    tradeoffs: "The Chromebook is cheapest but limited to Chrome OS and 16GB storage. The EliteBook has professional specs but costs more. The ProBook X360 offers best balance.",
    
    confidenceScore: 82,
    confidenceLevel: "High",
    confidenceBreakdown: {
      productsFound: "24/20 minimum ✓ (20%)",
      marketplaceDiversity: "4/4 marketplaces ✓ (20%)",
      sellerRatings: "100% have ratings ✓ (20%)",
      priceData: "100% complete ✓ (20%)",
      specsData: "95% complete ✓ (15%)",
      reviewCoverage: "88% average ✓ (5%)"
    },
    confidenceExplanation: "High confidence (82%) based on comprehensive search across all marketplaces with complete data.",

    rankingCriteria: {
      priceWeight: 0.25,
      qualityWeight: 0.25,
      sellerWeight: 0.25,
      shippingWeight: 0.25,
      explanation: "Products ranked using balanced multi-criteria scoring."
    },

    rankedProducts,

    alternatives: [
      {
        reason: "Different brand, similar specs",
        products: [
          {
            id: "ebay_456xyz",
            title: "HP PAVILION 15 Intel Core i3 8GB RAM 256GB SSD",
            price: 189.99,
            marketplace: "eBay",
            overallScore: 81
          },
          {
            id: "jiji_789abc",
            title: "ASUS VivoBook 15 Intel Pentium 4GB RAM 128GB SSD",
            price: 119.50,
            marketplace: "Jiji",
            overallScore: 79
          }
        ]
      }
    ],

    warnings: [],

    shoppingTips: [
      "Compare shipping times if you need the item urgently",
      "Celeron processors are fine for web browsing and light productivity",
      "Chrome OS is great for students but cannot run Windows programs",
      "8GB RAM is minimum recommended for comfortable multitasking",
      "256GB storage is ideal for most users",
      "Buy from sellers with ratings above 4.0 stars",
      "Check return policies before purchase"
    ],

    nextSteps: [
      "Click 'View on Marketplace' on your preferred product to proceed to checkout",
      "Compare final prices at checkout (taxes/fees may apply)",
      "Save product for later review using browser bookmarks",
      "Check seller reviews before confirming purchase"
    ]
  };

  return {
    type: "complete",
    timestamp: new Date().toISOString(),
    progress: 100,
    metadata: {
      message: "Decision report compiled successfully.",
      searchQuery: query || "HP laptops under $300",
      marketplacesSearched: ["Jumia", "Konga", "eBay", "Jiji"],
      totalProductsFound: 24,
      productCategory: "laptops",
      searchDuration: "4.2s"
    },
    report
  };
}

export default aiService;