"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    investmentAppraisals,
    a2fPipeline,
    a2fDueDiligenceReports,
    a2fMatchingGrantApplications,
    a2fScoring,
    applications,
} from "../../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { advancePipelineStatus } from "./a2f-pipeline";
import { ActionResponse, successResponse, errorResponse } from "./types";
import {
    MATCHING_GRANT_MAX_TOTAL,
    MATCHING_GRANT_QUALIFYING_SCORE,
    getMatchingGrantQualification,
    normalizeMatchingGrantScores,
    type MatchingGrantScores,
} from "@/lib/a2f-constants";

export type A2fDocumentType = "gair" | "investment_memo";
export type IcDecision = "approved" | "approved_with_conditions" | "deferred" | "declined";

export interface AppraisalContent {
    businessBackground: string;
    marketContext: string;
    briefComments: string;
    assessmentOfTeam: string;
    keyRisksAndIssues: string;
    mitigations: string;
    sourceOfFunds: string;
    usesOfFunds: string;
    strengths: string;
    weaknesses: string;
    opportunities: string;
    threats: string;
    recommendedAmount: string;
    recommendedInstrument: string;
    icRecommendation: string;
    conditions: string;
    businessOverview?: string;
    caseForFinancing?: string;
    amountRequestedAndBudget?: string;
    useOfFunds?: string;
    otherFundingLeverage?: string;
    financialOverviewAndProjections?: string;
    projectTeam?: string;
    socioEconomicImpact?: string;
    innovationAspects?: string;
    mitigationConsiderations?: string;
    conclusionAndRecommendation?: string;
    scoringSummary?: string;
    dataSources?: string;
}

export interface CreateAppraisalInput {
    documentType: A2fDocumentType;
    content: Partial<AppraisalContent>;
}

export interface RecordIcDecisionInput {
    decision: IcDecision;
    approvedGrantAmount?: number;
    decisionNotes?: string;
    decisionConditions?: string;
}

import { A2F_STAFF_ROLES, assertA2fStaffRead } from "@/lib/a2f-access";

const A2F_ROLES = A2F_STAFF_ROLES;

