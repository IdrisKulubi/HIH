"use server";

import db from "@/db/drizzle";
import { accounts, applicants, mentors, users, userProfiles } from "../../../db/schema";
import { and, desc, eq, or, ilike, inArray, ne } from "drizzle-orm";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type { UserListItem, UserManagementRole, UserSignInMethod } from "@/lib/users/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const DEFAULT_PASSWORD = "BIRE@2025";

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

    return { ...userProfile, sessionUserId: session.user.id };
}

function splitDisplayName(name: string | null | undefined): { firstName: string; lastName: string } {
    const trimmed = (name ?? "").trim();
    if (!trimmed) return { firstName: "", lastName: "" };
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function resolveSignInMethod(hasPassword: boolean, providers: string[]): UserSignInMethod {
    const hasGoogle = providers.includes("google");
    if (hasPassword && hasGoogle) return "both";
    if (hasGoogle) return "google";
    if (hasPassword) return "password";
    return "none";
}

async function searchUsersQuery(query: string): Promise<UserListItem[]> {
    const searchPattern = query.length >= 2 ? `%${query}%` : null;

    const rows = searchPattern
        ? await db
              .select({
                  id: users.id,
                  email: users.email,
                  name: users.name,
                  password: users.password,
                  createdAt: users.createdAt,
                  firstName: userProfiles.firstName,
                  lastName: userProfiles.lastName,
                  role: userProfiles.role,
                  profileId: userProfiles.id,
              })
              .from(users)
              .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
              .where(
                  or(
                      ilike(users.email, searchPattern),
                      ilike(users.name, searchPattern),
                      ilike(userProfiles.firstName, searchPattern),
                      ilike(userProfiles.lastName, searchPattern),
                      ilike(userProfiles.email, searchPattern)
                  )
              )
              .orderBy(desc(users.createdAt))
              .limit(50)
        : await db
              .select({
                  id: users.id,
                  email: users.email,
                  name: users.name,
                  password: users.password,
                  createdAt: users.createdAt,
                  firstName: userProfiles.firstName,
                  lastName: userProfiles.lastName,
                  role: userProfiles.role,
                  profileId: userProfiles.id,
              })
              .from(users)
              .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
              .orderBy(desc(users.createdAt))
              .limit(50);

    const userIds = rows.map((row) => row.id);
    const accountRows =
        userIds.length > 0
            ? await db
                  .select({
                      userId: accounts.userId,
                      provider: accounts.provider,
                  })
                  .from(accounts)
                  .where(inArray(accounts.userId, userIds))
            : [];

    const providersByUser = new Map<string, string[]>();
    for (const account of accountRows) {
        const list = providersByUser.get(account.userId) ?? [];
        if (!list.includes(account.provider)) list.push(account.provider);
        providersByUser.set(account.userId, list);
    }

    return rows.map((row) => {
        const fromName = splitDisplayName(row.name);
        const hasProfile = row.profileId != null;
        return {
            id: row.id,
            email: row.email,
            name: row.name,
            firstName: row.firstName?.trim() || fromName.firstName || "",
            lastName: row.lastName?.trim() || fromName.lastName || "",
            role: hasProfile ? row.role || "applicant" : "none",
            hasProfile,
            signInMethod: resolveSignInMethod(
                Boolean(row.password),
                providersByUser.get(row.id) ?? []
            ),
            createdAt: row.createdAt,
        };
    });
}

export async function searchUsers(query: string): Promise<{
    success: boolean;
    data?: UserListItem[];
    error?: string;
}> {
    try {
        await verifyAdminAccess();
        const data = await searchUsersQuery(query.trim());
        return { success: true, data };
    } catch (error) {
        console.error("Error searching users:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to search users",
        };
    }
}

export async function createAdminUser(
    email: string,
    firstName: string,
    lastName: string,
    role: UserManagementRole = "admin"
): Promise<{
    success: boolean;
    data?: { userId: string; alreadyExists?: boolean };
    error?: string;
}> {
    try {
        await verifyAdminAccess();

        if (!email || !email.includes("@")) {
            return { success: false, error: "Invalid email address" };
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, normalizedEmail),
        });

        if (existingUser) {
            return {
                success: false,
                data: { userId: existingUser.id, alreadyExists: true },
                error:
                    "User already exists — open them in the list to update, assign a role, or delete",
            };
        }

        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        const userId = uuidv4();

        await db.insert(users).values({
            id: userId,
            email: normalizedEmail,
            name: `${firstName} ${lastName}`,
            password: hashedPassword,
            role: role === "admin" ? "admin" : "user",
            emailVerified: new Date(),
        });

        await db.insert(userProfiles).values({
            userId,
            firstName,
            lastName,
            email: normalizedEmail,
            role,
            isCompleted: true,
        });

        revalidatePath("/admin/users");
        return { success: true, data: { userId } };
    } catch (error) {
        console.error("Error creating admin user:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to create user",
        };
    }
}

