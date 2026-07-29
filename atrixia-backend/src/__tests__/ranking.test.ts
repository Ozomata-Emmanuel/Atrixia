import { describe, it, expect } from 'vitest';
import { RankingEngine } from '../lib/ai/ranking/engine';
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
    seller: 'Test Seller',
    sellerRating: 80,
    reviewCount: 50,
    shippingCost: 0,
    shippingEstimate: 'Free Shipping',
    availability: true,
    condition: 'new',
    category: 'General',
    attributes: {},
    confidence: null,
    rawData: {},
    description: null,
    pros: [],
    cons: [],
    ...overrides,
  };
}

describe('RankingEngine.rank', () => {
  it('returns empty result for empty product list', () => {
    const result = RankingEngine.rank([]);
    expect(result.topPick).toBeNull();
    expect(result.budgetPick).toBeNull();
    expect(result.products).toHaveLength(0);
    expect(result.confidenceLevel).toBe('Low');
  });

  it('returns topPick for single product', () => {
    const p = makeProduct({ id: 'p1', title: 'HP Laptop', price: 299 });
    const result = RankingEngine.rank([p]);
    expect(result.topPick?.id).toBe('p1');
    expect(result.products).toHaveLength(1);
  });

  it('4 distinct picks are all different products', () => {
    const products = [
      makeProduct({ id: 'p1', price: 500, sellerRating: 95, reviewCount: 200, shippingCost: 0 }),
      makeProduct({ id: 'p2', price: 100, sellerRating: 70, reviewCount: 10,  shippingCost: 10 }),
      makeProduct({ id: 'p3', price: 300, sellerRating: 85, reviewCount: 100, shippingCost: 0 }),
      makeProduct({ id: 'p4', price: 200, sellerRating: 90, reviewCount: 80,  shippingCost: 0 }),
    ];
    const result = RankingEngine.rank(products);
    const picks = [result.topPick?.id, result.budgetPick?.id, result.performancePick?.id, result.valuePick?.id]
      .filter(Boolean);
    const unique = new Set(picks);
    expect(unique.size).toBe(picks.length); // all distinct
  });

  it('budgetPick is the cheapest product', () => {
    const products = [
      makeProduct({ id: 'p1', price: 500 }),
      makeProduct({ id: 'p2', price: 50 }),
      makeProduct({ id: 'p3', price: 300 }),
    ];
    const result = RankingEngine.rank(products);
    // budgetPick should be the cheapest (p2=50) unless it is already topPick
    const pickedIds = [result.topPick?.id];
    if (!pickedIds.includes('p2')) {
      expect(result.budgetPick?.id).toBe('p2');
    }
  });

  it('weights sum to ~1.0', () => {
    const result = RankingEngine.rank([makeProduct({ id: 'p1' })]);
    const { priceWeight, qualityWeight, sellerWeight, shippingWeight } = result.weights;
    const sum = priceWeight + qualityWeight + sellerWeight + shippingWeight;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('budget-aware: product over budget scores lower than one under budget', () => {
    const under = makeProduct({ id: 'under', price: 200, sellerRating: 80, reviewCount: 50 });
    const over  = makeProduct({ id: 'over',  price: 600, sellerRating: 80, reviewCount: 50 });
    const result = RankingEngine.rank([under, over], {}, 300);
    const underScore = result.products.find(p => p.id === 'under')?.scoreBreakdown.priceScore ?? 0;
    const overScore  = result.products.find(p => p.id === 'over')?.scoreBreakdown.priceScore  ?? 0;
    expect(underScore).toBeGreaterThan(overScore);
  });

  it('assigns scoreBreakdown to every product', () => {
    const products = [
      makeProduct({ id: 'p1', price: 100 }),
      makeProduct({ id: 'p2', price: 200 }),
    ];
    const result = RankingEngine.rank(products);
    for (const p of result.products) {
      expect(p.scoreBreakdown).toBeDefined();
      expect(typeof p.scoreBreakdown.overallScore).toBe('number');
    }
  });

  it('returns confidenceScore between 0 and 100', () => {
    const products = [makeProduct({ id: 'p1' }), makeProduct({ id: 'p2', price: 200 })];
    const result = RankingEngine.rank(products);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(100);
  });
});
