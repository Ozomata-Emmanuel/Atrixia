import { db } from '../db';
import { conversations } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { ConversationThread } from '../lib/ai/memory/history';
import { Message } from '../lib/ai/types/ai';

export class ConversationRepository {
  async get(conversationId: string): Promise<ConversationThread | null> {
    const records = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (records.length === 0) return null;
    const rec = records[0];

    return {
      conversationId: rec.id,
      messages: (rec.messages as Message[]) || [],
      summary: rec.summary || undefined,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
    };
  }

  async save(thread: ConversationThread): Promise<void> {
    const messagesJson = JSON.stringify(thread.messages);
    const now = new Date();
    const createdAt = thread.createdAt instanceof Date
      ? thread.createdAt.toISOString()
      : new Date(thread.createdAt).toISOString();
    const nowIso = now.toISOString();

    await db.execute(sql`
      INSERT INTO conversations (id, user_id, messages, summary, created_at, updated_at)
      VALUES (
        ${thread.conversationId},
        ${thread.userId || '00000000-0000-0000-0000-000000000000'},
        ${messagesJson}::jsonb,
        ${thread.summary ?? null},
        ${createdAt}::timestamptz,
        ${nowIso}::timestamptz
      )
      ON CONFLICT (id) DO UPDATE SET
        messages   = EXCLUDED.messages,
        summary    = EXCLUDED.summary,
        updated_at = EXCLUDED.updated_at
    `);
  }

  async delete(conversationId: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, conversationId));
  }

  async listByUser(userId: string): Promise<ConversationThread[]> {
    const records = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    return records.map(rec => ({
      conversationId: rec.id,
      messages: (rec.messages as Message[]) || [],
      summary: rec.summary || undefined,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
    }));
  }
}
