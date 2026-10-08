import assert from "node:assert/strict";
import { buildMatchingGrantPdfModel, renderMatchingGrantApplicationPdf } from "./matching-grant-application-pdf";
import { hydrateMatchingGrantApplication } from "./matching-grant-application-view";

const entry = {
    application: {
        id: 42,
        track: "acceleration",
        submittedAt: "2026-03-01T00:00:00.000Z",
        business: {
            name: "Green At Mind Ltd",
            revenueLastYear: 9165794,
            county: "Nairobi",
            sector: "Climate",
            isRegistered: true,
            applicant: {
                firstName: "Amina",
                lastName: "Otieno",
                email: "amina@example.com",
                phoneNumber: "0700000000",
            },
        },
        kycProfile: { hubName: "Nairobi Hub", kraPin: "A001234567B" },
    },
};

const record = {
    status: "submitted",
    updatedAt: new Date("2026-10-01T09:00:00.000Z"),
    totalProjectAmount: "1000000",
    bireGrantAmount: "700000",
    enterpriseContributionAmount: "300000",
    preferredCoInvestmentPct: "30",
    projectTitle: "Solar dryer line",
    fundingNeed: "The dryer is needed before the next harvest.",
    withoutGrantImpact: "Produce would continue to spoil in transit.",
    capexOnlyConfirmed: true,
    coInvestmentSource: "Owner savings",
    coInvestmentJustification: "Savings cover the enterprise share.",
    enterpriseIdentification: {
        name: "Green At Mind Ltd",
        tradingName: "Green At Mind",
        registrationNumber: "PVT-123",
        legalStructure: "Limited company",
        county: "Nairobi",
        sector: "Climate",
        otherOwners: [{ name: "Jane Doe", role: "Director", ownershipPct: 20, gender: "Female", category: "Youth" }],
    },
    leadEntrepreneur: { name: "Amina Otieno", email: "amina@example.com", phone: "0700000000" },
    programmeEngagement: { bireClientId: "APP-42", regionalHub: "Nairobi Hub" },
    businessOverview: { businessDescription: "Dries produce for longer shelf life." },
    financialOverview: { annualRevenue2025: 9165794, employeeCount: 8 },
    otherFunding: { ownSavings: "KES 300,000 set aside" },
    governanceCompliance: { kraPin: "A001234567B", registrationStatus: "Registered" },
    financialProjections: { projectedAnnualRevenue: "KES 12,000,000" },
    impact: { environmentalImpact: "Less post-harvest loss." },
    budgetItems: [{
        item: "Solar dryer",
        category: "productive_equipment",
        confirmedEligible: true,
        totalCost: 1000000,
        bireGrant: 700000,
        enterpriseContribution: 300000,
    }],
    implementationMilestones: [{
        activity: "Install dryer",
        completionDate: "2026-12-01",
        tranche: "Tranche 1",
        verificationMethod: "Site visit",
    }],
    jobCreationPlan: [{ role: "Operator", women: 2, youth: 1, pwd: 0, total: 3 }],
    supportingDocuments: [],
    declaration: {
        applicantName: "Amina Otieno",
        accepted: true,
        useOfFundsAcknowledged: true,
        acceptedAt: "2026-10-01T09:00:00.000Z",
    },
    returnReason: null,
};

const view = hydrateMatchingGrantApplication(entry, record, null);
const model = buildMatchingGrantPdfModel(view, {
    pipelineRevenue: 9165794,
    track: "acceleration",
    declarationAcceptedAt: "2026-10-01T09:00:00.000Z",
    generatedAt: new Date("2026-10-08T14:00:00.000Z"),
});

function findAnswer(question: string): string | undefined {
    for (const block of model.sections) {
        const direct = block.fields.find((item) => item.question === question);
        if (direct) return direct.answer;
        for (const group of block.groups) {
            const nested = group.fields.find((item) => item.question === question);
            if (nested) return nested.answer;
        }
    }
    return undefined;
}

assert.equal(model.enterpriseName, "Green At Mind Ltd");
assert.equal(model.trackLabel, "Accelerator");
assert.equal(model.bireShare, "70%");
assert.equal(model.enterpriseShare, "30%");
assert.equal(model.fileName, "Green-At-Mind-Ltd-access-to-finance-application.pdf");
assert.equal(findAnswer("Enterprise name"), "Green At Mind Ltd");
assert.equal(findAnswer("Why is this funding needed now?"), "The dryer is needed before the next harvest.");
assert.equal(findAnswer("CAPEX category"), "Productive equipment");
assert.equal(findAnswer("Investment item"), "Solar dryer");
assert.equal(findAnswer("Applicant full name"), "Amina Otieno");
assert.match(findAnswer("Declaration") ?? "", /Accepted/);
assert.equal(model.sections.length, 14);

async function tests() {
    const pdf = await renderMatchingGrantApplicationPdf(model);
    assert.ok(pdf.length > 1000);
    assert.equal(pdf.subarray(0, 4).toString("utf8"), "%PDF");
    console.log("matching grant application pdf ok", pdf.length);
}

tests();
