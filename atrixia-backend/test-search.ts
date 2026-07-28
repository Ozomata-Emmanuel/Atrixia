import { MarketplaceManager } from './src/lib/ai/marketplace/manager';
import { MarketplaceRegistry } from './src/lib/ai/marketplace/registry';
import { JumiaAdapter } from './src/lib/ai/adapters/jumia';

async function run() {
  const manager = new MarketplaceManager();
  console.log('Active adapters:', MarketplaceRegistry.getInstance().getActiveAdapters().map(a => a.marketplaceName));
  const res = await manager.searchAll('ergonomic chair', { currency: 'USD' });
  console.log('Result count:', res.length);
}
run();
