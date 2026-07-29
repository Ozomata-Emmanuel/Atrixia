import { z } from 'zod';

// All marketplace identifiers the system supports
export const AVAILABLE_MARKETPLACES = ['jumia', 'konga', 'ebay', 'aliexpress', 'temu'] as const;
export type MarketplaceName = typeof AVAILABLE_MARKETPLACES[number];

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
});

export const PreferencesSchema = z.object({
  currency: z.string().optional().default('USD'),
  budgetMin: z.number().nonnegative().optional().default(0),
  budgetMax: z.number().nonnegative().optional().default(1000),
  prioritizePrice: z.boolean().optional().default(true),
  prioritizeQuality: z.boolean().optional().default(false),
  prioritizeShipping: z.boolean().optional().default(false),
  prioritizeSeller: z.boolean().optional().default(false),
});

export const ConversationContextSchema = z.object({
  conversationId: z.string().optional(),
  messages: z.array(MessageSchema),
  preferences: PreferencesSchema.optional(),
  // Optional marketplace filter — user picks which ones to search
  marketplaces: z.array(z.enum(AVAILABLE_MARKETPLACES)).optional(),
});

export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  context: ConversationContextSchema.optional(),
  // Top-level shorthand — can also be set inside context
  marketplaces: z.array(z.enum(AVAILABLE_MARKETPLACES)).optional(),
});

export const ChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  context: ConversationContextSchema.optional(),
});
