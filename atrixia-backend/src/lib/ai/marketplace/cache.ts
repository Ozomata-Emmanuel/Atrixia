import { NormalizedProduct } from '../models/product';

export interface IMarketplaceCache {
  get(queryHash: string): Promise<NormalizedProduct[] | null>;
  set(queryHash: string, results: NormalizedProduct[], ttlSeconds?: number): Promise<void>;
  invalidate(queryHash: string): Promise<void>;
}

export class InMemoryMarketplaceCache implements IMarketplaceCache {
  private cache = new Map<string, { expiresAt: number; data: NormalizedProduct[] }>();

  async get(queryHash: string): Promise<NormalizedProduct[] | null> {
    const entry = this.cache.get(queryHash);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(queryHash);
      return null;
    }
    return entry.data;
  }

  async set(queryHash: string, results: NormalizedProduct[], ttlSeconds = 21600): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(queryHash, { expiresAt, data: results });
  }

  async invalidate(queryHash: string): Promise<void> {
    this.cache.delete(queryHash);
  }
}
