import assert from "node:assert/strict";
import type { PanelMatchedEnterprise } from "./panel-analysis-core";
import { buildEnterpriseProfitabilityFeedback } from "./profitability-feedback";

function enterprise(overrides: Partial<PanelMatchedEnterprise> = {}): PanelMatchedEnterprise {
  return {
    businessId: 42,
    businessName: "Green Harvest Ltd",
    track: "foundation",
    ownerGender: "female",
    ownerYouth: false,
    sector: "agriculture",
    county: "nairobi",
    baseline: { revenue: 100_000, costs: 70_000, profit: 30_000 },
    monitoring: { revenue: 110_000, costs: 72_000, profit: 38_000 },
    flags: [],
    ...overrides,
  };
}

function testProfitImprovement() {
  const feedback = buildEnterpriseProfitabilityFeedback({
    enterprise: enterprise(),
    periodLabel: "Y1 Monitoring Q1",
  });
  assert.equal(feedback.rows.length, 3);
  assert.ok(Math.abs((feedback.rows[2].changePercent ?? 0) - 26.6667) < 0.01);
  assert.ok(feedback.interpretation.some((line) => line.includes("Revenue")));
  assert.ok(feedback.interpretation.some((line) => /improved|higher/i.test(line)));
  assert.ok(feedback.recommendation?.includes("Profitability improved"));
}

function testLossAfterProfit() {
  const feedback = buildEnterpriseProfitabilityFeedback({
    enterprise: enterprise({
      monitoring: { revenue: 80_000, costs: 95_000, profit: -15_000 },
    }),
    periodLabel: "Y1 Monitoring Q1",
  });
  assert.ok(feedback.recommendation?.includes("loss"));
}

function testMissingData() {
  const feedback = buildEnterpriseProfitabilityFeedback({
    enterprise: enterprise({
      baseline: { revenue: null, costs: 70_000, profit: 30_000 },
      monitoring: { revenue: 80_000, costs: 75_000, profit: 5_000 },
    }),
    periodLabel: "Y1 Monitoring Q1",
  });
  assert.ok(feedback.interpretation.some((line) => line.includes("not enough")));
}

testProfitImprovement();
testLossAfterProfit();
testMissingData();
console.log("MEL profitability feedback tests passed.");
