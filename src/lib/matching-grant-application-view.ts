/**
 * Hydrates the Matching Grant application into the same shape the wizard shows.
 * Client-safe — no server imports.
 */

import {
    type EnterpriseIdentification,
    type LeadEntrepreneur,
    type MatchingGrantBudgetItem,
    type MatchingGrantBusinessOverview,
    type MatchingGrantFinancialOverview,
    type MatchingGrantGovernanceCompliance,
    type MatchingGrantJobRow,
    type MatchingGrantMilestoneRow,
    type MatchingGrantOtherFunding,
    type OtherOwner,
    type ProgrammeEngagement,
    EMPTY_BUSINESS_OVERVIEW,
    EMPTY_ENTERPRISE_IDENTIFICATION,
    EMPTY_FINANCIAL_OVERVIEW,
    EMPTY_GOVERNANCE_COMPLIANCE,
    EMPTY_LEAD_ENTREPRENEUR,
    EMPTY_OTHER_FUNDING,
    EMPTY_PROGRAMME_ENGAGEMENT,
    emptyBudgetRows,
    emptyJobs,
    emptyMilestones,
    emptyOwners,
    parseBudgetItems,
    parseBusinessOverview,
    parseEnterpriseIdentification,
    parseFinancialOverview,
    parseGovernanceCompliance,
    parseJobCreationPlan,
    parseLeadEntrepreneur,
    parseMilestones,
    parseOtherFunding,
    parseOtherOwners,
    parseProgrammeEngagement,
    seedFromPipeline,
} from "@/lib/matching-grant-form-types";
import {
    type MgSupportingDocumentRow,
    defaultMgSupportingDocuments,
    parseMgSupportingDocuments,
    resolveMgDocumentSources,
    type MgBusinessDocFields,
    type MgCdpEvidenceRef,
    type MgKycDocumentRef,
} from "@/lib/mg-supporting-documents";

export interface MatchingGrantApplicationView {
    status: "draft" | "submitted" | "returned_for_correction";
    enterprise: EnterpriseIdentification;
    lead: LeadEntrepreneur;
    otherOwners: OtherOwner[];
    programme: ProgrammeEngagement;
    business: MatchingGrantBusinessOverview;
    totalProjectAmount: number;
    bireGrantAmount: number;
    enterpriseContributionAmount: number;
    preferredCoInvestmentPct: number;
    coInvestmentSource: string;
    coInvestmentJustification: string;
    projectTitle: string;
    fundingNeed: string;
    withoutGrantImpact: string;
    capexOnlyConfirmed: boolean;
    financial: MatchingGrantFinancialOverview;
    projectedMonthlyRevenue: string;
    projectedAnnualRevenue: string;
    projectedGrowthRate: string;
    projectionAssumptions: string;
    employmentTerms: string;
    inclusionStrategy: string;
    environmentalImpact: string;
    environmentalIndicators: string;
    communityImpact: string;
    innovationElement: string;
    otherFunding: MatchingGrantOtherFunding;
    governance: MatchingGrantGovernanceCompliance;
    useOfFundsAcknowledged: boolean;
    declarationName: string;
    declarationAccepted: boolean;
    budgetItems: MatchingGrantBudgetItem[];
    milestones: MatchingGrantMilestoneRow[];
    jobs: MatchingGrantJobRow[];
    documents: MgSupportingDocumentRow[];
}

export const EMPTY_MATCHING_GRANT_APPLICATION: MatchingGrantApplicationView = {
    status: "draft",
    totalProjectAmount: 0,
    bireGrantAmount: 0,
    enterpriseContributionAmount: 0,
    preferredCoInvestmentPct: 0,
    coInvestmentSource: "",
    coInvestmentJustification: "",
    projectTitle: "",
    fundingNeed: "",
    withoutGrantImpact: "",
    capexOnlyConfirmed: false,
    enterprise: { ...EMPTY_ENTERPRISE_IDENTIFICATION },
    lead: { ...EMPTY_LEAD_ENTREPRENEUR },
    otherOwners: emptyOwners(),
    programme: { ...EMPTY_PROGRAMME_ENGAGEMENT },
    business: { ...EMPTY_BUSINESS_OVERVIEW },
    financial: { ...EMPTY_FINANCIAL_OVERVIEW },
    projectedMonthlyRevenue: "",
    projectedAnnualRevenue: "",
    projectedGrowthRate: "",
    projectionAssumptions: "",
    employmentTerms: "",
    inclusionStrategy: "",
    environmentalImpact: "",
    environmentalIndicators: "",
    communityImpact: "",
    innovationElement: "",
    otherFunding: { ...EMPTY_OTHER_FUNDING },
    governance: { ...EMPTY_GOVERNANCE_COMPLIANCE },
    useOfFundsAcknowledged: false,
    declarationName: "",
    declarationAccepted: false,
    budgetItems: emptyBudgetRows(),
    milestones: emptyMilestones(),
    jobs: emptyJobs(),
    documents: defaultMgSupportingDocuments(),
};

export interface MatchingGrantDocumentSourcePayload {
    business: MgBusinessDocFields;
    kycDocuments: MgKycDocumentRef[];
    cdpEvidence: MgCdpEvidenceRef[];
    savedSupportingDocuments: unknown;
}

