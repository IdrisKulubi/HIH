import assert from "node:assert/strict";
import {
    EMPTY_FINANCIAL_OVERVIEW,
    EMPTY_GOVERNANCE_COMPLIANCE,
    EMPTY_BUSINESS_OVERVIEW,
    EMPTY_ENTERPRISE_IDENTIFICATION,
    EMPTY_LEAD_ENTREPRENEUR,
    EMPTY_OTHER_FUNDING,
    EMPTY_PROGRAMME_ENGAGEMENT,
    emptyBudgetRow,
    emptyJobRow,
    emptyMilestoneRow,
} from "./matching-grant-form-types";
import {
    buildValidationInputFromApplicationPayload,
    getFirstMatchingGrantValidationError,
    getMatchingGrantStepValidationErrors,
    isRequiredNullableNumber,
    isRequiredText,
    validateMatchingGrantSubmitPayload,
    type MatchingGrantValidationInput,
} from "./matching-grant-validation";
import { defaultMgSupportingDocuments } from "./mg-supporting-documents";

const context = { track: "foundation" as const, pipelineRevenue: 0 };

function completeInput(): MatchingGrantValidationInput {
    const documents = defaultMgSupportingDocuments().map((doc) =>
        doc.mandatory === "Yes"
            ? { ...doc, url: "https://example.com/doc.pdf", confirmed: true, fileName: "doc.pdf" }
            : doc
    );

    return {
        enterprise: {
            ...EMPTY_ENTERPRISE_IDENTIFICATION,
            name: "Watbell Enterprises",
            tradingName: "Watbell",
            registrationNumber: "BN/123",
            legalStructure: "Sole proprietorship",
            registrationDate: "2020-01-01",
            yearOperationsStarted: "2020",
            sector: "Manufacturing",
            county: "Nairobi",
            subCountyWard: "Westlands",
            gpsLocation: "-1.2921,36.8219",
            physicalAddress: "Nairobi",
            postalAddress: "PO Box 1",
            ownershipStructure: "Sole owner",
        },
        lead: {
            ...EMPTY_LEAD_ENTREPRENEUR,
            name: "Jane Doe",
            idNumber: "12345678",
            gender: "Female",
            dateOfBirth: "1990-01-01",
            applicantCategory: "Women-led",
            role: "Founder",
            phone: "0700000000",
            email: "jane@example.com",
            education: "Degree",
            experience: "10 years",
        },
        otherOwners: [],
        programme: {
            ...EMPTY_PROGRAMME_ENGAGEMENT,
            bireClientId: "APP-1",
            regionalHub: "Nairobi",
            taLead: "Advisor",
            dateJoined: "2024-01-01",
            taDurationMonths: "6",
            taMilestones: "None",
            supportReceived: "Business planning",
        },
        financial: {
            ...EMPTY_FINANCIAL_OVERVIEW,
            annualRevenue2025: 2_500_000,
            annualRevenue2024: 0,
            annualRevenue2023: 0,
            monthlyRevenue: 200_000,
            monthlyOperatingCosts: 120_000,
            profitability: "Profitable",
            employeeCount: 5,
            casualWorkers: 2,
            recordkeepingStatus: "Digital records",
            revenueStreams: "Product sales",
            financialObligations: "None",
            narrative: "None",
        },
        projectTitle: "Equipment upgrade",
        totalProjectAmount: 1_000_000,
        bireGrantAmount: 700_000,
        enterpriseContributionAmount: 300_000,
        preferredCoInvestmentPct: 30,
        coInvestmentSource: "Own savings",
        coInvestmentJustification: "None",
        fundingNeed: "Scale production",
        withoutGrantImpact: "Stagnation",
        capexOnlyConfirmed: true,
        otherFunding: {
            ...EMPTY_OTHER_FUNDING,
            otherGrants: "None",
            loans: "None",
            investors: "None",
            ownSavings: "KES 300,000",
            leveragePotential: "None",
            description: "None",
        },
        governance: {
            ...EMPTY_GOVERNANCE_COMPLIANCE,
            registrationStatus: "Registered",
            kraPin: "A123",
            licensesPermits: "Valid",
            taxCompliance: "Compliant",
            litigationDisputes: "None",
            previousProgrammeFunding: "None",
            risks: "Supply chain",
            mitigationPlan: "Dual sourcing",
            complianceGaps: "None",
            notes: "None",
        },
        business: {
            ...EMPTY_BUSINESS_OVERVIEW,
            businessDescription: "Food processing",
            problemSolved: "Post-harvest loss",
            valueChainNode: "Processing",
            productsServices: "Juice",
            targetMarket: "Retail",
            targetCustomers: "Supermarkets",
            marketingSalesStrategy: "Direct sales",
            competitiveAdvantages: "Quality",
        },
        projectedMonthlyRevenue: "300000",
        projectedAnnualRevenue: "3600000",
        projectedGrowthRate: "20%",
        projectionAssumptions: "Stable demand",
        employmentTerms: "Full-time",
        inclusionStrategy: "Hire women and youth",
        environmentalImpact: "Reduced waste",
        environmentalIndicators: "Lower spoilage",
        communityImpact: "Farmer linkages",
        innovationElement: "Cold chain",
        budgetItems: [
            {
                ...emptyBudgetRow(),
                item: "Processing machine",
                category: "productive_equipment",
                confirmedEligible: true,
                totalCost: 1_000_000,
                bireGrant: 700_000,
                enterpriseContribution: 300_000,
            },
        ],
        milestones: [
            {
                ...emptyMilestoneRow(),
                activity: "Install equipment",
                completionDate: "2026-06-01",
                tranche: "1",
                verificationMethod: "Site visit",
            },
        ],
        jobs: [
            {
                ...emptyJobRow(),
                role: "Machine operator",
                women: 2,
                youth: 1,
                pwd: 0,
                total: 3,
            },
        ],
        documents,
        declarationName: "Jane Doe",
        declarationAccepted: true,
        useOfFundsAcknowledged: true,
    };
}

