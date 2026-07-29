/**
 * intentExtractor.ts
 *
 * Stage 1 AI call — uses Gemma to parse the user's query into structured
 * shopping intent BEFORE hitting any marketplace.
 *
 * This is a very short, low-temperature call (~1-2s) that outputs a small
 * JSON object. It corrects impossible queries (e.g. "iPhone 17 Pro Max"
 * which doesn't exist), detects budget, excludes accessories, and provides
 * better search terms than regex alone.
 */

import { IAIProvider } from '../providers/interface';

export interface ShoppingIntent {
  /** Clean product type (e.g. "smartphone", "laptop", "headphones") */
  productType: string;
  /** Brand if mentioned (e.g. "Apple", "HP") or null */
  brand: string | null;
  /** Corrected model name (e.g. "iPhone 16 Pro Max" if user said "17") or null */
  model: string | null;
  /** Best search terms for marketplace search engines (2-5 words) */
  searchTerms: string[];
  /** Words/phrases that should NOT appear in results */
  excludeTerms: string[];
  /** Detected budget ceiling in USD, or null */
  budgetMax: number | null;
  /** Minimum realistic price for this product in USD (filters fakes/accessories) */
  priceFloor: number;
  /** If the query had an issue (e.g. product doesn't exist), explain here */
  queryWarning: string | null;
  /** Short plain-English description of what the user wants */
  summary: string;
}

const INTENT_SYSTEM_PROMPT = `You are a shopping query parser. Extract structured intent from user queries.

Rules:
1. Identify the main product type (laptop, phone, headphones, shoes, etc.)
2. Extract brand and model if mentioned
3. If the user mentions a product that doesn't exist yet (future product, wrong name), correct it to the closest real version and add a warning
4. Generate 2-4 clean search terms for marketplace search engines (short, no filler)
5. List terms that should be EXCLUDED from results (accessories, peripherals, unrelated items)
6. Extract budget from phrases like "under $300", "less than 200", etc.
7. Set a realistic price floor to filter fakes (e.g. phones > $30, laptops > $50, headphones > $10)
8. Be concise — the summary should be one sentence

You MUST output valid JSON only, no extra text.`;

const INTENT_OUTPUT_FORMAT = `Output this exact JSON structure:
{
  "productType": "string (e.g. smartphone, laptop, headphones)",
  "brand": "string or null",
  "model": "string or null",
  "searchTerms": ["term1", "term2"],
  "excludeTerms": ["charger", "case", "cable", etc.],
  "budgetMax": number or null,
  "priceFloor": number,
  "queryWarning": "string or null",
  "summary": "one sentence summary"
}`;

/** Fallback when AI call fails — uses regex-based parsing */
function fallbackIntent(query: string): ShoppingIntent {
  const q = query.toLowerCase();

  // Detect product type
  let productType = 'general';
  let excludeTerms: string[] = [];
  let priceFloor = 5;

  if (/laptop|notebook|macbook|chromebook/.test(q)) {
    productType = 'laptop';
    excludeTerms = ['charger', 'adapter', 'cable', 'bag', 'case', 'battery', 'cooling pad', 'stand'];
    priceFloor = 50;
  } else if (/phone|iphone|smartphone|android/.test(q)) {
    productType = 'smartphone';
    excludeTerms = ['charger', 'case', 'cover', 'cable', 'holder', 'controller', 'trigger', 'earphone', 'battery'];
    priceFloor = 30;
  } else if (/headphone|earphone|earbud|airpod/.test(q)) {
    productType = 'headphones';
    excludeTerms = ['case', 'cable', 'adapter', 'stand'];
    priceFloor = 5;
  } else if (/mouse/.test(q)) {
    productType = 'mouse';
    excludeTerms = ['pad', 'mat', 'cable'];
    priceFloor = 3;
  } else if (/keyboard/.test(q)) {
    productType = 'keyboard';
    excludeTerms = ['cable', 'cover', 'skin', 'wrist rest'];
    priceFloor = 5;
  }

  // Extract budget
  const budgetMatch = query.match(/(?:under|below|less than|up to)\s+\$?([\d,]+)/i);
  const budgetMax = budgetMatch ? parseFloat(budgetMatch[1].replace(/,/g, '')) : null;

  // Clean search terms
  const cleaned = query
    .replace(/(?:under|below|less than|up to|around)\s+\$?[\d,]+/gi, '')
    .replace(/\b(show|me|find|i want|i need|best|good|please|the|a|an)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    productType,
    brand: null,
    model: null,
    searchTerms: cleaned.split(' ').filter(Boolean).slice(0, 4),
    excludeTerms,
    budgetMax,
    priceFloor,
    queryWarning: null,
    summary: `Searching for ${cleaned}`,
  };
}

export async function extractIntent(
  query: string,
  provider: IAIProvider
): Promise<ShoppingIntent> {
  const startTime = Date.now();
  try {
    const result = await provider.generate(
      `User query: "${query}"\n\n${INTENT_OUTPUT_FORMAT}`,
      {
        temperature: 0.0, // fully deterministic — this is parsing, not creative
        maxTokens: 300,   // we only need a small JSON object
        systemInstruction: INTENT_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      }
    );

    const text = result.text.trim();
    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonText) as ShoppingIntent;

    // Validate required fields
    if (!parsed.productType || !Array.isArray(parsed.searchTerms)) {
      throw new Error('Invalid intent structure');
    }

    console.log(`[IntentExtractor] Parsed in ${Date.now() - startTime}ms:`, JSON.stringify(parsed));
    return parsed;
  } catch (err: any) {
    console.warn(`[IntentExtractor] AI parse failed (${err.message}), using fallback`);
    return fallbackIntent(query);
  }
}
