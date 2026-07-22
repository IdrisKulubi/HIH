/**
 * Matching Grant application JSONB shapes and form helpers.
 * Client-safe — no server imports.
 */

import {
    type A2fEnterpriseTrack,
} from "@/lib/a2f-constants";

export interface EnterpriseIdentification {
    name: string;
    tradingName: string;
    registrationNumber: string;
    legalStructure: string;
    registrationDate: string;
    yearOperationsStarted: string;
    physicalAddress: string;
    county: string;
    subCountyWard: string;
    gpsLocation: string;
    postalAddress: string;
    sector: string;
    ownershipStructure: string;
    location?: string;
}

export interface LeadEntrepreneur {
    name: string;
    idNumber: string;
    gender: string;
    dateOfBirth: string;
    applicantCategory: string;
    phone: string;
    email: string;
    role: string;
    education: string;
    experience: string;
}

export interface OtherOwner {
    name: string;
    role: string;
    ownershipPct: number;
    gender: string;
    category: string;
}

export interface ProgrammeEngagement {
    bireClientId: string;
    regionalHub: string;
    taLead: string;
    dateJoined: string;
    taDurationMonths: string;
    taMilestones: string;
    supportReceived: string;
}

export interface MatchingGrantBusinessOverview {
    businessDescription: string;
    problemSolved: string;
    valueChainNode: string;
    targetMarket: string;
    marketingSalesStrategy: string;
    competitiveAdvantages: string;
    productsServices: string;
    targetCustomers: string;
}

export const EMPTY_ENTERPRISE_IDENTIFICATION: EnterpriseIdentification = {
    name: "",
    tradingName: "",
    registrationNumber: "",
    legalStructure: "",
    registrationDate: "",
    yearOperationsStarted: "",
    physicalAddress: "",
    county: "",
    subCountyWard: "",
    gpsLocation: "",
    postalAddress: "",
    sector: "",
    ownershipStructure: "",
};

export const EMPTY_LEAD_ENTREPRENEUR: LeadEntrepreneur = {
    name: "",
    idNumber: "",
    gender: "",
    dateOfBirth: "",
    applicantCategory: "",
    phone: "",
    email: "",
    role: "",
    education: "",
    experience: "",
};

export const EMPTY_PROGRAMME_ENGAGEMENT: ProgrammeEngagement = {
    bireClientId: "",
    regionalHub: "",
    taLead: "",
    dateJoined: "",
    taDurationMonths: "",
    taMilestones: "",
    supportReceived: "",
};

export const EMPTY_BUSINESS_OVERVIEW: MatchingGrantBusinessOverview = {
    businessDescription: "",
    problemSolved: "",
    valueChainNode: "",
    targetMarket: "",
    marketingSalesStrategy: "",
    competitiveAdvantages: "",
    productsServices: "",
    targetCustomers: "",
};

export interface MatchingGrantFinancialOverview {
    annualRevenue2025: number;
    annualRevenue2024: number;
    annualRevenue2023: number;
    monthlyRevenue: number;
    monthlyOperatingCosts: number;
    profitability: string;
    employeeCount: number;
    casualWorkers: number;
    revenueStreams: string;
    financialObligations: string;
    recordkeepingStatus: string;
    narrative: string;
}

export const EMPTY_FINANCIAL_OVERVIEW: MatchingGrantFinancialOverview = {
    annualRevenue2025: 0,
    annualRevenue2024: 0,
    annualRevenue2023: 0,
    monthlyRevenue: 0,
    monthlyOperatingCosts: 0,
    profitability: "",
    employeeCount: 0,
    casualWorkers: 0,
    revenueStreams: "",
    financialObligations: "",
    recordkeepingStatus: "",
    narrative: "",
};

export interface MatchingGrantOtherFunding {
    otherGrants: string;
    loans: string;
    investors: string;
    ownSavings: string;
    leveragePotential: string;
    description: string;
}

export interface MatchingGrantGovernanceCompliance {
    registrationStatus: string;
    licensesPermits: string;
    taxCompliance: string;
    kraPin: string;
    litigationDisputes: string;
    previousProgrammeFunding: string;
    risks: string;
    mitigationPlan: string;
    complianceGaps: string;
    notes: string;
    officialUse?: MatchingGrantOfficialUse;
}

