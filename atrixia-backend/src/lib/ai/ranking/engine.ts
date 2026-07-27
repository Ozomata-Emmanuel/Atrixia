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

export interface RankingResult {
  products: NormalizedProduct[];
  topPick: NormalizedProduct | null;
  budgetPick: NormalizedProduct | null;
  confidenceScore: number;
  explanation: string;
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
      return { products: [], topPick: null, budgetPick: null, confidenceScore: 0, explanation: 'No products to evaluate.' };
    }

    const prices = products.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const weights = computeWeights(preferences);

    const scoredProducts = products.map((product) => {
      const sPrice = normalizePrice(product.price, minPrice, maxPrice);
      const sQuality = normalizeQuality(product);
      const sShipping = normalizeShipping(product);
      const sSeller = normalizeSeller(product);
      const sSentiment = normalizeSentiment(product);

      const totalScore =
        weights.priceWeight * sPrice +
        weights.qualityWeight * sQuality +
        weights.shippingWeight * sShipping +
        weights.sellerWeight * sSeller +
        weights.sentimentWeight * sSentiment;

      return {
        ...product,
        confidence: Math.round(totalScore), 
      };
    });

    scoredProducts.sort((a, b) => (b.confidence || 0) - (a.confidence || 0) || a.price - b.price);

    const topPick = scoredProducts[0] || null;
    const runnerUp = scoredProducts[1] || null;

    let budgetPick = scoredProducts.reduce((cheapest, current) => {
      if (current.price < cheapest.price) {
        return current;
      }
      return cheapest;
    }, scoredProducts[0]);

    if (budgetPick && topPick && budgetPick.id === topPick.id && scoredProducts.length > 1) {
      const alternatives = [...scoredProducts].sort((a, b) => a.price - b.price);
      if (alternatives[0].id === topPick.id) {
        budgetPick = alternatives[1];
      } else {
        budgetPick = alternatives[0];
      }
    }

    const confidenceScore = calculateConfidence(topPick, runnerUp, scoredProducts);

    let explanation = '';
    if (topPick) {
      explanation = `Product "${topPick.title}" was selected as the Top Pick (Score: ${topPick.confidence}/100) `;
      if (runnerUp) {
        const diff = (topPick.confidence || 0) - (runnerUp.confidence || 0);
        explanation += `outranking "${runnerUp.title}" by a margin of ${diff} points. `;
        explanation += `This decision was guided by user weighting priorities (Price: ${Math.round(weights.priceWeight * 100)}%, Quality: ${Math.round(weights.qualityWeight * 100)}%, Shipping: ${Math.round(weights.shippingWeight * 100)}%).`;
      } else {
        explanation += `as it is the single candidate product matching criteria.`;
      }
    }

    return {
      products: scoredProducts,
      topPick,
      budgetPick: budgetPick || null,
      confidenceScore,
      explanation,
    };
  }
}
