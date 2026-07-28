import { NormalizedProduct } from '../models/product';

export interface ConfidenceResult {
  score: number;
  level: 'High' | 'Medium' | 'Low';
}

export function calculateConfidence(
  topProduct: NormalizedProduct,
  runnerUp: NormalizedProduct | null,
  allProducts: NormalizedProduct[]
): ConfidenceResult {
  if (allProducts.length === 0) {
    return { score: 0, level: 'Low' };
  }
  
  let completenessScore = 0;
  if (topProduct.brand) completenessScore += 10;
  if (topProduct.sellerRating !== null) completenessScore += 10;
  if (topProduct.reviewCount !== null && topProduct.reviewCount > 0) completenessScore += 10;
  
  const dataFactor = (completenessScore / 30) * 30;

  let marginFactor = 40; 
  if (runnerUp && topProduct.confidence !== null && runnerUp.confidence !== null) {
    const margin = Math.abs(topProduct.confidence - runnerUp.confidence);
    marginFactor = Math.min(40, (margin / 20) * 40);
  }

  const reviews = topProduct.reviewCount || 0;
  let consensusFactor = 10;
  if (reviews > 1000) consensusFactor = 30;
  else if (reviews > 200) consensusFactor = 25;
  else if (reviews > 50) consensusFactor = 20;

  const totalConfidence = Math.round(dataFactor + marginFactor + consensusFactor);
  const score = Math.min(100, Math.max(50, totalConfidence));

  let level: 'High' | 'Medium' | 'Low' = 'Low';
  if (score >= 80) level = 'High';
  else if (score >= 65) level = 'Medium';

  return { score, level };
}
