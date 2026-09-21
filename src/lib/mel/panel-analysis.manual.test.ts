import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { ApprovedMonitoringRecord } from "./indicator-engine";
import { buildPanelAnalysis, resolveEnterpriseOwnBaseline } from "./panel-analysis";
import {
  buildPanelAnalysisFromWorkbook,
  parsePanelAnalysisWorkbook,
  resolvePanelWorkbookPath,
} from "./panel-analysis-workbook";

function record(
  businessId: number,
  overrides: Partial<ApprovedMonitoringRecord> = {}
): ApprovedMonitoringRecord {
  return {
    submissionId: businessId,
    businessId,
    periodId: 99,
    businessName: `Enterprise ${businessId}`,
    visitDate: null,
    approvedAt: null,
    dimensions: { track: "foundation", ownerGender: "female", ownerYouth: false, ownerPlwd: null, county: "nairobi", sector: "agriculture" },
    revenue: 300_000,
    costs: 180_000,
    profitLoss: 120_000,
    financialChangeExplanation: null,
    financialBaselineSnapshot: { revenue: 200_000, costs: 150_000, profit: 50_000 },
    financialComparisonSnapshot: null,
    newMarketSegments: null,
    businessPlanImproved: null,
    marketResearchCompleted: null,
    marketIntelligenceAccessed: null,
    technologyAdopted: null,
    newProductsDeveloped: null,
    linkedToFinanceProvider: null,
    financeValue: null,
    financeEntries: [],
    financialPlanCompleted: null,
    activeInsurance: null,
    investorReadinessCompleted: null,
    lifeCycleAssessmentCompleted: null,
    ecoCertificationActive: null,
    esgReportCompleted: null,
    socialSafeguardingGuidelines: null,
    circularGrowthReported: null,
    circularGrowthValue: null,
    strategicPartnerships: null,
    strategicPartnershipCount: null,
    strategicPartnershipDetails: null,
    forumParticipation: null,
    forumDetails: null,
    publicPrivatePartnership: null,
    publicPrivatePartnershipDetails: null,
    technologyDetails: null,
    newProductsDetails: null,
    mainChallenges: null,
    positiveProgrammeImpacts: null,
    negativeProgrammeImpacts: null,
    additionalSupportNeeded: null,
    collectorComment: null,
    directQualityJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
    directNonQualityJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
    directJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
    indirectJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
    waste: [],
    ...overrides,
  };
}