export async function updateUserRole(
    userId: string,
    newRole: UserManagementRole
): Promise<{ success: boolean; error?: string }> {
    try {
        await verifyAdminAccess();

        const target = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });
        if (!target) {
            return { success: false, error: "User not found" };
        }

        const profile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, userId),
        });

        const now = new Date();
        const fromName = splitDisplayName(target.name);

        if (!profile) {
            await db.insert(userProfiles).values({
                userId,
                firstName: fromName.firstName || target.email.split("@")[0] || "User",
                lastName: fromName.lastName || "—",
                email: target.email,
                role: newRole,
                isCompleted: true,
                createdAt: now,
                updatedAt: now,
            });
        } else {
            await db
                .update(userProfiles)
                .set({ role: newRole, updatedAt: now })
                .where(eq(userProfiles.userId, userId));
        }

        const updates: {
            role: "admin" | "user";
            updatedAt: Date;
            password?: string;
            emailVerified?: Date;
        } = {
            role: newRole === "admin" ? "admin" : "user",
            updatedAt: now,
        };

        if (!target.password) {
            updates.password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
            updates.emailVerified = target.emailVerified ?? now;
        }

        await db.update(users).set(updates).where(eq(users.id, userId));

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Error updating user role:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to update role",
        };
    }
}

const updateUserDetailsSchema = z.object({
    userId: z.string().min(1),
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
});

export async function updateUserDetails(input: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
}): Promise<{
    success: boolean;
    data?: { firstName: string; lastName: string; email: string };
    error?: string;
}> {
    try {
        await verifyAdminAccess();

        const parsed = updateUserDetailsSchema.safeParse(input);
        if (!parsed.success) {
            return {
                success: false,
                error: parsed.error.issues[0]?.message ?? "Invalid user details",
            };
        }

        const { userId, firstName, lastName, email } = parsed.data;
        const existingUser = await db.query.users.findFirst({
            where: and(ilike(users.email, email), ne(users.id, userId)),
            columns: { id: true },
        });
        if (existingUser) {
            return { success: false, error: "Another user already uses this email address" };
        }

        const target = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true },
        });
        if (!target) return { success: false, error: "User not found" };

        const now = new Date();
        const fullName = `${firstName} ${lastName}`.trim();
        await db.transaction(async (tx) => {
            await tx
                .update(users)
                .set({ name: fullName, email, updatedAt: now })
                .where(eq(users.id, userId));

            const profile = await tx.query.userProfiles.findFirst({
                where: eq(userProfiles.userId, userId),
                columns: { id: true },
            });

            if (profile) {
                await tx
                    .update(userProfiles)
                    .set({ firstName, lastName, email, updatedAt: now })
                    .where(eq(userProfiles.userId, userId));
            } else {
                await tx.insert(userProfiles).values({
                    userId,
                    firstName,
                    lastName,
                    email,
                    role: "applicant",
                    isCompleted: true,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            await tx
                .update(applicants)
                .set({ firstName, lastName, email, updatedAt: now })
                .where(eq(applicants.userId, userId));
        });

        revalidatePath("/admin/users");
        return { success: true, data: { firstName, lastName, email } };
    } catch (error) {
        console.error("Error updating user details:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to update user details",
        };
    }
}

export async function deleteAdminUser(
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const admin = await verifyAdminAccess();

        if (admin.sessionUserId === userId) {
            return { success: false, error: "You cannot delete your own account" };
        }

        const target = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { id: true, email: true },
        });
        if (!target) {
            return { success: false, error: "User not found" };
        }

        const mentor = await db.query.mentors.findFirst({
            where: eq(mentors.userId, userId),
            columns: { id: true },
        });
        if (mentor) {
            return {
                success: false,
                error:
                    "This user is linked as a mentor. Remove mentorship assignments before deleting.",
            };
        }

        try {
            await db.delete(users).where(eq(users.id, userId));
        } catch (error) {
            console.error("Error deleting admin user (FK):", error);
            return {
                success: false,
                error:
                    "This user is referenced by other records and cannot be deleted. Update or reassign those records first.",
            };
        }

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error) {
        console.error("Error deleting admin user:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to delete user",
        };
    }
}
