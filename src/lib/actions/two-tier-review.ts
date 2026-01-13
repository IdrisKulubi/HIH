"use server";

/**
 * Blind Dual Review System Server Actions
 * 
 * Implements:
 * - Reviewer 1 & Reviewer 2: Equal rights, independent blind scoring
 * - Final Score: Average of both reviewers
 * - Blind Review: R2 cannot see R1 scores until after they submit
 */

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import { applications, eligibilityResults, users, userProfiles } from "../../../db/schema";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ============================================================================
// TYPES
// ============================================================================

interface ReviewInput {
    applicationId: number;
    score: number;
    notes?: string;
}

interface LockInput {
    applicationId: number;
    reason?: string;
}

interface ReviewResult {
    success: boolean;
    message?: string;
    error?: string;
}

// Passing threshold for approval
const PASSING_THRESHOLD = 70;

// ============================================================================
// SUBMIT REVIEW (Works for both Reviewer 1 and Reviewer 2)
// ============================================================================

/**
 * Submit review - automatically determines if user is R1 or R2
 * R1: First reviewer, sets status to pending_senior_review
 * R2: Second reviewer, calculates average and finalizes
 */
export async function submitReview(input: ReviewInput): Promise<ReviewResult> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;

        // Check if user has reviewer permissions
        const userProfile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, userId),
        });

        if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "technical_reviewer")) {
            return { success: false, error: "You don't have permission to review applications" };
        }

        // Check if application exists
        const application = await db.query.applications.findFirst({
            where: eq(applications.id, input.applicationId),
        });

        if (!application) {
            return { success: false, error: "Application not found" };
        }

        // Get or create eligibility result
        let existingResult = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, input.applicationId),
        });

        if (existingResult?.isLocked) {
            return { success: false, error: "Application is locked and cannot be modified" };
        }

        // Determine if this user is R1 or R2
        const isReviewer1Slot = !existingResult?.reviewer1Id;
        const isReviewer2Slot = existingResult?.reviewer1Id && !existingResult?.reviewer2Id;
        const alreadyReviewed = existingResult?.reviewer1Id === userId || existingResult?.reviewer2Id === userId;

        if (alreadyReviewed) {
            return { success: false, error: "You have already reviewed this application" };
        }

        // Reviewer 1 cannot be the same as the person who will be Reviewer 2
        // This check happens when R2 tries to review

        if (isReviewer1Slot) {
            // First reviewer
            return await submitAsReviewer1(input, existingResult, userId, application.status);
        } else if (isReviewer2Slot) {
            // Second reviewer - cannot be same as R1
            if (existingResult!.reviewer1Id === userId) {
                return { success: false, error: "You cannot be both Reviewer 1 and Reviewer 2" };
            }
            return await submitAsReviewer2(input, existingResult!, userId);
        } else {
            return { success: false, error: "Both review slots are already filled" };
        }

    } catch (error) {
        console.error("Error submitting review:", error);
        return { success: false, error: "Failed to submit review" };
    }
}

// ============================================================================
// REVIEWER 1 - FIRST REVIEW
// ============================================================================

async function submitAsReviewer1(
    input: ReviewInput,
    existingResult: typeof eligibilityResults.$inferSelect | undefined,
    userId: string,
    currentStatus: string
): Promise<ReviewResult> {
    const reviewData = {
        reviewer1Id: userId,
        reviewer1Score: String(input.score),
        reviewer1Notes: input.notes ?? null,
        reviewer1At: new Date(),
        updatedAt: new Date(),
    };

    if (existingResult) {
        await db
            .update(eligibilityResults)
            .set(reviewData)
            .where(eq(eligibilityResults.id, existingResult.id));
    } else {
        await db.insert(eligibilityResults).values({
            applicationId: input.applicationId,
            isEligible: false, // Will be determined after both reviews
            ageEligible: true,
            registrationEligible: true,
            revenueEligible: true,
            businessPlanEligible: true,
            impactEligible: true,
            totalScore: String(input.score), // Temporary, will be averaged later
            ...reviewData,
        });
    }

    // Update application status to pending second review
    if (currentStatus === "submitted" || currentStatus === "under_review") {
        await db
            .update(applications)
            .set({
                status: "pending_senior_review", // Reusing this status for "pending second review"
                updatedAt: new Date(),
            })
            .where(eq(applications.id, input.applicationId));
    }

    revalidatePath(`/admin/applications/${input.applicationId}`);
    revalidatePath(`/admin/evaluate/${input.applicationId}`);
    revalidatePath("/admin/applications");

    return { success: true, message: "Review submitted. Awaiting second reviewer." };
}

