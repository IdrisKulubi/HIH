"use server";

/**
 * Two-Tier Review System Server Actions
 * 
 * Implements:
 * - Reviewer 1 (Initial Review): First pass evaluation
 * - Reviewer 2 (Senior Review): Reviews R1's work, can override, locks decision
 */

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import { applications, eligibilityResults, users } from "../../../db/schema";
import { eq } from "drizzle-orm";
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

// ============================================================================
// REVIEWER 1 - INITIAL REVIEW
// ============================================================================

/**
 * Submit initial review (Reviewer 1)
 * Moves application from 'under_review' to 'pending_senior_review'
 */
export async function submitReviewer1Review(input: ReviewInput): Promise<ReviewResult> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        // Check if application exists
        const application = await db.query.applications.findFirst({
            where: eq(applications.id, input.applicationId),
        });

        if (!application) {
            return { success: false, error: "Application not found" };
        }

        // Check if application is in correct status
        if (application.status !== "submitted" && application.status !== "under_review") {
            return { success: false, error: "Application is not available for initial review" };
        }

        // Get or create eligibility result
        const existingResult = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, input.applicationId),
        });

        if (existingResult?.isLocked) {
            return { success: false, error: "Application is locked and cannot be modified" };
        }

        const reviewData = {
            reviewer1Id: session.user.id,
            reviewer1Score: input.score,
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
                isEligible: input.score >= 70,
                ageEligible: true,
                registrationEligible: true,
                revenueEligible: true,
                businessPlanEligible: true,
                impactEligible: true,
                totalScore: input.score,
                ...reviewData,
            });
        }

        // Update application status to pending senior review
        await db
            .update(applications)
            .set({
                status: "pending_senior_review",
                updatedAt: new Date(),
            })
            .where(eq(applications.id, input.applicationId));

        revalidatePath(`/admin/applications/${input.applicationId}`);
        revalidatePath("/admin/applications");

        return { success: true, message: "Initial review submitted successfully" };
    } catch (error) {
        console.error("Error submitting Reviewer 1 review:", error);
        return { success: false, error: "Failed to submit review" };
    }
}

// ============================================================================
// REVIEWER 2 - SENIOR REVIEW
// ============================================================================

/**
 * Submit senior review (Reviewer 2)
 * Makes final decision, can override Reviewer 1, and locks application
 */
export async function submitReviewer2Review(
    input: ReviewInput & {
        finalDecision: "approved" | "rejected";
        overrideReviewer1?: boolean;
    }
): Promise<ReviewResult> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify user has admin role (senior reviewer)
        const userProfile = await db.query.userProfiles.findFirst({
            where: eq(users.id, session.user.id),
        });

        if (userProfile?.role !== "admin") {
            return { success: false, error: "Only senior reviewers can perform this action" };
        }

        // Check if application exists
        const application = await db.query.applications.findFirst({
            where: eq(applications.id, input.applicationId),
        });

        if (!application) {
            return { success: false, error: "Application not found" };
        }

        // Check if application is in correct status
        if (application.status !== "pending_senior_review") {
            return { success: false, error: "Application is not ready for senior review" };
        }

        // Get eligibility result
        const existingResult = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, input.applicationId),
        });

        if (!existingResult) {
            return { success: false, error: "No initial review found for this application" };
        }

        if (existingResult.isLocked) {
            return { success: false, error: "Application is already locked" };
        }

        // Determine if overriding reviewer 1
        const isOverride = input.overrideReviewer1 ||
            (existingResult.reviewer1Score !== null && input.score !== existingResult.reviewer1Score);

        // Update eligibility result with senior review
        await db
            .update(eligibilityResults)
            .set({
                reviewer2Id: session.user.id,
                reviewer2Score: input.score,
                reviewer2Notes: input.notes ?? null,
                reviewer2At: new Date(),
                reviewer2OverrodeReviewer1: isOverride,
                totalScore: input.score, // Senior reviewer score is final
                isEligible: input.finalDecision === "approved",
                updatedAt: new Date(),
            })
            .where(eq(eligibilityResults.id, existingResult.id));

        // Update application status to final decision
        await db
            .update(applications)
            .set({
                status: input.finalDecision,
                updatedAt: new Date(),
            })
            .where(eq(applications.id, input.applicationId));

        revalidatePath(`/admin/applications/${input.applicationId}`);
        revalidatePath("/admin/applications");

        return {
            success: true,
            message: `Application ${input.finalDecision}${isOverride ? " (Reviewer 1 score overridden)" : ""}`
        };
    } catch (error) {
        console.error("Error submitting Reviewer 2 review:", error);
        return { success: false, error: "Failed to submit senior review" };
    }
}

// ============================================================================
// LOCK APPLICATION
// ============================================================================

/**
 * Lock an application to prevent further modifications
 * Only senior reviewers (Reviewer 2) can lock applications
 */
export async function lockApplication(input: LockInput): Promise<ReviewResult> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        // Verify user has admin role
        const userProfile = await db.query.userProfiles.findFirst({
            where: eq(users.id, session.user.id),
        });

        if (userProfile?.role !== "admin") {
            return { success: false, error: "Only senior reviewers can lock applications" };
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
                lockReason: input.reason ?? "Locked by senior reviewer",
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
// UNLOCK APPLICATION (Emergency)
// ============================================================================

/**
 * Unlock an application (emergency use only)
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
            where: eq(users.id, session.user.id),
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
// GET REVIEW STATUS
// ============================================================================

/**
 * Get the current review status of an application
 */
export async function getReviewStatus(applicationId: number) {
    try {
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

        return {
            success: true,
            data: {
                applicationStatus: application.status,
                reviewer1: eligibility?.reviewer1Id ? {
                    id: eligibility.reviewer1Id,
                    name: reviewer1Name,
                    score: eligibility.reviewer1Score,
                    notes: eligibility.reviewer1Notes,
                    reviewedAt: eligibility.reviewer1At?.toISOString(),
                } : null,
                reviewer2: eligibility?.reviewer2Id ? {
                    id: eligibility.reviewer2Id,
                    name: reviewer2Name,
                    score: eligibility.reviewer2Score,
                    notes: eligibility.reviewer2Notes,
                    reviewedAt: eligibility.reviewer2At?.toISOString(),
                    overrodeReviewer1: eligibility.reviewer2OverrodeReviewer1,
                } : null,
                isLocked: eligibility?.isLocked ?? false,
                lockedBy: lockedByName,
                lockedAt: eligibility?.lockedAt?.toISOString(),
                lockReason: eligibility?.lockReason,
                finalScore: eligibility?.totalScore,
                isEligible: eligibility?.isEligible,
            },
        };
    } catch (error) {
        console.error("Error getting review status:", error);
        return { success: false, error: "Failed to get review status" };
    }
}
