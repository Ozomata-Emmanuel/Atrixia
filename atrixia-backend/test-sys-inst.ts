import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  try {
    const key = process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: key });
    console.log('Sending request with systemInstruction...');
    const response = await ai.models.generateContent({
      model: 'gemma-4-31b-it',
      contents: 'Tell me a joke',
      config: {
        systemInstruction: 'You are a funny comedian.',
        responseMimeType: 'application/json'
      }
    });
    console.log('Success!', response.text);
  } catch (e) {
    console.error('Failed with error:', e);
  }
}
run();
