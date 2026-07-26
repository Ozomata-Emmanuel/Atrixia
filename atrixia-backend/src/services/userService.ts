import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';

export const getUserProfile = async (userId: number) => {
  const user = await db.select({
    userId: users.id,
    email: users.email,
    created_at: users.createdAt
  })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
};
