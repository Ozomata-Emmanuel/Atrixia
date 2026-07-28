import { NormalizedProduct } from '../models/product';

export interface ConfidenceResult {
  score: number;
  level: 'High' | 'Medium' | 'Low';
  explanation: string;
}

/**
 * Calculates a real confidence score (0-100) based on actual data quality,
 * not a hardcoded floor. Factors:
 *   - Product count (20%): more products = higher confidence
 *   - Marketplace diversity (20%): multiple marketplaces = more reliable
 *   - Seller rating coverage (20%): products with real ratings
 *   - Price completeness (20%): all products have valid prices
 *   - Review coverage (10%): products with real review counts
 *   - Score margin (10%): clear winner vs close race
 */
export function calculateConfidence(
  topProduct: NormalizedProduct,
  runnerUp: NormalizedProduct | null,
  allProducts: NormalizedProduct[]
): ConfidenceResult {
  if (allProducts.length === 0) {
    return { score: 0, level: 'Low', explanation: 'No products found.' };
  }

  // Factor 1 — Product count (20 points)
  const countScore = Math.min(20, (allProducts.length / 12) * 20);

  // Factor 2 — Marketplace diversity (20 points)
  const marketplaces = new Set(allProducts.map((p) => p.marketplace));
  const diversityScore = Math.min(20, (marketplaces.size / 4) * 20);

  // Factor 3 — Seller rating coverage (20 points)
  const withRatings = allProducts.filter((p) => p.sellerRating !== null).length;
  const ratingCoverage = (withRatings / allProducts.length) * 20;

  // Factor 4 — Price completeness (20 points)
  const withPrice = allProducts.filter((p) => p.price > 0).length;
  const priceScore = (withPrice / allProducts.length) * 20;

  // Factor 5 — Review coverage (10 points)
  const withReviews = allProducts.filter((p) => (p.reviewCount || 0) > 0).length;
  const reviewScore = (withReviews / allProducts.length) * 10;

  // Factor 6 — Score margin (10 points): clear winner is more confident
  let marginScore = 5; // default: neutral
  if (runnerUp && topProduct.confidence !== null && runnerUp.confidence !== null) {
    const margin = Math.abs((topProduct.confidence || 0) - (runnerUp.confidence || 0));
    marginScore = Math.min(10, (margin / 15) * 10);
  }

  const rawScore = countScore + diversityScore + ratingCoverage + priceScore + reviewScore + marginScore;
  const score = Math.round(Math.min(98, Math.max(30, rawScore)));

  const level: 'High' | 'Medium' | 'Low' =
    score >= 75 ? 'High' : score >= 55 ? 'Medium' : 'Low';

  const explanation = [
    `Products found: ${allProducts.length} (${countScore.toFixed(0)}/20)`,
    `Marketplace diversity: ${marketplaces.size} sources (${diversityScore.toFixed(0)}/20)`,
    `Seller rating data: ${withRatings}/${allProducts.length} (${ratingCoverage.toFixed(0)}/20)`,
    `Price completeness: ${withPrice}/${allProducts.length} (${priceScore.toFixed(0)}/20)`,
    `Review coverage: ${withReviews}/${allProducts.length} (${reviewScore.toFixed(0)}/10)`,
    `Ranking margin: ${marginScore.toFixed(0)}/10`,
    `= ${score}% confidence`,
  ].join(' | ');

  return { score, level, explanation };
}
