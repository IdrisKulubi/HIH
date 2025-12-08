/* eslint-disable @typescript-eslint/no-explicit-any */

"use server";

import db from "../../../db/drizzle";
import { users, emailVerificationCodes } from "../../../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { generateVerificationCode } from "@/lib/utils";
import { sendPasswordResetEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

/**
 * Initiates the password reset process for a user.
 * 1. Checks if a user with the given email exists.
 * 2. Invalidates any existing password reset codes for that email.
 * 3. Generates a new, 6-digit verification code.
 * 4. Stores the new code in the database with a 15-minute expiration.
 * 5. Sends the code to the user's email.
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string; error?: any; }> {
  try {
    const normalizedEmail = email.toLowerCase();

    // 1. Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!user) {
      // For security, we don't reveal if the user exists or not.
      return { success: true, message: "If an account with that email exists, we've sent a password reset code." };
    }
    
    // 2. Invalidate old codes
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, normalizedEmail));

    // 3. Generate new code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // 4. Store new code
    await db.insert(emailVerificationCodes).values({
      email: normalizedEmail,
      code,
      expiresAt,
    });
    
    // 5. Send email
    await sendPasswordResetEmail({
      to: normalizedEmail,
      code,
      userName: user.name || "User",
    });

    return { success: true, message: "A password reset code has been sent to your email." };

  } catch (error) {
    console.error("Error requesting password reset:", error);
    return { success: false, message: "An unexpected error occurred.", error };
  }
}

/**
 * Verifies a password reset code.
 * Checks if the code exists, is not used, and has not expired.
 */
export async function verifyPasswordResetCode(email: string, code: string): Promise<{ success: boolean; message: string; error?: any; }> {
  try {
    const normalizedEmail = email.toLowerCase();
    
    const verificationCode = await db.query.emailVerificationCodes.findFirst({
      where: and(
        eq(emailVerificationCodes.email, normalizedEmail),
        eq(emailVerificationCodes.code, code),
        gt(emailVerificationCodes.expiresAt, new Date())
      )
    });

    if (!verificationCode) {
      return { success: false, message: "Invalid or expired verification code. Please try again." };
    }

    return { success: true, message: "Code verified successfully." };
  } catch (error) {
    console.error("Error verifying code:", error);
    return { success: false, message: "An unexpected error occurred during verification.", error };
  }
}

/**
 * Resets the user's password after successful code verification.
 * 1. Verifies the code again as a final security check.
 * 2. Hashes the new password.
 * 3. Updates the user's password in the database.
 * 4. Deletes the used verification code.
 */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; message: string; error?: any; }> {
  try {
    const normalizedEmail = email.toLowerCase();

    // 1. Final verification of the code
    const verificationResult = await verifyPasswordResetCode(normalizedEmail, code);
    if (!verificationResult.success) {
      return verificationResult;
    }

    // 2. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. Update the user's password
    const [updatedUser] = await db.update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.email, normalizedEmail))
      .returning();
      
    if (!updatedUser) {
      return { success: false, message: "Could not find user to update. Please restart the process." };
    }

    // 4. Delete the used code
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.email, normalizedEmail));

    return { success: true, message: "Your password has been reset successfully. You can now sign in with your new password." };

  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, message: "An unexpected error occurred while resetting the password.", error };
  }
} 