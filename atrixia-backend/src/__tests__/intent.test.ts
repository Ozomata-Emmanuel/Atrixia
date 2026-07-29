import { describe, it, expect } from 'vitest';
import { extractIntent } from '../lib/ai/intent/extractor';

describe('extractIntent', () => {
  it('extracts budget from "under $300"', () => {
    const intent = extractIntent('HP laptops under $300');
    expect(intent.budgetMax).toBe(300);
    expect(intent.productType).toBe('laptop');
  });

  it('sets price floor for laptops', () => {
    const intent = extractIntent('laptop');
    expect(intent.priceFloor).toBeGreaterThan(0);
  });

  it('extracts brand', () => {
    const intent = extractIntent('Samsung Galaxy phone');
    expect(intent.brand?.toLowerCase()).toContain('samsung');
  });

  it('includes exclusion terms for laptops', () => {
    const intent = extractIntent('laptop');
    expect(intent.excludeTerms.length).toBeGreaterThan(0);
    // charger should be excluded when searching for laptops
    expect(intent.excludeTerms.some(t => t.includes('charger'))).toBe(true);
  });

  it('handles descriptive queries via NLP', () => {
    const intent = extractIntent('something to sit on while coding');
    // compromise.js should extract a noun-based productType
    expect(intent.productType).toBeTruthy();
    expect(intent.searchTerms.length).toBeGreaterThan(0);
  });

  it('returns no warning for valid queries', () => {
    const intent = extractIntent('iPhone 16 Pro Max');
    expect(intent.queryWarning).toBeNull();
  });

  it('always returns searchTerms array', () => {
    const intent = extractIntent('wireless mouse');
    expect(Array.isArray(intent.searchTerms)).toBe(true);
    expect(intent.searchTerms.length).toBeGreaterThan(0);
  });

  it('extracts NGN budget', () => {
    const intent = extractIntent('laptop under ₦200000');
    expect(intent.budgetMax).toBe(200000);
  });
});
