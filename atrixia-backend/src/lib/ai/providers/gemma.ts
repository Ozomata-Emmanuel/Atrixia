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
      this.defaultModel = 'gemma-4-31b-it';
      this.client = new GoogleGenAI({ apiKey: aiConfig.gemmaApiKey });
    } else if (aiConfig.provider === 'vertex') {
      this.defaultModel = 'gemma-4-12b';
      this.client = new GoogleGenAI({
        enterprise: true,
        project: aiConfig.googleProject,
        location: aiConfig.vertexLocation,
      });
    } else if (aiConfig.provider === 'ollama') {
      this.defaultModel = 'gemma-4:12b';
    } else if (aiConfig.provider === 'openrouter') {
      this.defaultModel = 'google/gemma-4-12b-it';
    } else {
      this.defaultModel = 'google/gemma-4-12b';
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
    // Retry once on transient failures (fetch failed, 503, timeout)
    const MAX_RETRIES = 2;
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (this.client) {
          const contents = this.transformContents(prompt);
          const config: any = {};

          if (options?.temperature !== undefined)     config.temperature       = options.temperature;
          if (options?.maxTokens !== undefined)       config.maxOutputTokens   = options.maxTokens;
          if (options?.systemInstruction !== undefined) config.systemInstruction = options.systemInstruction;
          if (options?.responseMimeType !== undefined) config.responseMimeType  = options.responseMimeType;
          if (options?.responseSchema !== undefined)  config.responseSchema    = options.responseSchema;

          // 45s hard timeout — prevents the request hanging indefinitely
          const timeoutMs = 45_000;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);

          let response: any;
          try {
            response = await this.client.models.generateContent({
              model: this.defaultModel,
              contents,
              config,
            });
          } finally {
            clearTimeout(timer);
          }

          const text = response.text || '';
          if (!text && attempt < MAX_RETRIES) {
            console.warn(`[GemmaProvider] Empty response on attempt ${attempt}, retrying...`);
            await new Promise(r => setTimeout(r, 1000 * attempt));
            continue;
          }

          return { text, rawResponse: response };
        }

        // ── Non-Google-SDK paths (Ollama, OpenRouter, HuggingFace) ───────────
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
              options: { temperature: options?.temperature ?? 0.2, num_predict: options?.maxTokens },
              stream: false,
            }),
            signal: AbortSignal.timeout(45_000),
          });
          if (!response.ok) throw new Error(`Ollama ${response.status}`);
          const data = await response.json();
          return { text: data.message?.content || '', rawResponse: data };
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
            signal: AbortSignal.timeout(45_000),
          });
          if (!response.ok) throw new Error(`OpenRouter ${response.status}`);
          const data = await response.json();
          return { text: data.choices?.[0]?.message?.content || '', rawResponse: data };
        }

        if (aiConfig.provider === 'huggingface') {
          const response = await fetch(
            `https://api-inference.huggingface.co/models/${this.defaultModel}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiConfig.huggingfaceApiKey}`,
              },
              body: JSON.stringify({
                inputs: messagesPayload[messagesPayload.length - 1]?.content || '',
              }),
              signal: AbortSignal.timeout(45_000),
            }
          );
          if (!response.ok) throw new Error(`HuggingFace ${response.status}`);
          const data = await response.json();
          const text = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text || '';
          return { text, rawResponse: data };
        }

        throw new Error(`Unsupported AI Provider: ${aiConfig.provider}`);
      } catch (error: any) {
        lastError = new Error(error.message || String(error));
        const isTransient = error.message?.includes('fetch failed')
          || error.message?.includes('ECONNRESET')
          || error.message?.includes('ETIMEDOUT')
          || error.message?.includes('aborted')
          || error.code === 'ECONNRESET';

        if (isTransient && attempt < MAX_RETRIES) {
          const backoff = 1500 * attempt;
          console.warn(`[GemmaProvider] Transient error on attempt ${attempt}, retrying in ${backoff}ms: ${error.message}`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }

        break;
      }
    }

    throw new Error(`Gemma generate failed after ${MAX_RETRIES} attempts: ${lastError.message}`);
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
