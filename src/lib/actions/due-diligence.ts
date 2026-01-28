"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    dueDiligenceRecords,
    dueDiligenceItems,
    applications,
    eligibilityResults,
    users
} from "../../../db/schema";
import { eq, and, isNull, sql, or, lte, isNotNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Types derived from schema
export type DueDiligencePhase = 'phase1' | 'phase2';
export type DDStatus = 'pending' | 'in_progress' | 'awaiting_approval' | 'approved' | 'queried' | 'auto_reassigned';
export type ValidatorAction = 'approved' | 'queried';

// Constants
const DD_THRESHOLD_PERCENTAGE = 60; // Minimum aggregate score for DD qualification
const SCORE_DISPARITY_THRESHOLD = 10; // Points difference to trigger warning
const APPROVAL_WINDOW_HOURS = 12; // Hours for validator to approve

// -----------------------------------------------------------------------------
// GET
// -----------------------------------------------------------------------------

export async function getDueDiligence(applicationId: number) {
    try {
        const session = await auth();
        // Allow admin, oversight, and reviewer_1 to access DD
        if (!session?.user || !["admin", "oversight", "reviewer_1"].includes(session.user.role || "")) {
            return { success: false, message: "Unauthorized" };
        }

        // Fetch or create record
        let record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId),
            with: {
                items: true,
                reviewer: true,
            }
        });

        // Initialize if not exists
        if (!record) {
            const [newRecord] = await db.insert(dueDiligenceRecords)
                .values({
                    applicationId,
                    reviewerId: session.user.id,
                })
                .returning();

            // Return structure matching the query result (items empty)
            return {
                success: true,
                data: {
                    ...newRecord,
                    items: [],
                    reviewer: null // Initial creator is reviewer, but fetching relation might be null immediately if not refreshed, roughly ok
                }
            };
        }

        return { success: true, data: record };
    } catch (error) {
        console.error("Error fetching due diligence:", error);
        return { success: false, message: "Failed to load due diligence data" };
    }
}

/**
 * Get eligibility scores breakdown for DD review
 * Returns R1 and R2 scores and category totals
 */
export async function getEligibilityScoresForDD(applicationId: number) {
    try {
        const session = await auth();
        if (!session?.user || !["admin", "oversight", "reviewer_1"].includes(session.user.role || "")) {
            return { success: false, message: "Unauthorized" };
        }

        const eligibility = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, applicationId)
        });

        if (!eligibility) {
            return { success: false, message: "No eligibility record found" };
        }

        const r1Score = eligibility.reviewer1Score ? parseFloat(eligibility.reviewer1Score) : 0;
        const r2Score = eligibility.reviewer2Score ? parseFloat(eligibility.reviewer2Score) : 0;
        const aggregateScore = (r1Score + r2Score) / 2;

        return {
            success: true,
            data: {
                applicationId,
                reviewer1Score: r1Score,
                reviewer2Score: r2Score,
                aggregateScore: Math.round(aggregateScore * 10) / 10,
                reviewer1Notes: eligibility.reviewer1Notes || null,
                reviewer2Notes: eligibility.reviewer2Notes || null,
                // Category totals
                innovationTotal: eligibility.innovationTotal ? parseFloat(eligibility.innovationTotal) : 0,
                viabilityTotal: eligibility.viabilityTotal ? parseFloat(eligibility.viabilityTotal) : 0,
                alignmentTotal: eligibility.alignmentTotal ? parseFloat(eligibility.alignmentTotal) : 0,
                orgCapacityTotal: eligibility.orgCapacityTotal ? parseFloat(eligibility.orgCapacityTotal) : 0,
                // Total score
                totalScore: eligibility.totalScore ? parseFloat(eligibility.totalScore) : 0,
                // Score disparity
                scoreDisparity: eligibility.scoreDisparity || 0,
            }
        };
    } catch (error) {
        console.error("Error getting eligibility scores:", error);
        return { success: false, message: "Failed to load eligibility scores" };
    }
}

// -----------------------------------------------------------------------------
// UPSERT ITEM
// -----------------------------------------------------------------------------

