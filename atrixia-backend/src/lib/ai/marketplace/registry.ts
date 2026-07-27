import { IMarketplaceAdapter } from '../adapters/interface';

export class MarketplaceRegistry {
  private static instance: MarketplaceRegistry;
  private adapters = new Map<string, { adapter: IMarketplaceAdapter; enabled: boolean }>();

  private constructor() {}

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
