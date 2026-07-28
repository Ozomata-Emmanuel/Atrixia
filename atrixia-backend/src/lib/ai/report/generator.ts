import { NormalizedProduct } from '../models/product';
import { RankingResult } from '../ranking/engine';

export interface RecommendationReport {
  id: string;
  executiveSummary: string;
  bestOverall: NormalizedProduct | null;
  bestBudget: NormalizedProduct | null;
  bestPerformance: NormalizedProduct | null;
  bestValue: NormalizedProduct | null;
  // Overall report-level pros/cons (kept for backwards compat)
  pros: string[];
  cons: string[];
  tradeoffs: string;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  explanation: string;
  // All ranked products — each with their own pros/cons/description
  rankedProducts: NormalizedProduct[];
  alternatives: NormalizedProduct[];
  warnings: string[];
  shoppingTips: string[];
}

// AI returns this shape for each product
export interface AIProductAnalysis {
  productId: string;
  description: string;
  pros: string[];
  cons: string[];
}

/**
 * Deterministically generates per-product pros/cons/description
 * from the scraped data fields alone (no AI needed for this pass).
 * These are then overwritten with Gemma's richer analysis when available.
 */
function buildProductInsights(product: NormalizedProduct): {
  description: string;
  pros: string[];
  cons: string[];
} {
  const pros: string[] = [];
  const cons: string[] = [];
  const parts: string[] = [];

  // Description — built from known fields
  parts.push(`Listed on ${product.marketplace.toUpperCase()} for $${product.price.toFixed(2)}`);
  if (product.condition && product.condition !== 'new') {
    parts.push(`(${product.condition})`);
  }
  if (product.seller) parts.push(`by ${product.seller}`);
  if (product.shippingEstimate) parts.push(`· ${product.shippingEstimate}`);
  const description = parts.join(' ');

  // Pros
  if (product.shippingCost === 0) pros.push('Free shipping included');
  if (product.sellerRating !== null && product.sellerRating >= 90) {
    pros.push(`High seller rating (${product.sellerRating}%)`);
  }
  if (product.reviewCount && product.reviewCount > 50) {
    pros.push(`${product.reviewCount.toLocaleString()} verified reviews`);
  }
  if (product.condition === 'new') pros.push('Brand new condition');
  if (product.availability) pros.push('In stock and available');
  if ((product.confidence || 0) >= 80) pros.push('High match score for your query');

  // Cons
  if (product.shippingCost !== null && product.shippingCost > 15) {
    cons.push(`Additional shipping cost ($${product.shippingCost})`);
  }
  if (product.sellerRating !== null && product.sellerRating < 80) {
    cons.push(`Lower seller rating (${product.sellerRating}%)`);
  }
  if (!product.reviewCount || product.reviewCount < 10) {
    cons.push('Limited buyer reviews');
  }
  if (product.condition === 'used' || product.condition === 'refurbished') {
    cons.push(`Listed as ${product.condition} — verify condition carefully`);
  }

  return { description, pros, cons };
}

export class ReportGenerator {
  /**
   * Generates the full report deterministically from ranking data.
   * AI per-product enrichment is applied separately via mergeAIProductAnalysis().
   */
  public static generate(
    rankingResult: RankingResult,
    aiTextSummary: string
  ): RecommendationReport {
    const { products, topPick, budgetPick, confidenceScore, confidenceLevel, explanation } = rankingResult;

    // Enrich every product with deterministic per-product insights
    const enrichedProducts: NormalizedProduct[] = products.map((p) => {
      const insights = buildProductInsights(p);
      return {
        ...p,
        description: p.description ?? insights.description,
        pros: p.pros?.length ? p.pros : insights.pros,
        cons: p.cons?.length ? p.cons : insights.cons,
      };
    });

    const bestPerformance = enrichedProducts.length > 0
      ? [...enrichedProducts].sort((a, b) =>
          (b.sellerRating || 0) - (a.sellerRating || 0) || a.price - b.price
        )[0]
      : null;

    const bestValue = enrichedProducts.length > 0
      ? [...enrichedProducts].sort((a, b) => {
          const valA = (a.confidence || 1) / (a.price || 1);
          const valB = (b.confidence || 1) / (b.price || 1);
          return valB - valA;
        })[0]
      : null;

    // Report-level pros/cons (overall summary)
    const reportPros: string[] = [];
    const reportCons: string[] = [];
    const warnings: string[] = [];

    const enrichedTop = topPick
      ? enrichedProducts.find((p) => p.id === topPick.id) || null
      : null;
    const enrichedBudget = budgetPick
      ? enrichedProducts.find((p) => p.id === budgetPick.id) || null
      : null;

    if (enrichedTop) {
      reportPros.push(`Top pick "${enrichedTop.title.slice(0, 60)}" ranked highest across all scoring criteria.`);
      if (enrichedTop.shippingCost === 0) reportPros.push('Best pick ships for free.');
      if (enrichedTop.condition === 'refurbished' || enrichedTop.condition === 'used') {
        warnings.push(`Top pick is listed as "${enrichedTop.condition}" — check return policy.`);
      }
    }
    if (enrichedBudget && enrichedTop && enrichedBudget.id !== enrichedTop.id) {
      reportCons.push(`Budget option "${enrichedBudget.title.slice(0, 60)}" trades some quality for a lower price.`);
      if (enrichedBudget.shippingCost && enrichedBudget.shippingCost > 20) {
        warnings.push(`Budget pick has high shipping cost ($${enrichedBudget.shippingCost}).`);
      }
    }

    return {
      id: `report_${Math.random().toString(36).substring(7)}`,
      executiveSummary: aiTextSummary || 'Structured comparison analysis of matching marketplace products.',
      bestOverall: enrichedTop,
      bestBudget: enrichedBudget,
      bestPerformance,
      bestValue,
      pros: reportPros,
      cons: reportCons,
      tradeoffs: explanation,
      confidenceScore,
      confidenceLevel,
      explanation: `MCDA scoring determined recommendations with ${confidenceScore}% confidence.`,
      rankedProducts: enrichedProducts,
      alternatives: enrichedProducts.slice(1, 5),
      warnings,
      shoppingTips: [
        'Compare shipping times if you need the item urgently.',
        'Buy from sellers rated above 90% for safer transactions.',
        'Check product condition carefully for refurbished or used listings.',
      ],
    };
  }

  /**
   * Merges Gemma's per-product AI analysis back into the report products.
   * Call this after the AI inference step to overwrite the deterministic insights.
   */
  public static mergeAIProductAnalysis(
    report: RecommendationReport,
    aiProducts: AIProductAnalysis[]
  ): RecommendationReport {
    if (!aiProducts || aiProducts.length === 0) return report;

    const analysisMap = new Map(aiProducts.map((a) => [a.productId, a]));

    const merge = (p: NormalizedProduct | null): NormalizedProduct | null => {
      if (!p) return null;
      const ai = analysisMap.get(p.id);
      if (!ai) return p;
      return {
        ...p,
        description: ai.description || p.description,
        pros: ai.pros?.length ? ai.pros : p.pros,
        cons: ai.cons?.length ? ai.cons : p.cons,
      };
    };

    return {
      ...report,
      bestOverall: merge(report.bestOverall),
      bestBudget: merge(report.bestBudget),
      bestPerformance: merge(report.bestPerformance),
      bestValue: merge(report.bestValue),
      rankedProducts: report.rankedProducts.map((p) => merge(p)!),
      alternatives: report.alternatives.map((p) => merge(p)!),
    };
  }
}