/** Staff-only official review fields (stored under governanceCompliance.officialUse). */
export interface MatchingGrantOfficialUse {
    referenceNumber: string;
    dateReceived: string;
    receivedBy: string;
    eligibilityResult: string;
    initialScore: string;
    dueDiligenceStatus: string;
    icDecision: string;
    approvedGrantAmount: string;
    reviewerSignOff: string;
    reviewerSignOffAt: string;
    notes: string;
}

export const EMPTY_OFFICIAL_USE: MatchingGrantOfficialUse = {
    referenceNumber: "",
    dateReceived: "",
    receivedBy: "",
    eligibilityResult: "",
    initialScore: "",
    dueDiligenceStatus: "",
    icDecision: "",
    approvedGrantAmount: "",
    reviewerSignOff: "",
    reviewerSignOffAt: "",
    notes: "",
};

export interface MatchingGrantBudgetItem {
    item: string;
    category: string;
    confirmedEligible: boolean;
    totalCost: number;
    bireGrant: number;
    enterpriseContribution: number;
}

export interface MatchingGrantMilestoneRow {
    activity: string;
    completionDate: string;
    tranche: string;
    verificationMethod: string;
}

export interface MatchingGrantJobRow {
    role: string;
    women: number;
    youth: number;
    pwd: number;
    total: number;
}

export const MATCHING_GRANT_CAPEX_CATEGORIES = [
    { value: "productive_equipment", label: "Productive equipment" },
    { value: "technology_adoption", label: "Technology adoption" },
    { value: "climate_resilient_infrastructure", label: "Climate-resilient infrastructure" },
    { value: "operational_upgrades", label: "Operational upgrades linked to investment" },
] as const;

export const EMPTY_OTHER_FUNDING: MatchingGrantOtherFunding = {
    otherGrants: "",
    loans: "",
    investors: "",
    ownSavings: "",
    leveragePotential: "",
    description: "",
};

export const EMPTY_GOVERNANCE_COMPLIANCE: MatchingGrantGovernanceCompliance = {
    registrationStatus: "",
    licensesPermits: "",
    taxCompliance: "",
    kraPin: "",
    litigationDisputes: "",
    previousProgrammeFunding: "",
    risks: "",
    mitigationPlan: "",
    complianceGaps: "",
    notes: "",
};

export function emptyBudgetRow(): MatchingGrantBudgetItem {
    return {
        item: "",
        category: "",
        confirmedEligible: false,
        totalCost: 0,
        bireGrant: 0,
        enterpriseContribution: 0,
    };
}

export function emptyBudgetRows(count = 1): MatchingGrantBudgetItem[] {
    return Array.from({ length: count }, () => emptyBudgetRow());
}

export function emptyMilestoneRow(): MatchingGrantMilestoneRow {
    return {
        activity: "",
        completionDate: "",
        tranche: "",
        verificationMethod: "",
    };
}

export function emptyMilestones(count = 1): MatchingGrantMilestoneRow[] {
    return Array.from({ length: count }, () => emptyMilestoneRow());
}

export function emptyJobRow(): MatchingGrantJobRow {
    return {
        role: "",
        women: 0,
        youth: 0,
        pwd: 0,
        total: 0,
    };
}

export function emptyJobs(count = 1): MatchingGrantJobRow[] {
    return Array.from({ length: count }, () => emptyJobRow());
}

export function emptyOwnerRow(): OtherOwner {
    return {
        name: "",
        role: "",
        ownershipPct: 0,
        gender: "",
        category: "",
    };
}

export function emptyOwners(count = 1): OtherOwner[] {
    return Array.from({ length: count }, () => emptyOwnerRow());
}

/** Drop rows with no meaningful data before persisting to JSONB. */
export function filterFilledOtherOwners(owners: OtherOwner[]): OtherOwner[] {
    return owners.filter(
        (row) =>
            row.name.trim() !== ""
            || row.role.trim() !== ""
            || row.gender.trim() !== ""
            || row.category.trim() !== ""
            || row.ownershipPct > 0
    );
}

export function filterFilledBudgetItems(items: MatchingGrantBudgetItem[]): MatchingGrantBudgetItem[] {
    return items.filter(
        (row) =>
            row.item.trim() !== ""
            || row.category.trim() !== ""
            || row.confirmedEligible
            || row.totalCost > 0
            || row.bireGrant > 0
            || row.enterpriseContribution > 0
    );
}

