import { db } from '../db';
import { searches } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
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
   * Uses INSERT ... ON CONFLICT DO NOTHING — safe to call multiple times for same id.
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
    console.log(`[SearchHistoryRepository] Saved search "${session.query.slice(0, 50)}" for user ${userId}`);
  }

  /**
   * List last 20 searches for a user (sidebar view — lightweight, no full results).
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

  /**
   * Delete a single search by ID.
   * Only deletes if it belongs to the given userId (ownership check).
   */
  async deleteById(id: string, userId: string): Promise<void> {
    await db
      .delete(searches)
      .where(and(eq(searches.id, id), eq(searches.userId, userId)));
    console.log(`[SearchHistoryRepository] Deleted search ${id} for user ${userId}`);
  }

  /**
   * Delete all searches for a user — clears their full history.
   */
  async deleteAllByUser(userId: string): Promise<void> {
    await db.delete(searches).where(eq(searches.userId, userId));
    console.log(`[SearchHistoryRepository] Cleared all history for user ${userId}`);
  }
}
