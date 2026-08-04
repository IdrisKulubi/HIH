import assert from "node:assert/strict";
import {
  addJobBreakdowns,
  calculateProfitLoss,
  jobBreakdownIssues,
  quarterlyToMonthlyEquivalent,
} from "./monitoring-calculations";
import {
  melMonitoringDraftSchema,
  monitoringSubmissionIssues,
  type MelMonitoringDraft,
} from "./monitoring-validation";

function completeDraft(): MelMonitoringDraft {
  return {
    visitDate: "2026-07-31",
    businessPlanImproved: false,
    revenue: 900_000,
    costs: 600_000,
    financialChangeExplanation: null,
    directJobs: { total: 2, male: 1, female: 1, youth: 1, plwd: 0, refugee: 0 },
    indirectJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
    marketResearchCompleted: false,
    marketIntelligenceAccessed: false,
    newMarketSegments: 0,
    technologyAdopted: false,
    technologyDetails: null,
    newProductsDeveloped: false,
    newProductsDetails: null,
    linkedToFinanceProvider: false,
    financeEntries: [],
    financialPlanCompleted: false,
    activeInsurance: false,
    investorReadinessCompleted: false,
    lifeCycleAssessmentCompleted: false,
    ecoCertificationActive: false,
    esgReportCompleted: false,
    socialSafeguardingGuidelines: false,
    waste: { organic: 0, plastic: 0, paper: 0, glass: 0, e_waste: 0, other: 0 },
    strategicPartnerships: false,
    strategicPartnershipCount: null,
    strategicPartnershipDetails: null,
    forumParticipation: false,
    publicPrivatePartnership: false,
    publicPrivatePartnershipDetails: null,
    mainChallenges: "Access to working capital",
    negativeProgrammeImpacts: "None observed",
    additionalSupportNeeded: "Financial planning support",
    collectorComment: "Enterprise continues to trade.",
    reusedEvidenceIds: {},
  };
}

function testCalculations() {
  assert.equal(calculateProfitLoss(900_000, 600_000), 300_000);
  assert.equal(calculateProfitLoss(250_000, 400_000), -150_000);
  assert.equal(calculateProfitLoss(0, 0), 0);
  assert.equal(quarterlyToMonthlyEquivalent(900_000), 300_000);
  assert.deepEqual(
    addJobBreakdowns(
      { total: 2, male: 1, female: 1, youth: 1, plwd: 0, refugee: 0 },
      { total: 3, male: 2, female: 1, youth: 2, plwd: 1, refugee: 1 }
    ),
    { total: 5, male: 3, female: 2, youth: 3, plwd: 1, refugee: 1 }
  );
}

function testJobValidation() {
  assert.deepEqual(
    jobBreakdownIssues("Direct jobs", {
      total: 3,
      male: 2,
      female: 1,
      youth: 2,
      plwd: 1,
      refugee: 0,
    }),
    []
  );
  assert.ok(
    jobBreakdownIssues("Direct jobs", {
      total: 2,
      male: 2,
      female: 1,
      youth: 3,
      plwd: 0,
      refugee: 0,
    }).length >= 2
  );
}

function testSubmissionValidation() {
  const valid = completeDraft();
  assert.deepEqual(
    monitoringSubmissionIssues(valid, new Set(["jobs"]), new Set(), false, false),
    []
  );

  const technology = { ...valid, technologyAdopted: true, technologyDetails: null };
  const technologyIssues = monitoringSubmissionIssues(
    technology,
    new Set(["jobs"]),
    new Set(),
    false,
    false
  );
  assert.ok(technologyIssues.some((issue) => issue.includes("Technology or innovation details")));
  assert.ok(technologyIssues.some((issue) => issue.includes("Evidence is required for technology")));

  const finance = {
    ...valid,
    linkedToFinanceProvider: true,
    financeEntries: [{ financeType: "other" as const, otherDescription: null, amount: null }],
  };
  const financeIssues = monitoringSubmissionIssues(finance, new Set(["jobs"]), new Set(), false, false);
  assert.ok(financeIssues.some((issue) => issue.includes("Enter the amount")));
  assert.ok(financeIssues.some((issue) => issue.includes("other finance type")));

  const approvedSkip = { ...valid, businessPlanImproved: null };
  assert.deepEqual(
    monitoringSubmissionIssues(
      approvedSkip,
      new Set(["jobs"]),
      new Set(["business_plan_improved"]),
      false,
      false
    ),
    []
  );

  assert.equal(
    melMonitoringDraftSchema.safeParse({ ...valid, revenue: -1 }).success,
    false,
    "Negative money values must fail at the schema boundary"
  );

  const loss = { ...valid, revenue: 100, costs: 200 };
  assert.equal(
    monitoringSubmissionIssues(loss, new Set(["jobs"]), new Set(), false, false)
      .some((issue) => issue.includes("reported loss")),
    false,
    "A loss no longer requires a material-change explanation"
  );
}

testCalculations();
testJobValidation();
testSubmissionValidation();

console.log("MEL Phase 2 tests passed.");
