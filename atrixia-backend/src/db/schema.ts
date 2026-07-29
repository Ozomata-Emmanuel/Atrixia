import { pgTable, uuid, text, varchar, timestamp, jsonb, numeric, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  fullName: varchar('full_name').notNull(),
  email: varchar('email').notNull().unique(),
  passwordHash: varchar('password_hash').notNull(),
  emailVerified: boolean('email_verified').default(false),
  verificationCode: varchar('verification_code', { length: 6 }),
  verificationCodeExpiresAt: timestamp('verification_code_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const searches = pgTable('searches', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  query: text('query').notNull(),
  filters: jsonb('filters').default([]),
  results: jsonb('results').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const preferences = pgTable('preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  budgetMin: numeric('budget_min').default('0'),
  budgetMax: numeric('budget_max').default('10000'),
  preferredCurrency: varchar('preferred_currency', { length: 3 }).default('USD'),
  prioritizePrice: boolean('prioritize_price').default(true),
  prioritizeQuality: boolean('prioritize_quality').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Stores per-conversation chat message history for AI memory
export const conversations = pgTable('conversations', {
  id: varchar('id').primaryKey(),           // conversationId e.g. conv_abc123
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  messages: jsonb('messages').notNull().default([]),  // Message[] array
  summary: text('summary'),                // auto-summarised older messages
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Search = typeof searches.$inferSelect;
export type NewSearch = typeof searches.$inferInsert;
export type Preference = typeof preferences.$inferSelect;
export type NewPreference = typeof preferences.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
