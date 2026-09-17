import assert from "node:assert/strict";
import type { ApprovedMonitoringRecord } from "./indicator-engine";
import { buildApprovedMonitoringExportRows } from "./monitoring-export";

function record(overrides: Partial<ApprovedMonitoringRecord> = {}): ApprovedMonitoringRecord {
  return {
    submissionId: 11,
    businessId: 22,
    periodId: 3,
    businessName: "Acme Foods",
    dimensions: { track: "foundation", ownerGender: "female", ownerYouth: true, ownerPlwd: null, county: "nairobi", sector: "agriculture" },
    revenue: 45_000,
    costs: 15_000,
    profitLoss: 30_000,
    financialBaselineSnapshot: { effectiveDate: "2025-06-01", revenue: 8000, costs: 3000, profit: 5000 },
    newMarketSegments: 1,
    businessPlanImproved: true,
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
    directQualityJobs: { total: 2, male: 1, female: 1, youth: 1, plwd: 0, refugee: 0 },
    directNonQualityJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
    directJobs: { total: 2, male: 1, female: 1, youth: 1, plwd: 0, refugee: 0 },
    indirectJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
    waste: [],
    ...overrides,
  };
}

const rows = buildApprovedMonitoringExportRows([record()], [{ id: 3, label: "Y1 Q1", programmeYear: 1, sequence: 1 }]);
assert.equal(rows.length, 1);
assert.equal(rows[0].Enterprise, "Acme Foods");
assert.equal(rows[0].Period, "Y1 Q1");
assert.equal(rows[0].Monthly_Profit_KES, 10000);
assert.equal(rows[0].Baseline_Monthly_Profit_KES, 5000);
assert.equal(rows[0].Profit_Change_Vs_Own_Baseline_KES, 5000);
assert.equal(rows[0].Vs_Own_Baseline, "at_or_above");
console.log("MEL approved monitoring export tests passed");
