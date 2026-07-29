import { MarketplaceRegistry } from './registry';
import { MarketplaceNormalizer } from './normalizer';
import { IMarketplaceCache, InMemoryMarketplaceCache } from './cache';
import { NormalizedProduct } from '../models/product';
import { TimeoutError } from './errors';
import { ShoppingIntent } from '../intent/extractor';

// Default product limits
const DEFAULT_PER_MARKETPLACE = 3;
const PREFERRED_PER_MARKETPLACE = 6;
const FILL_PER_MARKETPLACE = 2;
const TOTAL_PRODUCT_CAP = 15;
const MIN_PRODUCTS_THRESHOLD = 4;

export class MarketplaceManager {
  private registry: MarketplaceRegistry;
  private cache: IMarketplaceCache;
  private defaultTimeoutMs = 30000;

  constructor(registry?: MarketplaceRegistry, cache?: IMarketplaceCache) {
    this.registry = registry || MarketplaceRegistry.getInstance();
    this.cache = cache || new InMemoryMarketplaceCache();
  }

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

  private filterAccessories(
    products: NormalizedProduct[],
    excludeKeywords: string[]
  ): NormalizedProduct[] {
    if (!excludeKeywords.length) return products;
    const lower = excludeKeywords.map((k) => k.toLowerCase());
    return products.filter((p) => {
      const title = p.title.toLowerCase();
      return !lower.some((kw) => title.includes(kw));
    });
  }

  /**
   * Removes products whose price is an outlier (< 5% of the median price).
   * This catches clearly fake or scam listings like "iPhone 17 Pro Max" at $12.
   */
  private filterPriceOutliers(products: NormalizedProduct[]): NormalizedProduct[] {
    if (products.length < 3) return products;

    const prices = [...products].map(p => p.price).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    const minPlausible = median * 0.08; // anything less than 8% of median is suspicious

    const filtered = products.filter(p => {
      if (p.price < minPlausible) {
        console.warn(`[MarketplaceManager] Filtering price outlier: "${p.title.slice(0, 50)}" at $${p.price} (median: $${median})`);
        return false;
      }
      return true;
    });

    return filtered.length > 0 ? filtered : products; // never return empty
  }

  private async runSearch(
    query: string,
    options: {
      category?: string;
      region?: string;
      currency?: string;
      timeoutMs?: number;
      marketplaces?: string[];
    },
    limitPerMarketplace: (name: string) => number
  ): Promise<NormalizedProduct[]> {
    const targetCurrency = options.currency || 'USD';
    const timeout = options.timeoutMs || this.defaultTimeoutMs;
    const marketplaceFilter = options.marketplaces?.map((m) => m.toLowerCase());

    let adapters = this.registry.getActiveAdapters();
    if (marketplaceFilter?.length) {
      adapters = adapters.filter((a) => marketplaceFilter.includes(a.marketplaceName.toLowerCase()));
    }
    if (!adapters.length) return [];

    const tasks = adapters.map(async (adapter) => {
      const limit = limitPerMarketplace(adapter.marketplaceName);
      try {
        const results = await this.searchWithTimeout(adapter.marketplaceName, query, options, timeout);
        const normalised = results
          .map((p) => MarketplaceNormalizer.normalizeProduct(p, targetCurrency))
          .slice(0, limit);
        console.log(`[MarketplaceManager] ${adapter.marketplaceName}: ${normalised.length} products`);
        return normalised;
      } catch (err: any) {
        console.warn(`[MarketplaceManager] ${adapter.marketplaceName} failed: ${err.message}`);
        return [];
      }
    });

    const outcomes = await Promise.allSettled(tasks);
    const aggregated: NormalizedProduct[] = [];
    for (const o of outcomes) {
      if (o.status === 'fulfilled') aggregated.push(...o.value);
    }
    return aggregated;
  }

