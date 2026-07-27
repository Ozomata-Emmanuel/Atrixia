import { IAIProvider } from '../providers/interface';
import { Message } from '../types/ai';

export class ConversationSummarizer {
  private provider: IAIProvider;

  constructor(provider: IAIProvider) {
    this.provider = provider;
  }

  async summarize(messages: Message[]): Promise<string> {
    if (messages.length === 0) return '';

    const formattedConversation = messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    const prompt = `Please summarize the key user search requirements, preferences, and products discussed in this conversation in a concise paragraph:\n\n${formattedConversation}`;

    try {
      const result = await this.provider.generate(prompt, {
        temperature: 0.1,
        maxTokens: 250,
      });
      return result.text.trim();
    } catch (error) {
      console.warn('[ConversationSummarizer] Failed to generate summary:', error);
      return `Conversation containing ${messages.length} messages. Primary query: "${messages[0]?.content || ''}"`;
    }
  }
}
