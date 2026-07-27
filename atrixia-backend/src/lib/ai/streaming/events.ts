export type SSEEventType =
  | 'thinking'
  | 'memory_loaded'
  | 'marketplace_started'
  | 'amazon_complete'
  | 'jumia_complete'
  | 'ebay_complete'
  | 'ranking_started'
  | 'ranking_finished'
  | 'ai_reasoning'
  | 'recommendation'
  | 'complete'
  | 'error';

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
