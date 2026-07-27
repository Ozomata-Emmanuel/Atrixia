import { MarketplaceRegistry } from './registry';
import { MarketplaceNormalizer } from './normalizer';
import { IMarketplaceCache, InMemoryMarketplaceCache } from './cache';
import { NormalizedProduct } from '../models/product';
import { TimeoutError } from './errors';

export class MarketplaceManager {
  private registry: MarketplaceRegistry;
  private cache: IMarketplaceCache;
  private defaultTimeoutMs = 4000;

  constructor(registry?: MarketplaceRegistry, cache?: IMarketplaceCache) {
    this.registry = registry || MarketplaceRegistry.getInstance();
    this.cache = cache || new InMemoryMarketplaceCache();
  }

  private async searchWithTimeout(
    adapterName: string,
    query: string,
    options?: { category?: string; region?: string },
    timeoutMs = this.defaultTimeoutMs
  ): Promise<NormalizedProduct[]> {
    const adapter = this.registry.getAdapter(adapterName);
    if (!adapter) {
      return [];
    }

    const searchPromise = adapter.search(query, options);
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Request to ${adapterName} timed out after ${timeoutMs}ms`, adapterName));
      }, timeoutMs);
    });

    return Promise.race([searchPromise, timeoutPromise]);
  }

  async searchAll(
    query: string,
    options?: { category?: string; region?: string; currency?: string; timeoutMs?: number }
  ): Promise<NormalizedProduct[]> {
    const targetCurrency = options?.currency || 'USD';
    const timeout = options?.timeoutMs || this.defaultTimeoutMs;

    const queryHash = Buffer.from(`${query}_${options?.category || ''}_${options?.region || ''}_${targetCurrency}`).toString('base64');
    const cached = await this.cache.get(queryHash);
    if (cached) {
      return cached;
    }

    const adapters = this.registry.getActiveAdapters();
    if (adapters.length === 0) {
      return [];
    }

    const searchTasks = adapters.map(async (adapter) => {
      try {
        const results = await this.searchWithTimeout(adapter.marketplaceName, query, options, timeout);
        return results.map((p) => MarketplaceNormalizer.normalizeProduct(p, targetCurrency));
      } catch (error: any) {
        console.warn(`[MarketplaceManager] Adapter ${adapter.marketplaceName} failed: ${error.message || error}`);
        return []; 
      }
    });

    const outcomes = await Promise.allSettled(searchTasks);
    const aggregatedResults: NormalizedProduct[] = [];

    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled') {
        aggregatedResults.push(...outcome.value);
      }
    }

    const finalResults = MarketplaceNormalizer.deduplicateProducts(aggregatedResults);
    await this.cache.set(queryHash, finalResults);

    return finalResults;
  }
}
