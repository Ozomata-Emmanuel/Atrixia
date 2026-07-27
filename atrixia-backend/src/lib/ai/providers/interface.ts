import { Message, ProviderResult } from '../types/ai';

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  responseMimeType?: string;
  responseSchema?: any;
}

export interface IAIProvider {
  readonly providerName: string;
  readonly defaultModel: string;
  generate(
    prompt: string | Message[],
    options?: GenerateOptions
  ): Promise<ProviderResult>;
  stream(
    prompt: string | Message[],
    options?: GenerateOptions
  ): AsyncIterable<string>;
  health(): Promise<boolean>;
}
