import assert from "node:assert/strict";
import { emptyPanelAnalysis } from "./panel-analysis-core";
import { renderMelExecutiveSummaryPdf } from "./executive-summary-pdf";
import type { MelExecutiveSummaryPdfInput } from "./executive-summary-pdf";

function fixture(): MelExecutiveSummaryPdfInput {
  const panel = emptyPanelAnalysis({
    monitoringPeriodLabel: "Y1 Monitoring Q1 (Jun–Aug 2026)",
    monitoringPeriodCode: "Y1-MQ1",
    summaryLabel: "Matched panel median (n=147)",
  });
  return {
    selectedPeriod: {
      id: 1,
      code: "Y1-MQ1",
      label: "Y1 Monitoring Q1",
      programmeYear: 1,
      sequence: 2,
      startDate: "2026-06-01",
      endDate: "2026-08-31",
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    filters: {
      periodId: 1,
      track: null,
      county: null,
      sector: null,
      ownerGender: null,
      panelBusinessId: null,
      panelSource: "workbook",
    },
    summary: {
      reportingEnterprises: 120,
      eligibleEnterprises: 240,
      reportingCompleteness: 50,
      monthlyMedianRevenue: 85000,
      monthlyMedianRevenueBaseline: 200000,
      monthlyMedianRevenueChange: -115000,
      monthlyMedianRevenueChangePercent: -57.5,
      monthlyMedianRevenueBaselineLabel: "overall ITT baseline",
      monthlyMedianCosts: 40000,
      monthlyMedianProfit: 45000,
      jobs: 320,
      directJobs: 280,
      directQualityJobs: 200,
      directNonQualityJobs: 80,
      indirectJobs: 40,
      jobDisaggregation: { male: 100, female: 180, youth: 90, plwd: 2, refugee: 0 },
      financeAccessed: 50000000,
      externalFinanceAccessed: 45000000,
      externalFinanceTarget: 130000000,
      externalFinanceAchievement: 34.6,
      greenResults: 12,
      amberResults: 5,
      redResults: 3,
    },
    financeBreakdown: [
      { type: "loan", label: "Loan", enterpriseCount: 10, amount: 30000000, percentage: 60 },
      { type: "repayable_grant", label: "Repayable grant", enterpriseCount: 4, amount: 15000000, percentage: 30 },
      { type: "other", label: "Other", enterpriseCount: 2, amount: 5000000, percentage: 10 },
    ],
    financialPerformance: [
      {
        track: "foundation",
        enterpriseCount: 80,
        monthlyMedianRevenue: 70000,
        monthlyMedianCosts: 35000,
        monthlyMedianProfit: 35000,
        baseline: { revenue: 200000, costs: 120000, profit: 80000 },
        variance: { revenue: -130000, costs: -85000, profit: -45000 },
        variancePercentage: { revenue: -65, costs: -70.8, profit: -56.3 },
        ownBaseline: {
          comparableCount: 70,
          atOrAboveCount: 35,
          declinedCount: 35,
          atOrAboveShare: 50,
          medianProfitChange: 5000,
          missingBaselineCount: 10,
        },
      },
    ],
    panelAnalysis: {
      ...panel,
      source: "workbook",
      coverage: {
        ...panel.coverage,
        baselineUniqueIds: 238,
        monitoringTotal: 151,
        matched: 147,
        matchPercentOfBaseline: 61.8,
      },
      baseline: { revenue: 120000, costs: 80000, profit: 40000 },
      monitoring: { revenue: 150000, costs: 90000, profit: 60000 },
      changePercent: { revenue: 25, costs: 12.5, profit: 50 },
      interpretation: ["Revenue increased by 25.0% (median, matched panel)."],
      unpairedMonitoring: {
        label: "Overall monitoring",
        enterpriseCount: 140,
        baseline: { revenue: null, costs: null, profit: null },
        monitoring: { revenue: 130000, costs: 85000, profit: 45000 },
        changePercent: { revenue: null, costs: null, profit: null },
      },
      matchedPanel: {
        label: "Matched panel",
        enterpriseCount: 147,
        baseline: { revenue: 120000, costs: 80000, profit: 40000 },
        monitoring: { revenue: 150000, costs: 90000, profit: 60000 },
        changePercent: { revenue: 25, costs: 12.5, profit: 50 },
      },
    },
  };
}

async function tests() {
  const pdf = await renderMelExecutiveSummaryPdf(fixture(), new Date("2026-09-21T12:00:00Z"));
  assert.ok(pdf.length > 1000);
  assert.equal(pdf.subarray(0, 4).toString("utf8"), "%PDF");
}

tests()
  .then(() => console.log("Executive summary PDF tests passed."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
