import assert from "node:assert/strict";
import {
  achievementStatus,
  calculateIndicator,
  isTrustedMonitoringStatus,
  median,
  safePercentage,
  type ApprovedMonitoringRecord,
  type IndicatorDefinitionInput,
} from "./indicator-engine";
import { buildFundingTypeBreakdown } from "./reporting-finance";

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

const definition = (code: string, aggregation: IndicatorDefinitionInput["aggregation"] = "sum"): IndicatorDefinitionInput => ({ code, aggregation, lowerIsBetter: false, version: 1 });
const base = { programmeResults: [], segmentKey: "overall", baseline: null, target: 10, thresholds: { red: 50, green: 80 } };

function tests() {
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

  const ratio = calculateIndicator({ ...base, definition: definition("OP1.2-IMPROVED-BUSINESS-PLANS", "ratio"), records: [record(1, 1, { businessPlanImproved: true }), record(2, 2)] });
  assert.equal(ratio.numerator, 1);
  assert.equal(ratio.denominator, 2);
  assert.equal(ratio.actual, 50);

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
}

tests();
console.log("MEL Phase 4 reconciliation tests passed.");
