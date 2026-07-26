import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error';

export const registerUser = async (email: string, password: string) => {
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    throw new AppError('Email already in use', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  
  const newUser = await db.insert(users).values({
    email,
    passwordHash
  }).returning({
    id: users.id,
    email: users.email
  });

  const user = newUser[0];
  
  const token = jwt.sign(
    { userId: user.id, email: user.email }, 
    process.env.JWT_SECRET || 'fallback_secret', 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return { userId: user.id, token };
};

export const loginUser = async (email: string, password: string) => {
  const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user.length === 0) {
    throw new AppError('Invalid email or password', 400);
  }

  const isMatch = await bcrypt.compare(password, user[0].passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 400);
  }

  const token = jwt.sign(
    { userId: user[0].id, email: user[0].email }, 
    process.env.JWT_SECRET || 'fallback_secret', 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return { userId: user[0].id, email: user[0].email, token };
};
