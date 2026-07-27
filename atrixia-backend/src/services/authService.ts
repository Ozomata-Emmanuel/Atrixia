import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error';
import { generateVerificationCode, isCodeExpired, sendVerificationEmail } from '../utils/verification';
import { emailTemplate, sendEmail } from '../utils/mail';

export const registerUser = async (fullName: string, email: string, password: string) => {
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    throw new AppError('Email already in use', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationCode = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  const newUser = await db.insert(users).values({
    fullName,
    email,
    passwordHash,
    emailVerified: false,
    verificationCode,
    verificationCodeExpiresAt: expiresAt
  }).returning({
    userId: users.id,
    email: users.email,
    fullName: users.fullName,
    emailVerified: users.emailVerified
  });
const firstName = fullName.split(' ')[0];
  const user = newUser[0];
  
  await sendVerificationEmail(email, verificationCode);
   await sendEmail({
     email: email,
     subject: "Email Verification",
     text: `Your verification code is: ${verificationCode}`,
     html: emailTemplate({ firstName: firstName || "User", code: verificationCode }),
   });

  return user;
};

export const verifyEmail = async (email: string, code: string) => {
  const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (userRecord.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = userRecord[0];

  if (user.verificationCode !== code) {
    throw new AppError('Invalid or expired code', 401);
  }

  if (!user.verificationCodeExpiresAt || isCodeExpired(user.verificationCodeExpiresAt)) {
    throw new AppError('Invalid or expired code', 401);
  }

  const updatedUser = await db.update(users).set({
    emailVerified: true,
    verificationCode: null,
    verificationCodeExpiresAt: null
  }).where(eq(users.id, user.id)).returning();

  const token = jwt.sign(
    { userId: user.id, email: user.email }, 
    process.env.JWT_SECRET || 'fallback_secret', 
    { expiresIn: '3d' }
  );

  return {
    userId: updatedUser[0].id,
    email: updatedUser[0].email,
    fullName: updatedUser[0].fullName,
    token
  };
};

export const resendVerificationCode = async (email: string) => {
  const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (userRecord.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = userRecord[0];

  if (user.emailVerified) {
    throw new AppError('Email already verified', 400);
  }

  const verificationCode = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);

  await db.update(users).set({
    verificationCode,
    verificationCodeExpiresAt: expiresAt
  }).where(eq(users.id, user.id));

  await sendVerificationEmail(email, verificationCode);
};

export const loginUser = async (email: string, password: string) => {
  const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (userRecord.length === 0) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = userRecord[0];

  if (!user.emailVerified) {
    throw new AppError('Please verify your email first', 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email }, 
    process.env.JWT_SECRET || 'fallback_secret', 
    { expiresIn: '3d' }
  );

  return { 
    userId: user.id, 
    email: user.email, 
    fullName: user.fullName,
    token 
  };
};
