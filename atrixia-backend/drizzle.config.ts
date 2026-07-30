import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/atrixia',
    ...(isProduction ? { ssl: { rejectUnauthorized: false } } : {}),
  },
});
