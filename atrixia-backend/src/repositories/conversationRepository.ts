import { IConversationRepository } from '../lib/ai/db/db';
import { ConversationThread } from '../lib/ai/memory/history';

export class ConversationRepository implements IConversationRepository {
  private static conversations = new Map<string, ConversationThread>();

  async get(id: string): Promise<ConversationThread | null> {
    return ConversationRepository.conversations.get(id) || null;
  }

  async save(thread: ConversationThread): Promise<void> {
    ConversationRepository.conversations.set(thread.conversationId, thread);
  }

  async delete(id: string): Promise<void> {
    ConversationRepository.conversations.delete(id);
  }
}
