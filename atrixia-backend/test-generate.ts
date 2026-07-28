import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  try {
    const key = process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: key });
    console.log('Sending request to gemma-4-31b-it...');
    const response = await ai.models.generateContent({
      model: 'gemma-4-31b-it',
      contents: 'Tell me a joke',
      config: {
        // responseMimeType: 'application/json'
      }
    });
    console.log('Success without JSON:', response.text);
  } catch (e) {
    console.error('Failed without JSON:', e);
  }

  try {
    const key = process.env.GEMMA_API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: key });
    console.log('Sending request with JSON schema...');
    const response = await ai.models.generateContent({
      model: 'gemma-4-31b-it',
      contents: 'Tell me a joke',
      config: {
        responseMimeType: 'application/json'
      }
    });
    console.log('Success with JSON:', response.text);
  } catch (e) {
    console.error('Failed with JSON:', e);
  }
}
run();
