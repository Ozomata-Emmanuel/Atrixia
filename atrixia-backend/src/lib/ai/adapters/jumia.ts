import { IMarketplaceAdapter } from './interface';
import { NormalizedProduct } from '../models/product';

export class JumiaAdapter implements IMarketplaceAdapter {
  readonly marketplaceName = 'jumia';

  async search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]> {
    return [];
  }

  async health(): Promise<'healthy' | 'degraded' | 'offline'> {
    return 'healthy';
  }

  supportsRegion(region: string): boolean {
    const supported = ['NG', 'KE', 'EG', 'GH', 'CI', 'MA', 'DZ', 'TN'];
    return supported.includes(region.toUpperCase());
  }

  supportsCategory(category: string): boolean {
    return true;
  }
}
