import { ConversationThread, SearchSessionRecord, RecommendationRecord } from './history';
import { ConversationContext } from '../types/ai';

export interface IMemoryRepository {
  getConversationThread(conversationId: string): Promise<ConversationThread | null>;
  saveConversationThread(thread: ConversationThread): Promise<void>;
  getUserPreferences(userId: string): Promise<ConversationContext['preferences'] | null>;
  getSearchHistory(userId: string, limit?: number): Promise<SearchSessionRecord[]>;
  getPreviousRecommendations(conversationId: string): Promise<RecommendationRecord[]>;
}

export class MockMemoryRepository implements IMemoryRepository {
  private threads = new Map<string, ConversationThread>();
  private preferences = new Map<string, ConversationContext['preferences']>();
  private searchHistory = new Map<string, SearchSessionRecord[]>();
  private recommendations = new Map<string, RecommendationRecord[]>();

  async getConversationThread(conversationId: string): Promise<ConversationThread | null> {
    return this.threads.get(conversationId) || null;
  }

  async saveConversationThread(thread: ConversationThread): Promise<void> {
    this.threads.set(thread.conversationId, thread);
  }

  async getUserPreferences(userId: string): Promise<ConversationContext['preferences'] | null> {
    return this.preferences.get(userId) || {
      currency: 'USD',
      budgetMin: 0,
      budgetMax: 1000,
      prioritizePrice: true,
      prioritizeQuality: false,
      prioritizeShipping: false,
      prioritizeSeller: false,
    };
  }

  async saveUserPreferences(userId: string, prefs: ConversationContext['preferences']): Promise<void> {
    this.preferences.set(userId, prefs);
  }

  async getSearchHistory(userId: string, limit = 10): Promise<SearchSessionRecord[]> {
    const list = this.searchHistory.get(userId) || [];
    return list.slice(0, limit);
  }

  async getPreviousRecommendations(conversationId: string): Promise<RecommendationRecord[]> {
    return this.recommendations.get(conversationId) || [];
  }
}
