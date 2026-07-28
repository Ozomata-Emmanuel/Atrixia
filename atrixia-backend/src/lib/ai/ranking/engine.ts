import { NormalizedProduct } from '../models/product';
import { computeWeights } from './weights';
import {
  normalizePrice,
  normalizeQuality,
  normalizeShipping,
  normalizeSeller,
  normalizeSentiment,
} from './scoring';
import { calculateConfidence } from './confidence';

export interface ScoreBreakdown {
  priceScore: number;
  qualityScore: number;
  shippingScore: number;
  sellerScore: number;
  sentimentScore: number;
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
    shippingWeight: number;
    sellerWeight: number;
    sentimentWeight: number;
  };
}

/** Fisher-Yates shuffle — randomises array in place */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Picks the best product by a predicate that is DIFFERENT from all already-picked IDs.
 * Falls back through the ranked list until a distinct product is found.
 */
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
    }
  ): RankingResult {
    if (products.length === 0) {
      return {
        products: [],
        topPick: null,
        budgetPick: null,
        performancePick: null,
        valuePick: null,
        confidenceScore: 0,
        confidenceLevel: 'Low',
        confidenceExplanation: 'No products to evaluate.',
        explanation: 'No products to evaluate.',
        weights: { priceWeight: 0.25, qualityWeight: 0.25, shippingWeight: 0.25, sellerWeight: 0.25, sentimentWeight: 0 },
      };
    }

    const prices = products.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const weights = computeWeights(preferences);

    // Score every product
    const scoredProducts: RankedProduct[] = products.map((product) => {
      const sPrice     = normalizePrice(product.price, minPrice, maxPrice);
      const sQuality   = normalizeQuality(product);
      const sShipping  = normalizeShipping(product);
      const sSeller    = normalizeSeller(product);
      const sSentiment = normalizeSentiment(product);

      const overallScore = Math.round(
        weights.priceWeight     * sPrice     +
        weights.qualityWeight   * sQuality   +
        weights.shippingWeight  * sShipping  +
        weights.sellerWeight    * sSeller    +
        weights.sentimentWeight * sSentiment
      );

      return {
        ...product,
        confidence: overallScore,
        scoreBreakdown: {
          priceScore:     Math.round(sPrice),
          qualityScore:   Math.round(sQuality),
          shippingScore:  Math.round(sShipping),
          sellerScore:    Math.round(sSeller),
          sentimentScore: Math.round(sSentiment),
          overallScore,
        },
      };
    });

    // Sort by overall score descending for ranking
    const ranked = [...scoredProducts].sort(
      (a, b) => (b.confidence || 0) - (a.confidence || 0) || a.price - b.price
    );

    // Shuffle the display order so marketplace results are interleaved
    const displayed = shuffle([...scoredProducts]);

    // ── Pick 4 DISTINCT recommendations ─────────────────────────────────────

    // 1. Best Overall — #1 by combined score
    const topPick = ranked[0] || null;
    const takenIds = new Set<string>(topPick ? [topPick.id] : []);

    // 2. Best Budget — cheapest product, must differ from topPick
    const budgetPick = pickDistinct(
      ranked,
      takenIds,
      (a, b) => a.price - b.price
    );
    if (budgetPick) takenIds.add(budgetPick.id);

    // 3. Best Performance — highest quality/seller score, different from above
    const performancePick = pickDistinct(
      ranked,
      takenIds,
      (a, b) => (b.scoreBreakdown.qualityScore + b.scoreBreakdown.sellerScore) -
                (a.scoreBreakdown.qualityScore + a.scoreBreakdown.sellerScore)
    );
    if (performancePick) takenIds.add(performancePick.id);

    // 4. Best Value — best quality-to-price ratio, different from above
    const valuePick = pickDistinct(
      ranked,
      takenIds,
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
        explanation += `Leads runner-up "${runnerUp.title.slice(0, 40)}" by ${margin} points. `;
      }
      explanation += `Weights: Price ${Math.round(weights.priceWeight * 100)}%, Quality ${Math.round(weights.qualityWeight * 100)}%, Shipping ${Math.round(weights.shippingWeight * 100)}%, Seller ${Math.round(weights.sellerWeight * 100)}%.`;
    }

    return {
      products: displayed,   // shuffled for display
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
