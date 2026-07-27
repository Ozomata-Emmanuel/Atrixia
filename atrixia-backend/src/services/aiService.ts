import dotenv from 'dotenv';
import { AppError } from '../utils/error';

dotenv.config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

export const callAiService = async (query: string, filters: Array<{ label: string, value: string }>) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/ai-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, filters }),
    });

    if (!response.ok) {
      throw new Error(`AI service responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('AI Service Error:', error);
    // For hackathon, if AI is down, maybe return empty or throw
    throw new AppError('Failed to fetch results from AI service', 500);
  }
};
