import { IMemoryRepository, MockMemoryRepository } from './retrieval';
import { ConversationSummarizer } from './summary';
import { IAIProvider } from '../providers/interface';
import { ConversationContext, Message } from '../types/ai';
import { ConversationThread } from './history';

export class MemoryManager {
  private repository: IMemoryRepository;
  private summarizer: ConversationSummarizer;
  private contextWindowLimit = 10;

  constructor(provider: IAIProvider, repository?: IMemoryRepository) {
    this.repository = repository || new MockMemoryRepository();
    this.summarizer = new ConversationSummarizer(provider);
  }

  async loadContext(
    userId: string,
    conversationId?: string
  ): Promise<ConversationContext> {
    const preferences = await this.repository.getUserPreferences(userId);
    
    if (!conversationId) {
      return {
        messages: [],
        preferences: preferences || undefined,
      };
    }

    const thread = await this.repository.getConversationThread(conversationId);
    if (!thread) {
      return {
        conversationId,
        messages: [],
        preferences: preferences || undefined,
      };
    }

    let messages = [...thread.messages];
    let summary = thread.summary;

    if (messages.length > this.contextWindowLimit) {
      const messagesToSummarize = messages.slice(0, messages.length - this.contextWindowLimit);
      const activeWindowMessages = messages.slice(messages.length - this.contextWindowLimit);
      
      const newSummary = await this.summarizer.summarize(messagesToSummarize);
      summary = summary ? `${summary}\n${newSummary}` : newSummary;
      
      const updatedThread: ConversationThread = {
        ...thread,
        summary,
        updatedAt: new Date(),
      };
      
      if (this.repository instanceof MockMemoryRepository) {
        await this.repository.saveConversationThread(updatedThread);
      }
      
      messages = activeWindowMessages;
    }

    return {
      conversationId,
      messages,
      preferences: preferences || undefined,
    };
  }

  async appendMessages(conversationId: string, newMessages: Message[]): Promise<void> {
    let thread = await this.repository.getConversationThread(conversationId);
    if (!thread) {
      thread = {
        conversationId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    thread.messages.push(...newMessages);
    thread.updatedAt = new Date();

    if (this.repository instanceof MockMemoryRepository) {
      await this.repository.saveConversationThread(thread);
    }
  }
}
