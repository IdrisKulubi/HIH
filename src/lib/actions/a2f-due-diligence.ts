"use server";

import { auth } from "@/auth";
import db from "../../../db/drizzle";
import {
    a2fDueDiligenceReports,
    a2fPipeline,
} from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { advancePipelineStatus } from "./a2f-pipeline";
import { ActionResponse, successResponse, errorResponse } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type A2fDdStage = 'initial' | 'pre_ic' | 'post_ta';

/** Company Overview — history, business model, mission/vision */
export interface CompanyOverview {
    companyHistory: string;
    businessModel: string;
    missionVision: string;
    productsServices: string;
    geographicPresence: string;
}

/** Financial Due Diligence — revenue, debt, banking, projections */
export interface FinancialDd {
    annualRevenue: string;
    revenueGrowthRate: string;
    debtObligations: string;
    bankingRelationships: string;
    threeYearProjections: string;
    cashFlowPosition: string;
    grantUtilizationPlan: string;
}

/** HR, Legal & Risk Management */
export interface HrAndRisk {
    organizationStructure: string;
    keyPersonnel: string;
    insuranceCoverage: string;
    crisisManagementPlan: string;
    legalIssuesPending: string;
    hseCompliance: string;
}

/** Impact, ESG & Climate */
export interface ImpactEsg {
    climateAngle: string;
    socioEconomicImpacts: string;
    genderInclusion: string;
    youthInclusion: string;
    environmentalSafeguards: string;
}

/** Management Team assessment */
export interface ManagementTeam {
    ceoBackground: string;
    teamStrengths: string;
    skillGaps: string;
    governanceStructure: string;
}

/** Legal Compliance */
export interface LegalCompliance {
    registrationStatus: string;
    taxComplianceStatus: string;
    licensesCertifications: string;
    pendingLitigation: string;
}

/** Market Position */
export interface MarketPosition {
    targetMarket: string;
    marketShareEstimate: string;
    competitiveLandscape: string;
    uniqueSellingProposition: string;
}

/** Operational Capacity */
export interface OperationalCapacity {
    productionCapacity: string;
    supplyChain: string;
    qualityControl: string;
    infrastructureAssets: string;
}

/** Technology & Systems */
export interface TechnologySystems {
    technologyAdoption: string;
    digitalSystems: string;
    itInfrastructure: string;
}

/** Customer & Supplier Relations */
export interface CustomerSupplierRelations {
    keyCustomers: string;
    customerConcentrationRisk: string;
    keySuppliers: string;
    supplierDependency: string;
}

/** Full DD Report payload — all 11 categories */
export interface A2fDdReportInput {
    stage: A2fDdStage;
    companyOverview?: Partial<CompanyOverview>;
    financialDd?: Partial<FinancialDd>;
    hrAndRisk?: Partial<HrAndRisk>;
    impactEsg?: Partial<ImpactEsg>;
    exitStrategy?: string;
    managementTeam?: Partial<ManagementTeam>;
    legalCompliance?: Partial<LegalCompliance>;
    marketPosition?: Partial<MarketPosition>;
    operationalCapacity?: Partial<OperationalCapacity>;
    technologySystems?: Partial<TechnologySystems>;
    customerSupplierRelations?: Partial<CustomerSupplierRelations>;
    isComplete?: boolean;
}

