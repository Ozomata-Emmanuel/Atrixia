import { IAIProvider } from '../providers/interface';
import { GeminiProvider } from '../providers/gemini';
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

export class AIOrchestrator {
  private provider: IAIProvider;
  private manager: MarketplaceManager;
  private memory: MemoryManager;
  private registry: ToolRegistry;

  constructor(provider?: IAIProvider, manager?: MarketplaceManager, memory?: MemoryManager) {
    this.provider = provider || new GeminiProvider();
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
      StructuredLogger.info('[AIOrchestrator] Starting decision engine workflow...', {
        userId,
        conversationId,
      });

      const memoryContext = await this.registry.executeTool('MemoryTool', {
        userId,
        conversationId,
      });
      StructuredLogger.info('[AIOrchestrator] Context memory loaded successfully.', {
        conversationId,
      });

      const searchStart = Date.now();
      const rawProducts = await this.registry.executeTool('MarketplaceSearchTool', {
        query: request.query,
        category: request.context?.preferences?.prioritizeQuality ? 'Quality' : undefined,
        region: 'US',
        currency: request.context?.preferences?.currency || 'USD',
      });
      const marketplaceMs = Date.now() - searchStart;
      StructuredLogger.info('[AIOrchestrator] Marketplace search retrieved listings.', {
        conversationId,
        metadata: { resultsCount: rawProducts.length },
      });

      const rankStart = Date.now();
      const rankingResult: RankingResult = await this.registry.executeTool('RankingTool', {
        products: rawProducts,
        preferences: request.context?.preferences || memoryContext.preferences,
      });
      const rankingMs = Date.now() - rankStart;
      StructuredLogger.info('[AIOrchestrator] Mathematical product ranking complete.', {
        conversationId,
        metadata: {
          topPick: rankingResult.topPick?.title || null,
          confidence: rankingResult.confidenceScore,
        },
      });

      const systemInstruction = PromptBuilder.buildSystemPrompt(
        { ...memoryContext, preferences: request.context?.preferences || memoryContext.preferences },
        rawProducts,
        rankingResult
      );

      const messages = PromptBuilder.buildMessages(request.query, memoryContext);

      const inferenceStart = Date.now();
      const aiResult = await this.provider.generate(messages, {
        temperature: 0.2,
        systemInstruction,
      });
      const inferenceMs = Date.now() - inferenceStart;
      StructuredLogger.info('[AIOrchestrator] Generative text summary received.', {
        conversationId,
      });

      const report = ReportGenerator.generate(rankingResult, aiResult.text);

      const outgoingMessages: Message[] = [
        { role: 'user', content: request.query },
        { role: 'assistant', content: report.executiveSummary },
      ];
      await this.memory.appendMessages(conversationId, outgoingMessages);

      StructuredLogger.info('[AIOrchestrator] Workflow executed cleanly.', {
        userId,
        conversationId,
        latencyMs: Date.now() - startTime,
        timing: {
          marketplaceMs,
          rankingMs,
          inferenceMs,
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
    stream.start(); 

    try {
      stream.step('memory_loaded', 15, { message: 'Conversation memory context restored.' });
      const memoryContext = await this.memory.loadContext(userId, conversationId);

      stream.step('marketplace_started', 30, { message: 'Searching online stores...' });
      const rawProducts = await this.manager.searchAll(request.query, {
        currency: request.context?.preferences?.currency || 'USD',
      });
      
      stream.step('amazon_complete', 45, { message: 'Amazon catalog parsing finished.' });
      stream.step('jumia_complete', 60, { message: 'Jumia product catalog parsed.' });
      stream.step('ebay_complete', 70, { message: 'eBay listings aggregated.' });

      stream.step('ranking_started', 75, { message: 'Sorting recommendations...' });
      const rankingResult = RankingEngine.rank(rawProducts, request.context?.preferences || memoryContext.preferences);
      stream.step('ranking_finished', 80, {
        message: 'Top items determined.',
        topPick: rankingResult.topPick?.title || null,
      });

      stream.step('ai_reasoning', 85, { message: 'Formulating trade-off report...' });
      const systemInstruction = PromptBuilder.buildSystemPrompt(
        { ...memoryContext, preferences: request.context?.preferences || memoryContext.preferences },
        rawProducts,
        rankingResult
      );
      const messages = PromptBuilder.buildMessages(request.query, memoryContext);

      const aiResult = await this.provider.generate(messages, {
        temperature: 0.2,
        systemInstruction,
      });

      const report = ReportGenerator.generate(rankingResult, aiResult.text);

      const outgoingMessages: Message[] = [
        { role: 'user', content: request.query },
        { role: 'assistant', content: report.executiveSummary },
      ];
      await this.memory.appendMessages(conversationId, outgoingMessages);

      stream.step('recommendation', 95, { report });
      stream.end({ message: 'Decision report compiled successfully.' });
    } catch (err: any) {
      console.error('[AIOrchestrator] Stream workflow failed:', err);
      stream.error(err.message || String(err));
    }
  }
}
