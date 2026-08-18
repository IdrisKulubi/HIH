import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  achievementStatus,
  calculateIndicator,
  isTrustedMonitoringStatus,
  MEL_CALCULATION_VERSION,
  median,
  safePercentage,
  type ApprovedMonitoringRecord,
  type IndicatorDefinitionInput,
} from "./indicator-engine";
import { buildFundingTypeBreakdown, EXTERNAL_FUNDING_TARGET_KES, FUNDING_TYPE_LABELS, sumExternalFinance } from "./reporting-finance";
import { MEL_ITT_SEED } from "./itt-seed";
import { indicatorGroup, MEL_INDICATOR_GROUPS } from "./reporting-visualizations";
import { cumulativePlannedCohort } from "./cohort-denominator";

const jobs = (total: number, male = total, female = 0, youth = 0, plwd = 0, refugee = 0) => ({ total, male, female, youth, plwd, refugee });
function record(id: number, businessId: number, overrides: Partial<ApprovedMonitoringRecord> = {}): ApprovedMonitoringRecord {
  return {
    submissionId: id,
    businessId,
    periodId: 1,
    dimensions: { track: "foundation", ownerGender: "female", ownerYouth: true, ownerPlwd: null, county: "nairobi", sector: "agriculture" },
    revenue: 900_000,
    costs: 600_000,
    profitLoss: 300_000,
    newMarketSegments: 0,
    businessPlanImproved: false,
    marketResearchCompleted: false,
    marketIntelligenceAccessed: false,
    technologyAdopted: false,
    newProductsDeveloped: false,
    linkedToFinanceProvider: false,
    financeValue: 0,
    financeEntries: [],
    financialPlanCompleted: false,
    activeInsurance: false,
    investorReadinessCompleted: false,
    lifeCycleAssessmentCompleted: false,
    ecoCertificationActive: false,
    esgReportCompleted: false,
    socialSafeguardingGuidelines: false,
    circularGrowthReported: false,
    strategicPartnerships: false,
    directJobs: jobs(2, 1, 1, 1),
    indirectJobs: jobs(3, 2, 1, 2),
    waste: [],
    ...overrides,
  };
}

const definition = (
  code: string,
  aggregation: IndicatorDefinitionInput["aggregation"] = "sum",
  options: Partial<IndicatorDefinitionInput> = {}
): IndicatorDefinitionInput => ({
  code,
  aggregation,
  lowerIsBetter: false,
  version: 1,
  unit: aggregation === "ratio" ? "percentage" : "count",
  sourceType: "quarterly_enterprise_form",
  isOneTime: false,
  ...options,
});
const base = { programmeResults: [], segmentKey: "overall", baseline: null, target: 10, thresholds: { red: 50, green: 80 } };

