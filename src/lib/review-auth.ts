import { cookies } from 'next/headers';
import crypto from 'crypto';

// You can change this passcode - store it in environment variable for production
const REVIEW_PASSCODE = process.env.REVIEW_PASSCODE || 'REVIEW2025';
const COOKIE_NAME = 'review_access_token';
const TOKEN_EXPIRY = 60 * 60 * 24; // 24 hours in seconds

export function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashPasscode(passcode: string): string {
  return crypto.createHash('sha256').update(passcode).digest('hex');
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  return passcode === REVIEW_PASSCODE;
}

export async function setReviewAccess(): Promise<void> {
  const token = generateAccessToken();
  const cookieStore = cookies();
  
  (await cookieStore).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY,
    path: '/admin/review'
  });
}

export async function hasReviewAccess(): Promise<boolean> {
  const cookieStore = cookies();
  const token = (await cookieStore).get(COOKIE_NAME);
  
  return !!token?.value;
}

export async function clearReviewAccess(): Promise<void> {
  const cookieStore = cookies();
  (await cookieStore).delete(COOKIE_NAME);
}
