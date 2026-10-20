/**
 * Shared Matching Grant application completeness validation.
 * Client-safe — used by wizard navigation and server submit enforcement.
 */

import type { A2fEnterpriseTrack } from "@/lib/a2f-constants";
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
    resolveAnnualRevenueForEligibility,
    validateBudgetUseOfFunds,
} from "@/lib/matching-grant-form-types";
import {
    parseMgSupportingDocuments,
    validateMandatoryMgDocuments,
    type MgSupportingDocumentRow,
} from "@/lib/mg-supporting-documents";

export type MgWizardStepId =
    | "enterprise"
    | "financials"
    | "grant_request"
    | "business_impact"
    | "investment_plan"
    | "documents";

export const MG_NA_GUIDANCE =
    "All fields are required before submission. Enter None or Not applicable where a question does not apply to your enterprise.";

export interface MatchingGrantValidationInput {
    enterprise: EnterpriseIdentification;
    lead: LeadEntrepreneur;
    otherOwners: OtherOwner[];
    programme: ProgrammeEngagement;
    financial: MatchingGrantFinancialOverview;
    projectTitle: string;
    totalProjectAmount: number;
    bireGrantAmount: number;
    enterpriseContributionAmount: number;
    preferredCoInvestmentPct: number;
    coInvestmentSource: string;
    coInvestmentJustification: string;
    fundingNeed: string;
    withoutGrantImpact: string;
    capexOnlyConfirmed: boolean;
    otherFunding: MatchingGrantOtherFunding;
    governance: MatchingGrantGovernanceCompliance;
    business: MatchingGrantBusinessOverview;
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
    budgetItems: MatchingGrantBudgetItem[];
    milestones: MatchingGrantMilestoneRow[];
    jobs: MatchingGrantJobRow[];
    documents: MgSupportingDocumentRow[];
    declarationName: string;
    declarationAccepted: boolean;
    useOfFundsAcknowledged: boolean;
}

export interface MatchingGrantValidationContext {
    track: A2fEnterpriseTrack;
    pipelineRevenue: number;
}

function trim(value: string | null | undefined): string {
    return value?.trim() ?? "";
}

export function isRequiredText(value: string | null | undefined): boolean {
    const normalized = trim(value).toLowerCase();
    if (!normalized) return false;
    return true;
}

export function isRequiredNullableNumber(value: number | null | undefined): boolean {
    return value !== null && value !== undefined && Number.isFinite(value);
}

function requireText(label: string, value: string | null | undefined): string | null {
    return isRequiredText(value) ? null : `${label} is required.`;
}

function requireNullableNumber(
    label: string,
    value: number | null | undefined
): string | null {
    return isRequiredNullableNumber(value) ? null : `${label} is required.`;
}

function ownerRowStarted(row: OtherOwner): boolean {
    return (
        trim(row.name) !== ""
        || trim(row.role) !== ""
        || trim(row.gender) !== ""
        || trim(row.category) !== ""
        || row.ownershipPct > 0
    );
}

function validateOtherOwnerRow(row: OtherOwner, index: number): string[] {
    if (!ownerRowStarted(row)) return [];
    const label = `Other owner row ${index + 1}`;
    const errors: string[] = [];
    if (!isRequiredText(row.name)) errors.push(`${label}: name is required.`);
    if (!isRequiredText(row.role)) errors.push(`${label}: role is required.`);
    if (!isRequiredNullableNumber(row.ownershipPct)) {
        errors.push(`${label}: ownership % is required.`);
    }
    if (!isRequiredText(row.gender)) errors.push(`${label}: gender is required.`);
    if (!isRequiredText(row.category)) errors.push(`${label}: category is required.`);
    return errors;
}

function budgetRowStarted(row: MatchingGrantBudgetItem): boolean {
    return (
        trim(row.item) !== ""
        || trim(row.category) !== ""
        || row.confirmedEligible
        || row.totalCost > 0
        || row.bireGrant > 0
        || row.enterpriseContribution > 0
    );
}

function validateBudgetRow(row: MatchingGrantBudgetItem, index: number): string[] {
    if (!budgetRowStarted(row)) return [];
    const label = `Budget row ${index + 1}`;
    const errors: string[] = [];
    if (!isRequiredText(row.item)) errors.push(`${label}: item description is required.`);
    if (!trim(row.category)) errors.push(`${label}: select a CAPEX category.`);
    if (!row.confirmedEligible) {
        errors.push(`${label}: confirm the item is CAPEX-eligible.`);
    }
    if (row.totalCost <= 0) errors.push(`${label}: total cost must be greater than zero.`);
    if (row.bireGrant < 0 || row.enterpriseContribution < 0) {
        errors.push(`${label}: grant and enterprise amounts cannot be negative.`);
    }
    if (
        row.totalCost > 0
        && Math.abs(row.totalCost - (row.bireGrant + row.enterpriseContribution)) > 1
    ) {
        errors.push(`${label}: BIRE grant and enterprise contribution must add up to total cost.`);
    }
    return errors;
}

