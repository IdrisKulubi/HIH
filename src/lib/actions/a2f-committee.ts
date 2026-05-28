"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    a2fPipeline,
    a2fScoring,
    a2fScoringOverrides,
    investmentAppraisals,
    applications,
    businesses,
    applicants,
} from "../../../db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertA2fRole, canRecordCommitteeDecision } from "@/lib/a2f-access";
import { advancePipelineStatus } from "./a2f-pipeline";
import { ActionResponse, successResponse, errorResponse } from "./types";
import {
    getMatchingGrantQualification,
    getMatchingGrantRevenueScore,
    isMatchingGrantTrackEligible,
    normalizeMatchingGrantScores,
    MATCHING_MAX_SCORES,
    type MatchingGrantScores,
    type A2fEnterpriseTrack,
} from "@/lib/a2f-constants";
import type { IcDecision, RecordIcDecisionInput, AppraisalContent } from "./a2f-investment-appraisals";

export interface CommitteePipelineListItem {
    id: number;
    applicationId: number;
    businessName: string;
    applicantName: string;
    track: string | null;
    status: string;
    totalScore: number | null;
    qualificationStatus: string | null;
    revenueEligible: boolean | null;
    hasGair: boolean;
    icDecision: string | null;
    updatedAt: string;
}

export interface CommitteeCaseDetail {
    pipeline: {
        id: number;
        applicationId: number;
        status: string;
        instrumentType: string;
        requestedAmount: string;
        businessName: string;
        applicantName: string;
        applicantEmail: string;
        track: string | null;
        county: string | null;
        sector: string | null;
        annualRevenue: number;
        revenueEligible: boolean;
    };
    scoring: {
        totalScore: number;
        qualificationStatus: string;
        scorerNotes: string | null;
        rawScores: MatchingGrantScores;
        categories: Array<{ category: string; earned: number; max: number; percentage: number }>;
        parameterBreakdown: Array<{ parameter: string; earned: number; max: number }>;
    } | null;
    gair: {
        id: number;
        icDecision: string | null;
        approvedGrantAmount: string | null;
        decisionNotes: string | null;
        decisionConditions: string | null;
        decidedAt: Date | null;
        scoringSummary: string | null;
    } | null;
}

const PARAMETER_LABELS: Record<keyof MatchingGrantScores, string> = {
    currentAnnualRevenue: "Annual revenue (hard gate)",
    revenueGrowthTrend: "Revenue growth trend",
    coInvestmentCommitment: "Co-investment commitment",
    marketDemandEvidence: "Market demand evidence",
    businessModelScalability: "Business model scalability",
    competitiveDifferentiation: "Competitive differentiation",
    projectedDecentJobs: "Projected decent jobs",
    inclusionTargeting: "Inclusion targeting",
    environmentalClimateImpact: "Environmental / climate impact",
    useOfFundsQuality: "Use of funds quality",
    leveragePotential: "Leverage potential",
    innovation: "Innovation",
};

function buildParameterBreakdown(scores: MatchingGrantScores) {
    const s = normalizeMatchingGrantScores(scores);
    return (Object.keys(PARAMETER_LABELS) as Array<keyof MatchingGrantScores>).map((key) => ({
        parameter: PARAMETER_LABELS[key],
        earned: s[key],
        max: MATCHING_MAX_SCORES[key],
    }));
}

function buildCategoryBreakdown(scores: MatchingGrantScores) {
    const s = normalizeMatchingGrantScores(scores);
    return [
        {
            category: "Financial Readiness & Co-Investment",
            earned: s.currentAnnualRevenue + s.revenueGrowthTrend + s.coInvestmentCommitment,
            max: 20,
            percentage: Math.round(((s.currentAnnualRevenue + s.revenueGrowthTrend + s.coInvestmentCommitment) / 20) * 100),
        },
        {
            category: "Market & Scalability Potential",
            earned: s.marketDemandEvidence + s.businessModelScalability + s.competitiveDifferentiation,
            max: 25,
            percentage: Math.round(((s.marketDemandEvidence + s.businessModelScalability + s.competitiveDifferentiation) / 25) * 100),
        },
        {
            category: "Impact & Inclusion",
            earned: s.projectedDecentJobs + s.inclusionTargeting + s.environmentalClimateImpact,
            max: 30,
            percentage: Math.round(((s.projectedDecentJobs + s.inclusionTargeting + s.environmentalClimateImpact) / 30) * 100),
        },
        {
            category: "Investment Plan & Leverage",
            earned: s.useOfFundsQuality + s.leveragePotential,
            max: 15,
            percentage: Math.round(((s.useOfFundsQuality + s.leveragePotential) / 15) * 100),
        },
        {
            category: "Innovation",
            earned: s.innovation,
            max: 10,
            percentage: Math.round((s.innovation / 10) * 100),
        },
    ];
}

