"use server";

import db from "@/db/drizzle";
import { users, userProfiles } from "../../../db/schema";
import { eq, or, ilike } from "drizzle-orm";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

// Types
export interface UserListItem {
    id: string;
    email: string;
    name: string | null;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: Date;
}

// Verify admin access
async function verifyAdminAccess() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Authentication required");
    }

    const userProfile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, session.user.id),
    });

    if (!userProfile || userProfile.role !== "admin") {
        throw new Error("Admin access required");
    }

    return userProfile;
}

// Search users by name or email (real-time search)
export async function searchUsers(query: string): Promise<{
    success: boolean;
    data?: UserListItem[];
    error?: string;
}> {
    try {
        await verifyAdminAccess();

        if (!query || query.length < 2) {
            // Return all users with profiles if query is empty/short
            const allUsers = await db
                .select({
                    id: users.id,
                    email: users.email,
                    name: users.name,
                    firstName: userProfiles.firstName,
                    lastName: userProfiles.lastName,
                    role: userProfiles.role,
                    createdAt: users.createdAt,
                })
                .from(users)
                .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
                .limit(50);

            return {
                success: true,
                data: allUsers.map((u) => ({
                    ...u,
                    firstName: u.firstName || "",
                    lastName: u.lastName || "",
                    role: u.role || "applicant",
                })),
            };
        }

        const searchPattern = `%${query}%`;

        const matchingUsers = await db
            .select({
                id: users.id,
                email: users.email,
                name: users.name,
                firstName: userProfiles.firstName,
                lastName: userProfiles.lastName,
                role: userProfiles.role,
                createdAt: users.createdAt,
            })
            .from(users)
            .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
            .where(
                or(
                    ilike(users.email, searchPattern),
                    ilike(users.name, searchPattern),
                    ilike(userProfiles.firstName, searchPattern),
                    ilike(userProfiles.lastName, searchPattern)
                )
            )
            .limit(50);

        return {
            success: true,
            data: matchingUsers.map((u) => ({
                ...u,
                firstName: u.firstName || "",
                lastName: u.lastName || "",
                role: u.role || "applicant",
            })),
        };
    } catch (error) {
        console.error("Error searching users:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to search users",
        };
    }
}

// Create a new admin user
export async function createAdminUser(
    email: string,
    firstName: string,
    lastName: string,
    role: "admin" | "technical_reviewer" | "reviewer_1" | "reviewer_2" = "admin"
): Promise<{ success: boolean; data?: { userId: string }; error?: string }> {
    try {
        await verifyAdminAccess();

        // Validate email
        if (!email || !email.includes("@")) {
            return { success: false, error: "Invalid email address" };
        }

        // Check if user already exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email.toLowerCase()),
        });

        if (existingUser) {
            return { success: false, error: "User with this email already exists" };
        }

        // Hash the default password
        const defaultPassword = "BIRE@2025";
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // Create user ID
        const userId = uuidv4();

        // Create user
        await db.insert(users).values({
            id: userId,
            email: email.toLowerCase(),
            name: `${firstName} ${lastName}`,
            password: hashedPassword,
            role: role === "admin" ? "admin" : "user",
            emailVerified: new Date(), // Auto-verify admin users
        });

        // Create user profile
        await db.insert(userProfiles).values({
            userId: userId,
            firstName: firstName,
            lastName: lastName,
            email: email.toLowerCase(),
            role: role,
            isCompleted: true,
        });

        return { success: true, data: { userId } };
    } catch (error) {
        console.error("Error creating admin user:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to create user",
        };
    }
}

// Update user role
export async function updateUserRole(
    userId: string,
    newRole: "applicant" | "admin" | "technical_reviewer" | "reviewer_1" | "reviewer_2"
): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminAccess();

        // Find user profile
        const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, userId),
        });

        if (!profile) {
            return { success: false, error: "User profile not found" };
        }

        // Update role in userProfiles
        await db
            .update(userProfiles)
            .set({ role: newRole, updatedAt: new Date() })
            .where(eq(userProfiles.userId, userId));

        // Also update role in users table for auth purposes
        await db
            .update(users)
            .set({
                role: newRole === "admin" ? "admin" : "user",
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        return { success: true };
    } catch (error) {
        console.error("Error updating user role:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to update role",
        };
    }
}
