import { db } from '../db';
import { searches } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { ISearchSessionRepository } from '../lib/ai/db/db';
import { SearchSessionRecord } from '../lib/ai/memory/history';

export class SearchHistoryRepository implements ISearchSessionRepository {
  /**
   * Fetch a single search record by ID.
   * Returns the full results payload so GET /api/search/:id is useful.
   */
  async get(id: string): Promise<(SearchSessionRecord & { results?: any }) | null> {
    const rows = await db.select().from(searches).where(eq(searches.id, id)).limit(1);
    if (rows.length === 0) return null;

    const record = rows[0];
    const results = record.results ?? null;
    return {
      id: record.id,
      query: record.query,
      timestamp: record.createdAt,
      resultsCount: Array.isArray(results) ? results.length : 1,
      results,
    };
  }

  /**
   * Persist a search session.
   * Uses INSERT ... ON CONFLICT DO NOTHING so retries (e.g. from SSE + non-stream
   * both calling save for the same id) are silently ignored.
   */
  async save(session: SearchSessionRecord & { userId?: string; results?: any }): Promise<void> {
    const userId = session.userId || '00000000-0000-0000-0000-000000000000';
    const resultsPayload = session.results ?? [];

    await db
      .insert(searches)
      .values({
        id: session.id,
        userId,
        query: session.query,
        results: resultsPayload,
        createdAt: session.timestamp,
      })
      .onConflictDoNothing();
    console.log(`[SearchHistoryRepository] Saved search "${session.query}" for user ${userId}`);
  }

  /**
   * List last 20 searches for a user.
   * Returns a summary row (no full results payload) for the history list view.
   */
  async listByUser(userId: string): Promise<(SearchSessionRecord & { results?: any })[]> {
    const records = await db
      .select()
      .from(searches)
      .where(eq(searches.userId, userId))
      .orderBy(desc(searches.createdAt))
      .limit(20);

    return records.map((record) => {
      const results = record.results ?? null;
      // Return a lightweight summary: query, timestamp, count, and top-level
      // report fields (executiveSummary, bestOverall) so the history list is
      // actually useful without sending the full product array.
      const summary = results && typeof results === 'object' && !Array.isArray(results)
        ? {
            executiveSummary: (results as any).executiveSummary ?? null,
            bestOverall: (results as any).bestOverall ?? null,
            totalProducts: (results as any).totalProductsFound ?? null,
          }
        : null;

      return {
        id: record.id,
        query: record.query,
        timestamp: record.createdAt,
        resultsCount: summary?.totalProducts ?? (Array.isArray(results) ? results.length : 0),
        summary,
      };
    });
  }
}