function computeTotal(scores: MatchingGrantScores): number {
    return (
        scores.currentAnnualRevenue +
        scores.revenueGrowthTrend +
        scores.coInvestmentCommitment +
        scores.marketDemandEvidence +
        scores.businessModelScalability +
        scores.competitiveDifferentiation +
        scores.projectedDecentJobs +
        scores.inclusionTargeting +
        scores.environmentalClimateImpact +
        scores.useOfFundsQuality +
        scores.leveragePotential +
        scores.innovation
    );
}

export async function getCommitteePipelineList(): Promise<
    ActionResponse<CommitteePipelineListItem[]>
> {
    try {
        const session = await auth();
        const authCheck = assertA2fRole(session?.user?.role, "committee");
        if (!authCheck.ok) return errorResponse(authCheck.error);

        const entries = await db
            .select({
                id: a2fPipeline.id,
                applicationId: a2fPipeline.applicationId,
                status: a2fPipeline.status,
                updatedAt: a2fPipeline.updatedAt,
                businessName: businesses.name,
                track: applications.track,
                applicantFirstName: applicants.firstName,
                applicantLastName: applicants.lastName,
                revenueLastYear: businesses.revenueLastYear,
            })
            .from(a2fPipeline)
            .innerJoin(applications, eq(applications.id, a2fPipeline.applicationId))
            .innerJoin(businesses, eq(businesses.id, applications.businessId))
            .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
            .orderBy(desc(a2fPipeline.updatedAt));

        if (!entries.length) return successResponse([]);

        const a2fIds = entries.map((e) => e.id);
        const scores = await db.query.a2fScoring.findMany({
            where: inArray(a2fScoring.a2fId, a2fIds),
            orderBy: [desc(a2fScoring.updatedAt)],
        });
        const scoreByA2f = new Map<number, typeof scores[0]>();
        for (const row of scores) {
            if (!scoreByA2f.has(row.a2fId)) scoreByA2f.set(row.a2fId, row);
        }

        const gairs = await db.query.investmentAppraisals.findMany({
            where: and(
                inArray(investmentAppraisals.a2fId, a2fIds),
                eq(investmentAppraisals.documentType, "gair")
            ),
        });
        const gairByA2f = new Map(gairs.map((g) => [g.a2fId, g]));

        const items: CommitteePipelineListItem[] = entries.map((entry) => {
            const latestScore = scoreByA2f.get(entry.id);
            const track = entry.track as A2fEnterpriseTrack | null;
            const annualRevenue = Number(entry.revenueLastYear ?? 0);
            const revenueEligible = isMatchingGrantTrackEligible(track, annualRevenue);
            let totalScore: number | null = null;
            let qualificationStatus: string | null = null;

            if (latestScore) {
                const normalized = normalizeMatchingGrantScores(
                    latestScore.scores as Partial<MatchingGrantScores>,
                    getMatchingGrantRevenueScore(track, annualRevenue)
                );
                totalScore = computeTotal(normalized);
                qualificationStatus = getMatchingGrantQualification(
                    totalScore,
                    normalized.currentAnnualRevenue
                );
            }

            const gair = gairByA2f.get(entry.id);

            return {
                id: entry.id,
                applicationId: entry.applicationId,
                businessName: entry.businessName,
                applicantName: `${entry.applicantFirstName} ${entry.applicantLastName}`.trim(),
                track: entry.track,
                status: entry.status,
                totalScore,
                qualificationStatus,
                revenueEligible,
                hasGair: Boolean(gair),
                icDecision: gair?.icDecision ?? null,
                updatedAt: entry.updatedAt.toISOString(),
            };
        });

        return successResponse(items);
    } catch (error) {
        console.error("Error loading committee pipeline:", error);
        return errorResponse("Failed to load committee cases");
    }
}

export interface CommitteeGairContent {
    appraisalId: number;
    content: Partial<AppraisalContent>;
    updatedAt: Date | null;
}

export async function getCommitteeGairContent(
    a2fId: number
): Promise<ActionResponse<CommitteeGairContent>> {
    try {
        const session = await auth();
        const authCheck = assertA2fRole(session?.user?.role, "committee");
        if (!authCheck.ok) return errorResponse(authCheck.error);

        const gairRow = await db.query.investmentAppraisals.findFirst({
            where: and(
                eq(investmentAppraisals.a2fId, a2fId),
                eq(investmentAppraisals.documentType, "gair")
            ),
        });

        if (!gairRow) {
            return errorResponse("GAIR not found for this case");
        }

        return successResponse({
            appraisalId: gairRow.id,
            content: (gairRow.content as Partial<AppraisalContent>) ?? {},
            updatedAt: gairRow.updatedAt,
        });
    } catch (error) {
        console.error("Error loading committee GAIR:", error);
        return errorResponse("Failed to load GAIR");
    }
}

