import { db } from '../db';
import { conversations } from '../db/schema';
import { eq } from 'drizzle-orm';
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
    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, thread.conversationId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(conversations)
        .set({
          messages: thread.messages as any,
          summary: thread.summary || null,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, thread.conversationId));
    } else {
      await db.insert(conversations).values({
        id: thread.conversationId,
        userId: thread.userId || '00000000-0000-0000-0000-000000000000',
        messages: thread.messages as any,
        summary: thread.summary || null,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      });
    }
  }

  async delete(conversationId: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, conversationId));
  }

  async listByUser(userId: string): Promise<ConversationThread[]> {
    const records = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(conversations.updatedAt);

    return records.map(rec => ({
      conversationId: rec.id,
      messages: (rec.messages as Message[]) || [],
      summary: rec.summary || undefined,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
    }));
  }
}