export async function saveDueDiligenceItem(
    applicationId: number,
    phase: DueDiligencePhase,
    category: string,
    criterion: string,
    score: number,
    comments?: string
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, message: "Unauthorized" };
        }

        // Ensure record exists
        let record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        if (!record) {
            [record] = await db.insert(dueDiligenceRecords)
                .values({
                    applicationId,
                    reviewerId: session.user.id,
                })
                .returning();
        }

        // Upsert item
        const existingItem = await db.query.dueDiligenceItems.findFirst({
            where: and(
                eq(dueDiligenceItems.recordId, record.id),
                eq(dueDiligenceItems.phase, phase),
                eq(dueDiligenceItems.criterion, criterion)
            )
        });

        if (existingItem) {
            await db.update(dueDiligenceItems)
                .set({ score, comments })
                .where(eq(dueDiligenceItems.id, existingItem.id));
        } else {
            await db.insert(dueDiligenceItems)
                .values({
                    recordId: record.id,
                    phase,
                    category,
                    criterion,
                    score,
                    comments
                });
        }

        // Recalculate Total Score for the Phase
        const allItems = await db.query.dueDiligenceItems.findMany({
            where: and(
                eq(dueDiligenceItems.recordId, record.id),
                eq(dueDiligenceItems.phase, phase)
            )
        });

        const totalScore = allItems.reduce((sum, item) => sum + (item.score || 0), 0);

        // Update Record Phase Score
        if (phase === 'phase1') {
            await db.update(dueDiligenceRecords)
                .set({
                    phase1Score: totalScore,
                    phase1Status: 'in_progress',
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, record.id));
        } else {
            await db.update(dueDiligenceRecords)
                .set({
                    phase2Score: totalScore,
                    phase2Status: 'in_progress',
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, record.id));
        }

        revalidatePath(`/admin/applications/${applicationId}`);
        return { success: true, message: "Saved" };

    } catch (error) {
        console.error("Error saving due diligence item:", error);
        return { success: false, message: "Failed to save" };
    }
}

// -----------------------------------------------------------------------------
// UPDATE STATUS / COMPLETE PHASE
// -----------------------------------------------------------------------------

export async function updateDueDiligenceStatus(
    applicationId: number,
    phase: DueDiligencePhase,
    status: string,
    notes?: string
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, message: "Unauthorized" };
        }

        const record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        if (!record) return { success: false, message: "Record not found" };

        if (phase === 'phase1') {
            await db.update(dueDiligenceRecords)
                .set({
                    phase1Status: status,
                    phase1Notes: notes ?? record.phase1Notes,
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, record.id));
        } else {
            await db.update(dueDiligenceRecords)
                .set({
                    phase2Status: status,
                    phase2Notes: notes ?? record.phase2Notes,
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, record.id));
        }

        revalidatePath(`/admin/applications/${applicationId}`);
        return { success: true, message: "Status updated" };

    } catch (error) {
        console.error("Error updating status:", error);
        return { success: false, message: "Failed to update status" };
    }
}

// -----------------------------------------------------------------------------
// FINAL DECISION
// -----------------------------------------------------------------------------

export async function saveDueDiligenceFinalDecision(
    applicationId: number,
    phase: DueDiligencePhase,
    verdict: 'pass' | 'fail',
    reason: string
) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, message: "Unauthorized" };
        }

        if (!reason || reason.trim().length < 10) {
            return { success: false, message: "Please provide a detailed reason (at least 10 characters)." };
        }

        const record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        if (!record) return { success: false, message: "Due diligence record not found" };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
            finalVerdict: verdict,
            finalReason: reason,
            updatedAt: new Date()
        };

        // Also mark the specific phase as completed
        if (phase === 'phase1') {
            updateData.phase1Status = 'completed';
        } else {
            updateData.phase2Status = 'completed';
        }

        await db.update(dueDiligenceRecords)
            .set(updateData)
            .where(eq(dueDiligenceRecords.id, record.id));

        revalidatePath(`/admin/applications/${applicationId}`);
        revalidatePath(`/admin/applications/${applicationId}/due-diligence`);

        return { success: true, message: `Final decision (${verdict.toUpperCase()}) saved successfully.` };

    } catch (error) {
        console.error("Error saving final decision:", error);
        return { success: false, message: "Failed to save final decision" };
    }
}

// =============================================================================
// DUE DILIGENCE QUALIFICATION & OVERSIGHT
// =============================================================================

/**
 * Calculate score disparity between R1 and R2
 * Triggers warning if > 10 points difference
 */
export async function calculateScoreDisparity(applicationId: number): Promise<{
    success: boolean;
    disparity?: number;
    hasWarning?: boolean;
    message?: string;
}> {
    try {
        const result = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, applicationId)
        });

        if (!result || !result.reviewer1Score || !result.reviewer2Score) {
            return { success: false, message: "Both reviews not complete" };
        }

        const r1 = parseFloat(result.reviewer1Score);
        const r2 = parseFloat(result.reviewer2Score);
        const disparity = Math.abs(r1 - r2);

        // Update the disparity in the record
        await db.update(eligibilityResults)
            .set({
                scoreDisparity: Math.round(disparity),
                updatedAt: new Date()
            })
            .where(eq(eligibilityResults.id, result.id));

        return {
            success: true,
            disparity: Math.round(disparity),
            hasWarning: disparity > SCORE_DISPARITY_THRESHOLD
        };
    } catch (error) {
        console.error("Error calculating disparity:", error);
        return { success: false, message: "Failed to calculate disparity" };
    }
}

