/**
 * adapter_test.ts
 * Tests each marketplace adapter directly and reports results.
 * Run: npx tsx src/__tests__/adapter_test.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { JumiaAdapter } from '../lib/ai/adapters/jumia';
import { KongaAdapter } from '../lib/ai/adapters/konga';
import { JijiAdapter } from '../lib/ai/adapters/jiji';
import { EbayAdapter } from '../lib/ai/adapters/ebay';

const QUERY = 'laptop';
const TIMEOUT = 15000;

async function testAdapter(name: string, fn: () => Promise<any[]>) {
  const t0 = Date.now();
  try {
    const results = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timed out after ${TIMEOUT}ms`)), TIMEOUT)
      ),
    ]);
    const ms = Date.now() - t0;
    if (results.length === 0) {
      console.log(`❌ ${name}: 0 products (${ms}ms) — returned empty`);
    } else {
      console.log(`✅ ${name}: ${results.length} products (${ms}ms)`);
      results.forEach((p, i) =>
        console.log(`   [${i + 1}] ${p.title?.slice(0, 60)} | ${p.currency} ${p.price} | img: ${p.image ? '✓' : '✗'}`)
      );
    }
  } catch (err: any) {
    const ms = Date.now() - t0;
    console.log(`❌ ${name}: ERROR (${ms}ms) — ${err.message}`);
  }
}

async function main() {
  console.log(`\n🔍 Testing all adapters with query: "${QUERY}"\n${'─'.repeat(60)}`);

  await testAdapter('Jumia', () => new JumiaAdapter().search(QUERY));
  await testAdapter('Konga', () => new KongaAdapter().search(QUERY));
  await testAdapter('Jiji',  () => new JijiAdapter().search(QUERY));
  await testAdapter('eBay',  () => new EbayAdapter().search(QUERY));

  console.log(`\n${'─'.repeat(60)}\nDone.\n`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
