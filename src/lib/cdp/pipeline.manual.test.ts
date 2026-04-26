/**
 * Run: npx tsx src/lib/cdp/pipeline.manual.test.ts
 */
import assert from "node:assert/strict";
import type { CdpFocusSummaryRow } from "@/db/schema";
import { CDP_FOCUS_CODES } from "./focus-areas";
import {
  assertCdpActivationReadiness,
  computeCdpPipelineCompleteness,
  computeCdpTopRiskFocus,
  keyResultsWeightsValidPerObjectives,
  roundScoreToDiscrete0510,
  sumKeyResultWeightsPercent,
} from "./pipeline";

function fakeSummaries(scoreForA: 0 | 5 | 10, keyGapsForA: string | null): CdpFocusSummaryRow[] {
  return CDP_FOCUS_CODES.map(
    (focusCode) =>
      ({
        focusCode,
        score0to10: focusCode === "A" ? scoreForA : 10,
        id: 1,
        planId: 1,
        keyGaps: focusCode === "A" ? keyGapsForA : null,
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
  assert.equal(keyResultsWeightsValidPerObjectives([{ id: 1, title: "O1", keyResults: [{ weightPercent: "50" }, { weightPercent: "50" }] }]), null);
  assert.ok(
    keyResultsWeightsValidPerObjectives([{ id: 1, title: "O1", keyResults: [{ weightPercent: "40" }, { weightPercent: "50" }] }])?.includes("100%")
  );

  const summariesA = fakeSummaries(5, "Gap text for A");
  const errWeights = assertCdpActivationReadiness({
    focusSummaries: summariesA,
    activities: [
      {
        focusCode: "A",
        intervention: "Do thing",
        targetDate: "2026-01-01",
      },
    ],
    objectivesForKrs: [{ id: 1, title: "Objective 1", keyResults: [{ weightPercent: "99" }] }],
  });
  assert.ok(errWeights?.includes("100%"));

  const errGap = assertCdpActivationReadiness({
    focusSummaries: fakeSummaries(5, null),
    activities: [
      {
        focusCode: "A",
        intervention: "Do thing",
        targetDate: "2026-01-01",
      },
    ],
    objectivesForKrs: [{ id: 1, title: "Objective 1", keyResults: [{ weightPercent: "100" }] }],
  });
  assert.ok(errGap?.includes("key gaps"));

  const ok = assertCdpActivationReadiness({
    focusSummaries: summariesA,
    activities: [
      {
        focusCode: "A",
        intervention: "Do thing",
        targetDate: "2026-01-01",
      },
    ],
    objectivesForKrs: [{ id: 1, title: "Objective 1", keyResults: [{ weightPercent: "100" }] }],
  });
  assert.equal(ok, null);

  const pipe = computeCdpPipelineCompleteness({
    status: "draft",
    focusSummaries: summariesA,
    activities: [],
    supportSessions: [],
    objectivesForKrs: [{ id: 1, title: "O1", keyResults: [{ weightPercent: "100" }] }],
    hasEndline: false,
  });
  assert.equal(pipe.okrsWeightedTo100, true);

  // eslint-disable-next-line no-console
  console.log("pipeline.manual.test: OK");
}

main();
