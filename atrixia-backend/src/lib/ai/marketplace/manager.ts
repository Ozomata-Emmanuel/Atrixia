import { MarketplaceRegistry } from './registry';
import { MarketplaceNormalizer } from './normalizer';
import { IMarketplaceCache, InMemoryMarketplaceCache } from './cache';
import { NormalizedProduct } from '../models/product';
import { TimeoutError } from './errors';
import { ShoppingIntent } from '../intent/extractor';

// Product limits
const DEFAULT_PER_MARKETPLACE = 3;
const PREFERRED_PER_MARKETPLACE = 6;
const FILL_PER_MARKETPLACE = 2;
const TOTAL_PRODUCT_CAP = 15;
const MIN_PRODUCTS_THRESHOLD = 4;

// Per-adapter timeouts (ms)
// Direct-fetch adapters (Jumia, Konga, Jiji) — single HTTP call, fast
const DIRECT_FETCH_TIMEOUT = 10_000;
// API adapters (eBay) — token is cached after first call, so also fast
const API_ADAPTER_TIMEOUT = 12_000;

// Adapters that go through an external API (not a plain scrape)
const API_ADAPTERS = new Set(['ebay']);

export class MarketplaceManager {
  private registry: MarketplaceRegistry;
  private cache: IMarketplaceCache;

  constructor(registry?: MarketplaceRegistry, cache?: IMarketplaceCache) {
    this.registry = registry || MarketplaceRegistry.getInstance();
    this.cache = cache || new InMemoryMarketplaceCache();
  }

  getAvailableMarketplaces(): string[] {
    return this.registry.getActiveAdapters().map((a) => a.marketplaceName);
  }

  private timeoutFor(adapterName: string): number {
    return API_ADAPTERS.has(adapterName.toLowerCase())
      ? API_ADAPTER_TIMEOUT
      : DIRECT_FETCH_TIMEOUT;
  }