export async function getAppraisals(a2fId: number) {
    try {
        if (!Number.isInteger(a2fId) || a2fId <= 0) {
            return { success: false, message: "Invalid pipeline ID" };
        }

        const session = await auth();
        const staffRead = assertA2fStaffRead(session?.user?.role);
        if (!session?.user || !staffRead.ok) {
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

export async function getAutoPopulatedAppraisalContent(
    a2fId: number,
    documentType: A2fDocumentType
): Promise<ActionResponse<Partial<AppraisalContent>>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

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
        if (!application?.business) return errorResponse("Application not found");

        const [ddReport, matchingGrantApplication, latestScore] = await Promise.all([
            db.query.a2fDueDiligenceReports.findFirst({
                where: and(
                    eq(a2fDueDiligenceReports.a2fId, a2fId),
                    eq(a2fDueDiligenceReports.stage, "initial"),
                    eq(a2fDueDiligenceReports.isComplete, true)
                ),
            }),
            db.query.a2fMatchingGrantApplications.findFirst({
                where: eq(a2fMatchingGrantApplications.a2fId, a2fId),
            }),
            db.query.a2fScoring.findFirst({
                where: eq(a2fScoring.a2fId, a2fId),
                orderBy: [desc(a2fScoring.createdAt)],
            }),
        ]);

        const biz = application.business;
        const ddOverview = asRecord(ddReport?.companyOverview);
        const ddFinancial = asRecord(ddReport?.financialDd);
        const ddImpact = asRecord(ddReport?.impactEsg);
        const mg = matchingGrantApplication;
        const enterpriseIdentification = asRecord(mg?.enterpriseIdentification);
        const leadEntrepreneur = asRecord(mg?.leadEntrepreneur);
        const programmeEngagement = asRecord(mg?.programmeEngagement);
        const businessOverview = asRecord(mg?.businessOverview);
        const financialOverview = asRecord(mg?.financialOverview);
        const otherFunding = asRecord(mg?.otherFunding);
        const financialProjections = asRecord(mg?.financialProjections);
        const impact = asRecord(mg?.impact);
        const governanceCompliance = asRecord(mg?.governanceCompliance);
        const declaration = asRecord(mg?.declaration);
        const budgetItems = asRecordArray(mg?.budgetItems);
        const implementationMilestones = asRecordArray(mg?.implementationMilestones);
        const jobCreationPlan = asRecordArray(mg?.jobCreationPlan);
        const supportingDocuments = asRecordArray(mg?.supportingDocuments);
        const scoreSummary = buildMatchingGrantScoreSummary(latestScore);
        const requestedAmount = mg?.bireGrantAmount ?? pipeline.requestedAmount;
        const totalProjectAmount = mg?.totalProjectAmount ?? pipeline.requestedAmount;
        const enterpriseContribution = mg?.enterpriseContributionAmount ?? "0";
        const applicantName = `${biz.applicant?.firstName ?? ""} ${biz.applicant?.lastName ?? ""}`.trim();

        const populatedBusinessOverview = multiline(
            line("Enterprise", enterpriseIdentification.name ?? biz.name),
            line("Lead entrepreneur", leadEntrepreneur.name ?? applicantName),
            line("Track", mg?.track ?? application.track),
            line("Sector", enterpriseIdentification.sector ?? biz.sector),
            line("Location", enterpriseIdentification.location ?? biz.county ?? biz.city),
            line("Ownership", enterpriseIdentification.ownershipStructure),
            line("Current employees", businessOverview.currentEmployees ?? biz.fullTimeEmployeesTotal),
            line("Business description", businessOverview.description ?? biz.description),
            line("Products/services", businessOverview.productsServices),
            line("Target customers", businessOverview.targetCustomers),
            line("Programme support received", programmeEngagement.supportReceived),
            list("Indicators to be tracked", implementationMilestones.map((item) => item.indicator ?? item.output))
        );

        const populatedCaseForFinancing = multiline(
            line("Project title", mg?.projectTitle),
            line("Funding need", mg?.fundingNeed),
            line("Consequence if grant is not awarded", mg?.withoutGrantImpact),
            line("Business case", businessOverview.growthOpportunity ?? businessOverview.businessCase),
            line("CAPEX-only confirmation", mg?.capexOnlyConfirmed ? "Confirmed" : "Not yet confirmed"),
            line("Co-investment source", mg?.coInvestmentSource),
            line("Co-investment justification", mg?.coInvestmentJustification)
        );

        const useOfFunds = buildBudgetSummary(budgetItems, totalProjectAmount, requestedAmount, enterpriseContribution);
        const scoringConclusion = scoreSummary?.qualificationStatus === "Qualified"
            ? "The case is ready for Investment Committee review, subject to final appraisal checks and IC decision."
            : "The case requires qualification review before Investment Committee progression.";

        const content: Partial<AppraisalContent> = {
            businessBackground: populatedBusinessOverview
                || text(ddOverview.companyHistory)
                || `${biz.name} is a ${biz.sector ?? "business"} enterprise operating in ${biz.county ?? biz.city}, established for ${biz.yearsOperational} year(s). ${biz.description ?? ""}`.trim(),
            marketContext: multiline(
                line("Market demand", businessOverview.marketDemand),
                line("Scalability", businessOverview.scalability),
                line("Differentiation", businessOverview.differentiation),
                line("DD business model", ddOverview.businessModel),
                biz.problemSolved
            ),
            sourceOfFunds: multiline(
                line("BIRE grant requested", money(requestedAmount)),
                line("Enterprise contribution", money(enterpriseContribution)),
                line("Co-investment source", mg?.coInvestmentSource),
                line("Other funding/leverage", otherFunding.description ?? otherFunding.sources),
                line("DD source notes", ddFinancial.grantUtilizationPlan)
            ),
            usesOfFunds: useOfFunds,
            strengths: multiline(businessOverview.strengths, scoreSummary?.highlights, ddOverview.missionVision),
            opportunities: multiline(impact.valueChainEffects, impact.communityEffects, ddImpact.socioEconomicImpacts),
            recommendedAmount: String(requestedAmount ?? ""),
            recommendedInstrument: "Matching Grant",
            briefComments: populatedCaseForFinancing,
            assessmentOfTeam: multiline(
                line("Founder education", leadEntrepreneur.education),
                line("Founder experience", leadEntrepreneur.experience),
                line("Project team", governanceCompliance.projectTeam)
            ),
            keyRisksAndIssues: multiline(governanceCompliance.risks, businessOverview.weaknesses, ddReport?.exitStrategy),
            mitigations: multiline(governanceCompliance.mitigationPlan, governanceCompliance.controls),
            weaknesses: multiline(businessOverview.weaknesses, governanceCompliance.complianceGaps),
            threats: multiline(businessOverview.threats, governanceCompliance.externalRisks),
            icRecommendation: documentType === "gair"
                ? scoreSummary?.qualificationStatus === "Qualified"
                    ? "Subject to IC approval, recommend proceeding to contracting with the Matching Grant case."
                    : "Review qualification evidence before IC decision."
                : "",
            conditions: "",
            businessOverview: populatedBusinessOverview,
            caseForFinancing: populatedCaseForFinancing,
            amountRequestedAndBudget: multiline(
                line("Total project budget", money(totalProjectAmount)),
                line("Amount requested from BIRE", money(requestedAmount)),
                line("Enterprise contribution", money(enterpriseContribution))
            ),
            useOfFunds,
            otherFundingLeverage: multiline(
                line("Other funding", otherFunding.description ?? otherFunding.sources),
                line("Leverage notes", otherFunding.leverageNotes ?? mg?.coInvestmentJustification)
            ),
            financialOverviewAndProjections: multiline(
                line("Current annual revenue", financialOverview.currentAnnualRevenue ?? biz.revenueLastYear),
                line("Revenue growth trend", financialOverview.revenueGrowthTrend),
                line("Gross margin", financialOverview.grossMargin),
                line("Projected revenue growth", financialProjections.projectedRevenueGrowth),
                line("Projection assumptions", financialProjections.assumptions)
            ),
            projectTeam: multiline(
                line("Lead entrepreneur", leadEntrepreneur.name ?? applicantName),
                line("Education", leadEntrepreneur.education),
                line("Experience", leadEntrepreneur.experience),
                line("Team", governanceCompliance.projectTeam)
            ),
            socioEconomicImpact: multiline(
                list("Job creation plan", jobCreationPlan.map(formatRecord)),
                line("Inclusion", impact.inclusion),
                line("Environmental/climate impact", impact.environmentalClimate),
                line("Community/value chain impact", impact.valueChainEffects ?? impact.communityEffects)
            ),
            innovationAspects: multiline(
                line("Technology or process innovation", businessOverview.innovation),
                line("Operational efficiency improvement", businessOverview.operationalEfficiency),
                line("Market reach improvement", businessOverview.marketReach)
            ),
            mitigationConsiderations: multiline(governanceCompliance.mitigationPlan, governanceCompliance.controls),
            conclusionAndRecommendation: documentType === "gair"
                ? multiline(scoreSummary?.summary, scoringConclusion)
                : "",
            scoringSummary: scoreSummary?.summary,
            dataSources: multiline(
                mg ? "Matching Grant application data captured in the system." : "No Matching Grant application record found; populated from legacy application/DD fields where available.",
                latestScore ? "Latest A2F scoring record included." : "No scoring record found.",
                ddReport ? "Initial due diligence report included." : "No complete initial due diligence report found.",
                supportingDocuments.length ? list("Supporting documents", supportingDocuments.map(formatRecord)) : "",
                line("Applicant declaration", declaration.confirmedBy ?? declaration.applicantName)
            ),
        };

        return successResponse(content, "Content auto-populated from Matching Grant application, scoring, DD, and application data");
    } catch (error) {
        console.error("Error auto-populating appraisal:", error);
        return errorResponse("Failed to auto-populate appraisal content");
    }
}

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

        revalidatePath(`/a2f/${a2fId}`);
        revalidatePath(`/a2f/${a2fId}/appraisal`);

        return successResponse({ id: recordId }, `${input.documentType.toUpperCase()} saved successfully`);
    } catch (error) {
        console.error("Error saving appraisal:", error);
        return errorResponse("Failed to save appraisal");
    }
}