function tests() {
  const panel = buildPanelAnalysis({
    records: [
      record(1, { revenue: 300_000, costs: 150_000, profitLoss: 150_000, financialBaselineSnapshot: { revenue: 200_000, costs: 120_000, profit: 80_000 } }),
      record(2, { revenue: 600_000, costs: 300_000, profitLoss: 300_000, financialBaselineSnapshot: { revenue: 400_000, costs: 200_000, profit: 200_000 } }),
      record(3, { revenue: 0, costs: 0, profitLoss: 0, financialBaselineSnapshot: { revenue: 50_000, costs: 40_000, profit: 10_000 } }),
      record(4, {
        revenue: 90_000,
        costs: 45_000,
        profitLoss: 45_000,
        financialBaselineSnapshot: null,
      }),
    ],
    monitoringPeriodId: 99,
    monitoringPeriodLabel: "Y1 Monitoring Q1 (Jun–Aug 2026)",
    monitoringPeriodCode: "Y1-MQ1",
    activeBaselinesByBusinessId: new Map([
      [3, { businessId: 3, monthlyRevenue: 60_000, monthlyCosts: 30_000, monthlyProfit: 30_000 }],
      [4, { businessId: 4, monthlyRevenue: 90_000, monthlyCosts: 60_000, monthlyProfit: 30_000 }],
    ]),
    panelBusinessId: null,
  });

  assert.equal(panel.coverage.monitoringEligible, 3);
  assert.equal(panel.coverage.matched, 4);
  assert.equal(panel.coverage.matchPercentOfBaseline, 100);
  assert.equal(panel.baseline.revenue, 145_000);
  assert.equal(panel.monitoring.revenue, 65_000);
  assert.equal(panel.change.revenue, -80_000);

  const missingNotZero = buildPanelAnalysis({
    records: [
      record(10, {
        revenue: 300_000,
        costs: 150_000,
        profitLoss: 150_000,
        financialBaselineSnapshot: { revenue: 200_000, costs: null, profit: 80_000 },
      }),
      record(11, {
        revenue: 600_000,
        costs: 300_000,
        profitLoss: 300_000,
        financialBaselineSnapshot: { revenue: 400_000, costs: 200_000, profit: 200_000 },
      }),
    ],
    monitoringPeriodId: 99,
    monitoringPeriodLabel: "Y1 Monitoring Q1 (Jun–Aug 2026)",
    monitoringPeriodCode: "Y1-MQ1",
    activeBaselinesByBusinessId: new Map([
      [10, { businessId: 10, monthlyRevenue: 200_000, monthlyCosts: null, monthlyProfit: 80_000 }],
      [11, { businessId: 11, monthlyRevenue: 400_000, monthlyCosts: 200_000, monthlyProfit: 200_000 }],
    ]),
    panelBusinessId: null,
  });
  assert.equal(missingNotZero.baseline.costs, 200_000);

  const single = buildPanelAnalysis({
    records: [
      record(2, {
        revenue: 600_000,
        costs: 300_000,
        profitLoss: 300_000,
        financialBaselineSnapshot: { revenue: 400_000, costs: 200_000, profit: 200_000 },
      }),
    ],
    monitoringPeriodId: 99,
    monitoringPeriodLabel: "Y1 Monitoring Q1 (Jun–Aug 2026)",
    monitoringPeriodCode: "Y1-MQ1",
    activeBaselinesByBusinessId: new Map(),
    panelBusinessId: 2,
  });
  assert.equal(single.viewMode, "single");
  assert.equal(single.monitoring.revenue, 200_000);
  assert.equal(single.baseline.revenue, 400_000);

  const ownBaseline = resolveEnterpriseOwnBaseline(null, { businessId: 4, monthlyRevenue: 10_000, monthlyCosts: 5_000, monthlyProfit: 5_000 });
  assert.equal(ownBaseline.revenue, 10_000);

  const workbookPath = resolvePanelWorkbookPath();
  if (existsSync(workbookPath)) {
    const buffer = readFileSync(workbookPath);
    const parsed = parsePanelAnalysisWorkbook(buffer);
    assert.equal(parsed.baselineRows.length, 239);
    assert.equal(parsed.monitoringRows.length, 151);
    const uniqueBaseline = new Set(parsed.baselineRows.map((row) => row.businessId));
    assert.equal(uniqueBaseline.size, 238);

    const workbookPanel = buildPanelAnalysisFromWorkbook({
      buffer,
      demographicsById: new Map(),
      panelBusinessId: null,
      monitoringPeriodLabel: "Y1 Monitoring Q1 (Jun–Aug 2026)",
      monitoringPeriodCode: "Y1-MQ1",
    });
    assert.equal(workbookPanel.coverage.baselineUniqueIds, 238);
    assert.equal(workbookPanel.coverage.monitoringTotal, 151);
    assert.ok(workbookPanel.coverage.matched >= 146 && workbookPanel.coverage.matched <= 147);
    assert.ok(Math.abs((workbookPanel.coverage.matchPercentOfBaseline ?? 0) - 61.8) < 0.5);
    assert.equal(workbookPanel.dataQuality.duplicateBaselineIds.length, 1);
    assert.equal(workbookPanel.dataQuality.duplicateBaselineIds[0]?.businessId, "827");
    assert.deepEqual(workbookPanel.coverage.unmatchedMonitoringIds.sort(), [421, 534, 826, 827, 986]);

    const firstMonitoring = parsed.monitoringRows[0];
    if (firstMonitoring) {
      assert.equal(firstMonitoring.monitoring.revenue, firstMonitoring.monitoring.revenue);
      const quarterlyWouldBe = firstMonitoring.monitoring.revenue !== null ? firstMonitoring.monitoring.revenue / 3 : null;
      assert.notEqual(workbookPanel.monitoring.revenue, quarterlyWouldBe);
    }
  }
}

tests();
console.log("Panel analysis tests passed.");