/**
 * Check if application qualifies for DD (≥60% aggregate score)
 * Called after R2 submits their review
 */
export async function checkDDQualification(applicationId: number): Promise<{
    success: boolean;
    qualifies?: boolean;
    aggregateScore?: number;
    message?: string;
}> {
    try {
        const result = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, applicationId)
        });

        if (!result || !result.reviewer1Score || !result.reviewer2Score) {
            return { success: false, message: "Both reviews not complete" };
        }

        const r1 = parseFloat(result.reviewer1Score);
        const r2 = parseFloat(result.reviewer2Score);
        const aggregateScore = (r1 + r2) / 2;
        const qualifies = aggregateScore >= DD_THRESHOLD_PERCENTAGE;

        // Update qualification status
        await db.update(eligibilityResults)
            .set({
                qualifiesForDueDiligence: qualifies,
                updatedAt: new Date()
            })
            .where(eq(eligibilityResults.id, result.id));

        // Also calculate disparity
        await calculateScoreDisparity(applicationId);

        return {
            success: true,
            qualifies,
            aggregateScore: Math.round(aggregateScore * 10) / 10
        };
    } catch (error) {
        console.error("Error checking DD qualification:", error);
        return { success: false, message: "Failed to check qualification" };
    }
}

/**
 * Oversight Admin: Recommend application for DD
 * Requires mandatory justification
 */
export async function recommendForDueDiligence(
    applicationId: number,
    justification: string
): Promise<{ success: boolean; message: string }> {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, message: "Unauthorized" };
        }

        // Check if user is oversight or admin
        const userRole = session.user.role;
        if (userRole !== "oversight" && userRole !== "admin") {
            return { success: false, message: "Only Oversight Administrators can recommend for DD" };
        }

        if (!justification || justification.trim().length < 20) {
            return { success: false, message: "Justification must be at least 20 characters" };
        }

        // Update eligibility result
        const result = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, applicationId)
        });

        if (!result) {
            return { success: false, message: "Application not found" };
        }

        await db.update(eligibilityResults)
            .set({
                ddRecommendedByOversight: true,
                adminOversightComment: justification,
                updatedAt: new Date()
            })
            .where(eq(eligibilityResults.id, result.id));

        // Create DD record if not exists
        let ddRecord = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        if (!ddRecord) {
            await db.insert(dueDiligenceRecords).values({
                applicationId,
                isOversightInitiated: true,
                oversightJustification: justification,
                oversightAdminId: session.user.id,
                oversightFlaggedAt: new Date(),
                ddStatus: 'pending'
            });
        } else {
            await db.update(dueDiligenceRecords)
                .set({
                    isOversightInitiated: true,
                    oversightJustification: justification,
                    oversightAdminId: session.user.id,
                    oversightFlaggedAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, ddRecord.id));
        }

        revalidatePath(`/admin/applications/${applicationId}`);
        revalidatePath('/admin/due-diligence');

        return { success: true, message: "Application flagged for Due Diligence" };
    } catch (error) {
        console.error("Error recommending for DD:", error);
        return { success: false, message: "Failed to recommend for DD" };
    }
}

// =============================================================================
// DD QUEUE & WORKFLOW
// =============================================================================

/**
 * Get all applications queued for DD
 * Applications qualify if:
 * 1. They have both R1 and R2 scores completed
 * 2. Their aggregate score (R1 + R2) / 2 >= 60%
 * OR
 * 3. They've been recommended by oversight
 */
