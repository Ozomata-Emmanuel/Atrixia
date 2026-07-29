import { describe, it, expect } from 'vitest';
import { ReportGenerator } from '../lib/ai/report/generator';
import { RankingEngine } from '../lib/ai/ranking/engine';
import { NormalizedProduct } from '../lib/ai/models/product';

function makeProduct(overrides: Partial<NormalizedProduct> & { id: string }): NormalizedProduct {
  return {
    marketplace: 'jumia',
    title: 'HP Laptop 15',
    brand: 'HP',
    price: 299,
    currency: 'USD',
    image: 'https://img.example.com/hp.jpg',
    productUrl: 'https://jumia.com/hp-laptop',
    seller: 'Jumia Seller',
    sellerRating: 80,
    reviewCount: 45,
    shippingCost: 0,
    shippingEstimate: 'Standard Delivery (3-7 days)',
    availability: true,
    condition: 'new',
    category: 'laptop',
    attributes: {},
    confidence: null,
    rawData: {},
    description: null,
    pros: [],
    cons: [],
    ...overrides,
  };
}

describe('ReportGenerator', () => {
  const products = [
    makeProduct({ id: 'p1', price: 299, sellerRating: 90, reviewCount: 100 }),
    makeProduct({ id: 'p2', price: 150, sellerRating: 70, reviewCount: 10, marketplace: 'konga' }),
    makeProduct({ id: 'p3', price: 450, sellerRating: 95, reviewCount: 200, marketplace: 'ebay' }),
  ];

  it('generates a report with a valid UUID id', () => {
    const ranking = RankingEngine.rank(products);
    const report = ReportGenerator.generate(ranking, 'Great laptops found.');
    expect(report.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('sets executiveSummary from AI text', () => {
    const ranking = RankingEngine.rank(products);
    const report = ReportGenerator.generate(ranking, 'Great laptops found.');
    expect(report.executiveSummary).toBe('Great laptops found.');
  });

  it('falls back to generated summary when AI text is empty', () => {
    const ranking = RankingEngine.rank(products);
    const report = ReportGenerator.generate(ranking, '');
    expect(report.executiveSummary.length).toBeGreaterThan(0);
  });

  it('bestOverall is set', () => {
    const ranking = RankingEngine.rank(products);
    const report = ReportGenerator.generate(ranking, 'Summary');
    expect(report.bestOverall).not.toBeNull();
    expect(report.bestOverall?.id).toBeTruthy();
  });

  it('totalProductsFound matches input count', () => {
    const ranking = RankingEngine.rank(products);
    const report = ReportGenerator.generate(ranking, 'Summary');
    expect(report.totalProductsFound).toBe(products.length);
  });

  it('rankedProducts all have scoreBreakdown', () => {
    const ranking = RankingEngine.rank(products);
    const report = ReportGenerator.generate(ranking, 'Summary');
    for (const p of report.rankedProducts) {
      expect(p.scoreBreakdown).toBeDefined();
    }
  });

  it('every product gets deterministic description when AI gives none', () => {
    const ranking = RankingEngine.rank(products);
    const report = ReportGenerator.generate(ranking, 'Summary');
    for (const p of report.rankedProducts) {
      expect(typeof p.description).toBe('string');
      expect((p.description as string).length).toBeGreaterThan(0);
    }
  });

  it('mergeAIProductAnalysis writes AI descriptions onto products', () => {
    const ranking = RankingEngine.rank(products);
    const report = ReportGenerator.generate(ranking, 'Summary');
    const firstId = report.rankedProducts[0].id;

    const merged = ReportGenerator.mergeAIProductAnalysis(report, [
      {
        productId: firstId,
        description: 'AI-generated description here.',
        pros: ['Fast CPU'],
        cons: ['Small screen'],
      },
    ]);

    const updated = merged.rankedProducts.find(p => p.id === firstId);
    expect(updated?.description).toBe('AI-generated description here.');
    expect(updated?.pros).toContain('Fast CPU');
    expect(updated?.cons).toContain('Small screen');
  });

  it('marketplacesSearched lists all unique marketplaces', () => {
    const ranking = RankingEngine.rank(products);
    const report = ReportGenerator.generate(ranking, 'Summary');
    expect(report.marketplacesSearched).toContain('jumia');
    expect(report.marketplacesSearched).toContain('konga');
    expect(report.marketplacesSearched).toContain('ebay');
  });
});
