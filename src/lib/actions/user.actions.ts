"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { userProfiles, applications } from "@/db/schema";
import { eq, and, like, or, desc, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Types for user management
export type UserRole = 'applicant' | 'admin' | 'technical_reviewer' | 'reviewer_1' | 'reviewer_2';

export interface CreateUserProfileData {
  firstName: string;
  lastName: string;
  email: string;
  role?: UserRole;
  profileImage?: string;
  phoneNumber?: string;
  country?: string;
  organization?: string;
  bio?: string;
}

export interface UpdateUserProfileData {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  country?: string;
  organization?: string;
  bio?: string;
  profileImage?: string;
}

// Authentication helpers
export async function getCurrentUser() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    // Fetch the full profile from the database
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id)
    });

    if (!profile) {
      return session.user;
    }

    return {
      ...session.user,
      ...profile,
      // Ensure firstName/lastName are available if they exist in profile
      id: session.user.id,
      email: profile.email || session.user.email,
      name: profile.firstName ? `${profile.firstName} ${profile.lastName}` : session.user.name,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/login');
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: User not logged in");
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id)
  });

  // Admin users bypass role checks
  if (userProfile?.role === 'admin') {
    return;
  }

  if (!userProfile || !allowedRoles.includes(userProfile.role as UserRole)) {
    throw new Error("Forbidden: You do not have the required role");
  }
}

// User Profile Management
export async function createUserProfile(data: CreateUserProfileData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    // Check if profile already exists
    const existingProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id)
    });

    if (existingProfile) {
      throw new Error("User profile already exists");
    }

    // Create user profile
    const [profile] = await db.insert(userProfiles).values({
      userId: session.user.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      role: data.role || 'applicant',
      profileImage: data.profileImage,
      phoneNumber: data.phoneNumber,
      country: data.country,
      organization: data.organization,
      bio: data.bio,
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    revalidatePath('/profile');
    return { success: true, data: profile };
  } catch (error) {
    console.error("Error creating user profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create profile"
    };
  }
}

export async function getUserProfile(userId: string) {
  try {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId)
    });

    return profile ?? null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

export async function getCurrentUserProfile() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    return await getUserProfile(session.user.id);
  } catch (error) {
    console.error("Error getting current user profile:", error);
    return null;
  }
}

export async function updateUserProfile(data: UpdateUserProfileData) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const [updatedProfile] = await db
      .update(userProfiles)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.userId, session.user.id))
      .returning();

    revalidatePath('/profile');
    return { success: true, data: updatedProfile };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile"
    };
  }
}

export async function completeUserProfile() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    const [updatedProfile] = await db
      .update(userProfiles)
      .set({
        isCompleted: true,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.userId, session.user.id))
      .returning();

    revalidatePath('/profile');
    return { success: true, data: updatedProfile };
  } catch (error) {
    console.error("Error completing user profile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete profile"
    };
  }
}

// Admin functions
export async function updateUserRole(userId: string, role: UserRole) {
  try {

    const [updatedProfile] = await db
      .update(userProfiles)
      .set({
        role,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.userId, userId))
      .returning();

    revalidatePath('/admin/users');
    return { success: true, data: updatedProfile };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update user role"
    };
  }
}

export async function getAllUsers(page: number = 1, limit: number = 50) {
  try {
    await requireRole(['admin']);

    const offset = (page - 1) * limit;

    const usersList = await db.query.userProfiles.findMany({
      limit,
      offset,
      orderBy: [desc(userProfiles.createdAt)]
    });

    const [{ count: totalUsers }] = await db.select({ count: count() }).from(userProfiles);

    return {
      success: true,
      data: {
        users: usersList,
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit)
      }
    };
  } catch (error) {
    console.error("Error getting all users:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get users"
    };
  }
}

export async function searchUsers(query: string, role?: UserRole) {
  try {
    await requireRole(['admin']);

    const searchConditions = or(
      like(userProfiles.email, `%${query}%`),
      like(userProfiles.firstName, `%${query}%`),
      like(userProfiles.lastName, `%${query}%`)
    );

    const whereCondition = role
      ? and(searchConditions, eq(userProfiles.role, role))
      : searchConditions;

    const searchResults = await db.query.userProfiles.findMany({
      where: whereCondition,
      limit: 20
    });

    return { success: true, data: searchResults };
  } catch (error) {
    console.error("Error searching users:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search users"
    };
  }
}

// Application-related user functions
export async function getUserApplicationStatus() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return null;
    }

    const application = await db.query.applications.findFirst({
      where: eq(applications.userId, session.user.id)
    });

    return application?.status || null;
  } catch (error) {
    console.error("Error getting user application status:", error);
    return null;
  }
}

export async function hasUserApplied() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return false;
    }

    const application = await db.query.applications.findFirst({
      where: eq(applications.userId, session.user.id)
    });

    return !!application;
  } catch (error) {
    console.error("Error checking if user has applied:", error);
    return false;
  }
}

// Profile completion check
export async function isProfileComplete() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return false;

    // Check if all required fields are filled
    const requiredFields = [
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'country'
    ];

    return requiredFields.every(field => {
      const value = profile[field as keyof typeof profile];
      return value && value.toString().trim().length > 0;
    });
  } catch (error) {
    console.error("Error checking profile completion:", error);
    return false;
  }
}

// OAuth callback handler
export async function handleOAuthCallback(userData: {
  id: string;
  email: string;
  name?: string;
  image?: string;
}) {
  try {
    // Check if user profile exists
    let profile = await getUserProfile(userData.id);

    if (!profile && userData.email && userData.name) {
      // Extract first and last name from the full name
      const nameParts = userData.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Create initial profile
      const result = await createUserProfile({
        firstName,
        lastName,
        email: userData.email,
        profileImage: userData.image,
        role: 'applicant'
      });

      if (result.success && result.data) {
        profile = result.data;
      }
    }

    return profile ?? null;
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    return null;
  }
}

// Utility functions
export async function getProfileCompletionPercentage() {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) return 0;

    const fields = [
      'firstName',
      'lastName',
      'email',
      'phoneNumber',
      'country',
      'organization',
      'bio',
      'profileImage'
    ];

    const completedFields = fields.filter(field => {
      const value = profile[field as keyof typeof profile];
      return value && value.toString().trim().length > 0;
    });

    return Math.round((completedFields.length / fields.length) * 100);
  } catch (error) {
    console.error("Error calculating profile completion:", error);
    return 0;
  }
}

export async function deleteUserAccount() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("User not authenticated");
    }

    // Delete user profile
    await db.delete(userProfiles).where(eq(userProfiles.userId, session.user.id));

    // Delete any applications
    await db.delete(applications).where(eq(applications.userId, session.user.id));

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error deleting user account:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete account"
    };
  }
}
