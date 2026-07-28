import { MarketplaceRegistry } from './registry';
import { MarketplaceNormalizer } from './normalizer';
import { IMarketplaceCache, InMemoryMarketplaceCache } from './cache';
import { NormalizedProduct } from '../models/product';
import { TimeoutError } from './errors';

// Default product limits
const DEFAULT_PER_MARKETPLACE = 3;   // when no marketplace specified
const PREFERRED_PER_MARKETPLACE = 6; // for user-specified marketplaces
const FILL_PER_MARKETPLACE = 2;      // other marketplaces fill remaining slots
const TOTAL_PRODUCT_CAP = 15;        // hard ceiling across all marketplaces

export class MarketplaceManager {
  private registry: MarketplaceRegistry;
  private cache: IMarketplaceCache;
  private defaultTimeoutMs = 30000;

  constructor(registry?: MarketplaceRegistry, cache?: IMarketplaceCache) {
    this.registry = registry || MarketplaceRegistry.getInstance();
    this.cache = cache || new InMemoryMarketplaceCache();
  }

  /** Returns names of all registered + enabled adapters */
  getAvailableMarketplaces(): string[] {
    return this.registry.getActiveAdapters().map((a) => a.marketplaceName);
  }

  private async searchWithTimeout(
    adapterName: string,
    query: string,
    options?: { category?: string; region?: string },
    timeoutMs = this.defaultTimeoutMs
  ): Promise<NormalizedProduct[]> {
    const adapter = this.registry.getAdapter(adapterName);
    if (!adapter) return [];

    return Promise.race([
      adapter.search(query, options),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(`Request to ${adapterName} timed out after ${timeoutMs}ms`, adapterName)),
          timeoutMs
        )
      ),
    ]);
  }

  async searchAll(
    query: string,
    options?: {
      category?: string;
      region?: string;
      currency?: string;
      timeoutMs?: number;
      /**
       * Optional list of user-preferred marketplaces.
       * - Preferred ones get up to PREFERRED_PER_MARKETPLACE (6) results.
       * - All others fill remaining slots with FILL_PER_MARKETPLACE (2) each.
       * - If empty/undefined, all get DEFAULT_PER_MARKETPLACE (3) each.
       */
      marketplaces?: string[];
    }
  ): Promise<NormalizedProduct[]> {
    const targetCurrency = options?.currency || 'USD';
    const timeout = options?.timeoutMs || this.defaultTimeoutMs;
    const preferred = (options?.marketplaces || []).map((m) => m.toLowerCase());
    const hasPreference = preferred.length > 0;

    const cacheKey = `${query}|${options?.category || ''}|${targetCurrency}|${preferred.join(',')}`;
    const queryHash = Buffer.from(cacheKey).toString('base64');
    const cached = await this.cache.get(queryHash);
    if (cached) {
      console.log(`[MarketplaceManager] Cache hit for "${query}"`);
      return cached;
    }

    const allAdapters = this.registry.getActiveAdapters();
    if (allAdapters.length === 0) return [];

    // Determine per-adapter limit based on whether user specified preferences
    const getLimit = (adapterName: string): number => {
      if (!hasPreference) return DEFAULT_PER_MARKETPLACE;
      return preferred.includes(adapterName.toLowerCase())
        ? PREFERRED_PER_MARKETPLACE
        : FILL_PER_MARKETPLACE;
    };

    // Run all adapters in parallel
    const searchTasks = allAdapters.map(async (adapter) => {
      const limit = getLimit(adapter.marketplaceName);
      try {
        const results = await this.searchWithTimeout(adapter.marketplaceName, query, options, timeout);
        const normalised = results
          .map((p) => MarketplaceNormalizer.normalizeProduct(p, targetCurrency))
          .slice(0, limit);
        console.log(`[MarketplaceManager] ${adapter.marketplaceName}: ${normalised.length}/${limit} products`);
        return normalised;
      } catch (error: any) {
        console.warn(`[MarketplaceManager] ${adapter.marketplaceName} failed: ${error.message || error}`);
        return [];
      }
    });

    const outcomes = await Promise.allSettled(searchTasks);
    const aggregated: NormalizedProduct[] = [];

    for (const outcome of outcomes) {
      if (outcome.status === 'fulfilled') {
        aggregated.push(...outcome.value);
      }
    }

    // Deduplicate then cap total
    const deduped = MarketplaceNormalizer.deduplicateProducts(aggregated);
    const finalResults = deduped.slice(0, TOTAL_PRODUCT_CAP);

    console.log(`[MarketplaceManager] Final: ${finalResults.length} products from ${allAdapters.length} marketplace(s) | preferred: [${preferred.join(', ') || 'all'}]`);

    await this.cache.set(queryHash, finalResults);
    return finalResults;
  }
}