function tests() {
  const resultIndexMigration = readFileSync("drizzle/0043_repair_mel_indicator_result_indexes.sql", "utf8");
  assert.match(resultIndexMigration, /CREATE UNIQUE INDEX IF NOT EXISTS "mel_indicator_results_indicator_period_segment_unique"/);
  assert.match(resultIndexMigration, /"indicator_id", "reporting_period_id", "programme_year", "segment_key"/);

  assert.equal(MEL_CALCULATION_VERSION, 2);
  assert.equal(MEL_ITT_SEED.length, 32, "The explorer must automatically expose every active ITT definition.");
  assert.deepEqual(
    [...new Set(MEL_ITT_SEED.map((indicator) => indicatorGroup(indicator.code)))].sort(),
    [...MEL_INDICATOR_GROUPS].sort(),
    "All six indicator explorer groups must be represented."
  );
  assert.equal(isTrustedMonitoringStatus("approved"), true);
  for (const status of ["draft", "returned_by_mel", "reopened", "voided"]) assert.equal(isTrustedMonitoringStatus(status), false);

  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(safePercentage(1, 0), null);

  const jobResult = calculateIndicator({ ...base, definition: definition("IM-JOBS-CREATED"), records: [record(1, 1), record(2, 2)] });
  assert.equal(jobResult.actual, 10);
  assert.equal(jobResult.trafficLight, "green");
  assert.equal(jobResult.achievementPercentage, 100);

  const overachievement = achievementStatus(15, 10, base.thresholds);
  assert.equal(overachievement.achievementPercentage, 150);
  assert.equal(overachievement.trafficLight, "green");
  assert.equal(achievementStatus(3, 5, base.thresholds, true).trafficLight, "green");

  const profitability = calculateIndicator({ ...base, definition: definition("LT1-PROFITABILITY-INCREASE", "median"), segmentKey: "track:foundation", records: [record(1, 1, { profitLoss: 300 }), record(2, 2, { profitLoss: 600 })], baseline: 100, target: 50 });
  assert.equal(profitability.numerator, 150);
  assert.equal(profitability.actual, 50);
  const overallProfitability = calculateIndicator({ ...base, definition: definition("LT1-PROFITABILITY-INCREASE", "median"), records: [record(1, 1)], baseline: null });
  assert.equal(overallProfitability.actual, null);
  assert.match(overallProfitability.exclusions[0], /Select Foundation or Acceleration/);
  const zeroBaseline = calculateIndicator({ ...base, definition: definition("LT1-PROFITABILITY-INCREASE", "median"), segmentKey: "track:foundation", records: [record(1, 1)], baseline: 0 });
  assert.equal(zeroBaseline.actual, null);
  assert.match(zeroBaseline.exclusions[0], /zero or missing/);

  const ratio = calculateIndicator({ ...base, definition: definition("OP1.2-IMPROVED-BUSINESS-PLANS", "ratio"), records: [record(1, 1, { businessPlanImproved: true }), record(2, 2)], enterpriseDenominator: { value: 250, basis: "planned_programme_cohort", eligibleBusinessIds: [1, 2] } });
  assert.equal(ratio.numerator, 1);
  assert.equal(ratio.denominator, 250);
  assert.equal(ratio.actual, 0.4);

  const thirtyEsgRecords = Array.from({ length: 30 }, (_, index) => record(index + 10, index + 10, { esgReportCompleted: true }));
  const thirtyEsg = calculateIndicator({
    ...base,
    target: 80,
    definition: definition("OP3.1-ESG-REPORTS", "ratio"),
    records: thirtyEsgRecords,
    enterpriseDenominator: { value: 250, basis: "planned_programme_cohort", eligibleBusinessIds: thirtyEsgRecords.map((item) => item.businessId) },
  });
  assert.equal(thirtyEsg.actual, 12);
  assert.equal(thirtyEsg.achievementPercentage, 15);

  const persistentAchievement = calculateIndicator({
    ...base,
    definition: definition("OP3.1-ESG-REPORTS", "ratio", { isOneTime: true }),
    records: [record(50, 1, { periodId: 1, esgReportCompleted: true }), record(51, 1, { periodId: 2, esgReportCompleted: null })],
    approvedAchievements: [{ id: 70, businessId: 1, indicatorCode: "OP3.1-ESG-REPORTS" }],
    enterpriseDenominator: { value: 250, basis: "planned_programme_cohort", eligibleBusinessIds: [1] },
  });
  assert.equal(persistentAchievement.numerator, 1);
  assert.equal(persistentAchievement.actual, 0.4);
  assert.deepEqual(persistentAchievement.sourceAchievementIds, [70]);

  const repeatableLatestNo = calculateIndicator({
    ...base,
    definition: definition("OP1.2-NEW-PRODUCTS", "ratio"),
    records: [record(60, 1, { periodId: 1, newProductsDeveloped: true }), record(61, 1, { periodId: 2, newProductsDeveloped: false })],
    enterpriseDenominator: { value: 250, basis: "planned_programme_cohort", eligibleBusinessIds: [1] },
  });
  assert.equal(repeatableLatestNo.numerator, 0);
  assert.equal(repeatableLatestNo.actual, 0);

  const missingCohort = calculateIndicator({
    ...base,
    definition: definition("OP3.1-ESG-REPORTS", "ratio"),
    records: [record(70, 1, { esgReportCompleted: true })],
    enterpriseDenominator: { value: null, basis: "planned_programme_cohort", eligibleBusinessIds: [1] },
  });
  assert.equal(missingCohort.actual, null);
  assert.match(missingCohort.exclusions[0], /denominator is missing or zero/i);

  const overCohort = calculateIndicator({
    ...base,
    definition: definition("OP3.1-ESG-REPORTS", "ratio", { isOneTime: true }),
    records: [],
    approvedAchievements: [1, 2, 3].map((businessId) => ({ id: businessId, businessId, indicatorCode: "OP3.1-ESG-REPORTS" })),
    enterpriseDenominator: { value: 2, basis: "actual_segment_cohort", eligibleBusinessIds: [1, 2, 3] },
  });
  assert.equal(overCohort.actual, 150);
  assert.match(overCohort.exclusions[0], /exceeds/i);

  const integrationRatio = calculateIndicator({
    ...base,
    definition: definition("OP2.1-INVESTOR-READINESS", "ratio", { sourceType: "integration", isOneTime: true }),
    records: [record(80, 1, { investorReadinessCompleted: true })],
    approvedAchievements: [{ id: 80, businessId: 1, indicatorCode: "OP2.1-INVESTOR-READINESS" }],
    enterpriseDenominator: { value: 400, basis: "planned_programme_cohort", eligibleBusinessIds: [1] },
  });
  assert.equal(integrationRatio.numerator, 1);
  assert.equal(integrationRatio.denominator, 400);
  assert.equal(integrationRatio.actual, 0.25);

  const trainingSystem = calculateIndicator({
    ...base,
    definition: definition("OP1.2-TRAINING-COMPLETION", "ratio", { sourceType: "integration", isOneTime: true }),
    records: [],
    systemActual: { actual: 100, numerator: 1, denominator: 1, sourceIds: [99], rule: "Distinct enterprises with a completion event" },
    enterpriseDenominator: { value: 400, basis: "planned_programme_cohort", eligibleBusinessIds: [1] },
  });
  assert.equal(trainingSystem.numerator, 1);
  assert.equal(trainingSystem.denominator, 400);
  assert.equal(trainingSystem.actual, 0.25);

  const cohortTargets = [
    { programmeYear: 0, reportingPeriodId: null, segmentKey: "overall", value: 400 },
    { programmeYear: 1, reportingPeriodId: null, segmentKey: "overall", value: 250 },
    { programmeYear: 2, reportingPeriodId: null, segmentKey: "overall", value: 150 },
    { programmeYear: 3, reportingPeriodId: null, segmentKey: "overall", value: 0 },
  ];
  assert.equal(cumulativePlannedCohort(cohortTargets, 1), 250);
  assert.equal(cumulativePlannedCohort(cohortTargets, 2), 400);
  assert.equal(cumulativePlannedCohort(cohortTargets, 3), 400);
  assert.equal(cumulativePlannedCohort([], 1), null);

  const deduplicated = calculateIndicator({ ...base, definition: definition("OP3.1-LIFE-CYCLE-ASSESSMENTS", "distinct_count"), records: [record(1, 1, { periodId: 1, lifeCycleAssessmentCompleted: true }), record(2, 1, { periodId: 2, lifeCycleAssessmentCompleted: true })] });
  assert.equal(deduplicated.actual, 1);

  const wasteDimensions = { track: "foundation", ownerGender: "female", ownerYouth: true, ownerPlwd: null, county: "nairobi", sector: "waste_management" };
  const waste = calculateIndicator({ ...base, definition: definition("OP3.3-WASTE-RECYCLED"), segmentKey: "waste_stream:plastic", records: [record(1, 1, { dimensions: wasteDimensions, waste: [{ stream: "plastic", kilograms: 12.5 }, { stream: "paper", kilograms: 5 }] }), record(2, 2, { dimensions: wasteDimensions, waste: [{ stream: "plastic", kilograms: 7.5 }] }), record(3, 3, { waste: [{ stream: "plastic", kilograms: 99 }] })] });
  assert.equal(waste.actual, 20);
  assert.equal(waste.sourceCount, 2);

  const circular = calculateIndicator({ ...base, definition: definition("LT3-CIRCULAR-GROWTH", "ratio"), records: [record(1, 1, { circularGrowthReported: true })] });
  assert.equal(circular.actual, null);
  assert.match(circular.exclusions[0], /evaluation source is pending/i);

  const foundation = calculateIndicator({ ...base, definition: definition("IM-JOBS-CREATED"), segmentKey: "track:foundation", records: [record(1, 1), record(2, 2, { dimensions: { track: "acceleration", ownerGender: "male", ownerYouth: false, ownerPlwd: null, county: "kisumu", sector: "manufacturing" } })] });
  assert.equal(foundation.actual, 5);
  assert.equal(foundation.sourceCount, 1);

  const femaleOwners = calculateIndicator({ ...base, definition: definition("IM-JOBS-CREATED"), segmentKey: "owner_gender:female", records: [record(1, 1), record(2, 2, { dimensions: { track: "acceleration", ownerGender: "male", ownerYouth: false, ownerPlwd: null, county: "kisumu", sector: "manufacturing" } })] });
  assert.equal(femaleOwners.actual, 5);
  assert.equal(femaleOwners.sourceCount, 1);

  const cumulativeJobs = calculateIndicator({ ...base, definition: definition("IM-JOBS-CREATED"), records: [record(1, 1, { periodId: 1 }), record(2, 1, { periodId: 2 })] });
  assert.equal(cumulativeJobs.actual, 10, "Official as-of trends retain cumulative quarterly job activity.");

  const financeBreakdown = buildFundingTypeBreakdown([
    record(1, 1, { financeValue: 30000, financeEntries: [{ financeType: "loan", otherDescription: null, amount: 20000 }, { financeType: "matching_grant", otherDescription: null, amount: 10000 }] }),
    record(2, 2, { financeValue: 5000, financeEntries: [{ financeType: "loan", otherDescription: null, amount: 5000 }] }),
    record(3, 1, { financeValue: 2000, financeEntries: [] }),
  ]);
  assert.deepEqual(
    financeBreakdown.map(({ type, amount, enterpriseCount }) => ({ type, amount, enterpriseCount })),
    [
      { type: "loan", amount: 25000, enterpriseCount: 2 },
      { type: "matching_grant", amount: 10000, enterpriseCount: 1 },
      { type: "repayable_grant", amount: 0, enterpriseCount: 0 },
      { type: "other", amount: 2000, enterpriseCount: 1 },
    ]
  );
  assert.equal(Math.round(financeBreakdown.reduce((total, item) => total + item.percentage, 0)), 100);
  assert.equal(FUNDING_TYPE_LABELS.matching_grant, "BIRE matching grant");
  assert.equal(sumExternalFinance(financeBreakdown), 27000, "External finance excludes BIRE matching grant");
  assert.equal(EXTERNAL_FUNDING_TARGET_KES, 130_000_000);
}

tests();
console.log("MEL Phase 4 reconciliation tests passed.");
