import { ConversationThread, SearchSessionRecord, RecommendationRecord } from '../memory/history';
import { ConversationContext } from '../types/ai';

export interface IConversationRepository {
  get(id: string): Promise<ConversationThread | null>;
  save(thread: ConversationThread): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IRecommendationRepository {
  get(id: string): Promise<RecommendationRecord | null>;
  save(rec: RecommendationRecord): Promise<void>;
  listByConversation(conversationId: string): Promise<RecommendationRecord[]>;
}

export interface ISearchSessionRepository {
  get(id: string): Promise<SearchSessionRecord | null>;
  save(session: SearchSessionRecord): Promise<void>;
  listByUser(userId: string): Promise<SearchSessionRecord[]>;
}

export interface IUserPreferencesRepository {
  get(userId: string): Promise<ConversationContext['preferences'] | null>;
  save(userId: string, preferences: ConversationContext['preferences']): Promise<void>;
}
