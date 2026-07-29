import { describe, it, expect } from 'vitest';
import { MarketplaceNormalizer } from '../lib/ai/marketplace/normalizer';
import { NormalizedProduct } from '../lib/ai/models/product';

function makeProduct(overrides: Partial<NormalizedProduct> & { id: string }): NormalizedProduct {
  return {
    marketplace: 'jumia',
    title: 'Test Product',
    brand: null,
    price: 100,
    currency: 'USD',
    image: null,
    productUrl: 'https://example.com',
    seller: null,
    sellerRating: null,
    reviewCount: null,
    shippingCost: null,
    shippingEstimate: null,
    availability: true,
    condition: 'new',
    category: null,
    attributes: {},
    confidence: null,
    rawData: {},
    description: null,
    pros: [],
    cons: [],
    ...overrides,
  };
}

describe('MarketplaceNormalizer', () => {
  describe('convertPrice', () => {
    it('no-ops when converting USD to USD', () => {
      expect(MarketplaceNormalizer.convertPrice(100, 'USD', 'USD')).toBe(100);
    });

    it('converts NGN to USD', () => {
      const usd = MarketplaceNormalizer.convertPrice(1000, 'NGN', 'USD');
      expect(usd).toBeGreaterThan(0);
      expect(usd).toBeLessThan(5); // 1000 NGN should be well under $5
    });

    it('result is rounded to 2dp', () => {
      const result = MarketplaceNormalizer.convertPrice(150000, 'NGN', 'USD');
      expect(result.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
    });
  });

  describe('normalizeBrand', () => {
    it('capitalises known brand', () => {
      expect(MarketplaceNormalizer.normalizeBrand('dell')).toBe('Dell');
    });

    it('returns null for null input', () => {
      expect(MarketplaceNormalizer.normalizeBrand(null)).toBeNull();
    });

    it('capitalises first letter of unknown brand', () => {
      expect(MarketplaceNormalizer.normalizeBrand('xiaomi')).toBe('Xiaomi');
    });
  });

  describe('computeTitleSimilarity', () => {
    it('returns 100 for identical titles', () => {
      expect(MarketplaceNormalizer.computeTitleSimilarity('HP Laptop 15', 'HP Laptop 15')).toBe(100);
    });

    it('returns 0 for completely different titles', () => {
      const score = MarketplaceNormalizer.computeTitleSimilarity('Laptop', 'Shoes');
      expect(score).toBe(0);
    });

    it('returns high score for similar titles', () => {
      const score = MarketplaceNormalizer.computeTitleSimilarity(
        'HP 15 Laptop Intel Core i5',
        'HP 15 Laptop Intel Core i5 8GB RAM'
      );
      // Jaccard similarity — adding extra tokens lowers the score,
      // but titles are clearly similar (>50 is enough to be useful)
      expect(score).toBeGreaterThan(50);
    });
  });

  describe('deduplicateProducts', () => {
    it('removes exact duplicate titles from same marketplace', () => {
      const p1 = makeProduct({ id: 'p1', marketplace: 'jumia', title: 'HP Laptop 15 inch Intel Core i5' });
      const p2 = makeProduct({ id: 'p2', marketplace: 'jumia', title: 'HP Laptop 15 inch Intel Core i5' });
      const result = MarketplaceNormalizer.deduplicateProducts([p1, p2]);
      expect(result).toHaveLength(1);
    });

    it('keeps products from different marketplaces even if titles match', () => {
      const p1 = makeProduct({ id: 'p1', marketplace: 'jumia', title: 'HP Laptop 15 Intel Core i5' });
      const p2 = makeProduct({ id: 'p2', marketplace: 'ebay',  title: 'HP Laptop 15 Intel Core i5' });
      const result = MarketplaceNormalizer.deduplicateProducts([p1, p2]);
      expect(result).toHaveLength(2);
    });

    it('keeps the cheaper of two duplicates', () => {
      const expensive = makeProduct({ id: 'exp', marketplace: 'jumia', price: 500, title: 'HP Laptop Intel Core i5 15 inch' });
      const cheap     = makeProduct({ id: 'chp', marketplace: 'jumia', price: 100, title: 'HP Laptop Intel Core i5 15 inch' });
      const result = MarketplaceNormalizer.deduplicateProducts([expensive, cheap]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('chp');
    });
  });

  describe('normalizeProduct', () => {
    it('converts NGN price to USD', () => {
      const p = makeProduct({ id: 'p1', price: 150000, currency: 'NGN' });
      const normalized = MarketplaceNormalizer.normalizeProduct(p, 'USD');
      expect(normalized.currency).toBe('USD');
      expect(normalized.price).toBeLessThan(200); // 150k NGN ~= $100
    });

    it('preserves USD price when already USD', () => {
      const p = makeProduct({ id: 'p1', price: 299, currency: 'USD' });
      const normalized = MarketplaceNormalizer.normalizeProduct(p, 'USD');
      expect(normalized.price).toBe(299);
    });

    it('sets availability to boolean', () => {
      const p = makeProduct({ id: 'p1', availability: true });
      const normalized = MarketplaceNormalizer.normalizeProduct(p, 'USD');
      expect(typeof normalized.availability).toBe('boolean');
    });
  });
});