assert.equal(isRequiredText("None"), true);
assert.equal(isRequiredText("Not applicable"), true);
assert.equal(isRequiredText(""), false);
assert.equal(isRequiredNullableNumber(0), true);
assert.equal(isRequiredNullableNumber(null), false);

const incomplete = completeInput();
incomplete.business.businessDescription = "";
const businessErrors = getMatchingGrantStepValidationErrors("business_impact", incomplete, context);
assert.ok(businessErrors.some((error) => error.includes("Business description")));

const partialBudget = completeInput();
partialBudget.budgetItems = [{ ...emptyBudgetRow(), item: "Incomplete row" }];
const planErrors = getMatchingGrantStepValidationErrors("investment_plan", partialBudget, context);
assert.ok(planErrors.some((error) => error.includes("Budget row 1")));

const complete = completeInput();
assert.equal(getFirstMatchingGrantValidationError(complete, context), null);

const missingPreferredPct = completeInput();
missingPreferredPct.preferredCoInvestmentPct = 0;
const grantRequestErrors = getMatchingGrantStepValidationErrors("grant_request", missingPreferredPct, context);
assert.ok(grantRequestErrors.some((error) => error.includes("Preferred co-investment percentage")));

const invalidPreferredPct = completeInput();
invalidPreferredPct.preferredCoInvestmentPct = 101;
const invalidGrantRequestErrors = getMatchingGrantStepValidationErrors("grant_request", invalidPreferredPct, context);
assert.ok(invalidGrantRequestErrors.some((error) => error.includes("Preferred co-investment percentage")));

const draftOnly = validateMatchingGrantSubmitPayload(
    { status: "draft", projectTitle: "" },
    context
);
assert.equal(draftOnly, null);

const submitIncomplete = validateMatchingGrantSubmitPayload(
    {
        status: "submitted",
        projectTitle: "",
        enterpriseIdentification: {},
        leadEntrepreneur: {},
        financialOverview: {},
        budgetItems: [],
        declaration: {},
    },
    context
);
assert.ok(submitIncomplete);

const payload = buildValidationInputFromApplicationPayload({
    status: "submitted",
    projectTitle: complete.projectTitle,
    totalProjectAmount: complete.totalProjectAmount,
    bireGrantAmount: complete.bireGrantAmount,
    enterpriseContributionAmount: complete.enterpriseContributionAmount,
    preferredCoInvestmentPct: complete.preferredCoInvestmentPct,
    coInvestmentSource: complete.coInvestmentSource,
    coInvestmentJustification: complete.coInvestmentJustification,
    fundingNeed: complete.fundingNeed,
    withoutGrantImpact: complete.withoutGrantImpact,
    capexOnlyConfirmed: complete.capexOnlyConfirmed,
    enterpriseIdentification: { ...complete.enterprise, otherOwners: complete.otherOwners },
    leadEntrepreneur: { ...complete.lead } as Record<string, unknown>,
    programmeEngagement: { ...complete.programme } as Record<string, unknown>,
    businessOverview: { ...complete.business } as Record<string, unknown>,
    financialOverview: { ...complete.financial } as Record<string, unknown>,
    otherFunding: { ...complete.otherFunding } as Record<string, unknown>,
    governanceCompliance: { ...complete.governance } as Record<string, unknown>,
    budgetItems: complete.budgetItems as unknown as Array<Record<string, unknown>>,
    implementationMilestones: complete.milestones as unknown as Array<Record<string, unknown>>,
    financialProjections: {
        projectedMonthlyRevenue: complete.projectedMonthlyRevenue,
        projectedAnnualRevenue: complete.projectedAnnualRevenue,
        projectedGrowthRate: complete.projectedGrowthRate,
        assumptions: complete.projectionAssumptions,
    },
    jobCreationPlan: complete.jobs as unknown as Array<Record<string, unknown>>,
    impact: {
        employmentTerms: complete.employmentTerms,
        inclusionStrategy: complete.inclusionStrategy,
        environmentalImpact: complete.environmentalImpact,
        environmentalIndicators: complete.environmentalIndicators,
        communityImpact: complete.communityImpact,
        innovationElement: complete.innovationElement,
    },
    supportingDocuments: complete.documents,
    declaration: {
        applicantName: complete.declarationName,
        accepted: complete.declarationAccepted,
        useOfFundsAcknowledged: complete.useOfFundsAcknowledged,
    },
});
assert.equal(getFirstMatchingGrantValidationError(payload, context), null);

console.log("Matching Grant validation tests passed");
