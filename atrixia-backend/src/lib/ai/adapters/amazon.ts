import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';

export class AmazonAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'amazon';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    return [];
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return 'healthy';
  }

  supportsRegion(region: string): boolean {
    const supported = ['US', 'UK', 'DE', 'FR', 'JP', 'CA'];
    return supported.includes(region.toUpperCase());
  }

  supportsCategory(category: string): boolean {
    return true;
  }
}
