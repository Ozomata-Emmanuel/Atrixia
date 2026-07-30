import { db } from '../db';
import { preferences } from '../db/schema';
import { eq } from 'drizzle-orm';
import { IUserPreferencesRepository } from '../lib/ai/db/db';
import { ConversationContext } from '../lib/ai/types/ai';

export interface UserPreferences {
  currency: string;
  prioritizePrice: boolean;
  prioritizeQuality: boolean;
  preferredMarketplaces: string[]; // [] means all
}

export class PreferenceRepository implements IUserPreferencesRepository {
  async get(userId: string): Promise<ConversationContext['preferences'] | null> {
    const records = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    if (records.length === 0) return null;

    const rec = records[0];
    return {
      currency: rec.preferredCurrency || 'USD',
      prioritizePrice: rec.prioritizePrice ?? false,
      prioritizeQuality: rec.prioritizeQuality ?? true,
      // Pass through for orchestrator marketplace filtering
      preferredMarketplaces: (rec.preferredMarketplaces as string[]) || [],
    } as any;
  }

  async save(userId: string, prefs: UserPreferences): Promise<void> {
    const existing = await db
      .select({ id: preferences.id })
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    const values = {
      preferredCurrency:     prefs.currency || 'USD',
      prioritizePrice:       prefs.prioritizePrice ?? false,
      prioritizeQuality:     prefs.prioritizeQuality ?? true,
      preferredMarketplaces: prefs.preferredMarketplaces ?? [],
    };

    if (existing.length > 0) {
      await db
        .update(preferences)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(preferences.userId, userId));
      console.log(`[PreferenceRepository] Updated preferences for user ${userId}`, values);
    } else {
      await db.insert(preferences).values({ userId, ...values });
      console.log(`[PreferenceRepository] Inserted preferences for user ${userId}`, values);
    }
  }

  async getMarketplaces(userId: string): Promise<string[]> {
    const records = await db
      .select({ preferredMarketplaces: preferences.preferredMarketplaces })
      .from(preferences)
      .where(eq(preferences.userId, userId))
      .limit(1);

    if (records.length === 0) return [];
    return (records[0].preferredMarketplaces as string[]) || [];
  }
}
