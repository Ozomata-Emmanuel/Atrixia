import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const responseSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    recommendation: { type: 'STRING' },
    reasoning: { type: 'STRING' },
    pros: { type: 'ARRAY', items: { type: 'STRING' } },
    cons: { type: 'ARRAY', items: { type: 'STRING' } },
    alternatives: { type: 'ARRAY', items: { type: 'STRING' } },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    confidence: { type: 'STRING' },
    next_questions: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: [
    'summary',
    'recommendation',
    'reasoning',
    'pros',
    'cons',
    'alternatives',
    'warnings',
    'confidence',
    'next_questions'
  ]
};

async function run() {
  try {
    const key = process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: key });
    console.log('Sending request with schema...');
    const response = await ai.models.generateContent({
      model: 'gemma-4-31b-it',
      contents: 'Tell me a joke',
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any
      }
    });
    console.log('Success:', response.text);
  } catch (e) {
    console.error('Failed:', e);
  }
}
run();
