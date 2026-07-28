import dotenv from 'dotenv';
dotenv.config();

export interface AIConfig {
  provider: 'google-studio' | 'vertex' | 'ollama' | 'huggingface' | 'openrouter';
  gemmaApiKey?: string;
  googleProject?: string;
  vertexLocation?: string;
  ollamaBaseUrl?: string;
  huggingfaceApiKey?: string;
  openrouterApiKey?: string;
  databaseUrl: string;
  jwtSecret: string;
}

const provider = (process.env.AI_PROVIDER || 'google-studio').toLowerCase() as AIConfig['provider'];

if (provider === 'google-studio' && !process.env.GEMMA_API_KEY && !process.env.GEMINI_API_KEY) {
  throw new Error('Gemma Migration Error: GEMMA_API_KEY or GEMINI_API_KEY is required for google-studio provider.');
}
if (provider === 'vertex' && (!process.env.GOOGLE_CLOUD_PROJECT || !process.env.VERTEX_LOCATION)) {
  throw new Error('Gemma Migration Error: GOOGLE_CLOUD_PROJECT and VERTEX_LOCATION are required for vertex provider.');
}
if (provider === 'ollama' && !process.env.OLLAMA_BASE_URL) {
  throw new Error('Gemma Migration Error: OLLAMA_BASE_URL is required for ollama provider.');
}
if (provider === 'huggingface' && !process.env.HUGGINGFACE_API_KEY) {
  throw new Error('Gemma Migration Error: HUGGINGFACE_API_KEY is required for huggingface provider.');
}
if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
  throw new Error('Gemma Migration Error: OPENROUTER_API_KEY is required for openrouter provider.');
}

export const aiConfig: AIConfig = {
  provider,
  gemmaApiKey: process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY,
  googleProject: process.env.GOOGLE_CLOUD_PROJECT,
  vertexLocation: process.env.VERTEX_LOCATION,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL,
  huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/atrixia',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
};
