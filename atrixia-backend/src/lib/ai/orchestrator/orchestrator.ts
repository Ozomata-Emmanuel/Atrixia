import { IAIProvider } from '../providers/interface';
import { ProviderFactory } from '../providers/providerFactory';
import { AIRequest, Message } from '../types/ai';
import { MarketplaceManager } from '../marketplace/manager';
import { RankingEngine, RankingResult } from '../ranking/engine';
import { MemoryManager } from '../memory/manager';
import { PromptBuilder } from '../prompt-builder/builder';
import { ReportGenerator, RecommendationReport, AIProductAnalysis } from '../report/generator';
import { SSEStreamCoordinator } from '../streaming/sse';
import { StructuredLogger } from '../logger/logger';
import { ToolRegistry } from '../tools/registry';
import {
  MarketplaceSearchTool,
  RankingTool,
  MemoryTool,
  PreferenceTool,
  VisionTool,
} from '../tools/tools';
import { Response } from 'express';
import { SearchHistoryRepository } from '../../../repositories/searchHistoryRepository';
import { extractIntent, ShoppingIntent } from '../intent/extractor';
import { validateQuery } from '../adapters/querySanitizer';

// Shared repo — lightweight, no connection per instance
const searchHistoryRepo = new SearchHistoryRepository();

export class AIOrchestrator {
  private provider: IAIProvider;
  private manager: MarketplaceManager;
  private memory: MemoryManager;
  private registry: ToolRegistry;

  constructor(provider?: IAIProvider, manager?: MarketplaceManager, memory?: MemoryManager) {
    this.provider = provider || ProviderFactory.getProvider();
    this.manager = manager || new MarketplaceManager();
    this.memory = memory || new MemoryManager(this.provider);
    this.registry = ToolRegistry.getInstance();

    this.registry.registerTool(new MarketplaceSearchTool(this.manager));
    this.registry.registerTool(new RankingTool());
    this.registry.registerTool(new MemoryTool(this.memory));
    this.registry.registerTool(new PreferenceTool());
    this.registry.registerTool(new VisionTool());
  }

  // ─── Non-streaming path ────────────────────────────────────────────────────

