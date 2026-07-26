import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';

export class TemuAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'temu';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    return [];
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return 'healthy';
  }

  supportsRegion(region: string): boolean {
    const supported = ['US', 'CA', 'UK', 'AU', 'DE', 'FR', 'IT'];
    return supported.includes(region.toUpperCase());
  }

  supportsCategory(category: string): boolean {
    return true;
  }
}
