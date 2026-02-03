"use server";

import db from "@/db/drizzle";
import {
    eligibilityResults,
    reviewerAssignmentQueue,
    users,
    applications,
    userProfiles,
} from "../../../db/schema";
import { eq, and, asc, ne, isNull, sql, count } from "drizzle-orm";
import { auth } from "@/auth";

// =============================================================================
// REVIEWER ASSIGNMENT SYSTEM
// =============================================================================

/**
 * Toggle a reviewer's active status (enable/disable from receiving assignments)
 */
export async function toggleReviewerActive(
    reviewerId: string,
    isActive: boolean
): Promise<{ success: boolean; message: string }> {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return { success: false, message: "Unauthorized" };
        }

        await db
            .update(reviewerAssignmentQueue)
            .set({ isActive })
            .where(eq(reviewerAssignmentQueue.reviewerId, reviewerId));

        return { success: true, message: `Reviewer ${isActive ? "activated" : "deactivated"}` };
    } catch (error) {
        console.error("Error toggling reviewer status:", error);
        return { success: false, message: "Failed to update reviewer status" };
    }
}

/**
 * Initialize reviewer queue entries for all active reviewers
 * Call this once to set up the queue, or when new reviewers are added
 */
export async function initializeReviewerQueue(): Promise<{ success: boolean; message: string }> {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return { success: false, message: "Unauthorized" };
        }

        // Get all users with reviewer roles from userProfiles table
        const reviewers = await db
            .select({ userId: userProfiles.userId, role: userProfiles.role })
            .from(userProfiles)
            .where(
                sql`${userProfiles.role} IN ('reviewer_1', 'reviewer_2')`
            );

        let added = 0;
        for (const reviewer of reviewers) {
            // Check if already in queue
            const existing = await db
                .select()
                .from(reviewerAssignmentQueue)
                .where(eq(reviewerAssignmentQueue.reviewerId, reviewer.userId))
                .limit(1);

            if (existing.length === 0) {
                await db.insert(reviewerAssignmentQueue).values({
                    reviewerId: reviewer.userId,
                    reviewerRole: reviewer.role as "reviewer_1" | "reviewer_2",
                    assignmentCount: 0,
                    isActive: true,
                });
                added++;
            }
        }

        return { success: true, message: `Initialized queue. Added ${added} new reviewers.` };
    } catch (error) {
        console.error("Error initializing reviewer queue:", error);
        return { success: false, message: "Failed to  initialize queue" };
    }
}

/**
 * Get the next reviewer for assignment (round-robin based on lowest count)
 */
async function getNextReviewer(role: "reviewer_1" | "reviewer_2", excludeUserId?: string): Promise<string | null> {
    const conditions = [
        eq(reviewerAssignmentQueue.reviewerRole, role),
        eq(reviewerAssignmentQueue.isActive, true),
    ];

    if (excludeUserId) {
        conditions.push(ne(reviewerAssignmentQueue.reviewerId, excludeUserId));
    }

    const nextReviewer = await db
        .select({ reviewerId: reviewerAssignmentQueue.reviewerId })
        .from(reviewerAssignmentQueue)
        .where(and(...conditions))
        .orderBy(asc(reviewerAssignmentQueue.assignmentCount), asc(reviewerAssignmentQueue.lastAssignedAt))
        .limit(1);

    return nextReviewer[0]?.reviewerId || null;
}

/**
 * Increment assignment count for a reviewer
 */
async function incrementAssignmentCount(reviewerId: string): Promise<void> {
    await db
        .update(reviewerAssignmentQueue)
        .set({
            assignmentCount: sql`${reviewerAssignmentQueue.assignmentCount} + 1`,
            lastAssignedAt: new Date(),
        })
        .where(eq(reviewerAssignmentQueue.reviewerId, reviewerId));
}

/**
 * Auto-assign a single application to the next available reviewer_1
 * Called when a new application is submitted
 */
