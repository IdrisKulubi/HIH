import assert from "node:assert/strict";
import {
  calculateFinancialComparison,
  enterpriseNamesAreEquivalent,
  KNOWN_BASELINE_ID_CORRECTIONS,
  normalizeEnterpriseName,
  summarizeOwnBaselineProfitability,
  compareMonthlyProfitToOwnBaseline,
  hasReportedFinancialActivity,
} from "./financial-baselines";

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

  assert.equal(enterpriseNamesAreEquivalent("ONJA FOODS LTD", "ONJA FOODS"), true);
  assert.equal(enterpriseNamesAreEquivalent("Godnet AgrInvest limited", "Godnet AgrInvest Limited (GAIL)"), true);
  assert.equal(enterpriseNamesAreEquivalent("Nyandarua Machinery Ring", "Nyandarua Machinery Ring"), true);
  assert.equal(
    enterpriseNamesAreEquivalent(
      "Kikuyu dairy cooperative society ltd",
      "KIKUYU DAIRY FARMERS COOPERATIVE SOCIETY LTD"
    ),
    false
  );

  const ownBaseline = summarizeOwnBaselineProfitability([
    { profitLoss: 45000, financialBaselineSnapshot: { profit: 8000 } },
    { profitLoss: 36000, financialBaselineSnapshot: { profit: 10000 } },
    { profitLoss: 48000, financialBaselineSnapshot: { profit: 12000 } },
    { profitLoss: 9000, financialBaselineSnapshot: { profit: 20000 } },
    { profitLoss: 30000, financialBaselineSnapshot: null },
    { profitLoss: null, financialBaselineSnapshot: { profit: 5000 } },
  ]);
  assert.equal(ownBaseline.comparableCount, 4);
  assert.equal(ownBaseline.improvedCount, 3);
  assert.equal(ownBaseline.declinedCount, 1);
  assert.equal(ownBaseline.atOrAboveCount, 3);
  assert.equal(ownBaseline.atOrAboveShare, 75);
  assert.equal(ownBaseline.missingBaselineCount, 1);
  assert.equal(ownBaseline.missingProfitCount, 1);
  assert.equal(ownBaseline.medianProfitChange, 3000);

  const pairwise = compareMonthlyProfitToOwnBaseline({ profitLoss: 45000, financialBaselineSnapshot: { profit: 8000 } });
  assert.equal(pairwise.monthlyProfit, 15000);
  assert.equal(pairwise.profitChangeVsOwnBaseline, 7000);
  assert.equal(pairwise.vsOwnBaseline, "at_or_above");

  assert.equal(hasReportedFinancialActivity({ revenue: 0, costs: 0, profitLoss: 0 }), false);
  assert.equal(hasReportedFinancialActivity({ revenue: null, costs: null, profitLoss: null }), false);
  assert.equal(hasReportedFinancialActivity({ revenue: 100, costs: 100, profitLoss: 0 }), true);
}

tests();
console.log("MEL enterprise financial baseline tests passed");
