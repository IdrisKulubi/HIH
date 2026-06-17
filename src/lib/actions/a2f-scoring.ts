"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    a2fScoring,
    a2fPipeline,
} from "../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { advancePipelineStatus } from "./a2f-pipeline";
import { ActionResponse, successResponse, errorResponse } from "./types";
import {
    type MatchingGrantScores,
    type ScoringPayload,
    MATCHING_GRANT_MAX_TOTAL,
    MATCHING_GRANT_QUALIFYING_SCORE,
    validateScoringWeights,
    getMatchingGrantQualification,
    getMatchingGrantRevenueScore,
    normalizeMatchingGrantScores,
    type A2fEnterpriseTrack,
} from "@/lib/a2f-constants";

export type { MatchingGrantScores, ScoringPayload };

import {
    A2F_STAFF_ROLES,
    assertA2fStaffRead,
    assertMatchingGrantApplicationSubmitted,
} from "@/lib/a2f-access";

const A2F_ROLES = A2F_STAFF_ROLES;

export async function action_calculateA2FScore(
    a2fId: number,
    payload: ScoringPayload,
    scorerNotes?: string
): Promise<ActionResponse<{ id: number; totalScore: number; bonusPoints: number; qualificationStatus?: string }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized. Admin or A2F Officer access required.");
        }

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
            with: {
                application: {
                    with: {
                        business: true,
                    },
                },
            },
        });

        if (!pipeline) return errorResponse("A2F pipeline entry not found");

        if (pipeline.instrumentType !== 'matching_grant') {
            return errorResponse("Only Matching Grant pipeline entries can be scored.");
        }
        const submitted = await assertMatchingGrantApplicationSubmitted(a2fId);
        if (!submitted.ok) return errorResponse(submitted.error);

        const scoringPayload = normalizeScoringPayload(payload, pipeline);

        const weightError = validateScoringWeights(scoringPayload);
        if (weightError) return errorResponse(weightError);

        const totalScore = computeTotal(scoringPayload.scores);
        const qualificationStatus = getMatchingGrantQualification(
            totalScore,
            scoringPayload.scores.currentAnnualRevenue
        );

        const existing = await db.query.a2fScoring.findFirst({
            where: eq(a2fScoring.a2fId, a2fId),
        });

        let recordId: number;

        if (existing) {
            await db
                .update(a2fScoring)
                .set({
                    instrumentType: 'matching_grant',
                    scores: scoringPayload.scores,
                    totalScore,
                    bonusPoints: 0,
                    scorerNotes: scorerNotes ?? null,
                    updatedAt: new Date(),
                })
                .where(eq(a2fScoring.id, existing.id));
            recordId = existing.id;
        } else {
            const [inserted] = await db
                .insert(a2fScoring)
                .values({
                    a2fId,
                    scorerId: session.user.id,
                    instrumentType: 'matching_grant',
                    scores: scoringPayload.scores,
                    totalScore,
                    bonusPoints: 0,
                    scorerNotes: scorerNotes ?? null,
                })
                .returning({ id: a2fScoring.id });
            recordId = inserted.id;
        }

        if (pipeline.status === 'pre_ic_scoring' && qualificationStatus === 'Qualified') {
            await advancePipelineStatus(a2fId, 'ic_appraisal_review');
        }

        revalidatePath(`/a2f/${a2fId}`);
        revalidatePath('/a2f');

        return successResponse(
            { id: recordId, totalScore, bonusPoints: 0, qualificationStatus },
            `Score calculated: ${totalScore}/${MATCHING_GRANT_MAX_TOTAL}. Status: ${qualificationStatus}.`
        );
    } catch (error) {
        console.error("Error calculating A2F score:", error);
        return errorResponse("Failed to calculate score");
    }
}

export async function getA2fScores(a2fId: number) {
    try {
        const session = await auth();
        const staffRead = assertA2fStaffRead(session?.user?.role);
        if (!session?.user || !staffRead.ok) {
            return { success: false, message: "Unauthorized" };
        }

        const scores = await db.query.a2fScoring.findMany({
            where: eq(a2fScoring.a2fId, a2fId),
            with: { scorer: { with: { userProfile: true } } },
            orderBy: [desc(a2fScoring.createdAt)],
        });

        return { success: true, data: scores };
    } catch (error) {
        console.error("Error fetching A2F scores:", error);
        return { success: false, message: "Failed to load scores" };
    }
}