function milestoneRowStarted(row: MatchingGrantMilestoneRow): boolean {
    return (
        trim(row.activity) !== ""
        || trim(row.completionDate) !== ""
        || trim(row.tranche) !== ""
        || trim(row.verificationMethod) !== ""
    );
}

function validateMilestoneRow(row: MatchingGrantMilestoneRow, index: number): string[] {
    if (!milestoneRowStarted(row)) return [];
    const label = `Milestone row ${index + 1}`;
    const errors: string[] = [];
    if (!isRequiredText(row.activity)) errors.push(`${label}: activity is required.`);
    if (!isRequiredText(row.completionDate)) errors.push(`${label}: completion date is required.`);
    if (!isRequiredText(row.tranche)) errors.push(`${label}: tranche is required.`);
    if (!isRequiredText(row.verificationMethod)) {
        errors.push(`${label}: verification method is required.`);
    }
    return errors;
}

function jobRowStarted(row: MatchingGrantJobRow): boolean {
    return (
        trim(row.role) !== ""
        || row.women > 0
        || row.youth > 0
        || row.pwd > 0
        || row.total > 0
    );
}

function validateJobRow(row: MatchingGrantJobRow, index: number): string[] {
    if (!jobRowStarted(row)) return [];
    const label = `Job creation row ${index + 1}`;
    const errors: string[] = [];
    if (!isRequiredText(row.role)) errors.push(`${label}: role is required.`);
    if (row.women + row.youth + row.pwd <= 0) {
        errors.push(`${label}: enter at least one job count (women, youth, or PWD).`);
    }
    return errors;
}

function isCompleteBudgetRow(row: MatchingGrantBudgetItem): boolean {
    if (!budgetRowStarted(row)) return false;
    return (
        isRequiredText(row.item)
        && Boolean(trim(row.category))
        && row.confirmedEligible
        && row.totalCost > 0
        && row.bireGrant >= 0
        && row.enterpriseContribution >= 0
        && Math.abs(row.totalCost - (row.bireGrant + row.enterpriseContribution)) <= 1
    );
}

function isCompleteMilestoneRow(row: MatchingGrantMilestoneRow): boolean {
    if (!milestoneRowStarted(row)) return false;
    return (
        isRequiredText(row.activity)
        && isRequiredText(row.completionDate)
        && isRequiredText(row.tranche)
        && isRequiredText(row.verificationMethod)
    );
}

function isCompleteJobRow(row: MatchingGrantJobRow): boolean {
    if (!jobRowStarted(row)) return false;
    return isRequiredText(row.role) && row.women + row.youth + row.pwd > 0;
}

function validateEnterpriseStep(input: MatchingGrantValidationInput): string[] {
    const errors: string[] = [];
    const enterpriseFields: Array<[string, string]> = [
        ["Enterprise name", input.enterprise.name],
        ["Trading name", input.enterprise.tradingName],
        ["Registration number", input.enterprise.registrationNumber],
        ["Legal structure", input.enterprise.legalStructure],
        ["Registration date", input.enterprise.registrationDate],
        ["Year operations started", input.enterprise.yearOperationsStarted],
        ["Sector", input.enterprise.sector],
        ["County / location", input.enterprise.county],
        ["Sub-county / ward", input.enterprise.subCountyWard],
        ["GPS / pin location", input.enterprise.gpsLocation],
        ["Physical address", input.enterprise.physicalAddress],
        ["Postal address", input.enterprise.postalAddress],
        ["Ownership structure", input.enterprise.ownershipStructure],
    ];
    for (const [label, value] of enterpriseFields) {
        const error = requireText(label, value);
        if (error) errors.push(error);
    }

    const leadFields: Array<[string, string]> = [
        ["Lead entrepreneur name", input.lead.name],
        ["Lead ID / passport number", input.lead.idNumber],
        ["Lead gender", input.lead.gender],
        ["Lead date of birth", input.lead.dateOfBirth],
        ["Lead applicant category", input.lead.applicantCategory],
        ["Lead role in enterprise", input.lead.role],
        ["Lead phone", input.lead.phone],
        ["Lead email", input.lead.email],
        ["Lead education", input.lead.education],
        ["Lead relevant experience", input.lead.experience],
    ];
    for (const [label, value] of leadFields) {
        const error = requireText(label, value);
        if (error) errors.push(error);
    }

    for (const [index, row] of input.otherOwners.entries()) {
        errors.push(...validateOtherOwnerRow(row, index));
    }

    const programmeFields: Array<[string, string]> = [
        ["BIRE client ID", input.programme.bireClientId],
        ["Regional hub", input.programme.regionalHub],
        ["TA lead", input.programme.taLead],
        ["Date joined programme", input.programme.dateJoined],
        ["Duration in TA support (months)", input.programme.taDurationMonths],
        ["Key TA milestones achieved", input.programme.taMilestones],
        ["Programme support received", input.programme.supportReceived],
    ];
    for (const [label, value] of programmeFields) {
        const error = requireText(label, value);
        if (error) errors.push(error);
    }

    return errors;
}

