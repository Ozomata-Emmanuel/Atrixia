import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';

export class AliexpressAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'aliexpress';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    return [];
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return 'healthy';
  }

  supportsRegion(region: string): boolean {
    return true; // Global shipping
  }

  supportsCategory(category: string): boolean {
    return true;
  }
}
