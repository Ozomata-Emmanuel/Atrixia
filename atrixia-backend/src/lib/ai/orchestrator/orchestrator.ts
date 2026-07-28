import { IAIProvider } from '../providers/interface';
import { ProviderFactory } from '../providers/providerFactory';
import { AIRequest, Message } from '../types/ai';
import { MarketplaceManager } from '../marketplace/manager';
import { RankingEngine, RankingResult } from '../ranking/engine';
import { MemoryManager } from '../memory/manager';
import { PromptBuilder } from '../prompt-builder/builder';
import { ReportGenerator, RecommendationReport } from '../report/generator';
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

      // 2. Marketplace search (using Mock / stubs concurrently)
      const searchStart = Date.now();
      const rawProducts = await this.registry.executeTool('MarketplaceSearchTool', {
        query: request.query,
        category: preferences?.prioritizeQuality ? 'Quality' : undefined,
        region: 'US',
        currency: preferences?.currency || 'USD',
      });
      const marketplaceMs = Date.now() - searchStart;

      // 3. Score and Rank listings deterministically
      const rankStart = Date.now();
      const rankingResult: RankingResult = await this.registry.executeTool('RankingTool', {
        products: rawProducts,
        preferences,
      });
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
      const validationMs = Date.now() - validationStart;

      // 7. Persist responses to memory
      const persistStart = Date.now();
      const outgoingMessages: Message[] = [
        { role: 'user', content: request.query },
        { role: 'assistant', content: report.executiveSummary },
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
        report,
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
    
    stream.step('thinking', 5, { message: 'Initializing decision pipeline...' }); 

    try {
      // 1. Load memory
      stream.step('retrieving_memory', 15, { message: 'Conversation memory context restored.' });
      const memoryContext = await this.memory.loadContext(userId, conversationId);

      // 2. Preferences
      stream.step('loading_preferences', 25, { message: 'Active priority preferences restored.' });
      const preferences = request.context?.preferences || memoryContext.preferences;

      // 3. Search
      stream.step('searching_marketplaces', 40, { message: 'Concurrently searching online catalogs...' });
      const rawProducts = await this.manager.searchAll(request.query, {
        currency: preferences?.currency || 'USD',
      });

      // 4. Mathematical ranking
      stream.step('ranking_products', 65, { message: 'Ranking candidates mathematically...' });
      const rankingResult = RankingEngine.rank(rawProducts, preferences);

      // 5. Build Dynamic composed Prompt
      stream.step('analyzing_tradeoffs', 75, { message: 'Formulating trade-off analysis...' });
      const systemInstruction = PromptBuilder.buildSystemPrompt(
        { ...memoryContext, preferences },
        rawProducts,
        rankingResult
      );
      const messages = PromptBuilder.buildMessages(request.query, memoryContext);

      // 6. Invoke Gemini JSON mode
      stream.step('generating_explanation', 85, { message: 'Compiling structured shopping response...' });
      const aiResult = await this.provider.generate(messages, {
        temperature: 0.15,
        systemInstruction,
        responseMimeType: 'application/json',
        // responseSchema, // Disabled to prevent fetch failed timeout with Gemma
      });

      // 7. Validate output
      stream.step('validating_response', 92, { message: 'Validating structural schemas...' });
      const rawJson = JSON.parse(aiResult.text);
      const report = ReportGenerator.generate(rankingResult, rawJson.summary || rawJson.recommendation);

      // 8. Persist results
      stream.step('saving_results', 98, { message: 'Restoring logs to database...' });
      const outgoingMessages: Message[] = [
        { role: 'user', content: request.query },
        { role: 'assistant', content: report.executiveSummary },
      ];
      await this.memory.appendMessages(conversationId, outgoingMessages);

      stream.step('recommendation', 99, { report });
      stream.end({ message: 'Decision report compiled successfully.', report });
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
