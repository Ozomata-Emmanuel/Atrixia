import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { searches } from '../db/schema';
import { callAiService } from './aiService';
import { AppError } from '../utils/error';

export const executeSearch = async (userId: string, query: string, filters: Array<{ label: string, value: string }>) => {
  const results = await callAiService(userId, query, filters);

  const newSearch = await db.insert(searches).values({
    id: crypto.randomUUID(),
    userId,
    query,
    filters,
    results,
  }).returning();

  return newSearch[0];
};

export const getSearchById = async (userId: string, searchId: string) => {
  const searchResult = await db.select()
    .from(searches)
    .where(eq(searches.id, searchId))
    .limit(1);

  if (searchResult.length === 0) throw new AppError('Search not found', 404);
  if (searchResult[0].userId !== userId) throw new AppError('Search belongs to different user', 403);

  return searchResult[0];
};

export const getSearchHistory = async (userId: string, limit = 10, offset = 0) => {
  const history = await db.select({
    id: searches.id,
    query: searches.query,
    created_at: searches.createdAt,
    resultCount: sql<number>`jsonb_array_length(COALESCE(${searches.results}, '[]'::jsonb))`,
  })
    .from(searches)
    .where(eq(searches.userId, userId))
    .orderBy(desc(searches.createdAt))
    .limit(limit)
    .offset(offset);

  const totalQuery = await db.select({ count: sql<number>`count(*)` })
    .from(searches)
    .where(eq(searches.userId, userId));

  const total = Number(totalQuery[0].count);
  return { total, searches: history };
};
