import { GoogleGenAI } from '@google/genai';
import { IAIProvider, GenerateOptions } from './interface';
import { Message, ProviderResult } from '../types/ai';

export class GeminiProvider implements IAIProvider {
  readonly providerName = 'gemini';
  readonly defaultModel = 'gemini-2.5-flash';
  private client: GoogleGenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    this.client = new GoogleGenAI({ apiKey: key });
  }

  private transformContents(prompt: string | Message[]): any {
    if (typeof prompt === 'string') {
      return prompt;
    }
    return prompt.map((msg) => {
      const role = msg.role === 'assistant' ? 'model' : msg.role;
      return {
        role,
        parts: [{ text: msg.content }],
      };
    });
  }

  async generate(
    prompt: string | Message[],
    options?: GenerateOptions
  ): Promise<ProviderResult> {
    try {
      const contents = this.transformContents(prompt);
      const config: any = {};

      if (options?.temperature !== undefined) {
        config.temperature = options.temperature;
      }
      if (options?.maxTokens !== undefined) {
        config.maxOutputTokens = options.maxTokens;
      }
      if (options?.systemInstruction !== undefined) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options?.responseMimeType !== undefined) {
        config.responseMimeType = options.responseMimeType;
      }
      if (options?.responseSchema !== undefined) {
        config.responseSchema = options.responseSchema;
      }

      const response = await this.client.models.generateContent({
        model: this.defaultModel,
        contents,
        config,
      });

      return {
        text: response.text || '',
        rawResponse: response,
      };
    } catch (error: any) {
      throw new Error(`Gemini generate failed: ${error.message || error}`);
    }
  }

  async *stream(
    prompt: string | Message[],
    options?: GenerateOptions
  ): AsyncIterable<string> {
    try {
      const contents = this.transformContents(prompt);
      const config: any = {};

      if (options?.temperature !== undefined) {
        config.temperature = options.temperature;
      }
      if (options?.maxTokens !== undefined) {
        config.maxOutputTokens = options.maxTokens;
      }
      if (options?.systemInstruction !== undefined) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options?.responseMimeType !== undefined) {
        config.responseMimeType = options.responseMimeType;
      }
      if (options?.responseSchema !== undefined) {
        config.responseSchema = options.responseSchema;
      }

      const streamResult = await this.client.models.generateContentStream({
        model: this.defaultModel,
        contents,
        config,
      });

      for await (const chunk of streamResult) {
        yield chunk.text || '';
      }
    } catch (error: any) {
      throw new Error(`Gemini streaming failed: ${error.message || error}`);
    }
  }

  async health(): Promise<boolean> {
    try {
      const response = await this.client.models.generateContent({
        model: this.defaultModel,
        contents: 'ping',
        config: { maxOutputTokens: 2 },
      });
      return !!response;
    } catch {
      return false;
    }
  }
}
