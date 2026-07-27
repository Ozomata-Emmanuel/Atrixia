import { db } from '../db';
import { searches } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { ISearchSessionRepository } from '../lib/ai/db/db';
import { SearchSessionRecord } from '../lib/ai/memory/history';

export class SearchHistoryRepository implements ISearchSessionRepository {
  async get(id: string): Promise<SearchSessionRecord | null> {
    const results = await db.select().from(searches).where(eq(searches.id, id)).limit(1);
    if (results.length === 0) return null;

    const record = results[0];
    return {
      id: record.id,
      query: record.query,
      timestamp: record.createdAt,
      resultsCount: Array.isArray(record.results) ? record.results.length : 0,
    };
  }

  async save(session: SearchSessionRecord & { userId?: string; results?: any }): Promise<void> {
    const userId = session.userId || '00000000-0000-0000-0000-000000000000';
    const resultsPayload = session.results || [];
    
    await db.insert(searches).values({
      id: session.id,
      userId,
      query: session.query,
      results: resultsPayload,
      createdAt: session.timestamp,
    });
  }

  async listByUser(userId: string): Promise<SearchSessionRecord[]> {
    const records = await db.select()
      .from(searches)
      .where(eq(searches.userId, userId))
      .orderBy(desc(searches.createdAt))
      .limit(20);

    return records.map((record) => ({
      id: record.id,
      query: record.query,
      timestamp: record.createdAt,
      resultsCount: Array.isArray(record.results) ? record.results.length : 0,
    }));
  }
}