function validateFinancialsStep(
    input: MatchingGrantValidationInput,
    context: MatchingGrantValidationContext
): string[] {
    const errors: string[] = [];
    const revenue = resolveAnnualRevenueForEligibility(input.financial, context.pipelineRevenue);
    if (revenue <= 0) {
        errors.push("Enter annual revenue for 2025, 2024, or 2023.");
    }

    const numericFields: Array<[string, number | null]> = [
        ["Annual revenue 2025 (KES)", input.financial.annualRevenue2025],
        ["Annual revenue 2024 (KES)", input.financial.annualRevenue2024],
        ["Annual revenue 2023 (KES)", input.financial.annualRevenue2023],
        ["Average monthly revenue (KES)", input.financial.monthlyRevenue],
        ["Monthly operating costs (KES)", input.financial.monthlyOperatingCosts],
        ["Full-time employees", input.financial.employeeCount],
        ["Casual / contract workers", input.financial.casualWorkers],
    ];
    for (const [label, value] of numericFields) {
        const error = requireNullableNumber(label, value);
        if (error) errors.push(error);
    }

    const textFields: Array<[string, string]> = [
        ["Profitability", input.financial.profitability],
        ["Financial recordkeeping status", input.financial.recordkeepingStatus],
        ["Revenue streams", input.financial.revenueStreams],
        ["Financial obligations", input.financial.financialObligations],
        ["Additional financial notes", input.financial.narrative],
    ];
    for (const [label, value] of textFields) {
        const error = requireText(label, value);
        if (error) errors.push(error);
    }

    return errors;
}

function validateGrantRequestStep(input: MatchingGrantValidationInput): string[] {
    const errors: string[] = [];
    const textFields: Array<[string, string]> = [
        ["Project title", input.projectTitle],
        ["Co-investment source", input.coInvestmentSource],
        ["Why this funding is needed now", input.fundingNeed],
        ["Impact without this grant", input.withoutGrantImpact],
        ["Co-investment notes / justification", input.coInvestmentJustification],
        ["Other grants", input.otherFunding.otherGrants],
        ["Loans", input.otherFunding.loans],
        ["Investors", input.otherFunding.investors],
        ["Own savings", input.otherFunding.ownSavings],
        ["Future investment / lender leverage", input.otherFunding.leveragePotential],
        ["Other funding summary / notes", input.otherFunding.description],
        ["Registration status", input.governance.registrationStatus],
        ["KRA PIN", input.governance.kraPin],
        ["Sector licenses / permits", input.governance.licensesPermits],
        ["Tax compliance", input.governance.taxCompliance],
        ["Litigation or disputes", input.governance.litigationDisputes],
        ["Previous grant / programme funding", input.governance.previousProgrammeFunding],
        ["Key risks", input.governance.risks],
        ["Mitigation plan", input.governance.mitigationPlan],
        ["Compliance gaps", input.governance.complianceGaps],
        ["Governance additional notes", input.governance.notes],
    ];
    for (const [label, value] of textFields) {
        const error = requireText(label, value);
        if (error) errors.push(error);
    }

    if (input.totalProjectAmount <= 0) {
        errors.push("Total project investment must be greater than zero.");
    }
    if (input.preferredCoInvestmentPct <= 0) {
        errors.push("Preferred co-investment percentage is required.");
    } else if (input.preferredCoInvestmentPct > 100) {
        errors.push("Preferred co-investment percentage must be between 1 and 100.");
    }
    if (!input.capexOnlyConfirmed) {
        errors.push("Confirm CAPEX-only use for this grant request.");
    }
    if (
        input.totalProjectAmount > 0
        && Math.abs(
            input.totalProjectAmount - (input.bireGrantAmount + input.enterpriseContributionAmount)
        ) > 1
    ) {
        errors.push("BIRE grant and enterprise contribution must add up to total project amount.");
    }

    return errors;
}