export async function getDDQueue(): Promise<{
    success: boolean;
    data?: Array<{
        id: number;
        applicationId: number;
        businessName: string;
        aggregateScore: number;
        isOversightInitiated: boolean;
        ddStatus: string;
        scoreDisparity: number | null;
        primaryReviewerId: string | null;
        validatorReviewerId: string | null;
        approvalDeadline: Date | null;
    }>;
    message?: string;
}> {
    try {
        const session = await auth();
        // Allow admin, oversight, and reviewer_1 to access the queue
        if (!session?.user || !["admin", "oversight", "reviewer_1"].includes(session.user.role || "")) {
            return { success: false, message: "Unauthorized" };
        }

        // Get all eligibility results that have BOTH reviewer scores
        const allEligibleApps = await db
            .select({
                eligibilityId: eligibilityResults.id,
                applicationId: eligibilityResults.applicationId,
                oversightRecommended: eligibilityResults.ddRecommendedByOversight,
                r1Score: eligibilityResults.reviewer1Score,
                r2Score: eligibilityResults.reviewer2Score,
                scoreDisparity: eligibilityResults.scoreDisparity,
            })
            .from(eligibilityResults)
            .where(
                and(
                    isNotNull(eligibilityResults.reviewer1Score),
                    isNotNull(eligibilityResults.reviewer2Score)
                )
            );

        const queueItems = [];

        for (const app of allEligibleApps) {
            const r1 = app.r1Score ? parseFloat(app.r1Score) : 0;
            const r2 = app.r2Score ? parseFloat(app.r2Score) : 0;
            const aggregateScore = (r1 + r2) / 2;

            // Check if qualifies: aggregate >= 60% OR oversight recommended
            const qualifies = aggregateScore >= DD_THRESHOLD_PERCENTAGE || app.oversightRecommended;

            if (!qualifies) continue;

            // Get DD record if exists
            const ddRecord = await db.query.dueDiligenceRecords.findFirst({
                where: eq(dueDiligenceRecords.applicationId, app.applicationId)
            });

            // Get application details
            const appDetails = await db.query.applications.findFirst({
                where: eq(applications.id, app.applicationId),
                with: { business: true }
            });

            if (!appDetails) continue;

            queueItems.push({
                id: ddRecord?.id || 0,
                applicationId: app.applicationId,
                businessName: appDetails.business?.name || "Unknown",
                aggregateScore: Math.round(aggregateScore * 10) / 10,
                isOversightInitiated: app.oversightRecommended || false,
                ddStatus: ddRecord?.ddStatus || 'pending',
                scoreDisparity: app.scoreDisparity ? Number(app.scoreDisparity) : null,
                primaryReviewerId: ddRecord?.primaryReviewerId || null,
                validatorReviewerId: ddRecord?.validatorReviewerId || null,
                approvalDeadline: ddRecord?.approvalDeadline || null,
            });
        }

        return { success: true, data: queueItems };
    } catch (error) {
        console.error("Error getting DD queue:", error);
        return { success: false, message: "Failed to load DD queue" };
    }
}

/**
 * Primary reviewer submits DD assessment
 */
export async function submitPrimaryDDReview(
    applicationId: number,
    finalScore: number,
    notes: string
): Promise<{ success: boolean; message: string }> {
    try {
        const session = await auth();
        if (!session?.user || !["admin", "oversight"].includes(session.user.role || "")) {
            return { success: false, message: "Unauthorized" };
        }

        let record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        if (!record) {
            // Create new record
            const [newRecord] = await db.insert(dueDiligenceRecords)
                .values({
                    applicationId,
                    primaryReviewerId: session.user.id,
                    primaryReviewedAt: new Date(),
                    phase1Score: finalScore,
                    phase1Notes: notes,
                    phase1Status: 'completed',
                    ddStatus: 'awaiting_approval',
                    approvalDeadline: new Date(Date.now() + APPROVAL_WINDOW_HOURS * 60 * 60 * 1000)
                })
                .returning();
            record = newRecord;
        } else {
            await db.update(dueDiligenceRecords)
                .set({
                    primaryReviewerId: session.user.id,
                    primaryReviewedAt: new Date(),
                    phase1Score: finalScore,
                    phase1Notes: notes,
                    phase1Status: 'completed',
                    ddStatus: 'awaiting_approval',
                    approvalDeadline: new Date(Date.now() + APPROVAL_WINDOW_HOURS * 60 * 60 * 1000),
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, record.id));
        }

        revalidatePath(`/admin/due-diligence/${applicationId}`);
        revalidatePath('/admin/due-diligence');

        return { success: true, message: "Primary review submitted. Please select a validator." };
    } catch (error) {
        console.error("Error submitting primary DD review:", error);
        return { success: false, message: "Failed to submit review" };
    }
}

/**
 * Select validator reviewer (dropdown)
 */
