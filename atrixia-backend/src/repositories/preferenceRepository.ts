import { db } from '../db';
import { preferences } from '../db/schema';
import { eq } from 'drizzle-orm';
import { IUserPreferencesRepository } from '../lib/ai/db/db';
import { ConversationContext } from '../lib/ai/types/ai';

export class PreferenceRepository implements IUserPreferencesRepository {
  async get(userId: string): Promise<ConversationContext['preferences'] | null> {
    const records = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1);
    if (records.length === 0) return null;

    const rec = records[0];
    return {
      currency: rec.preferredCurrency || 'USD',
      budgetMin: rec.budgetMin ? parseFloat(rec.budgetMin) : 0,
      budgetMax: rec.budgetMax ? parseFloat(rec.budgetMax) : 10000,
      prioritizePrice: rec.prioritizePrice !== null ? rec.prioritizePrice : true,
      prioritizeQuality: rec.prioritizeQuality !== null ? rec.prioritizeQuality : false,
      prioritizeShipping: false,
      prioritizeSeller: false,
    };
  }

  async save(userId: string, prefs: ConversationContext['preferences']): Promise<void> {
    const existing = await db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1);
    const budgetMin = prefs?.budgetMin?.toString() || '0';
    const budgetMax = prefs?.budgetMax?.toString() || '10000';
    const preferredCurrency = prefs?.currency || 'USD';
    const prioritizePrice = prefs?.prioritizePrice !== undefined ? prefs.prioritizePrice : true;
    const prioritizeQuality = prefs?.prioritizeQuality !== undefined ? prefs.prioritizeQuality : false;

    if (existing.length > 0) {
      await db.update(preferences)
        .set({
          budgetMin,
          budgetMax,
          preferredCurrency,
          prioritizePrice,
          prioritizeQuality,
          updatedAt: new Date(),
        })
        .where(eq(preferences.userId, userId));
    } else {
      await db.insert(preferences).values({
        userId,
        budgetMin,
        budgetMax,
        preferredCurrency,
        prioritizePrice,
        prioritizeQuality,
      });
    }
  }
}
