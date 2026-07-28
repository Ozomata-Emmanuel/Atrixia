export type SSEEventType =
  | 'thinking'
  | 'retrieving_memory'
  | 'loading_preferences'
  | 'searching_marketplaces'
  | 'ranking_products'
  | 'analyzing_tradeoffs'
  | 'generating_explanation'
  | 'validating_response'
  | 'saving_results'
  | 'complete'
  | 'error'
  // Keep compatibility stubs
  | 'memory_loaded'
  | 'marketplace_started'
  | 'amazon_complete'
  | 'jumia_complete'
  | 'ebay_complete'
  | 'ranking_started'
  | 'ranking_finished'
  | 'ai_reasoning'
  | 'recommendation';

export interface SSEEvent {
  type: SSEEventType;
  timestamp: string;
  progress: number;
  metadata?: Record<string, any>;
}

export function createSSEEvent(type: SSEEventType, progress: number, metadata?: Record<string, any>): SSEEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    progress,
    metadata,
  };
}
