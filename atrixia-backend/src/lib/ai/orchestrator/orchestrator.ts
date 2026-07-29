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
import { sanitizeQuery } from '../adapters/querySanitizer';
import { extractIntent, ShoppingIntent } from '../intent/extractor';

// Module-level repo instance (shared, lightweight)
const searchHistoryRepo = new SearchHistoryRepository();

// Strict schema mapping for JSON Mode
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

  async processQuery(
    userId: string,
    request: AIRequest
  ): Promise<{ success: boolean; report?: RecommendationReport; error?: string }> {
    const startTime = Date.now();
    const conversationId = request.context?.conversationId || `conv_${Math.random().toString(36).substring(7)}`;
    
    try {
      StructuredLogger.info('[AIOrchestrator] Restoring dialogue memory context...', {
        userId,
        conversationId,
      });

      // 1. Restore memory & preferences
      const memoryContext = await this.registry.executeTool('MemoryTool', {
        userId,
        conversationId,
      });
      const memoryMs = Date.now() - startTime;

      const preferences = await this.registry.executeTool('PreferenceTool', {
        preferences: request.context?.preferences || memoryContext.preferences
      });

      // Stage 1: Fast intent extraction (zero-latency regex, no AI call)
      // Corrects impossible queries, extracts budget, sets price floor + exclusions
      let intent: ShoppingIntent | undefined;
      try {
        intent = extractIntent(request.query);
        if (intent.queryWarning) {
          StructuredLogger.warn('[AIOrchestrator] Query correction:', {
            conversationId, warning: intent.queryWarning,
          });
        }
      } catch (_) {
        // Non-fatal
      }

      // 2. Marketplace search using structured intent
      const searchStart = Date.now();
      const rawProducts = await this.manager.searchAll(request.query, {
        currency: preferences?.currency || 'USD',
        marketplaces: request.context?.marketplaces,
        intent,
      });
      const marketplaceMs = Date.now() - searchStart;

      // 3. Score and Rank — pass budgetMax so price scoring is budget-aware
      const rankStart = Date.now();
      const rankingResult: RankingResult = RankingEngine.rank(
        rawProducts, preferences, intent?.budgetMax
      );
      const rankingMs = Date.now() - rankStart;
      // 4. Build Dynamically composed Prompt
      const systemInstruction = PromptBuilder.buildSystemPrompt(
        { ...memoryContext, preferences },
        rawProducts,
        rankingResult
      );
      const messages = PromptBuilder.buildMessages(request.query, memoryContext);

      // 5. Invoke Gemini with structured JSON Mode constraints
      const inferenceStart = Date.now();
      let retryCount = 0;
      let aiResult;
      
      while (true) {
        try {
          aiResult = await this.provider.generate(messages, {
            temperature: 0.15,
            systemInstruction,
            responseMimeType: 'application/json',
            // responseSchema, // Disabled to prevent fetch failed timeout with Gemma
          });
          
          // Verify JSON structure parses
          JSON.parse(aiResult.text);
          break;
        } catch (jsonErr: any) {
          retryCount++;
          if (retryCount > 1) {
            throw new Error(`Inference returned malformed JSON response schema after retry: ${jsonErr.message}`);
          }
          StructuredLogger.warn('[AIOrchestrator] Gemini JSON parsing failed, retrying once...', {
            conversationId,
            error: jsonErr.message,
          });
        }
      }
      
      const inferenceMs = Date.now() - inferenceStart;

      // 6. Generate structured Recommendation Report
      const validationStart = Date.now();
      const rawJson = JSON.parse(aiResult.text);
      const report = ReportGenerator.generate(rankingResult, rawJson.summary || rawJson.recommendation);

      // Merge per-product AI analysis into the report
      const aiProducts: AIProductAnalysis[] = Array.isArray(rawJson.products) ? rawJson.products : [];
      const enrichedReport = ReportGenerator.mergeAIProductAnalysis(report, aiProducts);
      const validationMs = Date.now() - validationStart;

      // 7. Persist responses to memory
      const persistStart = Date.now();
      const outgoingMessages: Message[] = [
        { role: 'user', content: request.query },
        { role: 'assistant', content: enrichedReport.executiveSummary },
      ];
      await this.memory.appendMessages(conversationId, outgoingMessages);
      const persistMs = Date.now() - persistStart;

      StructuredLogger.info('[AIOrchestrator] Workflow executed cleanly.', {
        userId,
        conversationId,
        latencyMs: Date.now() - startTime,
        metadata: {
          promptTokens: 0, // SDK handles this internally
          retryCount,
        },
        timing: {
          memoryMs,
          marketplaceMs,
          rankingMs,
          inferenceMs,
          validationMs,
          persistMs,
        },
      });

      return {
        success: true,
        report: enrichedReport,
      };
    } catch (err: any) {
      StructuredLogger.error('[AIOrchestrator] Workflow exception encountered.', {
        conversationId,
        userId,
        error: {
          code: 'ORCHESTRATOR_WORKFLOW_ERROR',
          message: err.message || String(err),
          stack: err.stack,
        },
      });

      return {
        success: false,
        error: err.message || String(err),
      };
    }
  }

  async processQueryStream(
    userId: string,
    request: AIRequest,
    res: Response
  ): Promise<void> {
    const stream = new SSEStreamCoordinator(res);
    const conversationId = request.context?.conversationId || `conv_${Math.random().toString(36).substring(7)}`;
    
    // Initialize SSE headers + flush immediately so the client connection opens
    stream.start();

    try {
      // 1. Load memory
      stream.step('retrieving_memory', 15, { message: 'Conversation memory context restored.' });
      const memoryContext = await this.memory.loadContext(userId, conversationId);

      // 2. Preferences
      stream.step('loading_preferences', 25, { message: 'Active priority preferences restored.' });
      const preferences = request.context?.preferences || memoryContext.preferences;

      // 3. Stage 1: Fast intent extraction (zero-latency regex, no AI call)
      let streamIntent: ShoppingIntent | undefined;
      try {
        streamIntent = extractIntent(request.query);
        if (streamIntent.queryWarning) {
          stream.step('thinking', 35, { message: `Note: ${streamIntent.queryWarning}` });
        }
      } catch (_) {
        // Non-fatal
      }

      // 4. Search all marketplaces with structured intent
      stream.step('searching_marketplaces', 40, { message: 'Concurrently searching online catalogs...' });
      const rawProducts = await this.manager.searchAll(request.query, {
        currency: preferences?.currency || 'USD',
        marketplaces: request.context?.marketplaces,
        intent: streamIntent,
      });

      // 5. Quality-first ranking with budget awareness
      stream.step('ranking_products', 65, { message: 'Ranking candidates by quality, seller trust, and value...' });
      const rankingResult = RankingEngine.rank(rawProducts, preferences, streamIntent?.budgetMax);
      // 6. Build Dynamic composed Prompt
      stream.step('analyzing_tradeoffs', 75, { message: 'Formulating trade-off analysis...' });
      const systemInstruction = PromptBuilder.buildSystemPrompt(
        { ...memoryContext, preferences },
        rawProducts,
        rankingResult
      );
      const messages = PromptBuilder.buildMessages(request.query, memoryContext);

      // 7. Invoke Gemini JSON mode
      stream.step('generating_explanation', 85, { message: 'Compiling structured shopping response...' });
      const aiResult = await this.provider.generate(messages, {
        temperature: 0.15,
        systemInstruction,
        responseMimeType: 'application/json',
        // responseSchema, // Disabled to prevent fetch failed timeout with Gemma
      });

      // 8. Validate output
      stream.step('validating_response', 92, { message: 'Validating structural schemas...' });
      const rawJson = JSON.parse(aiResult.text);
      const report = ReportGenerator.generate(rankingResult, rawJson.summary || rawJson.recommendation);

      // Merge per-product AI analysis
      const aiProducts: AIProductAnalysis[] = Array.isArray(rawJson.products) ? rawJson.products : [];
      const enrichedReport = ReportGenerator.mergeAIProductAnalysis(report, aiProducts);

      // 9. Persist to DB + memory
      stream.step('saving_results', 98, { message: 'Saving results to database...' });

      const outgoingMessages: Message[] = [
        { role: 'user', content: request.query },
        { role: 'assistant', content: enrichedReport.executiveSummary },
      ];
      await this.memory.appendMessages(conversationId, outgoingMessages);

      // Persist the full report to the searches table
      await searchHistoryRepo.save({
        id: enrichedReport.id,
        query: request.query,
        timestamp: new Date(),
        resultsCount: rawProducts.length,
        userId,
        results: enrichedReport,
      }).catch((err: any) => {
        StructuredLogger.warn('[AIOrchestrator] Failed to persist search to DB:', {
          conversationId,
          error: err.message,
        });
      });

      stream.step('recommendation', 99, { report: enrichedReport });
      stream.end({ message: 'Decision report compiled successfully.', report: enrichedReport, conversationId });
    } catch (err: any) {
      StructuredLogger.error('[AIOrchestrator] Stream workflow failed:', {
        conversationId,
        userId,
        error: err.message,
      });
      stream.error(err.message || String(err));
    }
  }
}
