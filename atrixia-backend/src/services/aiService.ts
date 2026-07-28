import { AppError } from '../utils/error';
import { AIOrchestrator } from '../lib/ai/orchestrator/orchestrator';

export const callAiService = async (userId: string, query: string, filters: Array<{ label: string, value: string }>) => {
  try {
    const orchestrator = new AIOrchestrator();
    
    // Map basic filters to preferences if possible or just pass them as context
    const preferences: Record<string, any> = {};
    filters.forEach(f => {
      preferences[f.label.toLowerCase()] = f.value;
    });

    const result = await orchestrator.processQuery(userId, {
      query,
      context: {
        preferences,
        messages: []
      }
    });

    if (!result.success || !result.report) {
      throw new Error(result.error || 'AI reasoning failed');
    }

    // Returning the structured report in an array to match the existing JSONB array DB schema 
    // or you can return the alternatives array. For a comprehensive response, we return the whole report array.
    return [result.report];
  } catch (error) {
    console.error('AI Service Error:', error);
    throw new AppError('Failed to generate results from AI agent', 500);
  }
};
