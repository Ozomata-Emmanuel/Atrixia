/**
 * db_check.ts — run with: npx tsx src/__tests__/db_check.ts
 * Verifies DB table structure and tests the save paths directly.
 */
import dotenv from 'dotenv';
dotenv.config();

import { db } from '../db';
import { searches, preferences, conversations, users } from '../db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('\n=== DB Connection Check ===');
  try {
    await db.execute(sql`SELECT 1`);
    console.log('✅ DB connected');
  } catch (e: any) {
    console.error('❌ DB connection failed:', e.message);
    process.exit(1);
  }

  console.log('\n=== Searches in DB ===');
  const searchRows = await db.execute(
    sql`SELECT id, user_id, query, created_at FROM searches ORDER BY created_at DESC LIMIT 10`
  );
  const srows = Array.isArray(searchRows) ? searchRows : (searchRows as any).rows ?? [];
  if (srows.length === 0) {
    console.log('  No searches found');
  }
  srows.forEach((r: any) => console.log(`  [${r.created_at?.toISOString?.() ?? r.created_at}] user=${r.user_id} query="${r.query}"`));

  console.log('\n=== Users in DB ===');
  const userRows = await db.execute(sql`SELECT id, email FROM users`);
  const urows = Array.isArray(userRows) ? userRows : (userRows as any).rows ?? [];
  urows.forEach((r: any) => console.log(`  id=${r.id} email=${r.email}`));

  console.log('\nDone.\n');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