export async function autoAssignNewApplication(
    eligibilityResultId: number
): Promise<{ success: boolean; assignedTo?: string; message: string }> {
    try {
        // Get next reviewer_1 with lowest assignment count
        const nextReviewerId = await getNextReviewer("reviewer_1");

        if (!nextReviewerId) {
            return { success: false, message: "No active reviewer_1 available" };
        }

        // Assign the application
        await db
            .update(eligibilityResults)
            .set({
                assignedReviewer1Id: nextReviewerId,
                assignedReviewer1At: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(eligibilityResults.id, eligibilityResultId));

        // Increment the reviewer's assignment count
        await incrementAssignmentCount(nextReviewerId);

        return { success: true, assignedTo: nextReviewerId, message: "Application assigned successfully" };
    } catch (error) {
        console.error("Error auto-assigning application:", error);
        return { success: false, message: "Failed to assign application" };
    }
}

/**
 * Bulk assign all unassigned applications evenly among reviewer_1 users
 * Admin-only function
 */
export async function bulkAssignApplicationsToReviewers(): Promise<{
    success: boolean;
    assigned: number;
    message: string;
}> {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return { success: false, assigned: 0, message: "Unauthorized" };
        }

        // Get all unassigned eligibility results (where assignedReviewer1Id is null)
        // Exclude observation applications - they are not scored
        const unassigned = await db
            .select({ id: eligibilityResults.id })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(
                and(
                    isNull(eligibilityResults.assignedReviewer1Id),
                    eq(applications.isObservationOnly, false)
                )
            );

        if (unassigned.length === 0) {
            return { success: true, assigned: 0, message: "No unassigned applications found" };
        }

        let assignedCount = 0;

        for (const result of unassigned) {
            const assignResult = await autoAssignNewApplication(result.id);
            if (assignResult.success) {
                assignedCount++;
            }
        }

        return {
            success: true,
            assigned: assignedCount,
            message: `Assigned ${assignedCount} of ${unassigned.length} applications`,
        };
    } catch (error) {
        console.error("Error bulk assigning applications:", error);
        return { success: false, assigned: 0, message: "Failed to bulk assign applications" };
    }
}

/**
 * Redistribute all assignments evenly among active reviewers
 * Clears existing R1 assignments and reassigns based on current active reviewers
 * Admin-only function
 */
export async function redistributeAssignments(): Promise<{
    success: boolean;
    redistributed: number;
    message: string;
}> {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return { success: false, redistributed: 0, message: "Unauthorized" };
        }

        // Step 1: Clear all existing R1 assignments (only for non-observation apps)
        const allAssignable = await db
            .select({ id: eligibilityResults.id })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(eq(applications.isObservationOnly, false));

        for (const result of allAssignable) {
            await db
                .update(eligibilityResults)
                .set({
                    assignedReviewer1Id: null,
                    assignedReviewer1At: null,
                    updatedAt: new Date(),
                })
                .where(eq(eligibilityResults.id, result.id));
        }

        // Step 2: Reset assignment counts for all active reviewer_1 users
        await db
            .update(reviewerAssignmentQueue)
            .set({
                assignmentCount: 0,
                lastAssignedAt: null,
            })
            .where(eq(reviewerAssignmentQueue.reviewerRole, "reviewer_1"));

        // Step 3: Re-assign all applications using the existing bulk assign logic
        const bulkResult = await bulkAssignApplicationsToReviewers();

        return {
            success: true,
            redistributed: bulkResult.assigned,
            message: `Redistributed ${bulkResult.assigned} applications evenly among active reviewers`,
        };
    } catch (error) {
        console.error("Error redistributing assignments:", error);
        return { success: false, redistributed: 0, message: "Failed to redistribute assignments" };
    }
}

/**
 * Assign second reviewer after first review is completed
 * Called when reviewer_1 submits their review
 */
export async function assignSecondReviewer(
    eligibilityResultId: number
): Promise<{ success: boolean; assignedTo?: string; message: string }> {
    try {
        // Get the first reviewer to exclude them
        const result = await db
            .select({ assignedReviewer1Id: eligibilityResults.assignedReviewer1Id })
            .from(eligibilityResults)
            .where(eq(eligibilityResults.id, eligibilityResultId))
            .limit(1);

        const firstReviewerId = result[0]?.assignedReviewer1Id;

        // Get next reviewer_2 with lowest assignment count, excluding first reviewer
        const nextReviewerId = await getNextReviewer("reviewer_2", firstReviewerId || undefined);

        if (!nextReviewerId) {
            return { success: false, message: "No active reviewer_2 available" };
        }

        // Assign the second reviewer
        await db
            .update(eligibilityResults)
            .set({
                assignedReviewer2Id: nextReviewerId,
                assignedReviewer2At: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(eligibilityResults.id, eligibilityResultId));

        // Increment the reviewer's assignment count
        await incrementAssignmentCount(nextReviewerId);

        return { success: true, assignedTo: nextReviewerId, message: "Second reviewer assigned successfully" };
    } catch (error) {
        console.error("Error assigning second reviewer:", error);
        return { success: false, message: "Failed to assign second reviewer" };
    }
}

/**
 * Bulk assign second reviewers to all applications that need them
 * This assigns R2s to apps where R1 review is complete but R2 is not assigned
 * Admin-only function
 */
export async function bulkAssignSecondReviewers(): Promise<{
    success: boolean;
    assigned: number;
    message: string;
}> {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return { success: false, assigned: 0, message: "Unauthorized" };
        }

        // Find all eligibility results where:
        // 1. R1 has reviewed (reviewer1Id is set)
        // 2. R2 is not yet assigned (assignedReviewer2Id is null)
        // 3. Not an observation application
        const needsR2 = await db
            .select({ id: eligibilityResults.id })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(
                and(
                    sql`${eligibilityResults.reviewer1Id} IS NOT NULL`,
                    isNull(eligibilityResults.assignedReviewer2Id),
                    eq(applications.isObservationOnly, false)
                )
            );

        if (needsR2.length === 0) {
            return { success: true, assigned: 0, message: "No applications need second reviewer assignment" };
        }

        let assignedCount = 0;

        for (const result of needsR2) {
            const assignResult = await assignSecondReviewer(result.id);
            if (assignResult.success) {
                assignedCount++;
            }
        }

        return {
            success: true,
            assigned: assignedCount,
            message: `Assigned second reviewers to ${assignedCount} of ${needsR2.length} applications`,
        };
    } catch (error) {
        console.error("Error bulk assigning second reviewers:", error);
        return { success: false, assigned: 0, message: "Failed to bulk assign second reviewers" };
    }
}

