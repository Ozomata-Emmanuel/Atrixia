import { GoogleGenAI } from '@google/genai';
import { IAIProvider, GenerateOptions } from './interface';
import { Message, ProviderResult } from '../types/ai';
import { aiConfig } from '../config';

export class GemmaProvider implements IAIProvider {
  readonly providerName = 'gemma';
  readonly defaultModel: string;
  private client?: GoogleGenAI;

  constructor() {
    if (aiConfig.provider === 'google-studio') {
      this.defaultModel = 'gemma-2-9b';
      this.client = new GoogleGenAI({ apiKey: aiConfig.gemmaApiKey });
    } else if (aiConfig.provider === 'vertex') {
      this.defaultModel = 'gemma-2-9b';
      this.client = new GoogleGenAI({
        enterprise: true,
        project: aiConfig.googleProject,
        location: aiConfig.vertexLocation,
      });
    } else if (aiConfig.provider === 'ollama') {
      this.defaultModel = 'gemma2:9b';
    } else if (aiConfig.provider === 'openrouter') {
      this.defaultModel = 'google/gemma-2-9b-it';
    } else {
      this.defaultModel = 'google/gemma-2-9b';
    }
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
      if (this.client) {
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
      }

      const messagesPayload: Message[] = typeof prompt === 'string' 
        ? [{ role: 'user', content: prompt }] 
        : prompt;

      if (aiConfig.provider === 'ollama') {
        const response = await fetch(`${aiConfig.ollamaBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.defaultModel,
            messages: messagesPayload,
            options: {
              temperature: options?.temperature ?? 0.2,
              num_predict: options?.maxTokens,
            },
            stream: false,
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama responded with status: ${response.status}`);
        }
        const data = await response.json();
        return {
          text: data.message?.content || '',
          rawResponse: data,
        };
      }

      if (aiConfig.provider === 'openrouter') {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.openrouterApiKey}`,
          },
          body: JSON.stringify({
            model: this.defaultModel,
            messages: messagesPayload.map((m) => ({ role: m.role, content: m.content })),
            temperature: options?.temperature ?? 0.2,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenRouter responded with status: ${response.status}`);
        }
        const data = await response.json();
        return {
          text: data.choices?.[0]?.message?.content || '',
          rawResponse: data,
        };
      }

      if (aiConfig.provider === 'huggingface') {
        const response = await fetch(`https://api-inference.huggingface.co/models/${this.defaultModel}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.huggingfaceApiKey}`,
          },
          body: JSON.stringify({
            inputs: messagesPayload[messagesPayload.length - 1]?.content || '',
          }),
        });

        if (!response.ok) {
          throw new Error(`HuggingFace responded with status: ${response.status}`);
        }
        const data = await response.json();
        const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text || '';
        return {
          text,
          rawResponse: data,
        };
      }

      throw new Error(`Unsupported AI Provider configured: ${aiConfig.provider}`);
    } catch (error: any) {
      throw new Error(`Gemma generate failed: ${error.message || error}`);
    }
  }

  async *stream(
    prompt: string | Message[],
    options?: GenerateOptions
  ): AsyncIterable<string> {
    try {
      if (this.client) {
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
      } else {
        const res = await this.generate(prompt, options);
        yield res.text;
      }
    } catch (error: any) {
      throw new Error(`Gemma streaming failed: ${error.message || error}`);
    }
  }

  async health(): Promise<boolean> {
    try {
      if (this.client) {
        const response = await this.client.models.generateContent({
          model: this.defaultModel,
          contents: 'ping',
          config: { maxOutputTokens: 2 },
        });
        return !!response;
      }
      return true;
    } catch {
      return false;
    }
  }
}
