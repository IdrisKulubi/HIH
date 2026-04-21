/**
 * Run: npx tsx src/lib/cdp/pipeline.manual.test.ts
 */
import assert from "node:assert/strict";
import type { CdpFocusSummaryRow } from "@/db/schema";
import { CDP_FOCUS_CODES } from "./focus-areas";
import {
  assertCdpActivationReadiness,
  computeCdpTopRiskFocus,
  keyResultsWeightsTotalOneHundred,
  roundScoreToDiscrete0510,
  sumKeyResultWeightsPercent,
} from "./pipeline";

function fakeSummaries(scoreForA: 0 | 5 | 10): CdpFocusSummaryRow[] {
  return CDP_FOCUS_CODES.map(
    (focusCode) =>
      ({
        focusCode,
        score0to10: focusCode === "A" ? scoreForA : 10,
        id: 1,
        planId: 1,
        keyGaps: null,
        recommendedIntervention: null,
        responsibleStaff: null,
        targetDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as CdpFocusSummaryRow
  );
}

function main() {
  assert.equal(roundScoreToDiscrete0510(1), 0);
  assert.equal(roundScoreToDiscrete0510(4), 5);
  assert.equal(roundScoreToDiscrete0510(10), 10);

  const top = computeCdpTopRiskFocus(
    CDP_FOCUS_CODES.map((focusCode) => ({
      focusCode,
      score0to10: focusCode === "C" ? 3 : 10,
    }))
  );
  assert.equal(top?.focusCode, "C");
  assert.equal(top?.score0to10, 3);

  assert.equal(sumKeyResultWeightsPercent([{ weightPercent: "40" }, { weightPercent: "60.01" }]) >= 99.99, true);
  assert.equal(keyResultsWeightsTotalOneHundred([{ weightPercent: "50" }, { weightPercent: "50" }]), true);
  assert.equal(keyResultsWeightsTotalOneHundred([{ weightPercent: "40" }, { weightPercent: "50" }]), false);

  const summariesA = fakeSummaries(5);
  const err = assertCdpActivationReadiness({
    focusSummaries: summariesA,
    activities: [
      {
        focusCode: "A",
        intervention: "Do thing",
        targetDate: "2026-01-01",
      },
    ],
    keyResultWeights: [{ weightPercent: "99" }],
  });
  assert.ok(err?.includes("100%"));

  const ok = assertCdpActivationReadiness({
    focusSummaries: summariesA,
    activities: [
      {
        focusCode: "A",
        intervention: "Do thing",
        targetDate: "2026-01-01",
      },
    ],
    keyResultWeights: [{ weightPercent: "100" }],
  });
  assert.equal(ok, null);

  // eslint-disable-next-line no-console
  console.log("pipeline.manual.test: OK");
}

main();
