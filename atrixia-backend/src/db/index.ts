import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/atrixia';
const isProduction = process.env.NODE_ENV === 'production';

const client = postgres(connectionString, {
  max:             isProduction ? 10 : 5,   // max pool size
  idle_timeout:    20,                        // seconds before idle connection closes
  connect_timeout: 10,                        // seconds before giving up on a new connection
  ssl:             isProduction ? { rejectUnauthorized: false } : false, // required by most cloud DBs (Supabase, Neon, Railway)
});

export const db = drizzle(client, { schema });
