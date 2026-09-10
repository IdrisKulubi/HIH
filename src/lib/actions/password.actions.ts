"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function currentUserHasPassword() {
    const session = await auth();
    if (!session?.user?.id) {
        return false;
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { password: true },
    });

    return Boolean(user?.password);
}

export async function updatePassword(prevState: any, formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, message: "Unauthorized. Please log in." };
        }

        const currentPassword = formData.get("currentPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (!newPassword || !confirmPassword) {
            return { success: false, message: "All fields are required." };
        }

        if (newPassword !== confirmPassword) {
            return { success: false, message: "New passwords do not match." };
        }

        // Password strength check
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return {
                success: false,
                message: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
            };
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id)
        });

        if (!user) {
            return { success: false, message: "User not found." };
        }

        if (user.password) {
            if (!currentPassword) {
                return { success: false, message: "Current password is required." };
            }

            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return { success: false, message: "Incorrect current password." };
            }
        }

        // Hash and update
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.update(users)
            .set({ password: hashedPassword, updatedAt: new Date() })
            .where(eq(users.id, session.user.id));

        revalidatePath("/profile");
        return { success: true, message: "Password updated successfully." };
    } catch (error) {
        console.error("Error updating password:", error);
        return { success: false, message: "An unexpected error occurred." };
    }
}
