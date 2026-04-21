import type { CnaScoreInput } from "@/lib/cna/compute-cna-outputs";
import {
  CDP_FOCUS_CODES,
  type CdpFocusCode,
  type CdpFocusSummaryInput,
} from "@/lib/cdp/focus-areas";
import { roundScoreToDiscrete0510 } from "@/lib/cdp/pipeline";

/**
 * Legacy quick CNA uses four 1–5 dimensions. CDP uses twelve focus areas (A–L) at 0–10.
 * This mapping is indicative only: programme staff should adjust suggested scores in the CDP UI.
 *
 * - `cna_diagnostics` and `bds_interventions` remain supported for the short four-dimension workflow.
 * - Prefer `capacity_development_plans` + `cdp_focus_summary` for the official BIRE CDP template.
 */
export const LEGACY_CNA_TO_CDP_FOCUS: Record<
  keyof CnaScoreInput,
  { focusCode: CdpFocusCode; label: string }
> = {
  financialManagementScore: {
    focusCode: "D",
    label: "Finance management assessment",
  },
  marketReachScore: {
    focusCode: "C",
    label: "Market + customer assessment",
  },
  operationsScore: {
    focusCode: "E",
    label: "Business technical capacity",
  },
  complianceScore: {
    focusCode: "J",
    label: "Risk assessment",
  },
};

/** Map legacy 1–5 score to 0–10 (linear stretch), then snap to BIRE discrete 0 / 5 / 10. */
export function legacyScore1to5To0to10(score: number): 0 | 5 | 10 {
  const clamped = Math.min(5, Math.max(1, Math.round(score)));
  const stretched = Math.round(((clamped - 1) / 4) * 10);
  return roundScoreToDiscrete0510(stretched);
}

/**
 * Produce twelve summary rows: four filled from legacy scores, rest default to 5 (mid template range).
 */
export function suggestedFocusSummariesFromLegacyCna(
  scores: CnaScoreInput
): CdpFocusSummaryInput[] {
  const byCode = new Map<CdpFocusCode, CdpFocusSummaryInput>();
  for (const key of Object.keys(LEGACY_CNA_TO_CDP_FOCUS) as (keyof CnaScoreInput)[]) {
    const { focusCode } = LEGACY_CNA_TO_CDP_FOCUS[key];
    byCode.set(focusCode, {
      focusCode,
      score0to10: legacyScore1to5To0to10(scores[key]),
      keyGaps: null,
      recommendedIntervention: null,
      responsibleStaff: null,
      targetDate: null,
    });
  }
  return CDP_FOCUS_CODES.map((focusCode) => {
    const existing = byCode.get(focusCode);
    if (existing) return existing;
    return {
      focusCode,
      score0to10: 5,
      keyGaps: null,
      recommendedIntervention: null,
      responsibleStaff: null,
      targetDate: null,
    };
  });
}
