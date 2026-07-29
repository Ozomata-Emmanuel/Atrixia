import { NormalizedProduct } from '../models/product';

export interface IMarketplaceAdapter {
  readonly marketplaceName: 'amazon' | 'ebay' | 'jumia' | 'konga' | 'aliexpress' | 'temu' | 'jiji' | 'mock';
  search(query: string, options?: { category?: string; region?: string }): Promise<NormalizedProduct[]>;
  health(): Promise<'healthy' | 'degraded' | 'offline'>;
  supportsRegion(region: string): boolean;
  supportsCategory(category: string): boolean;
}