function validateBusinessImpactStep(input: MatchingGrantValidationInput): string[] {
    const errors: string[] = [];
    const businessFields: Array<[string, string]> = [
        ["Business description", input.business.businessDescription],
        ["Problem solved", input.business.problemSolved],
        ["Value chain node", input.business.valueChainNode],
        ["Products / services", input.business.productsServices],
        ["Target market & estimated size", input.business.targetMarket],
        ["Target customers", input.business.targetCustomers],
        ["Marketing & sales strategy", input.business.marketingSalesStrategy],
        ["Competitive advantages", input.business.competitiveAdvantages],
        ["Projected monthly revenue after investment", input.projectedMonthlyRevenue],
        ["Projected annual revenue after investment", input.projectedAnnualRevenue],
        ["Projected revenue growth rate", input.projectedGrowthRate],
        ["Projection assumptions", input.projectionAssumptions],
        ["Employment terms", input.employmentTerms],
        ["Inclusion strategy", input.inclusionStrategy],
        ["Environmental / climate impact", input.environmentalImpact],
        ["Environmental outcome indicators", input.environmentalIndicators],
        ["Value chain / community impact", input.communityImpact],
        ["Innovation element", input.innovationElement],
    ];
    for (const [label, value] of businessFields) {
        const error = requireText(label, value);
        if (error) errors.push(error);
    }
    return errors;
}

function validateInvestmentPlanStep(input: MatchingGrantValidationInput): string[] {
    const errors: string[] = [];
    if (!input.useOfFundsAcknowledged) {
        errors.push(
            "Confirm the budget excludes ineligible uses (personal expenses, loan repayments, unrelated overheads)."
        );
    }

    const rowErrors = input.budgetItems.flatMap((row, index) => validateBudgetRow(row, index));
    errors.push(...rowErrors);
    errors.push(...validateBudgetUseOfFunds(input.budgetItems));

    const completeBudgetRows = input.budgetItems.filter(isCompleteBudgetRow);
    if (completeBudgetRows.length === 0) {
        errors.push("Add at least one complete budget line item.");
    }

    const milestoneErrors = input.milestones.flatMap((row, index) =>
        validateMilestoneRow(row, index)
    );
    errors.push(...milestoneErrors);
    const completeMilestones = input.milestones.filter(isCompleteMilestoneRow);
    if (completeMilestones.length === 0) {
        errors.push("Add at least one complete implementation milestone.");
    }

    const jobErrors = input.jobs.flatMap((row, index) => validateJobRow(row, index));
    errors.push(...jobErrors);
    const completeJobs = input.jobs.filter(isCompleteJobRow);
    if (completeJobs.length === 0) {
        errors.push("Add at least one complete job creation row.");
    }

    return errors;
}

function validateDocumentsStep(input: MatchingGrantValidationInput): string[] {
    const errors: string[] = [];
    errors.push(...validateMandatoryMgDocuments(input.documents));
    if (!isRequiredText(input.declarationName)) {
        errors.push("Applicant full name is required for declaration.");
    }
    if (!input.declarationAccepted) {
        errors.push("Applicant declaration must be accepted.");
    }
    return errors;
}

export function getMatchingGrantStepValidationErrors(
    stepId: MgWizardStepId,
    input: MatchingGrantValidationInput,
    context: MatchingGrantValidationContext
): string[] {
    switch (stepId) {
        case "enterprise":
            return validateEnterpriseStep(input);
        case "financials":
            return validateFinancialsStep(input, context);
        case "grant_request":
            return validateGrantRequestStep(input);
        case "business_impact":
            return validateBusinessImpactStep(input);
        case "investment_plan":
            return validateInvestmentPlanStep(input);
        case "documents":
            return validateDocumentsStep(input);
        default:
            return [];
    }
}

export function getMatchingGrantValidationErrors(
    input: MatchingGrantValidationInput,
    context: MatchingGrantValidationContext
): Record<MgWizardStepId, string[]> {
    const stepIds: MgWizardStepId[] = [
        "enterprise",
        "financials",
        "grant_request",
        "business_impact",
        "investment_plan",
        "documents",
    ];
    return Object.fromEntries(
        stepIds.map((stepId) => [
            stepId,
            getMatchingGrantStepValidationErrors(stepId, input, context),
        ])
    ) as Record<MgWizardStepId, string[]>;
}

export function getFirstMatchingGrantValidationError(
    input: MatchingGrantValidationInput,
    context: MatchingGrantValidationContext
): string | null {
    const grouped = getMatchingGrantValidationErrors(input, context);
    for (const stepId of Object.keys(grouped) as MgWizardStepId[]) {
        const first = grouped[stepId]?.[0];
        if (first) return first;
    }
    return null;
}