/**
 * Redistribute second reviewer assignments evenly
 * Clears existing R2 assignments and reassigns based on current active reviewers
 * Admin-only function
 */
export async function redistributeSecondReviewers(): Promise<{
    success: boolean;
    redistributed: number;
    message: string;
}> {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return { success: false, redistributed: 0, message: "Unauthorized" };
        }

        // Step 1: Clear all existing R2 assignments (only for non-observation apps)
        const allWithR2 = await db
            .select({ id: eligibilityResults.id })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(
                and(
                    sql`${eligibilityResults.assignedReviewer2Id} IS NOT NULL`,
                    eq(applications.isObservationOnly, false)
                )
            );

        for (const result of allWithR2) {
            await db
                .update(eligibilityResults)
                .set({
                    assignedReviewer2Id: null,
                    assignedReviewer2At: null,
                    updatedAt: new Date(),
                })
                .where(eq(eligibilityResults.id, result.id));
        }

        // Step 2: Reset assignment counts for all active reviewer_2 users
        await db
            .update(reviewerAssignmentQueue)
            .set({
                assignmentCount: 0,
                lastAssignedAt: null,
            })
            .where(eq(reviewerAssignmentQueue.reviewerRole, "reviewer_2"));

        // Step 3: Re-assign all applications that need R2
        const bulkResult = await bulkAssignSecondReviewers();

        return {
            success: true,
            redistributed: bulkResult.assigned,
            message: `Redistributed ${bulkResult.assigned} second reviewer assignments evenly`,
        };
    } catch (error) {
        console.error("Error redistributing second reviewers:", error);
        return { success: false, redistributed: 0, message: "Failed to redistribute second reviewers" };
    }
}

/**
 * Get applications assigned to the current reviewer
 * Filters by assignedReviewer1Id or assignedReviewer2Id based on role
 */
