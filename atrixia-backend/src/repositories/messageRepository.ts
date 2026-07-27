import { Message } from '../lib/ai/types/ai';

export class MessageRepository {
  private static messages = new Map<string, Message[]>();

  async getMessages(conversationId: string): Promise<Message[]> {
    return MessageRepository.messages.get(conversationId) || [];
  }

  async saveMessage(conversationId: string, message: Message): Promise<void> {
    const list = MessageRepository.messages.get(conversationId) || [];
    list.push(message);
    MessageRepository.messages.set(conversationId, list);
  }

  async saveMessages(conversationId: string, messagesList: Message[]): Promise<void> {
    const list = MessageRepository.messages.get(conversationId) || [];
    list.push(...messagesList);
    MessageRepository.messages.set(conversationId, list);
  }
}