// ============================================================================
// REVIEWER 2 - SECOND REVIEW (Calculates Average & Finalizes)
// ============================================================================

async function submitAsReviewer2(
    input: ReviewInput,
    existingResult: typeof eligibilityResults.$inferSelect,
    userId: string
): Promise<ReviewResult> {
    const r1Score = existingResult.reviewer1Score ? Number(existingResult.reviewer1Score) : 0;
    const r2Score = input.score;

    // Calculate average score
    const averageScore = (r1Score + r2Score) / 2;

    // Determine approval based on average
    const isApproved = averageScore >= PASSING_THRESHOLD;

    // Update eligibility result with second review
    await db
        .update(eligibilityResults)
        .set({
            reviewer2Id: userId,
            reviewer2Score: String(r2Score),
            reviewer2Notes: input.notes ?? null,
            reviewer2At: new Date(),
            reviewer2OverrodeReviewer1: false, // No override in blind system
            totalScore: String(averageScore.toFixed(2)),
            isEligible: isApproved,
            updatedAt: new Date(),
        })
        .where(eq(eligibilityResults.id, existingResult.id));

    // Update application status to final decision
    await db
        .update(applications)
        .set({
            status: isApproved ? "approved" : "rejected",
            updatedAt: new Date(),
        })
        .where(eq(applications.id, input.applicationId));

    revalidatePath(`/admin/applications/${input.applicationId}`);
    revalidatePath(`/admin/evaluate/${input.applicationId}`);
    revalidatePath("/admin/applications");

    return {
        success: true,
        message: `Review complete. Final Score: ${averageScore.toFixed(1)} (${isApproved ? "Approved" : "Rejected"})`
    };
}

// ============================================================================
// LEGACY FUNCTIONS (kept for backwards compatibility)
// ============================================================================

/**
 * @deprecated Use submitReview instead
 */
export async function submitReviewer1Review(input: ReviewInput): Promise<ReviewResult> {
    return submitReview(input);
}

/**
 * @deprecated Use submitReview instead
 */
export async function submitReviewer2Review(
    input: ReviewInput & {
        finalDecision?: "approved" | "rejected";
        overrideReviewer1?: boolean;
    }
): Promise<ReviewResult> {
    return submitReview(input);
}

// ============================================================================
// LOCK APPLICATION
// ============================================================================

/**
 * Lock an application to prevent further modifications
 * Only admins can lock applications
 */
export async function lockApplication(input: LockInput): Promise<ReviewResult> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify user has admin role
        const userProfile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, session.user.id),
        });

        if (userProfile?.role !== "admin") {
            return { success: false, error: "Only admins can lock applications" };
        }

        // Check if application exists
        const application = await db.query.applications.findFirst({
            where: eq(applications.id, input.applicationId),
        });

        if (!application) {
            return { success: false, error: "Application not found" };
        }

        // Get eligibility result
        const existingResult = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, input.applicationId),
        });

        if (!existingResult) {
            return { success: false, error: "No eligibility result found" };
        }

        if (existingResult.isLocked) {
            return { success: false, error: "Application is already locked" };
        }

        // Lock the application
        await db
            .update(eligibilityResults)
            .set({
                isLocked: true,
                lockedBy: session.user.id,
                lockedAt: new Date(),
                lockReason: input.reason ?? "Locked by admin",
                updatedAt: new Date(),
            })
            .where(eq(eligibilityResults.id, existingResult.id));

        revalidatePath(`/admin/applications/${input.applicationId}`);
        revalidatePath("/admin/applications");

        return { success: true, message: "Application locked successfully" };
    } catch (error) {
        console.error("Error locking application:", error);
        return { success: false, error: "Failed to lock application" };
    }
}

// ============================================================================
// UNLOCK APPLICATION
// ============================================================================

/**
 * Unlock an application
 * Only admin users can unlock
 */
export async function unlockApplication(input: LockInput): Promise<ReviewResult> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify user has admin role
        const userProfile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, session.user.id),
        });

        if (userProfile?.role !== "admin") {
            return { success: false, error: "Only admins can unlock applications" };
        }

        // Get eligibility result
        const existingResult = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, input.applicationId),
        });

        if (!existingResult) {
            return { success: false, error: "No eligibility result found" };
        }

        if (!existingResult.isLocked) {
            return { success: false, error: "Application is not locked" };
        }

        // Unlock the application
        await db
            .update(eligibilityResults)
            .set({
                isLocked: false,
                lockReason: `Unlocked by admin: ${input.reason ?? "No reason provided"}`,
                updatedAt: new Date(),
            })
            .where(eq(eligibilityResults.id, existingResult.id));

        revalidatePath(`/admin/applications/${input.applicationId}`);
        revalidatePath("/admin/applications");

        return { success: true, message: "Application unlocked successfully" };
    } catch (error) {
        console.error("Error unlocking application:", error);
        return { success: false, error: "Failed to unlock application" };
    }
}

