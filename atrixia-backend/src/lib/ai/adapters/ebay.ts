import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';

export class EbayAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'ebay';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    return [];
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return 'healthy';
  }

  supportsRegion(region: string): boolean {
    const supported = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES'];
    return supported.includes(region.toUpperCase());
  }

  supportsCategory(category: string): boolean {
    return true;
  }
}