  async searchAll(
    rawQuery: string,
    options?: {
      category?: string;
      region?: string;
      currency?: string;
      timeoutMs?: number;
      marketplaces?: string[];
      /** Structured intent from AI Stage 1 — used for filtering and search terms */
      intent?: ShoppingIntent;
    }
  ): Promise<NormalizedProduct[]> {
    const opts = options || {};
    const preferred = (opts.marketplaces || []).map((m) => m.toLowerCase());
    const hasPreference = preferred.length > 0;
    const intent = opts.intent;

    // Use AI-extracted search terms if available, otherwise fall back to regex sanitizer
    const searchQuery = intent?.searchTerms?.join(' ') || rawQuery;
    const excludeKeywords = intent?.excludeTerms || [];
    const priceFloor = intent?.priceFloor || 0;

    const cacheKey = `${searchQuery}|${opts.category || ''}|${opts.currency || 'USD'}|${preferred.join(',')}`;
    const queryHash = Buffer.from(cacheKey).toString('base64');
    const cached = await this.cache.get(queryHash);
    if (cached) {
      console.log(`[MarketplaceManager] Cache hit for "${searchQuery}"`);
      return cached;
    }
    const getLimit = (name: string): number => {
      if (!hasPreference) return DEFAULT_PER_MARKETPLACE;
      return preferred.includes(name.toLowerCase()) ? PREFERRED_PER_MARKETPLACE : FILL_PER_MARKETPLACE;
    };

    // Primary search
    let aggregated = await this.runSearch(searchQuery, opts, getLimit);

    // Filter accessories (e.g. chargers when user asked for laptops)
    aggregated = this.filterAccessories(aggregated, excludeKeywords);

    // Filter price outliers (scam/fake listings with unrealistically low prices)
    if (aggregated.length >= 3) {
      aggregated = this.filterPriceOutliers(aggregated);
    }

    // Apply price floor from intent (hard filter — removes anything below minimum realistic price)
    if (priceFloor > 0) {
      const beforeFloor = aggregated.length;
      aggregated = aggregated.filter(p => {
        if (p.price < priceFloor) {
          console.warn(`[MarketplaceManager] Below price floor ($${priceFloor}): "${p.title.slice(0,40)}" at $${p.price}`);
          return false;
        }
        return true;
      });
      if (aggregated.length < beforeFloor) {
        console.log(`[MarketplaceManager] Price floor removed ${beforeFloor - aggregated.length} product(s)`);
      }
    }

    // Fallback: if too few results, try a broader search using the product type
    if (aggregated.length < MIN_PRODUCTS_THRESHOLD) {
      const fallbackQuery = intent?.productType || searchQuery.split(' ')[0];
      console.log(`[MarketplaceManager] Only ${aggregated.length} results — fallback search: "${fallbackQuery}"`);
      const fallbackRaw = await this.runSearch(fallbackQuery, opts, getLimit);
      const filtered = this.filterAccessories(fallbackRaw, excludeKeywords);
      const fallbackFiltered = filtered.length >= 3 ? this.filterPriceOutliers(filtered) : filtered;
      const fallbackWithFloor = priceFloor > 0
        ? fallbackFiltered.filter(p => p.price >= priceFloor)
        : fallbackFiltered;

      // Merge, dedup, keep originals first
      const existingIds = new Set(aggregated.map((p) => p.id));
      const newProducts = fallbackWithFloor.filter((p) => !existingIds.has(p.id));
      aggregated = [...aggregated, ...newProducts];
      console.log(`[MarketplaceManager] After fallback: ${aggregated.length} products`);
    }

    // Deduplicate
    const deduped = MarketplaceNormalizer.deduplicateProducts(aggregated);

    // Fisher-Yates shuffle — interleave marketplaces
    for (let i = deduped.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deduped[i], deduped[j]] = [deduped[j], deduped[i]];
    }

    const finalResults = deduped.slice(0, TOTAL_PRODUCT_CAP);
    console.log(`[MarketplaceManager] Final: ${finalResults.length} products | query: "${searchQuery}" | priceFloor: $${priceFloor}`);

    await this.cache.set(queryHash, finalResults);
    return finalResults;
  }
}