const A2F_ROLES = ['admin', 'a2f_officer'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// GET: Fetch DD report for a pipeline entry + stage
// ─────────────────────────────────────────────────────────────────────────────

export async function getA2fDdReport(a2fId: number, stage: A2fDdStage) {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'a2f_officer', 'oversight'].includes(session.user.role || '')) {
            return { success: false, message: "Unauthorized" };
        }

        const report = await db.query.a2fDueDiligenceReports.findFirst({
            where: and(
                eq(a2fDueDiligenceReports.a2fId, a2fId),
                eq(a2fDueDiligenceReports.stage, stage)
            ),
        });

        return { success: true, data: report ?? null };
    } catch (error) {
        console.error("Error fetching A2F DD report:", error);
        return { success: false, message: "Failed to load DD report" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE DRAFT: Auto-save while filling the form (isComplete stays false)
// ─────────────────────────────────────────────────────────────────────────────

export async function saveA2fDdDraft(
    a2fId: number,
    data: A2fDdReportInput
): Promise<ActionResponse<{ id: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized");
        }

        return upsertDdReport(a2fId, session.user.id, { ...data, isComplete: false });
    } catch (error) {
        console.error("Error saving A2F DD draft:", error);
        return errorResponse("Failed to save draft");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT: action_submitDDReport
// Validates the 11-category payload, saves, then advances pipeline status.
// ─────────────────────────────────────────────────────────────────────────────

export async function action_submitDDReport(
    a2fId: number,
    data: A2fDdReportInput
): Promise<ActionResponse<{ id: number }>> {
    try {
        const session = await auth();
        if (!session?.user || !A2F_ROLES.includes(session.user.role as typeof A2F_ROLES[number])) {
            return errorResponse("Unauthorized. Admin or A2F Officer access required.");
        }

        // Validate pipeline entry exists
        const pipeline = await db.query.a2fPipeline.findFirst({
            where: eq(a2fPipeline.id, a2fId),
        });

        if (!pipeline) return errorResponse("A2F pipeline entry not found");

        // Validate minimum required fields per stage
        const validationError = validateDdPayload(data);
        if (validationError) return errorResponse(validationError);

        // Persist the report as complete
        const result = await upsertDdReport(a2fId, session.user.id, { ...data, isComplete: true });
        if (!result.success) return result;

        // Advance pipeline status based on the stage submitted
        if (data.stage === 'initial' && pipeline.status === 'a2f_pipeline') {
            await advancePipelineStatus(a2fId, 'due_diligence_initial');
        } else if (data.stage === 'pre_ic' && pipeline.status === 'due_diligence_initial') {
            await advancePipelineStatus(a2fId, 'pre_ic_scoring');
        } else if (data.stage === 'post_ta' && pipeline.status === 'disbursement_active') {
            await advancePipelineStatus(a2fId, 'post_ta_monitoring');
        }

        revalidatePath(`/admin/a2f/${a2fId}`);
        revalidatePath('/admin/a2f');

        return { ...result, message: "Due diligence report submitted successfully" };
    } catch (error) {
        console.error("Error submitting A2F DD report:", error);
        return errorResponse("Failed to submit due diligence report");
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL: All DD reports for a pipeline entry (all stages)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllA2fDdReports(a2fId: number) {
    try {
        const session = await auth();
        if (!session?.user || !['admin', 'a2f_officer', 'oversight'].includes(session.user.role || '')) {
            return { success: false, message: "Unauthorized" };
        }

        const reports = await db.query.a2fDueDiligenceReports.findMany({
            where: eq(a2fDueDiligenceReports.a2fId, a2fId),
            with: { submittedBy: { with: { userProfile: true } } },
        });

        return { success: true, data: reports };
    } catch (error) {
        console.error("Error fetching all DD reports:", error);
        return { success: false, message: "Failed to load DD reports" };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function upsertDdReport(
    a2fId: number,
    submittedById: string,
    data: A2fDdReportInput
): Promise<ActionResponse<{ id: number }>> {
    const existing = await db.query.a2fDueDiligenceReports.findFirst({
        where: and(
            eq(a2fDueDiligenceReports.a2fId, a2fId),
            eq(a2fDueDiligenceReports.stage, data.stage)
        ),
    });

    const payload = {
        a2fId,
        stage: data.stage,
        submittedById,
        companyOverview: data.companyOverview ?? null,
        financialDd: data.financialDd ?? null,
        hrAndRisk: data.hrAndRisk ?? null,
        impactEsg: data.impactEsg ?? null,
        exitStrategy: data.exitStrategy ?? null,
        managementTeam: data.managementTeam ?? null,
        legalCompliance: data.legalCompliance ?? null,
        marketPosition: data.marketPosition ?? null,
        operationalCapacity: data.operationalCapacity ?? null,
        technologySystems: data.technologySystems ?? null,
        customerSupplierRelations: data.customerSupplierRelations ?? null,
        isComplete: data.isComplete ?? false,
        updatedAt: new Date(),
    };

    if (existing) {
        await db
            .update(a2fDueDiligenceReports)
            .set(payload)
            .where(eq(a2fDueDiligenceReports.id, existing.id));

        return successResponse({ id: existing.id });
    }

    const [inserted] = await db
        .insert(a2fDueDiligenceReports)
        .values(payload)
        .returning({ id: a2fDueDiligenceReports.id });

    return successResponse({ id: inserted.id });
}

function validateDdPayload(data: A2fDdReportInput): string | null {
    if (!data.stage) return "DD stage is required";

    // For submission (isComplete: true) — require core sections
    if (data.isComplete) {
        if (!data.companyOverview?.businessModel) {
            return "Company Overview: Business model description is required";
        }
        if (!data.financialDd?.annualRevenue) {
            return "Financial DD: Annual revenue is required";
        }
        if (!data.impactEsg?.socioEconomicImpacts) {
            return "Impact & ESG: Socio-economic impact description is required";
        }
        if (!data.exitStrategy || data.exitStrategy.trim().length < 20) {
            return "Exit strategy must be at least 20 characters";
        }
    }

    return null;
}
