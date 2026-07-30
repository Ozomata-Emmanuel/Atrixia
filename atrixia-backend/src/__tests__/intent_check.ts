/**
 * Quick intent extraction smoke test — not a vitest file, run directly.
 * npx tsx src/__tests__/intent_check.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import { extractIntent } from '../lib/ai/intent/extractor';

const queries = [
  'redmi phone',
  'I want to buy a Redmi phone',
  'HP laptop under $500',
  'wireless headphones',
  'I awant to buy a mug',
  'Samsung Galaxy S24',
  'cheap laptop under ₦200000',
  'something to sit on while coding',
  'I need a good running shoe',
];

console.log('\n─── Intent Extraction Smoke Test ───\n');
for (const q of queries) {
  const intent = extractIntent(q);
  console.log(`Query:       "${q}"`);
  console.log(`SearchTerms: ${intent.searchTerms.join(' ')}  (joins to → "${intent.searchTerms.join(' ')}")`);
  console.log(`ProductType: ${intent.productType}`);
  console.log(`Brand:       ${intent.brand ?? 'none'}`);
  console.log(`Budget:      ${intent.budgetMax ?? 'none'}`);
  console.log(`Warning:     ${intent.queryWarning ?? 'none'}`);
  console.log(`Summary:     ${intent.summary}`);
  if (intent.queryWarning) console.log(`⚠️  ${intent.queryWarning}`);
  console.log();
}

process.exit(0);