export function resolveMatchingGrantDocumentRows(
    sources: MatchingGrantDocumentSourcePayload
): MgSupportingDocumentRow[] {
    return resolveMgDocumentSources({
        business: sources.business,
        kycDocuments: sources.kycDocuments,
        cdpEvidence: sources.cdpEvidence,
        savedRows: parseMgSupportingDocuments(sources.savedSupportingDocuments),
    });
}

function parseStatus(value: unknown): MatchingGrantApplicationView["status"] {
    if (value === "submitted" || value === "returned_for_correction" || value === "draft") {
        return value;
    }
    return "draft";
}

function text(value: unknown): string {
    return value == null ? "" : String(value);
}

/**
 * Builds the wizard view from the pipeline entry, the saved application, and
 * any documents already resolved from programme records.
 */
export function hydrateMatchingGrantApplication(
    entry: unknown,
    record: unknown,
    resolvedDocuments?: MgSupportingDocumentRow[] | null
): MatchingGrantApplicationView {
    const business = (entry as {
        application?: {
            business?: {
                environmentalImpactDescription?: string | null;
                technologyIntegrationDescription?: string | null;
                businessModelInnovation?: string | null;
            };
        };
    } | null)?.application?.business;

    const seed = seedFromPipeline(entry);
    const seeded: MatchingGrantApplicationView = {
        ...EMPTY_MATCHING_GRANT_APPLICATION,
        enterprise: seed.enterprise,
        lead: seed.lead,
        otherOwners: seed.owners,
        programme: seed.programme,
        business: seed.business,
        financial: seed.financial,
        otherFunding: seed.otherFunding,
        governance: seed.governance,
        declarationName: seed.declarationName,
        useOfFundsAcknowledged: seed.useOfFundsAcknowledged,
        environmentalImpact: business?.environmentalImpactDescription ?? "",
        innovationElement:
            business?.technologyIntegrationDescription ?? business?.businessModelInnovation ?? "",
        documents: resolvedDocuments ?? EMPTY_MATCHING_GRANT_APPLICATION.documents,
    };

    if (!record || typeof record !== "object") return seeded;

    const row = record as Record<string, unknown>;
    const enterpriseRaw = (row.enterpriseIdentification ?? {}) as Record<string, unknown>;
    const projections = (row.financialProjections ?? {}) as Record<string, unknown>;
    const impact = (row.impact ?? {}) as Record<string, unknown>;
    const declaration = (row.declaration ?? {}) as Record<string, unknown>;

    return {
        ...seeded,
        enterprise: parseEnterpriseIdentification(enterpriseRaw),
        lead: parseLeadEntrepreneur(row.leadEntrepreneur as Record<string, unknown>),
        otherOwners: parseOtherOwners(enterpriseRaw.otherOwners),
        programme: parseProgrammeEngagement(row.programmeEngagement as Record<string, unknown>),
        business: parseBusinessOverview(row.businessOverview as Record<string, unknown>),
        financial: parseFinancialOverview(row.financialOverview as Record<string, unknown>),
        otherFunding: parseOtherFunding(row.otherFunding as Record<string, unknown>),
        governance: parseGovernanceCompliance(row.governanceCompliance as Record<string, unknown>),
        useOfFundsAcknowledged: Boolean(declaration.useOfFundsAcknowledged ?? seeded.useOfFundsAcknowledged),
        status: parseStatus(row.status),
        totalProjectAmount: Number(row.totalProjectAmount ?? 0),
        bireGrantAmount: Number(row.bireGrantAmount ?? 0),
        enterpriseContributionAmount: Number(row.enterpriseContributionAmount ?? 0),
        preferredCoInvestmentPct: Number(row.preferredCoInvestmentPct ?? 0),
        coInvestmentSource: text(row.coInvestmentSource),
        coInvestmentJustification: text(row.coInvestmentJustification),
        projectTitle: text(row.projectTitle),
        fundingNeed: text(row.fundingNeed),
        withoutGrantImpact: text(row.withoutGrantImpact),
        capexOnlyConfirmed: Boolean(row.capexOnlyConfirmed),
        projectedMonthlyRevenue: text(projections.projectedMonthlyRevenue),
        projectedAnnualRevenue: text(projections.projectedAnnualRevenue),
        projectedGrowthRate: text(projections.projectedGrowthRate),
        projectionAssumptions: text(projections.assumptions),
        employmentTerms: text(impact.employmentTerms),
        inclusionStrategy: text(impact.inclusionStrategy),
        environmentalImpact: text(impact.environmentalImpact),
        environmentalIndicators: text(impact.environmentalIndicators),
        communityImpact: text(impact.communityImpact),
        innovationElement: text(impact.innovationElement),
        declarationName:
            declaration.applicantName == null
                ? seeded.declarationName
                : text(declaration.applicantName),
        declarationAccepted: Boolean(declaration.accepted),
        budgetItems: parseBudgetItems(row.budgetItems),
        milestones: parseMilestones(row.implementationMilestones),
        jobs: parseJobCreationPlan(row.jobCreationPlan),
        documents: resolvedDocuments ?? parseMgSupportingDocuments(row.supportingDocuments),
    };
}
