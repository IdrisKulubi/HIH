"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    investmentAppraisals,
    a2fPipeline,
    a2fDueDiligenceReports,
    applications,
    businesses,
    applicants,
} from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { advancePipelineStatus } from "./a2f-pipeline";
import { ActionResponse, successResponse, errorResponse } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type A2fDocumentType = 'gair' | 'investment_memo';

/**
 * JSONB content structure for GAIR / Investment Memo.
 * Auto-populated from DD reports; edited in rich-text workspace.
 */
export interface AppraisalContent {
    // Auto-populated from DD
    businessBackground: string;
    marketContext: string;
    // Key narrative sections
    briefComments: string;
    assessmentOfTeam: string;
    keyRisksAndIssues: string;
    mitigations: string;
    // Financial analysis
    sourceOfFunds: string;
    usesOfFunds: string;
    // SWOT
    strengths: string;
    weaknesses: string;
    opportunities: string;
    threats: string;
    // IC recommendation
    recommendedAmount: string;
    recommendedInstrument: string;
    icRecommendation: string;
    conditions: string;
}

export interface CreateAppraisalInput {
    documentType: A2fDocumentType;
    content: Partial<AppraisalContent>;
}

const A2F_ROLES = ['admin', 'a2f_officer'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// GET: All appraisals for a pipeline entry
// ─────────────────────────────────────────────────────────────────────────────

export async function getAppraisals(a2fId: number) {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'a2f_officer', 'oversight'].includes(session.user.role || '')) {
            return { success: false, message: "Unauthorized" };
        }

        const appraisals = await db.query.investmentAppraisals.findMany({
            where: eq(investmentAppraisals.a2fId, a2fId),
            with: { preparedBy: { with: { userProfile: true } } },
        });

        return { success: true, data: appraisals };
    } catch (error) {
        console.error("Error fetching appraisals:", error);
        return { success: false, message: "Failed to load appraisals" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET: Auto-populate appraisal from DD + application data
// Returns pre-filled content object ready for the rich-text workspace.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAutoPopulatedAppraisalContent(
    a2fId: number,
    documentType: A2fDocumentType
): Promise<ActionResponse<Partial<AppraisalContent>>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        // Fetch pipeline + application tree
        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
        });
        if (!pipeline) return errorResponse("Pipeline entry not found");

        const application = await db.query.applications.findFirst({
            where: eq(applications.id, pipeline.applicationId),
            with: {
                business: { with: { applicant: true } },
            },
        });
        if (!application) return errorResponse("Application not found");

        // Fetch latest Initial DD report for auto-population
        const ddReport = await db.query.a2fDueDiligenceReports.findFirst({
            where: and(
                eq(a2fDueDiligenceReports.a2fId, a2fId),
                eq(a2fDueDiligenceReports.stage, 'initial'),
                eq(a2fDueDiligenceReports.isComplete, true)
            ),
        });

        const biz = application.business;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ddOverview = ddReport?.companyOverview as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ddFinancial = ddReport?.financialDd as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ddImpact = ddReport?.impactEsg as any;

        const content: Partial<AppraisalContent> = {
            businessBackground: ddOverview?.companyHistory
                ?? `${biz.name} is a ${biz.sector ?? 'business'} enterprise operating in ${biz.county ?? biz.city}, established for ${biz.yearsOperational} year(s). ${biz.description}`,
            marketContext: ddOverview?.businessModel ?? biz.problemSolved ?? '',
            sourceOfFunds: ddFinancial?.grantUtilizationPlan ?? '',
            usesOfFunds: `Total project: KES ${pipeline.requestedAmount}. Requested from HiH: KES ${pipeline.requestedAmount}.`,
            strengths: ddOverview?.missionVision ?? '',
            opportunities: ddImpact?.socioEconomicImpacts ?? '',
            recommendedAmount: pipeline.requestedAmount,
            recommendedInstrument: pipeline.instrumentType === 'repayable_grant' ? 'Repayable Grant' : 'Matching Grant',
            // Narrative fields — left blank for officer to fill
            briefComments: '',
            assessmentOfTeam: '',
            keyRisksAndIssues: ddReport?.exitStrategy ?? '',
            mitigations: '',
            weaknesses: '',
            threats: '',
            icRecommendation: documentType === 'gair'
                ? 'Subject to IC approval, recommend proceeding to contracting.'
                : '',
            conditions: '',
        };

        return successResponse(content, "Content auto-populated from DD reports and application data");
    } catch (error) {
        console.error("Error auto-populating appraisal:", error);
        return errorResponse("Failed to auto-populate appraisal content");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE / UPDATE: Appraisal document
// ─────────────────────────────────────────────────────────────────────────────

export async function createOrUpdateAppraisal(
    a2fId: number,
    input: CreateAppraisalInput
): Promise<ActionResponse<{ id: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        if (!input.documentType) {
            return errorResponse("Document type is required");
        }

        const existing = await db.query.investmentAppraisals.findFirst({
            where: and(
                eq(investmentAppraisals.a2fId, a2fId),
                eq(investmentAppraisals.documentType, input.documentType)
            ),
        });

        let recordId: number;

        if (existing) {
            await db
                .update(investmentAppraisals)
                .set({
                    content: input.content,
                    preparedById: session.user.id,
                    updatedAt: new Date(),
                })
                .where(eq(investmentAppraisals.id, existing.id));
            recordId = existing.id;
        } else {
            const [inserted] = await db
                .insert(investmentAppraisals)
                .values({
                    a2fId,
                    documentType: input.documentType,
                    content: input.content,
                    preparedById: session.user.id,
                    icApprovalStatus: false,
                    approvedBy: [],
                })
                .returning({ id: investmentAppraisals.id });
            recordId = inserted.id;
        }

        revalidatePath(`/admin/a2f/${a2fId}`);

        return successResponse({ id: recordId }, `${input.documentType.toUpperCase()} saved successfully`);
    } catch (error) {
        console.error("Error saving appraisal:", error);
        return errorResponse("Failed to save appraisal");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORD: IC member approval
// Tracks which IC members have approved the appraisal.
// Once all required members approve, advances pipeline to Offer Issued.
// ─────────────────────────────────────────────────────────────────────────────

export async function recordIcApproval(
    appraisalId: number,
    requiredApprovals: number = 1
): Promise<ActionResponse<{ approvedBy: string[]; fullyApproved: boolean }>> {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'a2f_officer', 'oversight'].includes(session.user.role || '')) {
            return errorResponse("Unauthorized");
        }

        const appraisal = await db.query.investmentAppraisals.findFirst({
            where: eq(investmentAppraisals.id, appraisalId),
        });

        if (!appraisal) return errorResponse("Appraisal not found");

        const currentApprovals = (appraisal.approvedBy ?? []) as string[];

        if (currentApprovals.includes(session.user.id)) {
            return errorResponse("You have already recorded your approval for this document");
        }

        const updatedApprovals = [...currentApprovals, session.user.id];
        const fullyApproved = updatedApprovals.length >= requiredApprovals;

        await db
            .update(investmentAppraisals)
            .set({
                approvedBy: updatedApprovals,
                icApprovalStatus: fullyApproved,
                updatedAt: new Date(),
            })
            .where(eq(investmentAppraisals.id, appraisalId));

        // If fully approved and it's a GAIR, advance pipeline to Offer Issued
        if (fullyApproved && appraisal.documentType === 'gair') {
            const pipeline = await db.query.a2fPipeline.findFirst({
                where: eq(a2fPipeline.id, appraisal.a2fId),
            });

            if (pipeline?.status === 'ic_appraisal_review') {
                await advancePipelineStatus(appraisal.a2fId, 'offer_issued');
            }
        }

        revalidatePath(`/admin/a2f/${appraisal.a2fId}`);

        return successResponse(
            { approvedBy: updatedApprovals, fullyApproved },
            fullyApproved ? "IC approval complete. Pipeline advanced." : "Approval recorded."
        );
    } catch (error) {
        console.error("Error recording IC approval:", error);
        return errorResponse("Failed to record IC approval");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE: Generated document URL (after PDF export)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAppraisalDocumentUrl(
    appraisalId: number,
    documentUrl: string
): Promise<ActionResponse<void>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        await db
            .update(investmentAppraisals)
            .set({ generatedDocumentUrl: documentUrl, updatedAt: new Date() })
            .where(eq(investmentAppraisals.id, appraisalId));

        return successResponse(undefined, "Document URL saved");
    } catch (error) {
        console.error("Error saving document URL:", error);
        return errorResponse("Failed to save document URL");
    }
}
