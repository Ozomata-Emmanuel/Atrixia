import { EbayAdapter } from './src/lib/ai/adapters/ebay';

async function run() {
  const adapter = new EbayAdapter();
  console.log('Searching eBay...');
  const res = await adapter.search('comfortable ergonomic chair under $300');
  console.log('Results:', res);
}
run();
