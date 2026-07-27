import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError } from '../utils/error';
import { AIOrchestrator } from '../lib/ai/orchestrator/orchestrator';
import { SearchRequestSchema } from '../lib/ai/schemas/request';
import { PreferenceRepository } from '../repositories/preferenceRepository';
import { SearchHistoryRepository } from '../repositories/searchHistoryRepository';
import { DatabaseMemoryRepository } from '../repositories/databaseMemoryRepository';
import { MemoryManager } from '../lib/ai/memory/manager';
import { GeminiProvider } from '../lib/ai/providers/gemini';

const preferenceRepo = new PreferenceRepository();
const searchHistoryRepo = new SearchHistoryRepository();
const memoryRepo = new DatabaseMemoryRepository();
const provider = new GeminiProvider();
const memoryManager = new MemoryManager(provider, memoryRepo);
const orchestrator = new AIOrchestrator(provider, undefined, memoryManager);

export const createSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const parsed = SearchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(`Invalid request payload: ${parsed.error.message}`, 400);
    }

    const { query, context } = parsed.data;
    const preferences = await preferenceRepo.get(userId);

    const queryContext = {
      conversationId: context?.conversationId,
      messages: context?.messages || [],
      preferences: preferences || undefined,
    };

    const isStream = req.query.stream === 'true' || req.headers.accept === 'text/event-stream';

    if (isStream) {
      await orchestrator.processQueryStream(userId, { query, context: queryContext }, res);
    } else {
      const result = await orchestrator.processQuery(userId, { query, context: queryContext });
      
      if (!result.success) {
        throw new AppError(result.error || 'AI Search processing failed', 500);
      }

      const searchSessionId = result.report?.id || `search_${Math.random().toString(36).substring(7)}`;
      await searchHistoryRepo.save({
        id: searchSessionId,
        query,
        timestamp: new Date(),
        resultsCount: result.report?.alternatives.length || 0,
        userId,
        results: result.report,
      });

      res.status(200).json({
        success: true,
        data: result.report,
      });
    }
  } catch (error) {
    next(error);
  }
};

export const getSearch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const searchId = req.params.searchId as string;
    if (!searchId) {
      throw new AppError('Invalid search ID format', 400);
    }

    const searchRecord = await searchHistoryRepo.get(searchId);
    if (!searchRecord) {
      throw new AppError('Search record not found', 404);
    }

    res.status(200).json({
      success: true,
      data: searchRecord,
    });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const list = await searchHistoryRepo.listByUser(userId);

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    next(error);
  }
};
