import { eq, desc } from 'drizzle-orm';
import { db } from '../db';
import { searches } from '../db/schema';
import { callAiService } from './aiService';

export const executeSearch = async (userId: string, query: string, filters: Array<{ label: string, value: string }>) => {
  // 1. Call AI service
  const results = await callAiService(query, filters);

  // 2. Store search in DB
  const newSearch = await db.insert(searches).values({
    userId,
    query,
    filters,
    results
  }).returning();

  return newSearch[0];
};

export const getSearchById = async (userId: string, searchId: string) => {
  const searchResult = await db.select()
    .from(searches)
    .where(eq(searches.id, searchId))
    .limit(1);

  if (searchResult.length === 0 || searchResult[0].userId !== userId) {
    return null;
  }

  return searchResult[0];
};

export const getSearchHistory = async (userId: string) => {
  const history = await db.select({
    id: searches.id,
    query: searches.query,
    createdAt: searches.createdAt
  })
  .from(searches)
  .where(eq(searches.userId, userId))
  .orderBy(desc(searches.createdAt))
  .limit(10);

  return history;
};
