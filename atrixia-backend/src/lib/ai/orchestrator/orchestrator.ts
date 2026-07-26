import { IAIProvider } from '../providers/interface';
import { GeminiProvider } from '../providers/gemini';
import { SYSTEM_PROMPT } from '../prompts/system';
import { SHOPPING_REASONING_PROMPT } from '../prompts/shopping';
import { FOLLOWUP_PROMPT } from '../prompts/followup';
import { AIRequest, AIResponse, Message } from '../types/ai';

export class AIOrchestrator {
  private provider: IAIProvider;
  private maxRetries = 3;

  constructor(provider?: IAIProvider) {
    // Default to GeminiProvider if not provided, allowing easy swapability
    this.provider = provider || new GeminiProvider();
  }

  /**
   * Compiles the system instructions and messages based on request inputs.
   */
  private buildInferenceContext(request: AIRequest): { systemInstruction: string; messages: Message[] } {
    let systemInstruction = SYSTEM_PROMPT;
    const messages: Message[] = [];

    // Inherit active shopping priorities or thread history if context is present
    if (request.context) {
      const prefs = request.context.preferences;
      if (prefs) {
        systemInstruction += `\nUser Preferences Configuration:\n` +
          `- Preferred Currency: ${prefs.currency || 'USD'}\n` +
          `- Budget Range: ${prefs.budgetMin ?? 0} to ${prefs.budgetMax ?? 1000}\n` +
          `- Prioritize Price: ${prefs.prioritizePrice ?? true}\n` +
          `- Prioritize Quality: ${prefs.prioritizeQuality ?? false}\n` +
          `- Prioritize Shipping Speed: ${prefs.prioritizeShipping ?? false}\n` +
          `- Prioritize Seller Trust: ${prefs.prioritizeSeller ?? false}\n`;
      }

      // Add conversation thread context
      if (request.context.messages && request.context.messages.length > 0) {
        messages.push(...request.context.messages);
      }
    }

    // Append the active search prompt or reasoning directive
    const isFollowup = messages.length > 0;
    systemInstruction += isFollowup ? `\n${FOLLOWUP_PROMPT}` : `\n${SHOPPING_REASONING_PROMPT}`;

    // Add the current user query to the payload if not already present in thread history
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.content !== request.query || lastMsg.role !== 'user') {
      messages.push({ role: 'user', content: request.query });
    }

    return { systemInstruction, messages };
  }

  /**
   * Executes AI inference with retry mechanism and error handling.
   */
  async processQuery(request: AIRequest): Promise<AIResponse> {
    const { systemInstruction, messages } = this.buildInferenceContext(request);
    let attempts = 0;
    let lastError: any = null;

    while (attempts < this.maxRetries) {
      try {
        attempts++;
        const result = await this.provider.generate(messages, {
          temperature: 0.2,
          systemInstruction,
          responseMimeType: 'application/json'
        });

        // Normalize text response to match AIResponse shape
        const rawJson = JSON.parse(result.text);

        return {
          success: true,
          id: rawJson.id || `session_${Math.random().toString(36).substring(7)}`,
          productName: rawJson.productName,
          confidenceScore: rawJson.confidenceScore,
          summary: rawJson.summary,
          pros: rawJson.pros,
          cons: rawJson.cons,
          tradeoffs: rawJson.tradeoffs,
          alternatives: rawJson.alternatives,
        };
      } catch (error: any) {
        lastError = error;
        // Log attempt failure in structured format
        console.warn(`[AIOrchestrator] Attempt ${attempts} failed: ${error.message || error}`);
        
        if (attempts >= this.maxRetries) {
          break;
        }
        // Small exponential delay before retry
        await new Promise((resolve) => setTimeout(resolve, attempts * 500));
      }
    }

    // Fallback normalization in case of total failure
    return {
      success: false,
      id: `err_${Math.random().toString(36).substring(7)}`,
      error: {
        code: 'PROVIDER_FAILURE',
        message: `AI Orchestrator failed after ${this.maxRetries} retries. Raw error: ${lastError?.message || lastError}`,
      },
    };
  }

  /**
   * Generates a streaming token context.
   */
  async *streamQuery(request: AIRequest): AsyncIterable<string> {
    const { systemInstruction, messages } = this.buildInferenceContext(request);
    try {
      yield* this.provider.stream(messages, {
        temperature: 0.2,
        systemInstruction,
      });
    } catch (error: any) {
      console.error(`[AIOrchestrator] Streaming error: ${error.message || error}`);
      yield JSON.stringify({
        type: 'error',
        payload: {
          code: 'STREAMING_EXCEPTION',
          message: error.message || String(error),
        }
      });
    }
  }
}