  async processQuery(
    userId: string,
    request: AIRequest
  ): Promise<{ success: boolean; report?: RecommendationReport; error?: string; rejection?: string }> {
    const t0 = Date.now();
    const conversationId =
      request.context?.conversationId || `conv_${crypto.randomUUID().slice(0, 8)}`;

    // ── Pre-flight: validate query before spending any resources ─────────────
    const validation = validateQuery(request.query);
    if (!validation.valid) {
      StructuredLogger.warn('[AIOrchestrator] Query rejected', {
        conversationId, userId, metadata: { reason: validation.reason, query: request.query },
      });
      return { success: false, rejection: validation.message, error: validation.message };
    }

    try {
      const [memoryContext, intent] = await Promise.all([
        this.memory.loadContext(userId, conversationId),
        Promise.resolve(this._extractIntent(request.query)),
      ]);

      const preferences = request.context?.preferences ?? memoryContext.preferences;

      // Use preferredMarketplaces from saved prefs if request doesn't specify any
      const resolvedMarketplaces =
        request.context?.marketplaces ??
        (preferences as any)?.preferredMarketplaces ??
        [];

      const rawProducts = await this.manager.searchAll(request.query, {
        currency: preferences?.currency || 'USD',
        marketplaces: resolvedMarketplaces.length > 0 ? resolvedMarketplaces : undefined,
        intent,
      });

      const rankingResult = RankingEngine.rank(rawProducts, preferences, intent?.budgetMax);
      const systemInstruction = PromptBuilder.buildSystemPrompt(
        { ...memoryContext, preferences },
        rawProducts,
        rankingResult
      );
      const messages = PromptBuilder.buildMessages(request.query, memoryContext);

      let aiResult;
      let retryCount = 0;
      while (true) {
        try {
          aiResult = await this.provider.generate(messages, {
            temperature: 0.15,
            systemInstruction,
            responseMimeType: 'application/json',
          });
          JSON.parse(aiResult.text);
          break;
        } catch (jsonErr: any) {
          retryCount++;
          if (retryCount > 1) throw new Error(`AI malformed JSON after retry: ${jsonErr.message}`);
        }
      }

      const rawJson = JSON.parse(aiResult.text);
      const report = ReportGenerator.generate(rankingResult, rawJson.summary || rawJson.recommendation);
      const aiProducts: AIProductAnalysis[] = Array.isArray(rawJson.products) ? rawJson.products : [];
      const enrichedReport = ReportGenerator.mergeAIProductAnalysis(report, aiProducts);

      // Persist — awaited so failures are visible in logs
      try {
        await Promise.all([
          this.memory.appendMessages(conversationId,
            [{ role: 'user', content: request.query },
             { role: 'assistant', content: enrichedReport.executiveSummary }],
            userId
          ),
          searchHistoryRepo.save({
            id: enrichedReport.id,
            query: request.query,
            timestamp: new Date(),
            resultsCount: rawProducts.length,
            userId,
            results: enrichedReport,
          }),
        ]);
      } catch (saveErr: any) {
        // Log but don't fail the response — user still gets their results
        StructuredLogger.warn('[AIOrchestrator] Persist failed (non-fatal)', {
          conversationId, error: saveErr.message,
        });
      }

      StructuredLogger.info('[AIOrchestrator] processQuery complete', {
        userId, conversationId, latencyMs: Date.now() - t0,
        metadata: { products: rawProducts.length },
      });

      return { success: true, report: enrichedReport };
    } catch (err: any) {
      StructuredLogger.error('[AIOrchestrator] processQuery failed', {
        conversationId, userId, error: err.message,
      });
      return { success: false, error: err.message || String(err) };
    }
  }

  // ─── SSE streaming path ────────────────────────────────────────────────────