export async function recordIcApproval(
    appraisalId: number,
    requiredApprovals: number = 1
): Promise<ActionResponse<{ approvedBy: string[]; fullyApproved: boolean }>> {
    try {
        const session = await auth();
        const staffRead = assertA2fStaffRead(session?.user?.role);
        if (!session?.user || !staffRead.ok) {
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

        if (fullyApproved && appraisal.documentType === "gair") {
            const pipeline = await db.query.a2fPipeline.findFirst({
                where: eq(a2fPipeline.id, appraisal.a2fId),
            });

            if (pipeline?.status === "ic_appraisal_review") {
                await advancePipelineStatus(appraisal.a2fId, "offer_issued");
            }
        }

        revalidatePath(`/a2f/${appraisal.a2fId}`);
        revalidatePath(`/a2f/${appraisal.a2fId}/appraisal`);

        return successResponse(
            { approvedBy: updatedApprovals, fullyApproved },
            fullyApproved ? "IC approval complete. Pipeline advanced." : "Approval recorded."
        );
    } catch (error) {
        console.error("Error recording IC approval:", error);
        return errorResponse("Failed to record IC approval");
    }
}

export async function recordIcDecision(
    appraisalId: number,
    input: RecordIcDecisionInput
): Promise<ActionResponse<{ decision: IcDecision; advanced: boolean }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }
        if (session.user.role === "a2f_officer") {
            return errorResponse(
                "A2F Officers cannot record committee decisions. Use the committee dashboard or ask an admin."
            );
        }

        const appraisal = await db.query.investmentAppraisals.findFirst({
            where: eq(investmentAppraisals.id, appraisalId),
        });

        if (!appraisal) return errorResponse("Appraisal not found");
        if (!["approved", "approved_with_conditions", "deferred", "declined"].includes(input.decision)) {
            return errorResponse("Invalid IC decision");
        }

        const isApproval = input.decision === "approved" || input.decision === "approved_with_conditions";
        const approvedAmount = input.approvedGrantAmount ?? Number((appraisal.content as Partial<AppraisalContent>)?.recommendedAmount ?? 0);

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
        if (isApproval && appraisal.documentType === "gair") {
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

        return successResponse(
            { decision: input.decision, advanced },
            isApproval
                ? "IC decision recorded. Approved case is ready for contracting."
                : "IC decision recorded. Case will not advance to contracting."
        );
    } catch (error) {
        console.error("Error recording IC decision:", error);
        return errorResponse("Failed to record IC decision");
    }
}

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

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function asRecordArray(value: unknown): Array<Record<string, unknown>> {
    return Array.isArray(value)
        ? value.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object" && !Array.isArray(item))
        : [];
}

