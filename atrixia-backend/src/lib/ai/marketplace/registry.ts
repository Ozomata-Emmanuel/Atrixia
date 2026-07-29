import { IMarketplaceAdapter } from '../adapters/interface';
import { EbayAdapter } from '../adapters/ebay';
import { JumiaAdapter } from '../adapters/jumia';
import { KongaAdapter } from '../adapters/konga';
import { AliexpressAdapter } from '../adapters/aliexpress';
import { TemuAdapter } from '../adapters/temu';
import { JijiAdapter } from '../adapters/jiji';

export class MarketplaceRegistry {
  private static instance: MarketplaceRegistry;
  private adapters = new Map<string, { adapter: IMarketplaceAdapter; enabled: boolean }>();

  private constructor() {
    // Direct-fetch adapters (fast, no proxy needed)
    this.registerAdapter(new JumiaAdapter());
    this.registerAdapter(new KongaAdapter());
    this.registerAdapter(new JijiAdapter());
    // eBay: uses official API when EBAY_APP_ID is set, ScraperAPI proxy otherwise
    this.registerAdapter(new EbayAdapter());
    // ScraperAPI JS-render required — disabled until paid tier is enabled
    // To re-enable: call MarketplaceRegistry.getInstance().setAdapterStatus('aliexpress', true)
    this.registerAdapter(new AliexpressAdapter(), false);
    this.registerAdapter(new TemuAdapter(), false);
  }

  public static getInstance(): MarketplaceRegistry {
    if (!MarketplaceRegistry.instance) {
      MarketplaceRegistry.instance = new MarketplaceRegistry();
    }
    return MarketplaceRegistry.instance;
  }

  public registerAdapter(adapter: IMarketplaceAdapter, enabled = true): void {
    const key = adapter.marketplaceName.toLowerCase();
    this.adapters.set(key, { adapter, enabled });
  }

  public getAdapter(name: string): IMarketplaceAdapter | null {
    const key = name.toLowerCase();
    const entry = this.adapters.get(key);
    return entry && entry.enabled ? entry.adapter : null;
  }

  public getActiveAdapters(): IMarketplaceAdapter[] {
    return Array.from(this.adapters.values())
      .filter((entry) => entry.enabled)
      .map((entry) => entry.adapter);
  }

  public setAdapterStatus(name: string, enabled: boolean): void {
    const key = name.toLowerCase();
    const entry = this.adapters.get(key);
    if (entry) {
      entry.enabled = enabled;
    }
  }

  public clear(): void {
    this.adapters.clear();
  }
}
