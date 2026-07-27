import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError } from '../utils/error';
import { AIOrchestrator } from '../lib/ai/orchestrator/orchestrator';
import { ChatRequestSchema } from '../lib/ai/schemas/request';
import { PreferenceRepository } from '../repositories/preferenceRepository';
import { DatabaseMemoryRepository } from '../repositories/databaseMemoryRepository';
import { MemoryManager } from '../lib/ai/memory/manager';
import { GeminiProvider } from '../lib/ai/providers/gemini';

const preferenceRepo = new PreferenceRepository();
const memoryRepo = new DatabaseMemoryRepository();
const provider = new GeminiProvider();
const memoryManager = new MemoryManager(provider, memoryRepo);
const orchestrator = new AIOrchestrator(provider, undefined, memoryManager);

export const handleChatMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const parsed = ChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(`Invalid request payload: ${parsed.error.message}`, 400);
    }

    const { conversationId, message, context } = parsed.data;
    const preferences = await preferenceRepo.get(userId);
    const activeConvId = conversationId || context?.conversationId || `conv_${Math.random().toString(36).substring(7)}`;

    const memoryContext = await memoryManager.loadContext(userId, activeConvId);
    const mergedMessages = [...memoryContext.messages];

    await orchestrator.processQueryStream(userId, {
      query: message,
      context: {
        conversationId: activeConvId,
        messages: mergedMessages,
        preferences: preferences || undefined,
      }
    }, res);

  } catch (error) {
    next(error);
  }
};
