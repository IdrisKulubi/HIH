"use server";

import db from "../../../db/drizzle";
import { applications, eligibilityResults } from "../../../db/schema";
import { eq, and, gte, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "../../../auth";

/**
 * Reconciles applications that were rejected under the old 70% threshold
 * but should pass under the new 60% threshold.
 */
export async function reconcileRejectedApplications() {
    try {
        const session = await auth();
        if (session?.user?.role !== "admin") {
            return { success: false, error: "Unauthorized. Admin access only." };
        }

        console.log("Starting reconciliation of rejected applications (threshold 60%)...");

        // 1. Find applications with status 'rejected' but score >= 60
        const impactedApplications = await db
            .select({
                id: applications.id,
                status: applications.status,
                totalScore: eligibilityResults.totalScore,
                eligibilityId: eligibilityResults.id,
                reviewer1Score: eligibilityResults.reviewer1Score,
                reviewer2Score: eligibilityResults.reviewer2Score,
            })
            .from(applications)
            .innerJoin(eligibilityResults, eq(applications.id, eligibilityResults.applicationId))
            .where(
                and(
                    eq(applications.status, "rejected"),
                    gte(eligibilityResults.totalScore, "60")
                )
            );

        if (impactedApplications.length === 0) {
            return { success: true, message: "No applications found that need reconciliation.", count: 0 };
        }

        console.log(`Found ${impactedApplications.length} applications to reconcile.`);

        let count = 0;
        for (const app of impactedApplications) {
            // Determine the new status
            // If it was rejected after review (R1/R2), move to 'approved'
            // If it was rejected automatically (if that ever happens), move to 'scoring_phase'
            const newStatus = (app.reviewer1Score || app.reviewer2Score) ? "approved" : "scoring_phase";

            // Update application status
            await db
                .update(applications)
                .set({
                    status: newStatus,
                    updatedAt: new Date(),
                })
                .where(eq(applications.id, app.id));

            // Update eligibility result
            await db
                .update(eligibilityResults)
                .set({
                    isEligible: true,
                    qualifiesForDueDiligence: true,
                    evaluationNotes: `[RECONCILIATION] Status updated from 'rejected' to '${newStatus}' due to pass mark change (70% -> 60%).`,
                    updatedAt: new Date(),
                })
                .where(eq(eligibilityResults.id, app.eligibilityId));

            count++;
        }

        revalidatePath("/admin/applications");
        revalidatePath("/admin/review");
        revalidatePath("/reviewer");

        return {
            success: true,
            message: `Successfully reconciled ${count} applications.`,
            count
        };
    } catch (error) {
        console.error("Error during application reconciliation:", error);
        return { success: false, error: "An error occurred during reconciliation." };
    }
}