  private async searchWithTimeout(
    adapterName: string,
    query: string,
    options?: { category?: string; region?: string }
  ): Promise<NormalizedProduct[]> {
    const adapter = this.registry.getAdapter(adapterName);
    if (!adapter) return [];

    const ms = this.timeoutFor(adapterName);
    return Promise.race([
      adapter.search(query, options),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new TimeoutError(`${adapterName} timed out after ${ms}ms`, adapterName)),
          ms
        )
      ),
    ]);
  }

  private filterAccessories(products: NormalizedProduct[], excludeKeywords: string[]): NormalizedProduct[] {
    if (!excludeKeywords.length) return products;
    const lower = excludeKeywords.map((k) => k.toLowerCase());
    return products.filter((p) => {
      const title = p.title.toLowerCase();
      return !lower.some((kw) => title.includes(kw));
    });
  }

  private filterPriceOutliers(products: NormalizedProduct[]): NormalizedProduct[] {
    if (products.length < 3) return products;
    const prices = [...products].map((p) => p.price).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    const minPlausible = median * 0.08;
    const filtered = products.filter((p) => {
      if (p.price < minPlausible) {
        console.warn(`[MarketplaceManager] Outlier removed: "${p.title.slice(0, 50)}" at ${p.price} (median ${median})`);
        return false;
      }
      return true;
    });
    return filtered.length > 0 ? filtered : products;
  }

  /**
   * Run all active adapters in parallel. Each adapter gets its own timeout budget.
   * Never blocks on a slow adapter — Promise.allSettled ensures fast ones return immediately.
   */
  private async runSearch(
    query: string,
    options: {
      category?: string;
      region?: string;
      currency?: string;
      marketplaces?: string[];
    },
    limitPerMarketplace: (name: string) => number
  ): Promise<NormalizedProduct[]> {
    const targetCurrency = options.currency || 'USD';
    const marketplaceFilter = options.marketplaces?.map((m) => m.toLowerCase());

    let adapters = this.registry.getActiveAdapters();
    if (marketplaceFilter?.length) {
      adapters = adapters.filter((a) => marketplaceFilter.includes(a.marketplaceName.toLowerCase()));
    }
    if (!adapters.length) return [];

    // Fan out — all adapters run truly in parallel
    const tasks = adapters.map(async (adapter) => {
      const limit = limitPerMarketplace(adapter.marketplaceName);
      const t0 = Date.now();
      try {
        const results = await this.searchWithTimeout(adapter.marketplaceName, query, options);
        const normalised = results
          .map((p) => MarketplaceNormalizer.normalizeProduct(p, targetCurrency))
          .slice(0, limit);
        console.log(`[MarketplaceManager] ${adapter.marketplaceName}: ${normalised.length} products (${Date.now() - t0}ms)`);
        return normalised;
      } catch (err: any) {
        console.warn(`[MarketplaceManager] ${adapter.marketplaceName} failed (${Date.now() - t0}ms): ${err.message}`);
        return [] as NormalizedProduct[];
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
      marketplaces?: string[];
      intent?: ShoppingIntent;
    }
  ): Promise<NormalizedProduct[]> {
    const opts = options || {};
    const preferred = (opts.marketplaces || []).map((m) => m.toLowerCase());
    const hasPreference = preferred.length > 0;
    const intent = opts.intent;

    const searchQuery = intent?.searchTerms?.join(' ') || rawQuery;
    const excludeKeywords = intent?.excludeTerms || [];
    const priceFloor = intent?.priceFloor || 0;

    // Cache key includes query + currency + marketplace filter
    const cacheKey = `${searchQuery}|${opts.currency || 'USD'}|${preferred.join(',')}`;
    const queryHash = Buffer.from(cacheKey).toString('base64');
    const cached = await this.cache.get(queryHash);
    if (cached) {
      console.log(`[MarketplaceManager] Cache hit for "${searchQuery}" (${cached.length} products)`);
      return cached;
    }

    const getLimit = (name: string): number => {
      if (!hasPreference) return DEFAULT_PER_MARKETPLACE;
      return preferred.includes(name.toLowerCase()) ? PREFERRED_PER_MARKETPLACE : FILL_PER_MARKETPLACE;
    };

    // Primary parallel search across all active adapters
    let aggregated = await this.runSearch(searchQuery, opts, getLimit);

    // Post-processing filters
    aggregated = this.filterAccessories(aggregated, excludeKeywords);
    if (aggregated.length >= 3) {
      aggregated = this.filterPriceOutliers(aggregated);
    }
    if (priceFloor > 0) {
      const before = aggregated.length;
      aggregated = aggregated.filter((p) => p.price >= priceFloor);
      if (aggregated.length < before) {
        console.log(`[MarketplaceManager] Price floor (${priceFloor}) removed ${before - aggregated.length} product(s)`);
      }
    }

    // Fallback: only if we got almost nothing — use just the product type keyword,
    // single retry, no timeout extension
    if (aggregated.length < MIN_PRODUCTS_THRESHOLD && intent?.productType) {
      const fallbackQuery = intent.productType;
      console.log(`[MarketplaceManager] Only ${aggregated.length} results — one-shot fallback: "${fallbackQuery}"`);
      const fallbackRaw = await this.runSearch(fallbackQuery, opts, getLimit);
      let fallback = this.filterAccessories(fallbackRaw, excludeKeywords);
      if (fallback.length >= 3) fallback = this.filterPriceOutliers(fallback);
      if (priceFloor > 0) fallback = fallback.filter((p) => p.price >= priceFloor);

      const existingIds = new Set(aggregated.map((p) => p.id));
      aggregated = [...aggregated, ...fallback.filter((p) => !existingIds.has(p.id))];
      console.log(`[MarketplaceManager] After fallback: ${aggregated.length} products`);
    }

    // Deduplicate, then interleave marketplaces with a shuffle
    const deduped = MarketplaceNormalizer.deduplicateProducts(aggregated);
    for (let i = deduped.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deduped[i], deduped[j]] = [deduped[j], deduped[i]];
    }

    const final = deduped.slice(0, TOTAL_PRODUCT_CAP);
    console.log(`[MarketplaceManager] Final: ${final.length} products for "${searchQuery}"`);

    await this.cache.set(queryHash, final);
    return final;
  }
}