export async function getCommitteeCaseDetail(
    a2fId: number
): Promise<ActionResponse<CommitteeCaseDetail>> {
    try {
        const session = await auth();
        const authCheck = assertA2fRole(session?.user?.role, "committee");
        if (!authCheck.ok) return errorResponse(authCheck.error);

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
            with: {
                application: {
                    with: {
                        business: { with: { applicant: true } },
                    },
                },
            },
        });

        if (!pipeline?.application?.business) {
            return errorResponse("Case not found");
        }

        const biz = pipeline.application.business;
        const track = pipeline.application.track as A2fEnterpriseTrack | null;
        const annualRevenue = Number(biz.revenueLastYear ?? 0);

        const latestScore = await db.query.a2fScoring.findFirst({
            where: eq(a2fScoring.a2fId, a2fId),
            orderBy: [desc(a2fScoring.updatedAt)],
        });

        let scoring: CommitteeCaseDetail["scoring"] = null;
        if (latestScore) {
            const normalized = normalizeMatchingGrantScores(
                latestScore.scores as Partial<MatchingGrantScores>,
                getMatchingGrantRevenueScore(track, annualRevenue)
            );
            const totalScore = computeTotal(normalized);
            scoring = {
                totalScore,
                qualificationStatus: getMatchingGrantQualification(
                    totalScore,
                    normalized.currentAnnualRevenue
                ),
                scorerNotes: latestScore.scorerNotes,
                rawScores: normalized,
                categories: buildCategoryBreakdown(normalized),
                parameterBreakdown: buildParameterBreakdown(normalized),
            };
        }

        const gairRow = await db.query.investmentAppraisals.findFirst({
            where: and(
                eq(investmentAppraisals.a2fId, a2fId),
                eq(investmentAppraisals.documentType, "gair")
            ),
        });

        const gairContent = gairRow?.content as Partial<AppraisalContent> | undefined;

        return successResponse({
            pipeline: {
                id: pipeline.id,
                applicationId: pipeline.applicationId,
                status: pipeline.status,
                instrumentType: pipeline.instrumentType,
                requestedAmount: pipeline.requestedAmount,
                businessName: biz.name,
                applicantName: `${biz.applicant.firstName} ${biz.applicant.lastName}`.trim(),
                applicantEmail: biz.applicant.email,
                track: pipeline.application.track,
                county: biz.county,
                sector: biz.sector,
                annualRevenue,
                revenueEligible: isMatchingGrantTrackEligible(track, annualRevenue),
            },
            scoring,
            gair: gairRow
                ? {
                      id: gairRow.id,
                      icDecision: gairRow.icDecision,
                      approvedGrantAmount: gairRow.approvedGrantAmount,
                      decisionNotes: gairRow.decisionNotes,
                      decisionConditions: gairRow.decisionConditions,
                      decidedAt: gairRow.decidedAt,
                      scoringSummary: gairContent?.scoringSummary ?? null,
                  }
                : null,
        });
    } catch (error) {
        console.error("Error loading committee case:", error);
        return errorResponse("Failed to load case detail");
    }
}

export async function recordCommitteeIcDecision(
    appraisalId: number,
    input: RecordIcDecisionInput
): Promise<ActionResponse<{ decision: IcDecision; advanced: boolean }>> {
    try {
        const session = await auth();
        if (!session?.user || !canRecordCommitteeDecision(session.user.role)) {
            return errorResponse("Unauthorized");
        }

        const appraisal = await db.query.investmentAppraisals.findFirst({
            where: eq(investmentAppraisals.id, appraisalId),
        });

        if (!appraisal) return errorResponse("Appraisal not found");
        if (appraisal.documentType !== "gair") {
            return errorResponse("Committee decisions apply to the GAIR only");
        }
        if (!["approved", "approved_with_conditions", "deferred", "declined"].includes(input.decision)) {
            return errorResponse("Invalid committee decision");
        }

        const isApproval =
            input.decision === "approved" || input.decision === "approved_with_conditions";
        const approvedAmount =
            input.approvedGrantAmount ??
            Number((appraisal.content as Partial<AppraisalContent>)?.recommendedAmount ?? 0);

        if (isApproval && (!Number.isFinite(approvedAmount) || approvedAmount <= 0)) {
            return errorResponse("Approved grant amount is required for approved cases.");
        }

        if (input.decision === "approved_with_conditions" && !input.decisionConditions?.trim()) {
            return errorResponse("Approval conditions are required when approving with conditions.");
        }

        await db
            .update(investmentAppraisals)
            .set({
                icDecision: input.decision,
                approvedGrantAmount: isApproval ? String(approvedAmount) : null,
                decisionNotes: input.decisionNotes?.trim() || null,
                decisionConditions: input.decisionConditions?.trim() || null,
                decidedById: session.user.id,
                decidedAt: new Date(),
                icApprovalStatus: isApproval,
                approvedBy: isApproval ? [session.user.id] : [],
                updatedAt: new Date(),
            })
            .where(eq(investmentAppraisals.id, appraisalId));

        let advanced = false;
        if (isApproval) {
            const pipeline = await db.query.a2fPipeline.findFirst({
                where: eq(a2fPipeline.id, appraisal.a2fId),
            });

            if (pipeline?.status === "ic_appraisal_review") {
                await advancePipelineStatus(appraisal.a2fId, "offer_issued");
                advanced = true;
            }
        }

        revalidatePath(`/a2f/${appraisal.a2fId}`);
        revalidatePath(`/a2f/${appraisal.a2fId}/appraisal`);
        revalidatePath("/a2f/committee");
        revalidatePath(`/a2f/committee/${appraisal.a2fId}`);

        return successResponse(
            { decision: input.decision, advanced },
            isApproval
                ? "Committee decision recorded. Case may proceed to contracting."
                : "Committee decision recorded."
        );
    } catch (error) {
        console.error("Error recording committee decision:", error);
        return errorResponse("Failed to record committee decision");
    }
}

