import assert from "node:assert/strict";
import {
  addJobBreakdowns,
  calculateProfitLoss,
  jobBreakdownIssues,
  quarterlyToMonthlyEquivalent,
} from "./monitoring-calculations";
import { resolveSatisfiedOneTimeQuestionCodes } from "./monitoring-question-catalog";
import {
  isMelEvidenceOptionalForSubmission,
  isMelEvidenceOptionalPeriod,
} from "./programme-calendar";
import {
  melMonitoringDraftSchema,
  monitoringSubmissionIssues,
  normalizeMonitoringDraft,
  type MelMonitoringDraft,
} from "./monitoring-validation";

function completeDraft(): MelMonitoringDraft {
  return {
    visitDate: "2026-07-31",
    businessPlanImproved: false,
    revenue: 900_000,
    costs: 600_000,
    financialChangeExplanation: null,
    directQualityJobs: { total: 2, male: 1, female: 1, youth: 1, plwd: 0, refugee: 0 },
    directNonQualityJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
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
    positiveProgrammeImpacts: "Improved record keeping and market linkages",
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

function testZeroJobsValidation() {
  const valid = completeDraft();
  const zeroJobs = {
    ...valid,
    directQualityJobs: { total: 0, male: null, female: null, youth: null, plwd: null, refugee: null },
    directNonQualityJobs: { total: 0, male: null, female: null, youth: null, plwd: null, refugee: null },
    indirectJobs: { total: 0, male: null, female: null, youth: null, plwd: null, refugee: null },
  };
  assert.deepEqual(
    monitoringSubmissionIssues(zeroJobs, new Set(), new Set(), false, false),
    [],
    "Zero jobs with no evidence should pass when totals are 0"
  );

  const partialZero = {
    ...valid,
    directQualityJobs: { total: 0, male: null, female: null, youth: null, plwd: null, refugee: null },
    directNonQualityJobs: { total: 0, male: null, female: null, youth: null, plwd: null, refugee: null },
    indirectJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
  };
  assert.deepEqual(
    monitoringSubmissionIssues(partialZero, new Set(), new Set(), false, false),
    [],
    "Zero total with null breakdown dimensions should pass after normalization"
  );

  const jobsWithoutEvidence = {
    ...valid,
    directQualityJobs: { total: 2, male: 1, female: 1, youth: 1, plwd: 0, refugee: 0 },
    directNonQualityJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
    indirectJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
  };
  const jobsIssues = monitoringSubmissionIssues(jobsWithoutEvidence, new Set(), new Set(), false, false);
  assert.ok(
    !jobsIssues.some((issue) => issue.includes("Evidence is required for jobs")),
    "Jobs evidence is not required while jobs supporting files remain optional"
  );

  const incompleteJobs = {
    ...valid,
    directQualityJobs: { total: 2, male: null, female: null, youth: null, plwd: null, refugee: null },
    directNonQualityJobs: { total: 0, male: null, female: null, youth: null, plwd: null, refugee: null },
    indirectJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
  };
  assert.ok(
    monitoringSubmissionIssues(incompleteJobs, new Set(["jobs"]), new Set(), false, false).some((issue) =>
      issue.includes("Direct jobs (quality) breakdown is required")
    ),
    "Incomplete breakdown is still required when total is greater than 0"
  );
}

function testOptionalEvidenceForY1Mq1() {
  const valid = completeDraft();
  const withYesAndJobs = {
    ...valid,
    technologyAdopted: true,
    technologyDetails: "Solar drying equipment",
    directQualityJobs: { total: 2, male: 1, female: 1, youth: 1, plwd: 0, refugee: 0 },
    directNonQualityJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
    indirectJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
  };

  assert.deepEqual(
    monitoringSubmissionIssues(withYesAndJobs, new Set(), new Set(), false, false, false, "Y1-MQ1"),
    [],
    "Y1-MQ1 allows submit without evidence when other fields are complete"
  );

  assert.deepEqual(
    monitoringSubmissionIssues(withYesAndJobs, new Set(), new Set(), false, false, false, {
      code: "Y1-LEGACY-MONITORING",
      programmeYear: 1,
      sequence: 2,
    }),
    [],
    "Y1 first monitoring quarter allows submit without evidence even when the period code differs"
  );

  assert.ok(
    monitoringSubmissionIssues(withYesAndJobs, new Set(), new Set(), false, false, false, "Y1-MQ2").some(
      (issue) => issue.includes("Evidence is required")
    ),
    "Later periods still require evidence after first submit"
  );

  assert.deepEqual(
    monitoringSubmissionIssues(
      withYesAndJobs,
      new Set(),
      new Set(),
      false,
      false,
      false,
      "Y1-MQ2",
      "draft"
    ),
    [],
    "Draft reports may submit without evidence in any collection period"
  );

  const preDeliveryReturned = {
    ...withYesAndJobs,
    financialPlanCompleted: true,
    lifeCycleAssessmentCompleted: true,
    waste: { organic: 0, plastic: 0, paper: 0, glass: 0, e_waste: 0, other: 0 },
    positiveProgrammeImpacts: "Growing waste collection network",
    mainChallenges: "Cash flow",
    negativeProgrammeImpacts: "None",
    additionalSupportNeeded: "None",
    collectorComment:
      "Jobs and financial supporting documents were not available this quarter; narrative explanation provided per MEL return.",
  };
  assert.deepEqual(
    monitoringSubmissionIssues(
      preDeliveryReturned,
      new Set(),
      new Set(),
      false,
      true,
      false,
      { code: "Y1-PRE", label: "Y1 Pre-delivery (Oct 2025–May 2026)", programmeYear: 1, sequence: 1 },
      "returned_by_mel"
    ),
    [],
    "Y1 pre-delivery catch-up returned by MEL may resubmit without per-question evidence files"
  );
}

testCalculations();
testJobValidation();
testSubmissionValidation();
testZeroJobsValidation();
testOptionalEvidenceForY1Mq1();

function testIndirectDefaultAndPriorOneTimeEvidenceSkip() {
  const valid = completeDraft();
  const missingIndirect = normalizeMonitoringDraft(
    {
      ...valid,
      indirectJobs: { total: null, male: null, female: null, youth: null, plwd: null, refugee: null },
    },
    false
  );
  assert.equal(missingIndirect.indirectJobs.total, 0);
  assert.deepEqual(
    monitoringSubmissionIssues(missingIndirect, new Set(), new Set(), false, false, false, "Y1-MQ2"),
    [],
    "Unset indirect jobs should default to zero"
  );

  const withTechnology = {
    ...valid,
    technologyAdopted: true,
    technologyDetails: "Waste sorting equipment",
  };
  const satisfied = new Set(
    resolveSatisfiedOneTimeQuestionCodes({
      approvedIndicatorCodes: [],
      priorVerifiedEvidenceQuestionCodes: [],
      priorApprovedResponses: [{ technologyAdopted: true }],
    })
  );
  const issues = monitoringSubmissionIssues(
    withTechnology,
    new Set(),
    satisfied,
    false,
    false,
    false,
    "Y1-MQ2"
  );
  assert.ok(
    !issues.some((issue) => issue.includes("technology adopted")),
    "One-time achievements from prior approved reports should not require new evidence"
  );
}

testIndirectDefaultAndPriorOneTimeEvidenceSkip();

function testFirstBdsEvidenceGraceByPeriodCode() {
  assert.equal(isMelEvidenceOptionalPeriod("Y1-MQ1"), true);
  assert.equal(
    isMelEvidenceOptionalPeriod({ code: "Y1-LEGACY", programmeYear: 1, sequence: 1 }),
    false
  );
  assert.equal(
    isMelEvidenceOptionalPeriod({ code: "Y1-MQ1", programmeYear: 1, sequence: 1 }),
    true,
    "MQ1 in code should allow optional evidence even when DB sequence is 1"
  );
  assert.equal(isMelEvidenceOptionalPeriod({ code: "Y1-PRE", programmeYear: 1, sequence: 1 }), true);
  assert.equal(
    isMelEvidenceOptionalForSubmission(
      { code: "Y1-MQ2", programmeYear: 1, sequence: 3 },
      "returned_by_mel"
    ),
    true,
    "Returned reports may resubmit without blocking on every evidence file"
  );
}

testFirstBdsEvidenceGraceByPeriodCode();

console.log("MEL Phase 2 tests passed.");