export function filterFilledMilestones(milestones: MatchingGrantMilestoneRow[]): MatchingGrantMilestoneRow[] {
    return milestones.filter(
        (row) =>
            row.activity.trim() !== ""
            || row.completionDate.trim() !== ""
            || row.tranche.trim() !== ""
            || row.verificationMethod.trim() !== ""
    );
}

export function filterFilledJobs(jobs: MatchingGrantJobRow[]): MatchingGrantJobRow[] {
    return jobs.filter(
        (row) =>
            row.role.trim() !== ""
            || row.women > 0
            || row.youth > 0
            || row.pwd > 0
            || row.total > 0
    );
}

function str(value: unknown): string {
    return value != null ? String(value) : "";
}

function num(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function formatDate(value: unknown): string {
    if (!value) return "";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const s = String(value);
    return s.length >= 10 ? s.slice(0, 10) : s;
}

export function parseEnterpriseIdentification(raw: Record<string, unknown> | null | undefined): EnterpriseIdentification {
    if (!raw) return { ...EMPTY_ENTERPRISE_IDENTIFICATION };
    return {
        name: str(raw.name),
        tradingName: str(raw.tradingName),
        registrationNumber: str(raw.registrationNumber),
        legalStructure: str(raw.legalStructure),
        registrationDate: str(raw.registrationDate),
        yearOperationsStarted: str(raw.yearOperationsStarted),
        physicalAddress: str(raw.physicalAddress),
        county: str(raw.county),
        subCountyWard: str(raw.subCountyWard),
        gpsLocation: str(raw.gpsLocation),
        postalAddress: str(raw.postalAddress),
        sector: str(raw.sector),
        ownershipStructure: str(raw.ownershipStructure),
        location: str(raw.location),
    };
}

export function parseLeadEntrepreneur(raw: Record<string, unknown> | null | undefined): LeadEntrepreneur {
    if (!raw) return { ...EMPTY_LEAD_ENTREPRENEUR };
    return {
        name: str(raw.name),
        idNumber: str(raw.idNumber),
        gender: str(raw.gender),
        dateOfBirth: str(raw.dateOfBirth),
        applicantCategory: str(raw.applicantCategory),
        phone: str(raw.phone),
        email: str(raw.email),
        role: str(raw.role),
        education: str(raw.education),
        experience: str(raw.experience),
    };
}

export function parseOtherOwners(raw: unknown): OtherOwner[] {
    if (!Array.isArray(raw) || raw.length === 0) return [emptyOwnerRow()];
    return raw.map((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        return {
            name: str(row.name),
            role: str(row.role),
            ownershipPct: num(row.ownershipPct),
            gender: str(row.gender),
            category: str(row.category),
        };
    });
}

export function parseProgrammeEngagement(raw: Record<string, unknown> | null | undefined): ProgrammeEngagement {
    if (!raw) return { ...EMPTY_PROGRAMME_ENGAGEMENT };
    return {
        bireClientId: str(raw.bireClientId),
        regionalHub: str(raw.regionalHub),
        taLead: str(raw.taLead),
        dateJoined: str(raw.dateJoined),
        taDurationMonths: str(raw.taDurationMonths),
        taMilestones: str(raw.taMilestones),
        supportReceived: str(raw.supportReceived),
    };
}

export function parseFinancialOverview(raw: Record<string, unknown> | null | undefined): MatchingGrantFinancialOverview {
    if (!raw) return { ...EMPTY_FINANCIAL_OVERVIEW };
    return {
        annualRevenue2025: num(raw.annualRevenue2025),
        annualRevenue2024: num(raw.annualRevenue2024),
        annualRevenue2023: num(raw.annualRevenue2023),
        monthlyRevenue: num(raw.monthlyRevenue),
        monthlyOperatingCosts: num(raw.monthlyOperatingCosts),
        profitability: str(raw.profitability),
        employeeCount: num(raw.employeeCount),
        casualWorkers: num(raw.casualWorkers),
        revenueStreams: str(raw.revenueStreams),
        financialObligations: str(raw.financialObligations),
        recordkeepingStatus: str(raw.recordkeepingStatus),
        narrative: str(raw.narrative),
    };
}

export function resolveAnnualRevenueForEligibility(
    financialOverview: Record<string, unknown> | MatchingGrantFinancialOverview | undefined,
    fallbackRevenue: number
): number {
    const parsed = financialOverview && typeof financialOverview === "object" && "annualRevenue2025" in financialOverview
        ? financialOverview as MatchingGrantFinancialOverview
        : parseFinancialOverview(financialOverview as Record<string, unknown> | undefined);
    if (parsed.annualRevenue2025 > 0) return parsed.annualRevenue2025;
    if (parsed.annualRevenue2024 > 0) return parsed.annualRevenue2024;
    if (parsed.annualRevenue2023 > 0) return parsed.annualRevenue2023;
    return fallbackRevenue > 0 ? fallbackRevenue : 0;
}

export function serializeFinancialOverview(
    financial: MatchingGrantFinancialOverview,
    _track: A2fEnterpriseTrack | null | undefined,
    fallbackRevenue: number
): Record<string, unknown> {
    const revenueUsed = resolveAnnualRevenueForEligibility(financial, fallbackRevenue);
    return {
        ...financial,
        revenueUsedForEligibility: revenueUsed,
        revenueEligible: revenueUsed > 0,
    };
}

export function parseOtherFunding(raw: Record<string, unknown> | null | undefined): MatchingGrantOtherFunding {
    if (!raw) return { ...EMPTY_OTHER_FUNDING };
    const sources = str(raw.sources);
    return {
        otherGrants: str(raw.otherGrants),
        loans: str(raw.loans),
        investors: str(raw.investors),
        ownSavings: str(raw.ownSavings),
        leveragePotential: str(raw.leveragePotential),
        description: str(raw.description) || sources,
    };
}

export function parseOfficialUse(raw: Record<string, unknown> | null | undefined): MatchingGrantOfficialUse {
    if (!raw) return { ...EMPTY_OFFICIAL_USE };
    return {
        referenceNumber: str(raw.referenceNumber),
        dateReceived: str(raw.dateReceived),
        receivedBy: str(raw.receivedBy),
        eligibilityResult: str(raw.eligibilityResult),
        initialScore: str(raw.initialScore),
        dueDiligenceStatus: str(raw.dueDiligenceStatus),
        icDecision: str(raw.icDecision),
        approvedGrantAmount: str(raw.approvedGrantAmount),
        reviewerSignOff: str(raw.reviewerSignOff),
        reviewerSignOffAt: str(raw.reviewerSignOffAt),
        notes: str(raw.notes),
    };
}

export function parseGovernanceCompliance(raw: Record<string, unknown> | null | undefined): MatchingGrantGovernanceCompliance {
    if (!raw) return { ...EMPTY_GOVERNANCE_COMPLIANCE };
    const officialUseRaw = raw.officialUse as Record<string, unknown> | undefined;
    return {
        registrationStatus: str(raw.registrationStatus),
        licensesPermits: str(raw.licensesPermits),
        taxCompliance: str(raw.taxCompliance),
        kraPin: str(raw.kraPin),
        litigationDisputes: str(raw.litigationDisputes),
        previousProgrammeFunding: str(raw.previousProgrammeFunding),
        risks: str(raw.risks),
        mitigationPlan: str(raw.mitigationPlan),
        complianceGaps: str(raw.complianceGaps),
        notes: str(raw.notes),
        officialUse: officialUseRaw ? parseOfficialUse(officialUseRaw) : undefined,
    };
}

const IC_DECISION_LABELS: Record<string, string> = {
    approved: "Approved",
    approved_with_conditions: "Approved with conditions",
    deferred: "Deferred",
    declined: "Declined",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildOfficialUseSeed(params: {
    a2fId: number;
    applicationId: number;
    mgApp?: Record<string, unknown> | null;
    scoring?: {
        totalScore?: number;
        maxTotal?: number;
        qualificationStatus?: string | null;
    } | null;
    ddReports?: Array<{ stage?: string }> | null;
    gairAppraisal?: {
        icDecision?: string | null;
        approvedGrantAmount?: string | number | null;
    } | null;
    officerName?: string;
}): MatchingGrantOfficialUse {
    const governance = (params.mgApp?.governanceCompliance ?? {}) as Record<string, unknown>;
    const saved = parseOfficialUse(governance.officialUse as Record<string, unknown>);
    const financial = (params.mgApp?.financialOverview ?? {}) as Record<string, unknown>;
    const revenueEligible = financial.revenueEligible === true;
    const revenueGate = revenueEligible
        ? "Eligible"
        : financial.revenueUsedForEligibility
            ? "Ineligible"
            : "";

    const latestDd = params.ddReports?.[0]?.stage?.replace(/_/g, " ") ?? "";
    const icKey = params.gairAppraisal?.icDecision ?? "";
    const icLabel = icKey ? (IC_DECISION_LABELS[icKey] ?? icKey.replace(/_/g, " ")) : "";

    const scoreText = params.scoring?.totalScore != null && params.scoring?.maxTotal != null
        ? `${params.scoring.totalScore}/${params.scoring.maxTotal}${params.scoring.qualificationStatus ? ` (${params.scoring.qualificationStatus})` : ""}`
        : "";

    const mgCreated = params.mgApp?.createdAt ?? params.mgApp?.updatedAt;

    return {
        referenceNumber: saved.referenceNumber || `MG-${params.a2fId}`,
        dateReceived: saved.dateReceived || formatDate(mgCreated),
        receivedBy: saved.receivedBy || params.officerName || "",
        eligibilityResult: saved.eligibilityResult
            || params.scoring?.qualificationStatus
            || revenueGate
            || "",
        initialScore: saved.initialScore || scoreText,
        dueDiligenceStatus: saved.dueDiligenceStatus || latestDd,
        icDecision: saved.icDecision || icLabel,
        approvedGrantAmount: saved.approvedGrantAmount
            || (params.gairAppraisal?.approvedGrantAmount != null
                ? String(params.gairAppraisal.approvedGrantAmount)
                : ""),
        reviewerSignOff: saved.reviewerSignOff,
        reviewerSignOffAt: saved.reviewerSignOffAt,
        notes: saved.notes,
    };
}

export function parseBudgetItems(raw: unknown): MatchingGrantBudgetItem[] {
    if (!Array.isArray(raw) || raw.length === 0) return [emptyBudgetRow()];
    return raw.map((entry) => {
        const row = (entry ?? {}) as Record<string, unknown>;
        return {
            item: str(row.item),
            category: str(row.category),
            confirmedEligible: Boolean(row.confirmedEligible),
            totalCost: num(row.totalCost),
            bireGrant: num(row.bireGrant),
            enterpriseContribution: num(row.enterpriseContribution),
        };
    });
}

export function parseMilestones(raw: unknown): MatchingGrantMilestoneRow[] {
    if (!Array.isArray(raw) || raw.length === 0) return [emptyMilestoneRow()];
    return raw.map((entry) => {
        const row = (entry ?? {}) as Record<string, unknown>;
        return {
            activity: str(row.activity),
            completionDate: str(row.completionDate),
            tranche: str(row.tranche),
            verificationMethod: str(row.verificationMethod),
        };
    });
}

export function parseJobCreationPlan(raw: unknown): MatchingGrantJobRow[] {
    if (!Array.isArray(raw) || raw.length === 0) return [emptyJobRow()];
    return raw.map((entry) => {
        const row = (entry ?? {}) as Record<string, unknown>;
        const women = num(row.women);
        const youth = num(row.youth);
        const pwd = num(row.pwd);
        return {
            role: str(row.role),
            women,
            youth,
            pwd,
            total: women + youth + pwd,
        };
    });
}

export function validateBudgetUseOfFunds(budgetItems: MatchingGrantBudgetItem[]): string[] {
    const warnings: string[] = [];
    budgetItems.forEach((row, index) => {
        if (!row.item.trim()) return;
        const label = `Budget row ${index + 1}`;
        if (!row.category.trim()) {
            warnings.push(`${label}: select a CAPEX category for this investment item.`);
        }
        if (!row.confirmedEligible) {
            warnings.push(`${label}: confirm the item is CAPEX-eligible and not personal expense, loan repayment, or unrelated overhead.`);
        }
    });
    return warnings;
}

export function parseBusinessOverview(raw: Record<string, unknown> | null | undefined): MatchingGrantBusinessOverview {
    if (!raw) return { ...EMPTY_BUSINESS_OVERVIEW };
    return {
        businessDescription: str(raw.businessDescription ?? raw.description),
        problemSolved: str(raw.problemSolved),
        valueChainNode: str(raw.valueChainNode),
        targetMarket: str(raw.targetMarket),
        marketingSalesStrategy: str(raw.marketingSalesStrategy),
        competitiveAdvantages: str(raw.competitiveAdvantages),
        productsServices: str(raw.productsServices),
        targetCustomers: str(raw.targetCustomers),
    };
}

/** Serialize enterprise JSONB including nested otherOwners. */
export function serializeEnterpriseIdentification(
    enterprise: EnterpriseIdentification,
    otherOwners: OtherOwner[]
): Record<string, unknown> {
    return {
        ...enterprise,
        location: enterprise.county || enterprise.physicalAddress || enterprise.location,
        otherOwners,
    };
}

/** Returns an error message when submit validation fails, otherwise null. */
export function validateMatchingGrantSubmitFields(input: {
    status?: string;
    track?: A2fEnterpriseTrack | null;
    capexOnlyConfirmed?: boolean;
    enterpriseIdentification?: Record<string, unknown>;
    leadEntrepreneur?: Record<string, unknown>;
    financialOverview?: Record<string, unknown>;
    budgetItems?: Array<Record<string, unknown>>;
    declaration?: Record<string, unknown>;
    fallbackRevenue?: number;
}): string | null {
    if (input.status !== "submitted") return null;
    if (!input.capexOnlyConfirmed) {
        return "Confirm CAPEX-only use before submitting the Matching Grant application.";
    }
    const enterprise = parseEnterpriseIdentification(input.enterpriseIdentification);
    if (!enterprise.name.trim()) {
        return "Enterprise name is required before submitting the Matching Grant application.";
    }
    if (!enterprise.county.trim()) {
        return "County / location is required before submitting the Matching Grant application.";
    }
    const lead = parseLeadEntrepreneur(input.leadEntrepreneur);
    if (!lead.name.trim()) {
        return "Lead entrepreneur name is required before submitting the Matching Grant application.";
    }
    const declaration = input.declaration ?? {};
    if (!declaration.accepted) {
        return "Applicant declaration must be accepted before submitting the Matching Grant application.";
    }
    if (!declaration.useOfFundsAcknowledged) {
        return "Confirm that the budget excludes ineligible uses (personal expenses, loan repayments, unrelated overheads) before submitting.";
    }
    const budgetRows = parseBudgetItems(input.budgetItems);
    const filledRows = budgetRows.filter((row) => row.item.trim());
    if (filledRows.length === 0) {
        return "Add at least one detailed budget line item before submitting the Matching Grant application.";
    }
    for (const row of filledRows) {
        if (!row.category.trim()) {
            return "Each budget line item must have a CAPEX category before submitting.";
        }
        if (!row.confirmedEligible) {
            return "Each budget line item must be confirmed as CAPEX-eligible before submitting.";
        }
    }
    const revenue = resolveAnnualRevenueForEligibility(
        input.financialOverview,
        input.fallbackRevenue ?? 0
    );
    return revenue > 0
        ? null
        : "Annual revenue is required before submitting the Matching Grant application.";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function seedFromPipeline(entry: any): {
    enterprise: EnterpriseIdentification;
    lead: LeadEntrepreneur;
    owners: OtherOwner[];
    programme: ProgrammeEngagement;
    business: MatchingGrantBusinessOverview;
    financial: MatchingGrantFinancialOverview;
    otherFunding: MatchingGrantOtherFunding;
    governance: MatchingGrantGovernanceCompliance;
    declarationName: string;
    useOfFundsAcknowledged: boolean;
} {
    const biz = entry?.application?.business;
    const applicant = biz?.applicant;
    const kyc = entry?.application?.kycProfile;

    const applicantName = `${applicant?.firstName ?? ""} ${applicant?.lastName ?? ""}`.trim();
    const cityLine = [biz?.city, biz?.county].filter(Boolean).join(", ");

    const enterprise: EnterpriseIdentification = {
        ...EMPTY_ENTERPRISE_IDENTIFICATION,
        name: biz?.name ?? "",
        registrationNumber: str(biz?.registrationType ?? ""),
        legalStructure: str(biz?.registrationType ?? ""),
        yearOperationsStarted: biz?.yearsOperational != null ? String(biz.yearsOperational) : "",
        physicalAddress: cityLine,
        county: str(biz?.county ?? ""),
        sector: str(biz?.sector ?? ""),
        location: cityLine,
    };

    const lead: LeadEntrepreneur = {
        ...EMPTY_LEAD_ENTREPRENEUR,
        name: applicantName,
        idNumber: str(applicant?.idPassportNumber ?? ""),
        gender: str(applicant?.gender ?? ""),
        dateOfBirth: formatDate(applicant?.dob),
        phone: str(applicant?.phoneNumber ?? ""),
        email: str(applicant?.email ?? ""),
        role: "Lead entrepreneur / founder",
    };

    const programme: ProgrammeEngagement = {
        ...EMPTY_PROGRAMME_ENGAGEMENT,
        bireClientId: entry?.application?.id != null ? `APP-${entry.application.id}` : "",
        regionalHub: str(kyc?.hubName ?? ""),
        dateJoined: formatDate(entry?.application?.submittedAt ?? entry?.application?.createdAt),
    };

    const business: MatchingGrantBusinessOverview = {
        ...EMPTY_BUSINESS_OVERVIEW,
        businessDescription: str(biz?.description ?? ""),
        problemSolved: str(biz?.problemSolved ?? ""),
        targetMarket: str(biz?.marketScalePotential ?? ""),
        competitiveAdvantages: str(biz?.competitiveAdvantageSource ?? biz?.productDifferentiation ?? ""),
        marketingSalesStrategy: str(biz?.salesMarketingApproach ?? ""),
        productsServices: str(biz?.productDifferentiation ?? ""),
        targetCustomers: str(biz?.customerCount != null ? `Approx. ${biz.customerCount} customers` : ""),
    };

    const revenue = Number(biz?.revenueLastYear ?? 0);
    const financial: MatchingGrantFinancialOverview = {
        ...EMPTY_FINANCIAL_OVERVIEW,
        annualRevenue2025: revenue > 0 ? revenue : 0,
        employeeCount: Number(biz?.fullTimeEmployeesTotal ?? 0),
        recordkeepingStatus: biz?.hasFinancialRecords ? "Financial records available" : "",
        narrative: revenue > 0
            ? `Annual revenue (last year): KES ${revenue.toLocaleString("en-KE")}`
            : "",
    };

    const otherFunding: MatchingGrantOtherFunding = {
        ...EMPTY_OTHER_FUNDING,
        description: str(biz?.externalFundingDetails ?? ""),
    };

    const governance: MatchingGrantGovernanceCompliance = {
        ...EMPTY_GOVERNANCE_COMPLIANCE,
        registrationStatus: biz?.isRegistered ? "Registered" : "Not registered",
        kraPin: str(kyc?.kraPin ?? ""),
        previousProgrammeFunding: str(biz?.externalFundingDetails ?? ""),
        taxCompliance: biz?.businessCompliance ? String(biz.businessCompliance) : "",
    };

    return {
        enterprise,
        lead,
        owners: emptyOwners(),
        programme,
        business,
        financial,
        otherFunding,
        governance,
        declarationName: applicantName,
        useOfFundsAcknowledged: false,
    };
}

/** Merge saved MG record over pipeline seed; saved record wins when present. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeMgRecordOverSeed(seed: ReturnType<typeof seedFromPipeline>, record: any | null) {
    if (!record) return seed;

    const enterpriseRaw = (record.enterpriseIdentification ?? {}) as Record<string, unknown>;
    const financialOverview = (record.financialOverview ?? {}) as Record<string, unknown>;
    const declaration = (record.declaration ?? {}) as Record<string, unknown>;

    return {
        enterprise: parseEnterpriseIdentification(enterpriseRaw),
        lead: parseLeadEntrepreneur(record.leadEntrepreneur as Record<string, unknown>),
        owners: parseOtherOwners(enterpriseRaw.otherOwners),
        programme: parseProgrammeEngagement(record.programmeEngagement as Record<string, unknown>),
        business: parseBusinessOverview(record.businessOverview as Record<string, unknown>),
        financial: parseFinancialOverview(financialOverview),
        otherFunding: parseOtherFunding(record.otherFunding as Record<string, unknown>),
        governance: parseGovernanceCompliance(record.governanceCompliance as Record<string, unknown>),
        declarationName: str(declaration.applicantName) || seed.declarationName,
        useOfFundsAcknowledged: Boolean(declaration.useOfFundsAcknowledged),
    };
}
