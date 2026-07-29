import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError } from '../utils/error';
import { AIOrchestrator } from '../lib/ai/orchestrator/orchestrator';
import { SearchRequestSchema } from '../lib/ai/schemas/request';
import { PreferenceRepository } from '../repositories/preferenceRepository';
import { SearchHistoryRepository } from '../repositories/searchHistoryRepository';
import { DatabaseMemoryRepository } from '../repositories/databaseMemoryRepository';
import { MemoryManager } from '../lib/ai/memory/manager';
import { ProviderFactory } from '../lib/ai/providers/providerFactory';
import { MarketplaceManager } from '../lib/ai/marketplace/manager';

const preferenceRepo = new PreferenceRepository();
const searchHistoryRepo = new SearchHistoryRepository();
const memoryRepo = new DatabaseMemoryRepository();
const provider = ProviderFactory.getProvider();
const memoryManager = new MemoryManager(provider, memoryRepo);
const marketplaceManager = new MarketplaceManager();
const orchestrator = new AIOrchestrator(provider, marketplaceManager, memoryManager);

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

    const { query, context, marketplaces } = parsed.data;
    const preferences = await preferenceRepo.get(userId);

    // Merge marketplaces — top-level field takes priority over context field
    const resolvedMarketplaces = marketplaces || context?.marketplaces;

    const queryContext = {
      conversationId: context?.conversationId,
      messages: context?.messages || [],
      preferences: preferences || undefined,
      marketplaces: resolvedMarketplaces,
    };

    const isStream = req.query.stream === 'true' || req.headers.accept === 'text/event-stream';

    if (isStream) {
      await orchestrator.processQueryStream(userId, { query, context: queryContext }, res);
    } else {
      const result = await orchestrator.processQuery(userId, { query, context: queryContext });

      if (!result.success) {
        throw new AppError(result.error || 'AI Search processing failed', 500);
      }

      // processQuery already persists to history internally — no double-save needed
      res.status(200).json({
        success: true,
        data: {
          ...result.report,
          conversationId: queryContext.conversationId,
          searchId: result.report?.id,
        },
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
    if (!userId) throw new AppError('Unauthorized', 401);

    const list = await searchHistoryRepo.listByUser(userId);

    // Shape the response like a ChatGPT sidebar:
    // Each item has an id, the query as "title", a short preview, timestamp,
    // and the top recommendation so the user can see what they found at a glance.
    const data = list.map((item: any) => ({
      id: item.id,
      title: item.query,
      preview: item.summary?.executiveSummary?.slice(0, 120) || null,
      bestOverall: item.summary?.bestOverall
        ? {
            title: item.summary.bestOverall.title,
            price: item.summary.bestOverall.price,
            currency: item.summary.bestOverall.currency,
            image: item.summary.bestOverall.image,
            marketplace: item.summary.bestOverall.marketplace,
          }
        : null,
      resultsCount: item.resultsCount,
      createdAt: item.timestamp,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/search/marketplaces
 * Returns the list of available marketplace names the client can filter by.
 * No auth required — safe to call before login for the marketplace picker UI.
 */
export const getMarketplaces = (_req: AuthRequest, res: Response) => {
  const available = marketplaceManager.getAvailableMarketplaces();

  // Enrich with display metadata for the frontend picker
  const metadata: Record<string, { label: string; region: string; description: string }> = {
    jumia:      { label: 'Jumia',       region: 'Nigeria / Africa',  description: 'Leading African e-commerce marketplace' },
    konga:      { label: 'Konga',       region: 'Nigeria',           description: 'Nigerian online shopping platform' },
    jiji:       { label: 'Jiji',        region: 'Nigeria / Africa',  description: 'Top classifieds marketplace for new & used items' },
    ebay:       { label: 'eBay',        region: 'US / Global',       description: 'Global marketplace with new & used items' },
    aliexpress: { label: 'AliExpress',  region: 'Global',            description: 'Affordable products shipped worldwide' },
    temu:       { label: 'Temu',        region: 'US / Global',       description: 'Budget-friendly products from global sellers' },
  };

  const marketplaces = available.map((name) => ({
    id: name,
    ...(metadata[name] || { label: name, region: 'Global', description: '' }),
  }));

  res.status(200).json({
    success: true,
    data: marketplaces,
  });
};

/**
 * GET /api/search/conversations
 * Returns all conversation threads for the authenticated user (chat history).
 */
export const getConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { ConversationRepository } = await import('../repositories/conversationRepository');
    const convRepo = new ConversationRepository();
    const threads = await convRepo.listByUser(userId);

    // Return summary view — don't send all message bodies by default
    const data = threads.map(t => ({
      conversationId: t.conversationId,
      messageCount: t.messages.length,
      lastMessage: t.messages[t.messages.length - 1]?.content?.slice(0, 80) || '',
      summary: t.summary || null,
      updatedAt: t.updatedAt,
      createdAt: t.createdAt,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/search/conversations/:conversationId
 * Returns the full message thread for a specific conversation.
 */
export const getConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('Unauthorized', 401);

    const { conversationId } = req.params;
    if (!conversationId) throw new AppError('conversationId is required', 400);

    const { ConversationRepository } = await import('../repositories/conversationRepository');
    const convRepo = new ConversationRepository();
    const thread = await convRepo.get(conversationId);

    if (!thread) throw new AppError('Conversation not found', 404);
    if (thread.userId && thread.userId !== userId) throw new AppError('Forbidden', 403);

    res.status(200).json({ success: true, data: thread });
  } catch (error) {
    next(error);
  }
};
