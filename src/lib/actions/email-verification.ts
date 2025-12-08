"use server";

import { eq, and } from "drizzle-orm";
import db from "@/db/drizzle";
import { emailVerificationCodes, users } from "@/db/schema";
import { sendVerificationCode } from "@/lib/email";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';





async function isUserExisting(email: string): Promise<boolean> {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  return !!existingUser;
}

export async function sendVerificationCodeAction(email: string) {
  try {
    if (await isUserExisting(email)) {
      return { success: false, error: "An account with this email already exists. Please sign in instead." };
    }

    // Invalidate old codes
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email));

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(emailVerificationCodes).values({
      email,
      code,
      expiresAt,
    });

    await sendVerificationCode({ to: email, verificationCode: code });

    return { success: true, message: "Verification code sent to your email." };
  } catch (error) {
    console.error("Error sending verification code:", error);
    return { success: false, error: "An unexpected error occurred. Please try again." };
  }
}

export async function resendVerificationCode(email: string) {
    try {
        if (await isUserExisting(email)) {
          return { success: false, error: "An account with this email already exists." };
        }
    
        // Invalidate old codes before sending a new one
        await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, email));
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
        await db.insert(emailVerificationCodes).values({
          email,
          code,
          expiresAt,
        });
    
        await sendVerificationCode({ to: email, verificationCode: code });
    
        return { success: true, message: "A new verification code has been sent." };
    } catch (error)        {
        console.error("Error resending verification code:", error);
        return { success: false, error: "Failed to resend code. Please try again later." };
    }
}

export async function verifyCodeAndCreateAccount(data: { email: string; code: string; password: string; name: string; }) {
  const { email, code, password, name } = data;

  try {
    const tokenRecord = await db.query.emailVerificationCodes.findFirst({
      where: and(
        eq(emailVerificationCodes.email, email),
        eq(emailVerificationCodes.isUsed, false)
      ),
      orderBy: (codes, { desc }) => [desc(codes.createdAt)],
    });

    if (!tokenRecord) {
      return { success: false, error: "No verification code found. Please request one." };
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      return { success: false, error: "Verification code has expired. Please request a new one." };
    }

    if (tokenRecord.code !== code) {
      // Optional: implement attempt tracking here if needed
      return { success: false, error: "Invalid verification code." };
    }
    
    if (await isUserExisting(email)) {
      return { success: false, error: "This email is already associated with an account." };
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: 'user' as const,
      emailVerified: new Date(),
    };

    await db.insert(users).values(newUser);

    // Mark code as used
    await db.update(emailVerificationCodes)
      .set({ isUsed: true })
      .where(eq(emailVerificationCodes.id, tokenRecord.id));

    return { success: true, message: "Account created successfully!" };
  } catch (error) {
    console.error("Error verifying code and creating account:", error);
    return { success: false, error: "An unexpected error occurred during account creation." };
  }
} 