export function buildValidationInputFromApplicationPayload(input: {
    projectTitle?: string;
    totalProjectAmount?: number;
    bireGrantAmount?: number;
    enterpriseContributionAmount?: number;
    preferredCoInvestmentPct?: number;
    coInvestmentSource?: string;
    coInvestmentJustification?: string;
    fundingNeed?: string;
    withoutGrantImpact?: string;
    capexOnlyConfirmed?: boolean;
    status?: string;
    enterpriseIdentification?: Record<string, unknown>;
    leadEntrepreneur?: Record<string, unknown>;
    programmeEngagement?: Record<string, unknown>;
    businessOverview?: Record<string, unknown>;
    financialOverview?: Record<string, unknown>;
    otherFunding?: Record<string, unknown>;
    governanceCompliance?: Record<string, unknown>;
    budgetItems?: Array<Record<string, unknown>>;
    implementationMilestones?: Array<Record<string, unknown>>;
    financialProjections?: Record<string, unknown>;
    jobCreationPlan?: Array<Record<string, unknown>>;
    impact?: Record<string, unknown>;
    supportingDocuments?: unknown;
    declaration?: Record<string, unknown>;
}): MatchingGrantValidationInput {
    const enterpriseRaw = (input.enterpriseIdentification ?? {}) as Record<string, unknown>;
    const projections = (input.financialProjections ?? {}) as Record<string, unknown>;
    const impact = (input.impact ?? {}) as Record<string, unknown>;
    const declaration = (input.declaration ?? {}) as Record<string, unknown>;

    return {
        enterprise: parseEnterpriseIdentification(enterpriseRaw),
        lead: parseLeadEntrepreneur(input.leadEntrepreneur),
        otherOwners: parseOtherOwners(enterpriseRaw.otherOwners),
        programme: parseProgrammeEngagement(input.programmeEngagement),
        financial: parseFinancialOverview(input.financialOverview),
        projectTitle: String(input.projectTitle ?? ""),
        totalProjectAmount: Number(input.totalProjectAmount ?? 0),
        bireGrantAmount: Number(input.bireGrantAmount ?? 0),
        enterpriseContributionAmount: Number(input.enterpriseContributionAmount ?? 0),
        preferredCoInvestmentPct: Number(input.preferredCoInvestmentPct ?? 0),
        coInvestmentSource: String(input.coInvestmentSource ?? ""),
        coInvestmentJustification: String(input.coInvestmentJustification ?? ""),
        fundingNeed: String(input.fundingNeed ?? ""),
        withoutGrantImpact: String(input.withoutGrantImpact ?? ""),
        capexOnlyConfirmed: Boolean(input.capexOnlyConfirmed),
        otherFunding: parseOtherFunding(input.otherFunding),
        governance: parseGovernanceCompliance(input.governanceCompliance),
        business: parseBusinessOverview(input.businessOverview),
        projectedMonthlyRevenue: String(projections.projectedMonthlyRevenue ?? ""),
        projectedAnnualRevenue: String(projections.projectedAnnualRevenue ?? ""),
        projectedGrowthRate: String(projections.projectedGrowthRate ?? ""),
        projectionAssumptions: String(projections.assumptions ?? ""),
        employmentTerms: String(impact.employmentTerms ?? ""),
        inclusionStrategy: String(impact.inclusionStrategy ?? ""),
        environmentalImpact: String(impact.environmentalImpact ?? ""),
        environmentalIndicators: String(impact.environmentalIndicators ?? ""),
        communityImpact: String(impact.communityImpact ?? ""),
        innovationElement: String(impact.innovationElement ?? ""),
        budgetItems: parseBudgetItems(input.budgetItems),
        milestones: parseMilestones(input.implementationMilestones),
        jobs: parseJobCreationPlan(input.jobCreationPlan),
        documents: parseMgSupportingDocuments(input.supportingDocuments),
        declarationName: String(declaration.applicantName ?? ""),
        declarationAccepted: Boolean(declaration.accepted),
        useOfFundsAcknowledged: Boolean(declaration.useOfFundsAcknowledged),
    };
}

export function validateMatchingGrantSubmitPayload(
    input: Parameters<typeof buildValidationInputFromApplicationPayload>[0],
    context: MatchingGrantValidationContext
): string | null {
    if (input.status !== "submitted") return null;
    return getFirstMatchingGrantValidationError(
        buildValidationInputFromApplicationPayload(input),
        context
    );
}
