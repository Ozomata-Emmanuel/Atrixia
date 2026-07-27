import { NormalizedProduct } from '../models/product';

export function normalizePrice(price: number, minPrice: number, maxPrice: number): number {
  if (maxPrice === minPrice) return 100;
  return ((maxPrice - price) / (maxPrice - minPrice)) * 100;
}

export function normalizeQuality(product: NormalizedProduct): number {
  const rating = product.sellerRating !== null ? (product.sellerRating > 5 ? product.sellerRating / 20 : product.sellerRating) : 4.0;
  return Math.min(100, Math.max(0, rating * 20));
}

export function normalizeShipping(product: NormalizedProduct): number {
  let days = 5;
  const estimate = product.shippingEstimate || '';
  const match = estimate.match(/(\d+)/);
  if (match) {
    days = parseInt(match[1], 10);
  }
  const speedScore = 100 - (days * 10);
  return Math.min(100, Math.max(0, speedScore));
}

export function normalizeSeller(product: NormalizedProduct): number {
  return product.sellerRating !== null ? Math.min(100, Math.max(0, product.sellerRating)) : 80;
}

export function normalizeSentiment(product: NormalizedProduct): number {
  const count = product.reviewCount || 0;
  let volumeFactor = 50;
  if (count > 500) volumeFactor = 100;
  else if (count > 100) volumeFactor = 85;
  else if (count > 10) volumeFactor = 70;

  return volumeFactor;
}