// ============================================================================
// GET REVIEW STATUS (with blind review logic)
// ============================================================================

/**
 * Get the current review status of an application
 * IMPORTANT: Hides R1 scores from current user if they haven't reviewed yet
 */
export async function getReviewStatus(applicationId: number) {
    try {
        const session = await auth();
        const currentUserId = session?.user?.id;

        const application = await db.query.applications.findFirst({
            where: eq(applications.id, applicationId),
            with: {
                eligibilityResults: {
                    limit: 1,
                },
            },
        });

        if (!application) {
            return { success: false, error: "Application not found" };
        }

        const eligibility = application.eligibilityResults?.[0];

        // Determine if current user has already reviewed
        const currentUserIsR1 = eligibility?.reviewer1Id === currentUserId;
        const currentUserIsR2 = eligibility?.reviewer2Id === currentUserId;
        const currentUserHasReviewed = currentUserIsR1 || currentUserIsR2;
        const bothReviewsComplete = eligibility?.reviewer1Id && eligibility?.reviewer2Id;

        // Get reviewer names
        let reviewer1Name = null;
        let reviewer2Name = null;
        let lockedByName = null;

        if (eligibility?.reviewer1Id) {
            const r1 = await db.query.users.findFirst({
                where: eq(users.id, eligibility.reviewer1Id),
            });
            reviewer1Name = r1?.name ?? r1?.email;
        }

        if (eligibility?.reviewer2Id) {
            const r2 = await db.query.users.findFirst({
                where: eq(users.id, eligibility.reviewer2Id),
            });
            reviewer2Name = r2?.name ?? r2?.email;
        }

        if (eligibility?.lockedBy) {
            const lb = await db.query.users.findFirst({
                where: eq(users.id, eligibility.lockedBy),
            });
            lockedByName = lb?.name ?? lb?.email;
        }

        // BLIND REVIEW: Hide other reviewer's score if current user hasn't reviewed yet
        // Show scores only if:
        // 1. Both reviews are complete, OR
        // 2. Current user is viewing their own review
        const canSeeR1Details = bothReviewsComplete || currentUserIsR1;
        const canSeeR2Details = bothReviewsComplete || currentUserIsR2;

        return {
            success: true,
            data: {
                applicationStatus: application.status,
                // Reviewer 1 info (hidden if blind review active)
                reviewer1: eligibility?.reviewer1Id ? {
                    id: eligibility.reviewer1Id,
                    name: canSeeR1Details ? reviewer1Name : "Reviewer 1 (Blind)",
                    score: canSeeR1Details ? (eligibility.reviewer1Score ? Number(eligibility.reviewer1Score) : null) : null,
                    notes: canSeeR1Details ? eligibility.reviewer1Notes : null,
                    reviewedAt: eligibility.reviewer1At?.toISOString(),
                    isCurrentUser: currentUserIsR1,
                } : null,
                // Reviewer 2 info
                reviewer2: eligibility?.reviewer2Id ? {
                    id: eligibility.reviewer2Id,
                    name: canSeeR2Details ? reviewer2Name : "Reviewer 2 (Blind)",
                    score: canSeeR2Details ? (eligibility.reviewer2Score ? Number(eligibility.reviewer2Score) : null) : null,
                    notes: canSeeR2Details ? eligibility.reviewer2Notes : null,
                    reviewedAt: eligibility.reviewer2At?.toISOString(),
                    overrodeReviewer1: false, // Removed in blind system
                    isCurrentUser: currentUserIsR2,
                } : null,
                // Status flags
                isBlindReview: !bothReviewsComplete && !currentUserHasReviewed,
                currentUserHasReviewed,
                bothReviewsComplete,
                canSubmitReview: !currentUserHasReviewed && application.status !== "approved" && application.status !== "rejected",
                // Lock info
                isLocked: eligibility?.isLocked ?? false,
                lockedBy: lockedByName,
                lockedAt: eligibility?.lockedAt?.toISOString(),
                lockReason: eligibility?.lockReason,
                // Final score (only shown after both reviews)
                finalScore: bothReviewsComplete && eligibility?.totalScore ? Number(eligibility.totalScore) : null,
                isEligible: eligibility?.isEligible,
                eligibilityId: eligibility?.id,
            },
        };
    } catch (error) {
        console.error("Error getting review status:", error);
        return { success: false, error: "Failed to get review status" };
    }
}
