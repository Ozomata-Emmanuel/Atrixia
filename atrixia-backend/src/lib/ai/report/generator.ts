import { NormalizedProduct } from '../models/product';
import { RankingResult } from '../ranking/engine';

export interface RecommendationReport {
  id: string;
  executiveSummary: string;
  bestOverall: NormalizedProduct | null;
  bestBudget: NormalizedProduct | null;
  bestPerformance: NormalizedProduct | null;
  bestValue: NormalizedProduct | null;
  pros: string[];
  cons: string[];
  tradeoffs: string;
  confidenceScore: number;
  explanation: string;
  alternatives: NormalizedProduct[];
  warnings: string[];
  shoppingTips: string[];
}

export class ReportGenerator {
  public static generate(
    rankingResult: RankingResult,
    aiTextSummary: string
  ): RecommendationReport {
    const { products, topPick, budgetPick, confidenceScore, explanation } = rankingResult;

    let bestPerformance: NormalizedProduct | null = null;
    if (products.length > 0) {
      bestPerformance = [...products].sort((a, b) => {
        const ratingA = a.sellerRating || 0;
        const ratingB = b.sellerRating || 0;
        return ratingB - ratingA || a.price - b.price;
      })[0];
    }

    let bestValue: NormalizedProduct | null = null;
    if (products.length > 0) {
      bestValue = [...products].sort((a, b) => {
        const scoreA = a.confidence || 1;
        const scoreB = b.confidence || 1;
        const valA = scoreA / (a.price || 1);
        const valB = scoreB / (b.price || 1);
        return valB - valA;
      })[0];
    }

    const pros: string[] = [];
    const cons: string[] = [];
    const warnings: string[] = [];

    if (topPick) {
      pros.push(`Top Pick "${topPick.title}" offers excellent value for price.`);
      if (topPick.reviewCount && topPick.reviewCount > 100) {
        pros.push(`Highly reviewed options with over ${topPick.reviewCount} total purchases.`);
      }
      if (topPick.shippingCost === 0) {
        pros.push('Includes free shipping support.');
      }

      if (topPick.condition === 'refurbished' || topPick.condition === 'used') {
        warnings.push(`Top Pick is listed as "${topPick.condition}". Check seller return details.`);
      }
    }

    if (budgetPick) {
      cons.push(`Budget Pick "${budgetPick.title}" sacrifices some ratings for affordability.`);
      if (budgetPick.shippingCost && budgetPick.shippingCost > 20) {
        warnings.push(`High shipping cost of ${budgetPick.shippingCost} USD for the budget option.`);
      }
    }

    return {
      id: `report_${Math.random().toString(36).substring(7)}`,
      executiveSummary: aiTextSummary || 'Structured comparison analysis of matching marketplace products.',
      bestOverall: topPick,
      bestBudget: budgetPick,
      bestPerformance,
      bestValue,
      pros,
      cons,
      tradeoffs: explanation,
      confidenceScore,
      explanation: `MCDA score determined top recommendations with a final confidence calculation of ${confidenceScore}%.`,
      alternatives: products.slice(1, 4), 
      warnings,
      shoppingTips: [
        'Compare shipping times if you need the device urgently.',
        'Buy from sellers with ratings higher than 90% for safer processing.',
      ],
    };
  }
}