  async processQueryStream(
    userId: string,
    request: AIRequest,
    res: Response
  ): Promise<void> {
    const stream = new SSEStreamCoordinator(res);
    const t0 = Date.now();
    const conversationId =
      request.context?.conversationId || `conv_${crypto.randomUUID().slice(0, 8)}`;

    // Open SSE connection immediately
    stream.start();

    // ── Pre-flight: validate query ───────────────────────────────────────────
    const validation = validateQuery(request.query);
    if (!validation.valid) {
      StructuredLogger.warn('[AIOrchestrator] Query rejected (stream)', {
        conversationId, userId, metadata: { reason: validation.reason },
      });
      stream.error(validation.message || 'Invalid query', 'QUERY_REJECTED');
      return;
    }

    try {
      // ── Steps 1+2: memory + intent in parallel ────────────────────────────
      stream.step('retrieving_memory', 15, { message: 'Restoring conversation context...' });

      const [memoryContext, intent] = await Promise.all([
        this.memory.loadContext(userId, conversationId),
        Promise.resolve(this._extractIntent(request.query)),
      ]);

      if (intent?.queryWarning) {
        stream.step('thinking', 22, { message: `Note: ${intent.queryWarning}` });
      }

      const preferences = request.context?.preferences ?? memoryContext.preferences;
      stream.step('loading_preferences', 25, { message: 'Preferences loaded.' });

      // Use preferredMarketplaces from saved prefs if request doesn't specify any
      const resolvedMarketplaces =
        request.context?.marketplaces ??
        (preferences as any)?.preferredMarketplaces ??
        [];

      // ── Step 3: marketplace search ────────────────────────────────────────
      stream.step('searching_marketplaces', 30, {
        message: 'Searching Jumia, Konga, Jiji, eBay simultaneously...',
      });

      const rawProducts = await this.manager.searchAll(request.query, {
        currency: preferences?.currency || 'USD',
        marketplaces: resolvedMarketplaces.length > 0 ? resolvedMarketplaces : undefined,
        intent,
      });

      // No products at all — tell user immediately
      if (rawProducts.length === 0) {
        stream.error(
          "No products found across all marketplaces for that query. Try a more specific product name.",
          'NO_PRODUCTS'
        );
        return;
      }

      stream.step('ranking_products', 62, {
        message: `Ranking ${rawProducts.length} products by quality, value, and seller trust...`,
      });

      // ── Step 4: rank + prompt ─────────────────────────────────────────────
      const rankingResult = RankingEngine.rank(rawProducts, preferences, intent?.budgetMax);
      stream.step('analyzing_tradeoffs', 70, { message: 'Formulating trade-off analysis...' });

      const systemInstruction = PromptBuilder.buildSystemPrompt(
        { ...memoryContext, preferences },
        rawProducts,
        rankingResult
      );
      const messages = PromptBuilder.buildMessages(request.query, memoryContext);

      // ── Step 5: AI inference ──────────────────────────────────────────────
      stream.step('generating_explanation', 78, {
        message: 'Gemma is writing your recommendation...',
      });

      let enrichedReport: RecommendationReport;

      try {
        const aiResult = await this.provider.generate(messages, {
          temperature: 0.15,
          systemInstruction,
          responseMimeType: 'application/json',
        });

        stream.step('validating_response', 92, { message: 'Finalising report...' });

        const rawJson = JSON.parse(aiResult.text);
        const report = ReportGenerator.generate(rankingResult, rawJson.summary || rawJson.recommendation);
        const aiProducts: AIProductAnalysis[] = Array.isArray(rawJson.products) ? rawJson.products : [];
        enrichedReport = ReportGenerator.mergeAIProductAnalysis(report, aiProducts);
      } catch (aiErr: any) {
        // AI failed — still return a useful report using deterministic data only
        StructuredLogger.warn('[AIOrchestrator] AI inference failed, using deterministic fallback', {
          conversationId, error: aiErr.message,
        });
        stream.step('validating_response', 92, { message: 'Using deterministic analysis...' });
        enrichedReport = ReportGenerator.generate(
          rankingResult,
          `Found ${rawProducts.length} products across ${[...new Set(rawProducts.map(p => p.marketplace))].join(', ')}. ` +
          `Best match: ${rankingResult.topPick?.title ?? 'N/A'} at ${rankingResult.topPick?.price?.toFixed(2) ?? 'N/A'}.`
        );
      }

      // Persist — awaited so failures surface in logs
      stream.step('saving_results', 96, { message: 'Saving to your history...' });
      try {
        await Promise.all([
          this.memory.appendMessages(conversationId,
            [{ role: 'user', content: request.query },
             { role: 'assistant', content: enrichedReport.executiveSummary }],
            userId
          ),
          searchHistoryRepo.save({
            id: enrichedReport.id,
            query: request.query,
            timestamp: new Date(),
            resultsCount: rawProducts.length,
            userId,
            results: enrichedReport,
          }),
        ]);
      } catch (saveErr: any) {
        StructuredLogger.warn('[AIOrchestrator] Persist failed (non-fatal)', {
          conversationId, error: saveErr.message,
        });
      }

      StructuredLogger.info('[AIOrchestrator] processQueryStream complete', {
        userId, conversationId, latencyMs: Date.now() - t0,
        metadata: { products: rawProducts.length },
      });

      stream.step('recommendation', 99, { report: enrichedReport });
      stream.end({
        message: 'Report ready.',
        report: enrichedReport,
        conversationId,
        searchId: enrichedReport.id,
      });
    } catch (err: any) {
      StructuredLogger.error('[AIOrchestrator] processQueryStream failed', {
        conversationId, userId, error: err.message,
      });
      stream.error(err.message || String(err));
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private _extractIntent(query: string): ShoppingIntent | undefined {
    try {
      return extractIntent(query);
    } catch {
      return undefined;
    }
  }
}
