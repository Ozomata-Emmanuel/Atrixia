import { NormalizedProduct } from '../models/product';

export interface IMarketplaceAdapter {
  readonly marketplaceName: 'amazon' | 'ebay' | 'jumia' | 'aliexpress' | 'temu' | 'mock';
  search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]>;
  health(): Promise<'healthy' | 'degraded' | 'offline'>;
  supportsRegion(region: string): boolean;
  supportsCategory(category: string): boolean;
}
