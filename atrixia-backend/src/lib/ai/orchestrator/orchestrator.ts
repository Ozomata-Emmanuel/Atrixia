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
  ): Promise<{ success: boolean; report?: RecommendationReport; error?: string }> {
    const t0 = Date.now();
    const conversationId =
      request.context?.conversationId || `conv_${crypto.randomUUID().slice(0, 8)}`;

    try {
      // ── Step 1+2: load memory + extract intent in parallel ────────────────
      const [memoryContext, intent] = await Promise.all([
        this.memory.loadContext(userId, conversationId),
        Promise.resolve(this._extractIntent(request.query)),
      ]);

      if (intent?.queryWarning) {
        StructuredLogger.warn('[AIOrchestrator] Query correction applied', {
          conversationId,
          warning: intent.queryWarning,
        });
      }

      const preferences = request.context?.preferences ?? memoryContext.preferences;

      // ── Step 3: parallel marketplace search ───────────────────────────────
      const rawProducts = await this.manager.searchAll(request.query, {
        currency: preferences?.currency || 'USD',
        marketplaces: request.context?.marketplaces,
        intent,
      });

      // ── Step 4: rank + build prompt (CPU-only, instant) ───────────────────
      const rankingResult = RankingEngine.rank(rawProducts, preferences, intent?.budgetMax);
      const systemInstruction = PromptBuilder.buildSystemPrompt(
        { ...memoryContext, preferences },
        rawProducts,
        rankingResult
      );
      const messages = PromptBuilder.buildMessages(request.query, memoryContext);

      // ── Step 5: AI inference ──────────────────────────────────────────────
      let aiResult;
      let retryCount = 0;
      while (true) {
        try {
          aiResult = await this.provider.generate(messages, {
            temperature: 0.15,
            systemInstruction,
            responseMimeType: 'application/json',
          });
          JSON.parse(aiResult.text); // validate
          break;
        } catch (jsonErr: any) {
          retryCount++;
          if (retryCount > 1) {
            throw new Error(`AI returned malformed JSON after retry: ${jsonErr.message}`);
          }
          StructuredLogger.warn('[AIOrchestrator] JSON parse failed, retrying once', {
            conversationId,
            error: jsonErr.message,
          });
        }
      }

      // ── Step 6: build report ──────────────────────────────────────────────
      const rawJson = JSON.parse(aiResult.text);
      const report = ReportGenerator.generate(
        rankingResult,
        rawJson.summary || rawJson.recommendation
      );
      const aiProducts: AIProductAnalysis[] = Array.isArray(rawJson.products)
        ? rawJson.products
        : [];
      const enrichedReport = ReportGenerator.mergeAIProductAnalysis(report, aiProducts);

      // ── Step 7: persist memory + search history in parallel ───────────────
      await Promise.all([
        this.memory.appendMessages(
          conversationId,
          [
            { role: 'user', content: request.query },
            { role: 'assistant', content: enrichedReport.executiveSummary },
          ],
          userId
        ),
        searchHistoryRepo
          .save({
            id: enrichedReport.id,
            query: request.query,
            timestamp: new Date(),
            resultsCount: rawProducts.length,
            userId,
            results: enrichedReport,
          })
          .catch((err: any) =>
            StructuredLogger.warn('[AIOrchestrator] Search history save failed', {
              conversationId,
              error: err.message,
            })
          ),
      ]);

      StructuredLogger.info('[AIOrchestrator] processQuery complete', {
        userId,
        conversationId,
        latencyMs: Date.now() - t0,
        products: rawProducts.length,
        retryCount,
      });

      return { success: true, report: enrichedReport };
    } catch (err: any) {
      StructuredLogger.error('[AIOrchestrator] processQuery failed', {
        conversationId,
        userId,
        error: err.message,
        stack: err.stack,
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

    // Open SSE connection immediately — client sees activity right away
    stream.start();

    try {
      // ── Steps 1+2: memory + intent extraction in parallel ─────────────────
      // These two have zero dependency on each other — run together
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

      // ── Step 3: marketplace search (the slow part — all adapters in parallel)
      stream.step('searching_marketplaces', 30, {
        message: 'Searching Jumia, Konga, Jiji, eBay simultaneously...',
      });

      const rawProducts = await this.manager.searchAll(request.query, {
        currency: preferences?.currency || 'USD',
        marketplaces: request.context?.marketplaces,
        intent,
      });

      stream.step('ranking_products', 62, {
        message: `Ranking ${rawProducts.length} products by quality, value, and seller trust...`,
      });

      // ── Step 4: rank + build prompt (instant, CPU-only) ───────────────────
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

      const aiResult = await this.provider.generate(messages, {
        temperature: 0.15,
        systemInstruction,
        responseMimeType: 'application/json',
      });

      // ── Step 6: build report ──────────────────────────────────────────────
      stream.step('validating_response', 92, { message: 'Finalising report...' });

      const rawJson = JSON.parse(aiResult.text);
      const report = ReportGenerator.generate(
        rankingResult,
        rawJson.summary || rawJson.recommendation
      );
      const aiProducts: AIProductAnalysis[] = Array.isArray(rawJson.products)
        ? rawJson.products
        : [];
      const enrichedReport = ReportGenerator.mergeAIProductAnalysis(report, aiProducts);

      // ── Step 7: persist memory + search history in parallel ───────────────
      stream.step('saving_results', 96, { message: 'Saving to your history...' });

      await Promise.all([
        this.memory.appendMessages(
          conversationId,
          [
            { role: 'user', content: request.query },
            { role: 'assistant', content: enrichedReport.executiveSummary },
          ],
          userId
        ),
        searchHistoryRepo
          .save({
            id: enrichedReport.id,
            query: request.query,
            timestamp: new Date(),
            resultsCount: rawProducts.length,
            userId,
            results: enrichedReport,
          })
          .catch((err: any) =>
            StructuredLogger.warn('[AIOrchestrator] History save failed', {
              conversationId,
              error: err.message,
            })
          ),
      ]);

      StructuredLogger.info('[AIOrchestrator] processQueryStream complete', {
        userId,
        conversationId,
        latencyMs: Date.now() - t0,
        products: rawProducts.length,
      });

      // Emit the full report — include conversationId + searchId for frontend linking
      stream.step('recommendation', 99, { report: enrichedReport });
      stream.end({
        message: 'Report ready.',
        report: enrichedReport,
        conversationId,
        searchId: enrichedReport.id,  // lets frontend call GET /api/search/:id later
      });
    } catch (err: any) {
      StructuredLogger.error('[AIOrchestrator] processQueryStream failed', {
        conversationId,
        userId,
        error: err.message,
      });
      stream.error(err.message || String(err));
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private _extractIntent(query: string): ShoppingIntent | undefined {
    try {
      return require('../intent/extractor').extractIntent(query);
    } catch {
      return undefined;
    }
  }
}