function text(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function line(label: string, value: unknown): string {
    const clean = text(value);
    return clean ? `${label}: ${clean}` : "";
}

function multiline(...parts: Array<unknown>): string {
    return parts.map(text).filter(Boolean).join("\n");
}

function list(label: string, items: unknown[]): string {
    const rows = items.map(text).filter(Boolean);
    return rows.length ? `${label}:\n${rows.map((item) => `- ${item}`).join("\n")}` : "";
}

function money(value: unknown): string {
    const amount = Number(value ?? 0);
    return `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRecord(record: Record<string, unknown>): string {
    return Object.entries(record)
        .filter(([, value]) => text(value))
        .map(([key, value]) => `${humanize(key)}: ${text(value)}`)
        .join("; ");
}

function humanize(key: string): string {
    return key
        .replace(/([A-Z])/g, " $1")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
}

function buildBudgetSummary(
    budgetItems: Array<Record<string, unknown>>,
    totalProjectAmount: unknown,
    requestedAmount: unknown,
    enterpriseContribution: unknown
): string {
    const rows = budgetItems.map((item) => {
        const description = text(item.item ?? item.description ?? item.name);
        const amount = text(item.amount) ? money(item.amount) : "";
        const category = text(item.category);
        const supplier = text(item.supplier);
        return [description, amount, category, supplier].filter(Boolean).join(" | ");
    }).filter(Boolean);

    return multiline(
        line("Total project budget", money(totalProjectAmount)),
        line("BIRE grant requested", money(requestedAmount)),
        line("Enterprise contribution", money(enterpriseContribution)),
        list("Budget items", rows)
    );
}

function buildMatchingGrantScoreSummary(latestScore: { instrumentType: string; scores: unknown } | undefined | null) {
    if (!latestScore || latestScore.instrumentType !== "matching_grant") return null;

    const scores = normalizeMatchingGrantScores(latestScore.scores as Partial<MatchingGrantScores>);
    const totalScore = Object.values(scores).reduce((sum, value) => sum + Number(value ?? 0), 0);
    const qualificationStatus = getMatchingGrantQualification(totalScore, scores.currentAnnualRevenue);
    const categories = [
        ["Financial Readiness & Co-Investment", scores.currentAnnualRevenue + scores.revenueGrowthTrend + scores.coInvestmentCommitment, 20],
        ["Market & Scalability Potential", scores.marketDemandEvidence + scores.businessModelScalability + scores.competitiveDifferentiation, 25],
        ["Impact & Inclusion Potential", scores.projectedDecentJobs + scores.inclusionTargeting + scores.environmentalClimateImpact, 30],
        ["Investment Plan & Leverage Potential", scores.useOfFundsQuality + scores.leveragePotential, 15],
        ["Innovation", scores.innovation, 10],
    ] as const;

    const highlights = categories
        .filter(([, earned, max]) => earned / max >= 0.75)
        .map(([category, earned, max]) => `${category} (${earned}/${max})`)
        .join("; ");

    return {
        qualificationStatus,
        highlights: highlights ? `Scoring strengths: ${highlights}.` : "",
        summary: multiline(
            `Matching Grant score: ${totalScore}/${MATCHING_GRANT_MAX_TOTAL}.`,
            `Qualification threshold: >= ${MATCHING_GRANT_QUALIFYING_SCORE} and revenue score greater than 0.`,
            `Revenue score: ${scores.currentAnnualRevenue}/10.`,
            `Qualification status: ${qualificationStatus}.`,
            list("Category breakdown", categories.map(([category, earned, max]) => `${category}: ${earned}/${max}`))
        ),
    };
}
