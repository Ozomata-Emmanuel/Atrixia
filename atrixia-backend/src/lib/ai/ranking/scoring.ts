import { NormalizedProduct } from '../models/product';

/**
 * Price Score (25% weight)
 * 100 = Lowest price, well under budget
 *  75 = Fair price, within budget
 *  50 = High price, near budget limit
 *  25 = Very expensive, exceeds budget
 *
 * budgetMax: extracted from user query by IntentExtractor.
 * If no budget provided, use relative price scoring within the product set.
 */
export function normalizePrice(
  price: number,
  minPrice: number,
  maxPrice: number,
  budgetMax?: number | null
): number {
  if (budgetMax && budgetMax > 0) {
    // Budget-aware scoring
    const ratio = price / budgetMax;
    if (ratio <= 0.5)  return 100; // well under budget
    if (ratio <= 0.85) return 75;  // fair price
    if (ratio <= 1.0)  return 50;  // near budget limit
    return 25;                      // exceeds budget
  }

  // No budget: relative scoring within the result set
  if (maxPrice === minPrice) return 75;
  const relative = ((maxPrice - price) / (maxPrice - minPrice)) * 100;
  // Map to 25-100 range — price alone should never score 0
  return Math.round(25 + (relative * 0.75));
}

/**
 * Quality Score (25% weight)
 * 100 = Latest specs, top performance
 *  75 = Good specs, solid performance
 *  50 = Average specs, adequate performance
 *  25 = Old specs, poor performance
 *
 * We derive quality from: condition, review count, and whether it's a
 * known brand. The AI will further enrich this via per-product analysis.
 */
export function normalizeQuality(product: NormalizedProduct): number {
  let score = 50; // baseline

  // Condition bonus/penalty
  if (product.condition === 'new')         score += 20;
  else if (product.condition === 'refurbished') score += 5;
  else if (product.condition === 'used')    score -= 10;

  // Review count as proxy for market acceptance
  const reviews = product.reviewCount || 0;
  if (reviews > 500)  score += 25;
  else if (reviews > 100) score += 20;
  else if (reviews > 20)  score += 12;
  else if (reviews > 5)   score += 5;

  // Known brand gives a slight boost (title-based heuristic)
  const title = (product.title || '').toLowerCase();
  const knownBrands = ['apple', 'samsung', 'hp', 'dell', 'lenovo', 'asus', 'acer', 'sony',
    'lg', 'xiaomi', 'google', 'oneplus', 'huawei', 'oppo', 'bose', 'jbl', 'nike', 'adidas'];
  if (knownBrands.some(b => title.includes(b) || (product.brand || '').toLowerCase().includes(b))) {
    score += 10;
  }

  return Math.min(100, Math.max(25, score));
}

/**
 * Seller Score (25% weight)
 * 100 = 4.8-5.0 rating + 100+ reviews
 *  75 = 4.0-4.7 rating + 20+ reviews
 *  50 = 3.0-3.9 rating + 10+ reviews
 *  25 = Below 3.0 or no reviews
 */
export function normalizeSeller(product: NormalizedProduct): number {
  const rating = product.sellerRating;
  const reviews = product.reviewCount || 0;

  if (rating === null) {
    // No rating data — modest penalty
    return reviews > 10 ? 50 : 35;
  }

  // Normalise to 0-5 scale if needed
  const r = rating > 5 ? rating / 20 : rating;

  if (r >= 4.8 && reviews >= 100) return 100;
  if (r >= 4.0 && reviews >= 20)  return 75;
  if (r >= 3.0 && reviews >= 10)  return 50;
  return 25;
}

/**
 * Shipping Score (25% weight)
 * 100 = Free, 1-2 days
 *  75 = Free, 3-5 days
 *  50 = Paid, 5-7 days
 *  25 = Expensive, 7+ days
 */
export function normalizeShipping(product: NormalizedProduct): number {
  const isFree = product.shippingCost === 0;
  const estimate = (product.shippingEstimate || '').toLowerCase();

  // Express / same-day / next-day
  if (/same.?day|next.?day|express|1.?2\s*days?/i.test(estimate)) {
    return isFree ? 100 : 75;
  }

  // Parse day range from estimate (take the upper bound to be conservative)
  const rangeMatch = estimate.match(/(\d+)\s*[-–]\s*(\d+)\s*days?/i);
  const singleMatch = estimate.match(/(\d+)\s*days?/i);

  let days = 5; // default unknown
  if (rangeMatch)       days = parseInt(rangeMatch[2], 10);
  else if (singleMatch) days = parseInt(singleMatch[1], 10);

  if (isFree) {
    if (days <= 2) return 100;
    if (days <= 5) return 75;
    return 50;
  } else {
    if (days <= 7) return 50;
    return 25;
  }
}

// Kept for backwards compatibility — sentiment now folded into quality score
export function normalizeSentiment(product: NormalizedProduct): number {
  const count = product.reviewCount || 0;
  if (count > 500)  return 100;
  if (count > 100)  return 85;
  if (count > 20)   return 70;
  if (count > 5)    return 55;
  if (count > 0)    return 45;
  return 30;
}
