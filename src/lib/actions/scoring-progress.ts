"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { applicationScores, eligibilityResults } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface DetailedScoreInput {
    criteriaId: number;
    score: number;
    notes?: string;
}

export async function saveScoringProgress(
    applicationId: number,
    scores: DetailedScoreInput[]
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        // 1. Get or Create Eligibility Result
        let result = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, applicationId)
        });

        if (!result) {
            // Create initial result record
            const [newResult] = await db.insert(eligibilityResults).values({
                applicationId,
                reviewer1Id: session.user.id,
                reviewer1At: new Date(),
                totalScore: "0",
                isEligible: false,
                // Defaults
                ageEligible: true,
                registrationEligible: true,
                revenueEligible: true,
                businessPlanEligible: true,
                impactEligible: true,
            }).returning();
            result = newResult;
        }

        if (result.isLocked) {
            return { success: false, error: "Application is locked" };
        }

        const eligibilityResultId = result.id;

        // 2. Loop through each score and upsert
        for (const item of scores) {
            // Check if a score already exists for this eligibility result and criteria
            const existing = await db.query.applicationScores.findFirst({
                where: and(
                    eq(applicationScores.eligibilityResultId, eligibilityResultId),
                    eq(applicationScores.criteriaId, item.criteriaId)
                ),
            });

            if (existing) {
                await db
                    .update(applicationScores)
                    .set({
                        score: String(item.score),
                        reviewerComment: item.notes,
                    })
                    .where(eq(applicationScores.id, existing.id));
            } else {
                await db.insert(applicationScores).values({
                    eligibilityResultId,
                    criteriaId: item.criteriaId,
                    score: String(item.score),
                    reviewerComment: item.notes,
                });
            }
        }

        revalidatePath("/admin/applications/" + applicationId);
        return { success: true, message: "Progress saved" };
    } catch (error) {
        console.error("Error saving detailed scores:", error);
        return { success: false, error: "Failed to save progress" };
    }
}

export async function getDetailedScores(applicationId: number) {
    try {
        const result = await db.query.eligibilityResults.findFirst({
            where: eq(eligibilityResults.applicationId, applicationId)
        });

        if (!result) {
            return { success: true, data: [] };
        }

        const scores = await db.query.applicationScores.findMany({
            where: eq(applicationScores.eligibilityResultId, result.id)
        });
        return { success: true, data: scores };
    } catch (error) {
        console.error("Error fetching detailed scores:", error);
        return { success: false, error: "Failed to fetch scores" };
    }
}
