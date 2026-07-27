import { IMemoryRepository } from '../lib/ai/memory/retrieval';
import { ConversationThread, SearchSessionRecord, RecommendationRecord } from '../lib/ai/memory/history';
import { ConversationContext } from '../lib/ai/types/ai';
import { ConversationRepository } from './conversationRepository';
import { PreferenceRepository } from './preferenceRepository';
import { SearchHistoryRepository } from './searchHistoryRepository';

export class DatabaseMemoryRepository implements IMemoryRepository {
  private conversationRepo = new ConversationRepository();
  private preferenceRepo = new PreferenceRepository();
  private searchHistoryRepo = new SearchHistoryRepository();

  async getConversationThread(conversationId: string): Promise<ConversationThread | null> {
    return this.conversationRepo.get(conversationId);
  }

  async saveConversationThread(thread: ConversationThread): Promise<void> {
    await this.conversationRepo.save(thread);
  }

  async getUserPreferences(userId: string): Promise<ConversationContext['preferences'] | null> {
    return this.preferenceRepo.get(userId);
  }

  async getSearchHistory(userId: string, limit?: number): Promise<SearchSessionRecord[]> {
    return this.searchHistoryRepo.listByUser(userId);
  }

  async getPreviousRecommendations(conversationId: string): Promise<RecommendationRecord[]> {
    return [];
  }
}