export interface CommitteeScoreOverrideHistoryItem {
    id: number;
    previousTotal: number;
    newTotal: number;
    reason: string;
    createdAt: string;
    createdByName: string;
}

export async function getCommitteeScoreOverrideHistory(
    a2fId: number
): Promise<ActionResponse<CommitteeScoreOverrideHistoryItem[]>> {
    try {
        const session = await auth();
        const authCheck = assertA2fRole(session?.user?.role, "committee");
        if (!authCheck.ok) return errorResponse(authCheck.error);

        const rows = await db.query.a2fScoringOverrides.findMany({
            where: eq(a2fScoringOverrides.a2fId, a2fId),
            with: { createdBy: { with: { userProfile: true } } },
            orderBy: [desc(a2fScoringOverrides.createdAt)],
        });

        return successResponse(
            rows.map((row) => {
                const profile = row.createdBy?.userProfile;
                const name = profile
                    ? `${profile.firstName} ${profile.lastName}`.trim()
                    : "Committee member";
                return {
                    id: row.id,
                    previousTotal: row.previousTotal,
                    newTotal: row.newTotal,
                    reason: row.reason,
                    createdAt: row.createdAt.toISOString(),
                    createdByName: name,
                };
            })
        );
    } catch (error) {
        console.error("Error loading score override history:", error);
        return errorResponse("Failed to load override history");
    }
}

export async function recordCommitteeScoreOverride(
    a2fId: number,
    newScores: MatchingGrantScores,
    reason: string
): Promise<ActionResponse<{ newTotal: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !canRecordCommitteeDecision(session.user.role)) {
            return errorResponse("Unauthorized");
        }

        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            return errorResponse("A reason is required for score overrides");
        }

        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
            with: {
                application: { with: { business: true } },
            },
        });
        if (!pipeline?.application) return errorResponse("Case not found");

        const track = pipeline.application.track as A2fEnterpriseTrack | null;
        const annualRevenue = Number(pipeline.application.business?.revenueLastYear ?? 0);
        const revenueScore = getMatchingGrantRevenueScore(track, annualRevenue);
        const normalizedNew = normalizeMatchingGrantScores(newScores, revenueScore);
        const newTotal = computeTotal(normalizedNew);

        const existing = await db.query.a2fScoring.findFirst({
            where: eq(a2fScoring.a2fId, a2fId),
            orderBy: [desc(a2fScoring.updatedAt)],
        });

        if (!existing) {
            return errorResponse("No scoring record exists to override");
        }

        const previousNormalized = normalizeMatchingGrantScores(
            existing.scores as Partial<MatchingGrantScores>,
            revenueScore
        );
        const previousTotal = computeTotal(previousNormalized);

        await db.insert(a2fScoringOverrides).values({
            a2fId,
            previousScores: previousNormalized,
            newScores: normalizedNew,
            previousTotal,
            newTotal,
            reason: trimmedReason,
            createdById: session.user.id,
        });

        await db
            .update(a2fScoring)
            .set({
                scores: normalizedNew,
                totalScore: newTotal,
                scorerNotes: `[Committee override] ${trimmedReason}${existing.scorerNotes ? `\n\n${existing.scorerNotes}` : ""}`,
                updatedAt: new Date(),
            })
            .where(eq(a2fScoring.id, existing.id));

        revalidatePath("/a2f/committee");
        revalidatePath(`/a2f/committee/${a2fId}`);
        revalidatePath(`/a2f/${a2fId}/scoring`);

        return successResponse({ newTotal }, "Score override recorded");
    } catch (error) {
        console.error("Error recording score override:", error);
        return errorResponse("Failed to record score override");
    }
}
