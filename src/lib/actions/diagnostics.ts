"use server";

import db from "../../../db/drizzle";
import { applications, userProfiles, eligibilityResults, businesses } from "../../../db/schema";
import { eq, and, isNotNull, isNull, or, count } from "drizzle-orm";
import { auth } from "@/auth";

export interface ReviewerDiagnostic {
    id: string;
    name: string;
    role: string;
    email: string;
    r1: {
        assigned: number;
        completed: number;
        pending: number;
    };
    r2: {
        assigned: number;
        completed: number;
        pending: number;
    };
}

export interface PendingApplicationSnippet {
    id: number;
    businessName: string;
    assignedR1Id: string | null;
    r1Score: string | null;
    assignedR2Id: string | null;
    r2Score: string | null;
    status: string;
}

export async function getReviewDiagnosticStats() {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error("Unauthorized");

        // Verify admin
        const adminProfile = await db.query.userProfiles.findFirst({
            where: eq(userProfiles.userId, session.user.id)
        });
        if (!adminProfile || adminProfile.role !== 'admin') {
            throw new Error("Admin access required");
        }

        // Get all reviewers
        const reviewers = await db.query.userProfiles.findMany({
            where: or(eq(userProfiles.role, 'reviewer_1'), eq(userProfiles.role, 'reviewer_2'))
        });

        const reviewerStats: ReviewerDiagnostic[] = [];

        for (const r of reviewers) {
            // Reviewer 1 stats (Assignments based on assignedReviewer1Id)
            const r1AssignmentsResult = await db.select({ count: count() }).from(eligibilityResults)
                .where(eq(eligibilityResults.assignedReviewer1Id, r.userId));

            const r1CompletedResult = await db.select({ count: count() }).from(eligibilityResults)
                .where(and(
                    eq(eligibilityResults.assignedReviewer1Id, r.userId), // Still check the assignment
                    isNotNull(eligibilityResults.reviewer1Score)
                ));

            // Reviewer 2 stats
            const r2AssignmentsResult = await db.select({ count: count() }).from(eligibilityResults)
                .where(eq(eligibilityResults.assignedReviewer2Id, r.userId));

            const r2CompletedResult = await db.select({ count: count() }).from(eligibilityResults)
                .where(and(
                    eq(eligibilityResults.assignedReviewer2Id, r.userId),
                    isNotNull(eligibilityResults.reviewer2Score)
                ));

            reviewerStats.push({
                id: r.userId,
                name: `${r.firstName} ${r.lastName}`,
                role: r.role,
                email: r.email,
                r1: {
                    assigned: Number(r1AssignmentsResult[0].count),
                    completed: Number(r1CompletedResult[0].count),
                    pending: Number(r1AssignmentsResult[0].count) - Number(r1CompletedResult[0].count)
                },
                r2: {
                    assigned: Number(r2AssignmentsResult[0].count),
                    completed: Number(r2CompletedResult[0].count),
                    pending: Number(r2AssignmentsResult[0].count) - Number(r2CompletedResult[0].count)
                }
            });
        }

        // Find specifically pending applications
        const pendingApps = await db.select({
            id: applications.id,
            businessName: businesses.name,
            assignedR1Id: eligibilityResults.assignedReviewer1Id,
            r1Score: eligibilityResults.reviewer1Score,
            assignedR2Id: eligibilityResults.assignedReviewer2Id,
            r2Score: eligibilityResults.reviewer2Score,
            status: applications.status,
        })
            .from(applications)
            .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
            .innerJoin(businesses, eq(applications.businessId, businesses.id))
            .where(or(
                and(isNotNull(eligibilityResults.assignedReviewer1Id), isNull(eligibilityResults.reviewer1Score)),
                and(isNotNull(eligibilityResults.assignedReviewer2Id), isNull(eligibilityResults.reviewer2Score))
            ));

        return {
            success: true,
            data: {
                reviewers: reviewerStats,
                pendingApplications: pendingApps as PendingApplicationSnippet[]
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