export async function selectValidatorReviewer(
    applicationId: number,
    validatorId: string
): Promise<{ success: boolean; message: string }> {
    try {
        const session = await auth();
        if (!session?.user || !["admin", "oversight"].includes(session.user.role || "")) {
            return { success: false, message: "Unauthorized" };
        }

        const record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        if (!record) {
            return { success: false, message: "DD record not found" };
        }

        // Prevent selecting self as validator
        if (validatorId === record.primaryReviewerId) {
            return { success: false, message: "Validator must be different from primary reviewer" };
        }

        await db.update(dueDiligenceRecords)
            .set({
                validatorReviewerId: validatorId,
                updatedAt: new Date()
            })
            .where(eq(dueDiligenceRecords.id, record.id));

        revalidatePath(`/admin/due-diligence/${applicationId}`);

        return { success: true, message: "Validator selected successfully" };
    } catch (error) {
        console.error("Error selecting validator:", error);
        return { success: false, message: "Failed to select validator" };
    }
}

/**
 * Validator approves or queries the DD assessment
 */
export async function submitValidatorAction(
    applicationId: number,
    action: ValidatorAction,
    comments: string
): Promise<{ success: boolean; message: string }> {
    try {
        const session = await auth();
        if (!session?.user || !["admin", "oversight"].includes(session.user.role || "")) {
            return { success: false, message: "Unauthorized" };
        }

        const record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        if (!record) {
            return { success: false, message: "DD record not found" };
        }

        // Verify current user is the validator
        if (record.validatorReviewerId !== session.user.id) {
            return { success: false, message: "Only the assigned validator can take this action" };
        }

        const newStatus = action === 'approved' ? 'approved' : 'queried';

        await db.update(dueDiligenceRecords)
            .set({
                validatorAction: action,
                validatorComments: comments,
                validatorActionAt: new Date(),
                ddStatus: newStatus,
                updatedAt: new Date()
            })
            .where(eq(dueDiligenceRecords.id, record.id));

        revalidatePath(`/admin/due-diligence/${applicationId}`);
        revalidatePath('/admin/due-diligence');

        return {
            success: true,
            message: action === 'approved'
                ? "DD assessment approved. Final score recorded."
                : "DD assessment queried. Returned to primary reviewer."
        };
    } catch (error) {
        console.error("Error submitting validator action:", error);
        return { success: false, message: "Failed to submit action" };
    }
}

/**
 * Background job: Check and process expired approval deadlines
 * Auto-reassigns if 12-hour window passes without approval
 */
export async function checkApprovalDeadlines(): Promise<{
    success: boolean;
    reassigned: number;
    message: string;
}> {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return { success: false, reassigned: 0, message: "Unauthorized" };
        }

        const now = new Date();

        // Find records awaiting approval past deadline
        const expiredRecords = await db
            .select()
            .from(dueDiligenceRecords)
            .where(
                and(
                    eq(dueDiligenceRecords.ddStatus, 'awaiting_approval'),
                    lte(dueDiligenceRecords.approvalDeadline, now),
                    isNotNull(dueDiligenceRecords.approvalDeadline)
                )
            );

        let reassignedCount = 0;

        for (const record of expiredRecords) {
            // Reset to pending and clear validator
            await db.update(dueDiligenceRecords)
                .set({
                    ddStatus: 'auto_reassigned',
                    validatorReviewerId: null,
                    validatorAction: null,
                    validatorComments: 'Auto-reassigned due to 12-hour deadline expiry',
                    approvalDeadline: null,
                    updatedAt: new Date()
                })
                .where(eq(dueDiligenceRecords.id, record.id));

            reassignedCount++;
        }

        return {
            success: true,
            reassigned: reassignedCount,
            message: `Processed ${reassignedCount} expired approval(s)`
        };
    } catch (error) {
        console.error("Error checking deadlines:", error);
        return { success: false, reassigned: 0, message: "Failed to check deadlines" };
    }
}

/**
 * Get list of available validators (excluding primary reviewer)
 */
export async function getAvailableValidators(applicationId: number): Promise<{
    success: boolean;
    data?: Array<{ id: string; name: string; email: string }>;
    message?: string;
}> {
    try {
        const session = await auth();
        if (!session?.user) {
            return { success: false, message: "Unauthorized" };
        }

        const record = await db.query.dueDiligenceRecords.findFirst({
            where: eq(dueDiligenceRecords.applicationId, applicationId)
        });

        const excludeId = record?.primaryReviewerId || session.user.id;

        // Get all admin/oversight users except primary reviewer
        const validators = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email
            })
            .from(users)
            .where(
                and(
                    sql`${users.role} IN ('admin', 'oversight')`,
                    sql`${users.id} != ${excludeId}`
                )
            );

        return { success: true, data: validators as Array<{ id: string; name: string; email: string }> };
    } catch (error) {
        console.error("Error getting validators:", error);
        return { success: false, message: "Failed to load validators" };
    }
}