export async function getAssignedApplications(options?: {
    page?: number;
    limit?: number;
    track?: "foundation" | "acceleration" | "all";
}): Promise<{
    success: boolean;
    data?: {
        applications: Array<{
            id: number;
            applicationId: number;
            businessName: string;
            track: string;
            status: string;
            submittedAt: Date | null;
            assignedAt: Date | null;
            isFirstReview: boolean;
        }>;
        total: number;
        page: number;
        totalPages: number;
    };
    error?: string;
}> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;
        const userRole = session.user.role;
        const page = options?.page || 1;
        const limit = options?.limit || 20;
        const offset = (page - 1) * limit;

        // Determine which assignment field to filter by
        let assignmentCondition;
        let isFirstReview = true;

        if (userRole === "reviewer_1") {
            assignmentCondition = eq(eligibilityResults.assignedReviewer1Id, userId);
            isFirstReview = true;
        } else if (userRole === "reviewer_2") {
            assignmentCondition = eq(eligibilityResults.assignedReviewer2Id, userId);
            isFirstReview = false;
        } else {
            return { success: false, error: "Invalid reviewer role" };
        }

        // Build track condition
        const trackCondition = options?.track && options.track !== "all"
            ? eq(applications.track, options.track)
            : undefined;

        // Get assigned applications with application details
        const query = db
            .select({
                id: eligibilityResults.id,
                applicationId: eligibilityResults.applicationId,
                track: applications.track,
                status: applications.status,
                submittedAt: applications.submittedAt,
                assignedAt: isFirstReview
                    ? eligibilityResults.assignedReviewer1At
                    : eligibilityResults.assignedReviewer2At,
            })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(
                trackCondition
                    ? and(assignmentCondition, trackCondition)
                    : assignmentCondition
            )
            .orderBy(asc(eligibilityResults.assignedReviewer1At))
            .limit(limit)
            .offset(offset);

        const assignedApps = await query;

        // Get total count
        const countResult = await db
            .select({ count: count() })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(
                trackCondition
                    ? and(assignmentCondition, trackCondition)
                    : assignmentCondition
            );

        const total = Number(countResult[0]?.count || 0);

        // Get business names for each application
        const applicationsWithNames = await Promise.all(
            assignedApps.map(async (app) => {
                // This would need to be joined with businesses table
                // For now, using a placeholder
                return {
                    id: app.id,
                    applicationId: app.applicationId,
                    businessName: `Application #${app.applicationId}`, // TODO: Join with businesses
                    track: app.track || "unknown",
                    status: app.status || "unknown",
                    submittedAt: app.submittedAt,
                    assignedAt: app.assignedAt,
                    isFirstReview,
                };
            })
        );

        return {
            success: true,
            data: {
                applications: applicationsWithNames,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        console.error("Error getting assigned applications:", error);
        return { success: false, error: "Failed to get assigned applications" };
    }
}

/**
 * Get assignment statistics for admin dashboard
 */
export async function getAssignmentStats(): Promise<{
    success: boolean;
    data?: {
        totalApplications: number;
        assignedToReviewer1: number;
        assignedToReviewer2: number;
        unassigned: number;
        reviewerStats: Array<{
            reviewerId: string;
            reviewerName: string;
            role: string;
            assignmentCount: number;
            isActive: boolean;
        }>;
    };
    error?: string;
}> {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return { success: false, error: "Unauthorized" };
        }

        // Get total counts (excluding observation applications)
        const totalResult = await db
            .select({ count: count() })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(eq(applications.isObservationOnly, false));
        const total = Number(totalResult[0]?.count || 0);

        const assigned1Result = await db
            .select({ count: count() })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(
                and(
                    sql`${eligibilityResults.assignedReviewer1Id} IS NOT NULL`,
                    eq(applications.isObservationOnly, false)
                )
            );
        const assignedToReviewer1 = Number(assigned1Result[0]?.count || 0);

        const assigned2Result = await db
            .select({ count: count() })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(
                and(
                    sql`${eligibilityResults.assignedReviewer2Id} IS NOT NULL`,
                    eq(applications.isObservationOnly, false)
                )
            );
        const assignedToReviewer2 = Number(assigned2Result[0]?.count || 0);

        const unassignedResult = await db
            .select({ count: count() })
            .from(eligibilityResults)
            .innerJoin(applications, eq(eligibilityResults.applicationId, applications.id))
            .where(
                and(
                    isNull(eligibilityResults.assignedReviewer1Id),
                    eq(applications.isObservationOnly, false)
                )
            );
        const unassigned = Number(unassignedResult[0]?.count || 0);

        // Get reviewer stats from queue
        const queueStats = await db
            .select({
                reviewerId: reviewerAssignmentQueue.reviewerId,
                role: reviewerAssignmentQueue.reviewerRole,
                assignmentCount: reviewerAssignmentQueue.assignmentCount,
                isActive: reviewerAssignmentQueue.isActive,
            })
            .from(reviewerAssignmentQueue)
            .orderBy(asc(reviewerAssignmentQueue.reviewerRole), asc(reviewerAssignmentQueue.assignmentCount));

        // Get reviewer names
        const reviewerStats = await Promise.all(
            queueStats.map(async (stat) => {
                const user = await db
                    .select({ name: users.name })
                    .from(users)
                    .where(eq(users.id, stat.reviewerId))
                    .limit(1);

                return {
                    reviewerId: stat.reviewerId,
                    reviewerName: user[0]?.name || "Unknown",
                    role: stat.role || "unknown",
                    assignmentCount: stat.assignmentCount,
                    isActive: stat.isActive,
                };
            })
        );

        return {
            success: true,
            data: {
                totalApplications: total,
                assignedToReviewer1,
                assignedToReviewer2,
                unassigned,
                reviewerStats,
            },
        };
    } catch (error) {
        console.error("Error getting assignment stats:", error);
        return { success: false, error: "Failed to get assignment stats" };
    }
}
