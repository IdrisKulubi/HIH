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
    type RepayableGrantScores,
    type MatchingGrantScores,
    type ScoringPayload,
    REPAYABLE_MAX_SCORES,
    MATCHING_MAX_SCORES,
    validateScoringWeights,
} from "@/lib/a2f-constants";

// Re-export types only for consumers that import from this file
export type { RepayableGrantScores, MatchingGrantScores, ScoringPayload };

const A2F_ROLES = ['admin', 'a2f_officer'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// CALCULATE: action_calculateA2FScore
// Accepts payload, validates weights, computes total, saves to a2f_scoring.
// ─────────────────────────────────────────────────────────────────────────────

export async function action_calculateA2FScore(
    a2fId: number,
    payload: ScoringPayload,
    scorerNotes?: string
): Promise<ActionResponse<{ id: number; totalScore: number; bonusPoints: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized. Admin or A2F Officer access required.");
        }

        // Validate pipeline entry exists and instrument type matches
        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
        });

        if (!pipeline) return errorResponse("A2F pipeline entry not found");

        if (pipeline.instrumentType !== payload.instrumentType) {
            return errorResponse(
                `Instrument type mismatch. Pipeline is '${pipeline.instrumentType}' but scoring payload is '${payload.instrumentType}'.`
            );
        }

        // Validate category weights
        const weightError = validateScoringWeights(payload);
        if (weightError) return errorResponse(weightError);

        // Compute totals
        const { baseScore, bonusPoints } = computeTotals(payload);
        const totalScore = baseScore + bonusPoints;

        // Save / update scoring record for this scorer
        const existing = await db.query.a2fScoring.findFirst({
            where: eq(a2fScoring.a2fId, a2fId),
        });

        let recordId: number;

        if (existing) {
            await db
                .update(a2fScoring)
                .set({
                    instrumentType: payload.instrumentType,
                    scores: payload.scores,
                    totalScore,
                    bonusPoints,
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
                    instrumentType: payload.instrumentType,
                    scores: payload.scores,
                    totalScore,
                    bonusPoints,
                    scorerNotes: scorerNotes ?? null,
                })
                .returning({ id: a2fScoring.id });
            recordId = inserted.id;
        }

        // Advance pipeline to IC Appraisal if in Pre-IC Scoring stage
        if (pipeline.status === 'pre_ic_scoring') {
            await advancePipelineStatus(a2fId, 'ic_appraisal_review');
        }

        revalidatePath(`/admin/a2f/${a2fId}`);
        revalidatePath('/admin/a2f');

        return successResponse(
            { id: recordId, totalScore, bonusPoints },
            `Score calculated: ${baseScore} base + ${bonusPoints} bonus = ${totalScore}/110`
        );
    } catch (error) {
        console.error("Error calculating A2F score:", error);
        return errorResponse("Failed to calculate score");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Scores for a pipeline entry
// ─────────────────────────────────────────────────────────────────────────────

export async function getA2fScores(a2fId: number) {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'a2f_officer', 'oversight'].includes(session.user.role || '')) {
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

// ─────────────────────────────────────────────────────────────────────────────
// GET: Scoring summary with breakdown for UI display
// ─────────────────────────────────────────────────────────────────────────────

export async function getA2fScoringBreakdown(a2fId: number) {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'a2f_officer', 'oversight'].includes(session.user.role || '')) {
            return { success: false, message: "Unauthorized" };
        }

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
        });
        if (!pipeline) return { success: false, message: "Pipeline entry not found" };

        const latestScore = await db.query.a2fScoring.findFirst({
            where: eq(a2fScoring.a2fId, a2fId),
            orderBy: [desc(a2fScoring.createdAt)],
        });

        if (!latestScore) return { success: true, data: null };

        const maxTotal = 110;
        const percentage = Math.round((latestScore.totalScore / maxTotal) * 100);

        const categoryBreakdown = buildCategoryBreakdown(
            pipeline.instrumentType as 'repayable_grant' | 'matching_grant',
            latestScore.scores as RepayableGrantScores | MatchingGrantScores
        );

        return {
            success: true,
            data: {
                id: latestScore.id,
                instrumentType: latestScore.instrumentType,
                totalScore: latestScore.totalScore,
                bonusPoints: latestScore.bonusPoints,
                maxTotal,
                percentage,
                scorerNotes: latestScore.scorerNotes,
                rawScores: latestScore.scores,
                categories: categoryBreakdown,
                createdAt: latestScore.createdAt,
            },
        };
    } catch (error) {
        console.error("Error fetching scoring breakdown:", error);
        return { success: false, message: "Failed to load scoring breakdown" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function computeTotals(payload: ScoringPayload): { baseScore: number; bonusPoints: number } {
    if (payload.instrumentType === 'repayable_grant') {
        const s = payload.scores;
        const base = s.revenueCashFlow + s.debtServiceCoverage + s.collateralSecurity
            + s.marketScalabilityStrength + s.impactInclusion + s.investmentPlanSafeguards;
        return { baseScore: base, bonusPoints: s.bonusPoints };
    } else {
        const s = payload.scores;
        const base = s.ownContributionPct + s.financialManagementCapacity
            + s.marketScalabilityPotential + s.impactInclusion + s.investmentLeverage;
        return { baseScore: base, bonusPoints: s.bonusPoints };
    }
}

function buildCategoryBreakdown(
    instrumentType: 'repayable_grant' | 'matching_grant',
    scores: RepayableGrantScores | MatchingGrantScores
): Array<{ category: string; earned: number; max: number; percentage: number }> {
    if (instrumentType === 'repayable_grant') {
        const s = scores as RepayableGrantScores;
        return [
            {
                category: 'Repayment Capacity',
                earned: s.revenueCashFlow + s.debtServiceCoverage + s.collateralSecurity,
                max: 35,
                percentage: Math.round(((s.revenueCashFlow + s.debtServiceCoverage + s.collateralSecurity) / 35) * 100),
            },
            {
                category: 'Market & Scalability',
                earned: s.marketScalabilityStrength,
                max: 25,
                percentage: Math.round((s.marketScalabilityStrength / 25) * 100),
            },
            {
                category: 'Impact & Inclusion',
                earned: s.impactInclusion,
                max: 30,
                percentage: Math.round((s.impactInclusion / 30) * 100),
            },
            {
                category: 'Investment Plan & Safeguards',
                earned: s.investmentPlanSafeguards,
                max: 10,
                percentage: Math.round((s.investmentPlanSafeguards / 10) * 100),
            },
            {
                category: 'Bonus',
                earned: s.bonusPoints,
                max: 10,
                percentage: Math.round((s.bonusPoints / 10) * 100),
            },
        ];
    } else {
        const s = scores as MatchingGrantScores;
        return [
            {
                category: 'Financial Readiness & Co-Investment',
                earned: s.ownContributionPct + s.financialManagementCapacity,
                max: 30,
                percentage: Math.round(((s.ownContributionPct + s.financialManagementCapacity) / 30) * 100),
            },
            {
                category: 'Market & Scalability Potential',
                earned: s.marketScalabilityPotential,
                max: 25,
                percentage: Math.round((s.marketScalabilityPotential / 25) * 100),
            },
            {
                category: 'Impact & Inclusion',
                earned: s.impactInclusion,
                max: 30,
                percentage: Math.round((s.impactInclusion / 30) * 100),
            },
            {
                category: 'Investment Plan & Leverage',
                earned: s.investmentLeverage,
                max: 15,
                percentage: Math.round((s.investmentLeverage / 15) * 100),
            },
            {
                category: 'Bonus',
                earned: s.bonusPoints,
                max: 10,
                percentage: Math.round((s.bonusPoints / 10) * 100),
            },
        ];
    }
}
