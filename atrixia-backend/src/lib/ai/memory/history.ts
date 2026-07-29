import { Message } from '../types/ai';

export interface SearchSessionRecord {
  id: string;
  query: string;
  timestamp: Date;
  resultsCount: number;
}

export interface RecommendationRecord {
  id: string;
  productId: string;
  confidenceScore: number;
  summary: string;
  timestamp: Date;
}

export interface ConversationThread {
  conversationId: string;
  userId?: string;          // owner — set when thread is first created
  messages: Message[];
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}
