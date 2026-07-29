import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for SearchHistoryRepository logic.
 * We mock the DB layer entirely — no real Postgres needed.
 */

// ── Mock the db module ────────────────────────────────────────────────────────
const mockRows: any[] = [];

vi.mock('../db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(mockRows),
          orderBy: () => ({
            limit: () => Promise.resolve(mockRows),
          }),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => Promise.resolve(),
      }),
    }),
  },
}));

vi.mock('../db/schema', () => ({
  searches: { id: 'id', userId: 'userId', query: 'query', results: 'results', createdAt: 'createdAt' },
}));

// Import after mocks
import { SearchHistoryRepository } from '../repositories/searchHistoryRepository';

describe('SearchHistoryRepository', () => {
  const repo = new SearchHistoryRepository();

  beforeEach(() => {
    mockRows.length = 0;
  });

  it('get() returns null when no rows found', async () => {
    const result = await repo.get('nonexistent-id');
    expect(result).toBeNull();
  });

  it('get() returns record with results when row exists', async () => {
    const fakeReport = { executiveSummary: 'Test summary', bestOverall: null, totalProductsFound: 5 };
    mockRows.push({
      id: 'search-123',
      query: 'HP laptop',
      createdAt: new Date('2026-01-01'),
      results: fakeReport,
    });

    const result = await repo.get('search-123');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('search-123');
    expect(result!.query).toBe('HP laptop');
    expect((result as any).results).toEqual(fakeReport);
  });

  it('listByUser() returns summary with totalProductsFound', async () => {
    const fakeReport = {
      executiveSummary: 'Found 5 products.',
      bestOverall: { title: 'HP Laptop', price: 299, currency: 'USD', image: null, marketplace: 'jumia' },
      totalProductsFound: 5,
    };
    mockRows.push({
      id: 'search-456',
      query: 'laptop',
      createdAt: new Date('2026-01-15'),
      results: fakeReport,
    });

    const list = await repo.listByUser('user-1');
    expect(list).toHaveLength(1);
    expect(list[0].query).toBe('laptop');
    expect((list[0] as any).resultsCount).toBe(5);
    expect((list[0] as any).summary?.executiveSummary).toBe('Found 5 products.');
    expect((list[0] as any).summary?.bestOverall?.title).toBe('HP Laptop');
  });

  it('listByUser() handles null results gracefully', async () => {
    mockRows.push({
      id: 'search-789',
      query: 'shoes',
      createdAt: new Date(),
      results: null,
    });
    const list = await repo.listByUser('user-1');
    expect(list[0].resultsCount).toBe(0);
    expect((list[0] as any).summary).toBeNull();
  });

  it('save() calls insert without throwing', async () => {
    await expect(
      repo.save({
        id: 'new-search-id',
        query: 'wireless mouse',
        timestamp: new Date(),
        resultsCount: 3,
        userId: 'user-abc',
        results: { executiveSummary: 'Good mice found.' },
      })
    ).resolves.not.toThrow();
  });
});
