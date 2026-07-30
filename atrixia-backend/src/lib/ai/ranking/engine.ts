import { NormalizedProduct } from '../models/product';
import { normalizePrice, normalizeQuality, normalizeShipping, normalizeSeller, relevanceScore } from './scoring';
import { calculateConfidence } from './confidence';

export interface ScoreBreakdown {
  priceScore: number;
  qualityScore: number;
  sellerScore: number;
  shippingScore: number;
  overallScore: number;
}

export interface RankedProduct extends NormalizedProduct {
  scoreBreakdown: ScoreBreakdown;
}

export interface RankingResult {
  products: RankedProduct[];
  topPick: RankedProduct | null;
  budgetPick: RankedProduct | null;
  performancePick: RankedProduct | null;
  valuePick: RankedProduct | null;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  confidenceExplanation: string;
  explanation: string;
  weights: {
    priceWeight: number;
    qualityWeight: number;
    sellerWeight: number;
    shippingWeight: number;
  };
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickDistinct(
  sorted: RankedProduct[],
  takenIds: Set<string>,
  sorter?: (a: RankedProduct, b: RankedProduct) => number
): RankedProduct | null {
  const pool = sorter ? [...sorted].sort(sorter) : sorted;
  return pool.find((p) => !takenIds.has(p.id)) || null;
}

export class RankingEngine {
  public static rank(
    products: NormalizedProduct[],
    preferences?: {
      prioritizePrice?: boolean;
      prioritizeQuality?: boolean;
      prioritizeShipping?: boolean;
      prioritizeSeller?: boolean;
    },
    budgetMax?: number | null,
    queryTerms?: string[]   // from intent.searchTerms — used for relevance scoring
  ): RankingResult {
    if (products.length === 0) {
      return {
        products: [], topPick: null, budgetPick: null,
        performancePick: null, valuePick: null,
        confidenceScore: 0, confidenceLevel: 'Low',
        confidenceExplanation: 'No products to evaluate.',
        explanation: 'No products to evaluate.',
        weights: { priceWeight: 0.25, qualityWeight: 0.25, sellerWeight: 0.25, shippingWeight: 0.25 },
      };
    }

    const prices = products.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Fixed equal weights — as specified
    // User preferences only shift by a small amount (±0.05)
    let priceW = 0.25, qualityW = 0.25, sellerW = 0.25, shippingW = 0.25;

    if (preferences?.prioritizePrice)    { priceW   += 0.10; qualityW -= 0.03; sellerW -= 0.04; shippingW -= 0.03; }
    if (preferences?.prioritizeQuality)  { qualityW += 0.10; priceW   -= 0.04; sellerW -= 0.03; shippingW -= 0.03; }
    if (preferences?.prioritizeShipping) { shippingW += 0.10; priceW  -= 0.04; qualityW -= 0.03; sellerW -= 0.03; }
    if (preferences?.prioritizeSeller)   { sellerW  += 0.10; priceW   -= 0.04; qualityW -= 0.03; shippingW -= 0.03; }

    // Normalise so weights always sum to 1.0
    const total = priceW + qualityW + sellerW + shippingW;
    priceW /= total; qualityW /= total; sellerW /= total; shippingW /= total;

    const weights = { priceWeight: priceW, qualityWeight: qualityW, sellerWeight: sellerW, shippingWeight: shippingW };

    // Score every product
    const scoredProducts: RankedProduct[] = products.map((product) => {
      const sPrice    = normalizePrice(product.price, minPrice, maxPrice, budgetMax);
      const sQuality  = normalizeQuality(product);
      const sSeller   = normalizeSeller(product);
      const sShipping = normalizeShipping(product);

      // Relevance multiplier — products that don't match the query get demoted
      // Score: 100=perfect match, 75=good, 50=partial, 10=likely irrelevant
      const sRelevance = queryTerms?.length
        ? relevanceScore(product, queryTerms)
        : 75;
      const relevanceMultiplier = sRelevance / 100; // 0.10 to 1.00

      const rawScore =
        priceW   * sPrice   +
        qualityW * sQuality +
        sellerW  * sSeller  +
        shippingW * sShipping;

      // Apply relevance: irrelevant product at score 80 → 80 * 0.10 = 8
      const overallScore = Math.round(rawScore * relevanceMultiplier);

      return {
        ...product,
        confidence: overallScore,
        scoreBreakdown: {
          priceScore:    Math.round(sPrice),
          qualityScore:  Math.round(sQuality),
          sellerScore:   Math.round(sSeller),
          shippingScore: Math.round(sShipping),
          overallScore,
        },
      };
    });

    // Sort by overall score for ranking
    const ranked = [...scoredProducts].sort(
      (a, b) => (b.confidence || 0) - (a.confidence || 0)
    );

    // Shuffle for display so marketplaces are interleaved
    const displayed = shuffle([...scoredProducts]);

    // ── 4 distinct picks ──────────────────────────────────────────────────────

    // 1. Best Overall — #1 by combined quality/seller/shipping/price
    const topPick = ranked[0] || null;
    const takenIds = new Set<string>(topPick ? [topPick.id] : []);

    // 2. Best Budget — cheapest product not already taken
    const budgetPick = pickDistinct(
      ranked, takenIds,
      (a, b) => a.price - b.price
    );
    if (budgetPick) takenIds.add(budgetPick.id);

    // 3. Best Performance — highest quality score (best specs/condition)
    const performancePick = pickDistinct(
      ranked, takenIds,
      (a, b) => b.scoreBreakdown.qualityScore - a.scoreBreakdown.qualityScore
    );
    if (performancePick) takenIds.add(performancePick.id);

    // 4. Best Value — best quality/seller combined per dollar spent
    const valuePick = pickDistinct(
      ranked, takenIds,
      (a, b) => {
        const ratioA = (a.scoreBreakdown.qualityScore + a.scoreBreakdown.sellerScore) / (a.price || 1);
        const ratioB = (b.scoreBreakdown.qualityScore + b.scoreBreakdown.sellerScore) / (b.price || 1);
        return ratioB - ratioA;
      }
    );

    // ── Confidence ────────────────────────────────────────────────────────────
    const confidenceResult = calculateConfidence(
      topPick || ranked[0],
      ranked[1] || null,
      ranked
    );

    // ── Explanation ───────────────────────────────────────────────────────────
    const marketplaceCount = new Set(ranked.map((p) => p.marketplace)).size;
    let explanation = '';
    if (topPick) {
      const runnerUp = ranked[1];
      explanation = `"${topPick.title.slice(0, 50)}" is the top pick (score ${topPick.confidence}/100) from ${marketplaceCount} marketplace(s). `;
      if (runnerUp) {
        const margin = (topPick.confidence || 0) - (runnerUp.confidence || 0);
        explanation += `Leads runner-up by ${margin} points. `;
      }
      explanation += `Weights applied: Quality ${Math.round(qualityW * 100)}%, Seller ${Math.round(sellerW * 100)}%, Shipping ${Math.round(shippingW * 100)}%, Price ${Math.round(priceW * 100)}%.`;
    }

    return {
      products: displayed,
      topPick,
      budgetPick:      budgetPick      || null,
      performancePick: performancePick || null,
      valuePick:       valuePick       || null,
      confidenceScore: confidenceResult.score,
      confidenceLevel: confidenceResult.level,
      confidenceExplanation: confidenceResult.explanation,
      explanation,
      weights,
    };
  }
}
