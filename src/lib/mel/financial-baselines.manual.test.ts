import assert from "node:assert/strict";
import { calculateFinancialComparison, KNOWN_BASELINE_ID_CORRECTIONS, normalizeEnterpriseName } from "./financial-baselines";

function tests() {
  const stable = calculateFinancialComparison({ quarterly: { revenue: 330, costs: 240 }, baseline: { revenue: 100, costs: 80 }, thresholdPercent: 100 });
  assert.equal(stable.currentMonthly.revenue, 110);
  assert.equal(stable.explanationRequired, false);

  const loss = calculateFinancialComparison({ quarterly: { revenue: 150, costs: 300 }, baseline: { revenue: 100, costs: 50 } });
  assert.ok(loss.flags.some((flag) => flag.code === "negative_profit"));
  assert.ok(loss.flags.some((flag) => flag.code === "profit_sign_reversal"));
  assert.equal(loss.explanationRequired, true);

  const jump = calculateFinancialComparison({ quarterly: { revenue: 600, costs: 150 }, baseline: { revenue: 100, costs: 50 }, thresholdPercent: 100 });
  assert.ok(jump.flags.some((flag) => flag.code === "large_revenue_change" && flag.source === "baseline"));

  const prior = calculateFinancialComparison({ quarterly: { revenue: 900, costs: 300 }, priorApprovedQuarter: { revenue: 300, costs: 300 } });
  assert.ok(prior.flags.some((flag) => flag.code === "large_revenue_change" && flag.source === "prior_approved"));

  const zero = calculateFinancialComparison({ quarterly: { revenue: 30, costs: 0 }, baseline: { revenue: 0, costs: 0 } });
  assert.ok(zero.flags.some((flag) => flag.code === "large_revenue_change"));

  assert.equal(KNOWN_BASELINE_ID_CORRECTIONS[normalizeEnterpriseName("Petnam life care limited")], 826);
  assert.equal(KNOWN_BASELINE_ID_CORRECTIONS[normalizeEnterpriseName("Digital Legion Limited(trading name BurnerMarket)")], 1087);
  assert.equal(KNOWN_BASELINE_ID_CORRECTIONS[normalizeEnterpriseName("Agri flora organic solutions limited")], 585);
}

tests();
console.log("MEL enterprise financial baseline tests passed");