export async function getA2fScoringBreakdown(a2fId: number) {
    try {
        const session = await auth();
        const staffRead = assertA2fStaffRead(session?.user?.role);
        if (!session?.user || !staffRead.ok) {
            return { success: false, message: "Unauthorized" };
        }

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
            with: {
                application: {
                    with: {
                        business: true,
                    },
                },
            },
        });
        if (!pipeline) return { success: false, message: "Pipeline entry not found" };

        const latestScore = await db.query.a2fScoring.findFirst({
            where: eq(a2fScoring.a2fId, a2fId),
            orderBy: [desc(a2fScoring.createdAt)],
        });

        if (!latestScore) return { success: true, data: null };

        const normalizedScores = normalizeMatchingGrantScores(
            latestScore.scores as Partial<MatchingGrantScores>,
            getMatchingGrantRevenueScore(
                pipeline.application?.track as A2fEnterpriseTrack | null | undefined,
                Number(pipeline.application?.business?.revenueLastYear ?? 0)
            )
        );
        const displayTotalScore = computeTotal(normalizedScores);
        const maxTotal = MATCHING_GRANT_MAX_TOTAL;
        const percentage = Math.round((displayTotalScore / maxTotal) * 100);
        const categoryBreakdown = buildCategoryBreakdown(normalizedScores);
        const qualificationStatus = getMatchingGrantQualification(
            displayTotalScore,
            normalizedScores.currentAnnualRevenue
        );

        return {
            success: true,
            data: {
                id: latestScore.id,
                instrumentType: 'matching_grant' as const,
                totalScore: displayTotalScore,
                bonusPoints: 0,
                maxTotal,
                percentage,
                qualificationStatus,
                qualifyingScore: MATCHING_GRANT_QUALIFYING_SCORE,
                revenueScore: normalizedScores.currentAnnualRevenue,
                enterpriseTrack: pipeline.application?.track ?? null,
                scorerNotes: latestScore.scorerNotes,
                rawScores: normalizedScores,
                categories: categoryBreakdown,
                createdAt: latestScore.createdAt,
            },
        };
    } catch (error) {
        console.error("Error fetching scoring breakdown:", error);
        return { success: false, message: "Failed to load scoring breakdown" };
    }
}

function computeTotal(scores: MatchingGrantScores): number {
    return scores.currentAnnualRevenue + scores.revenueGrowthTrend + scores.coInvestmentCommitment
        + scores.marketDemandEvidence + scores.businessModelScalability + scores.competitiveDifferentiation
        + scores.projectedDecentJobs + scores.inclusionTargeting + scores.environmentalClimateImpact
        + scores.useOfFundsQuality + scores.leveragePotential + scores.innovation;
}

function normalizeScoringPayload(
    payload: ScoringPayload,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipeline: any
): ScoringPayload {
    const track = pipeline.application?.track as A2fEnterpriseTrack | null | undefined;
    const annualRevenue = Number(pipeline.application?.business?.revenueLastYear ?? 0);
    const revenueScore = getMatchingGrantRevenueScore(track, annualRevenue);

    return {
        instrumentType: 'matching_grant',
        scores: normalizeMatchingGrantScores(payload.scores, revenueScore),
    };
}

function buildCategoryBreakdown(
    scores: MatchingGrantScores
): Array<{ category: string; earned: number; max: number; percentage: number }> {
    const s = normalizeMatchingGrantScores(scores);
    return [
        {
            category: 'Financial Readiness & Co-Investment',
            earned: s.currentAnnualRevenue + s.revenueGrowthTrend + s.coInvestmentCommitment,
            max: 20,
            percentage: Math.round(((s.currentAnnualRevenue + s.revenueGrowthTrend + s.coInvestmentCommitment) / 20) * 100),
        },
        {
            category: 'Market & Scalability Potential',
            earned: s.marketDemandEvidence + s.businessModelScalability + s.competitiveDifferentiation,
            max: 25,
            percentage: Math.round(((s.marketDemandEvidence + s.businessModelScalability + s.competitiveDifferentiation) / 25) * 100),
        },
        {
            category: 'Impact & Inclusion',
            earned: s.projectedDecentJobs + s.inclusionTargeting + s.environmentalClimateImpact,
            max: 30,
            percentage: Math.round(((s.projectedDecentJobs + s.inclusionTargeting + s.environmentalClimateImpact) / 30) * 100),
        },
        {
            category: 'Investment Plan & Leverage',
            earned: s.useOfFundsQuality + s.leveragePotential,
            max: 15,
            percentage: Math.round(((s.useOfFundsQuality + s.leveragePotential) / 15) * 100),
        },
        {
            category: 'Innovation',
            earned: s.innovation,
            max: 10,
            percentage: Math.round((s.innovation / 10) * 100),
        },
    ];
}
