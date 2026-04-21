import type { CdpActivity, CdpFocusSummaryRow } from "@/db/schema";
import { CDP_BOOTCAMP_WEEKS, CDP_KR_WEIGHT_SUM_TOLERANCE, CDP_MIN_SUPPORT_SESSIONS } from "@/lib/cdp/constants";
import {
  CDP_FOCUS_CODES,
  type CdpFocusCode,
  priorityFromScore0to10,
} from "@/lib/cdp/focus-areas";

export type CdpTopRiskFocus = {
  focusCode: CdpFocusCode;
  score0to10: number;
};

/**
 * Lowest A–L score wins; ties break alphabetically A→L.
 */
export function computeCdpTopRiskFocus(
  summaries: Pick<CdpFocusSummaryRow, "focusCode" | "score0to10">[]
): CdpTopRiskFocus | null {
  if (!summaries.length) return null;
  const byCode = new Map(summaries.map((s) => [s.focusCode, s.score0to10]));
  let best: CdpTopRiskFocus | null = null;
  for (const focusCode of CDP_FOCUS_CODES) {
    const score0to10 = byCode.get(focusCode) ?? 0;
    if (
      best == null ||
      score0to10 < best.score0to10 ||
      (score0to10 === best.score0to10 && focusCode < best.focusCode)
    ) {
      best = { focusCode, score0to10 };
    }
  }
  return best;
}

/** Map any 0–10 style number to nearest BIRE discrete score {0, 5, 10}. */
export function roundScoreToDiscrete0510(score: number): 0 | 5 | 10 {
  if (!Number.isFinite(score)) return 0;
  if (score <= 2) return 0;
  if (score <= 7) return 5;
  return 10;
}

export type KrWeightRow = { weightPercent: string | null };

export function sumKeyResultWeightsPercent(rows: KrWeightRow[]): number {
  let sum = 0;
  for (const r of rows) {
    const n = parseFloat(String(r.weightPercent ?? "0"));
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}

export function keyResultsWeightsTotalOneHundred(rows: KrWeightRow[]): boolean {
  const s = sumKeyResultWeightsPercent(rows);
  return Math.abs(s - 100) <= CDP_KR_WEIGHT_SUM_TOLERANCE;
}

export type ActivationContext = {
  focusSummaries: CdpFocusSummaryRow[];
  activities: Pick<CdpActivity, "focusCode" | "intervention" | "targetDate">[];
  keyResultWeights: KrWeightRow[];
};

/**
 * Validates plan can be set to `active` per BIRE rules.
 * Returns first error message or null if OK.
 */
export function assertCdpActivationReadiness(ctx: ActivationContext): string | null {
  const { focusSummaries, activities, keyResultWeights } = ctx;

  if (focusSummaries.length < 12) {
    return "Diagnostic summary must include all 12 focus areas (A–L).";
  }

  for (const row of focusSummaries) {
    const v = row.score0to10;
    if (v !== 0 && v !== 5 && v !== 10) {
      return `Focus ${row.focusCode}: scores must be 0, 5, or 10 (BIRE template).`;
    }
  }

  if (!keyResultsWeightsTotalOneHundred(keyResultWeights)) {
    const s = sumKeyResultWeightsPercent(keyResultWeights);
    return `Key result weights must total 100% (currently ${s.toFixed(2)}%).`;
  }

  const needsIntervention = new Set<CdpFocusCode>();
  for (const s of focusSummaries) {
    const p = priorityFromScore0to10(s.score0to10);
    if (p === "high" || p === "medium") {
      needsIntervention.add(s.focusCode as CdpFocusCode);
    }
  }

  for (const code of needsIntervention) {
    const ok = activities.some(
      (a) =>
        a.focusCode === code &&
        String(a.intervention ?? "").trim().length > 0 &&
        a.targetDate != null &&
        String(a.targetDate).trim() !== ""
    );
    if (!ok) {
      return `Focus ${code} is high or medium priority: add at least one activity with intervention text and a target date.`;
    }
  }

  return null;
}

export type PipelineActivity = Pick<CdpActivity, "id" | "focusCode" | "intervention" | "targetDate"> & {
  progressReviews: { reviewPeriod: string; status: string; outcomeAchieved: boolean | null }[];
};

export type PipelineSession = {
  sessionNumber: number;
  bootcampWeek: number | null;
};

export type PipelineCompletenessInput = {
  status: "draft" | "active" | "archived";
  focusSummaries: CdpFocusSummaryRow[];
  activities: PipelineActivity[];
  supportSessions: PipelineSession[];
  keyResultWeights: KrWeightRow[];
  hasEndline: boolean;
};

export type PipelineCompleteness = {
  diagnosticScoresValid: boolean;
  interventionsForPriorityGaps: boolean;
  okrsWeightedTo100: boolean;
  sessionsOrBootcampComplete: boolean;
  outcomesForPriorityGaps: boolean;
  endlineSubmitted: boolean;
  /** Approximate 0–100 aggregate for UI. */
  percentComplete: number;
};

function everyHighMediumHasActivity(
  summaries: CdpFocusSummaryRow[],
  activities: Pick<CdpActivity, "focusCode" | "intervention" | "targetDate">[]
): boolean {
  for (const s of summaries) {
    const p = priorityFromScore0to10(s.score0to10);
    if (p !== "high" && p !== "medium") continue;
    const code = s.focusCode as CdpFocusCode;
    const ok = activities.some(
      (a) =>
        a.focusCode === code &&
        String(a.intervention ?? "").trim().length > 0 &&
        a.targetDate != null &&
        String(a.targetDate).trim() !== ""
    );
    if (!ok) return false;
  }
  return true;
}

function discreteScores(summaries: CdpFocusSummaryRow[]): boolean {
  return summaries.every((s) => s.score0to10 === 0 || s.score0to10 === 5 || s.score0to10 === 10);
}

function outcomesForPriorityActivities(
  summaries: CdpFocusSummaryRow[],
  activities: PipelineActivity[]
): boolean {
  const priorityCodes = new Set<CdpFocusCode>();
  for (const s of summaries) {
    const p = priorityFromScore0to10(s.score0to10);
    if (p === "high" || p === "medium") priorityCodes.add(s.focusCode as CdpFocusCode);
  }
  if (priorityCodes.size === 0) return true;

  for (const code of priorityCodes) {
    const acts = activities.filter((a) => a.focusCode === code);
    if (acts.length === 0) return false;
    const anyOutcome = acts.some((a) =>
      a.progressReviews.some((pr) => pr.outcomeAchieved === true)
    );
    if (!anyOutcome) return false;
  }
  return true;
}

function sessionsGateMet(sessions: PipelineSession[]): boolean {
  if (sessions.length >= CDP_MIN_SUPPORT_SESSIONS) return true;
  const weeks = new Set<number>();
  for (const s of sessions) {
    if (s.bootcampWeek != null && s.bootcampWeek >= 1 && s.bootcampWeek <= CDP_BOOTCAMP_WEEKS) {
      weeks.add(s.bootcampWeek);
    }
  }
  return weeks.size >= CDP_BOOTCAMP_WEEKS;
}

/**
 * Definition-of-done style checklist (informative; activation still enforced separately).
 */
export function computeCdpPipelineCompleteness(input: PipelineCompletenessInput): PipelineCompleteness {
  const {
    status,
    focusSummaries,
    activities,
    supportSessions,
    keyResultWeights,
    hasEndline,
  } = input;

  const diagnosticScoresValid =
    focusSummaries.length >= 12 && discreteScores(focusSummaries);

  const interventionsForPriorityGaps = everyHighMediumHasActivity(focusSummaries, activities);

  const okrsWeightedTo100 = keyResultsWeightsTotalOneHundred(keyResultWeights);

  const sessionsOrBootcampComplete = sessionsGateMet(supportSessions);

  const outcomesForPriorityGaps = outcomesForPriorityActivities(focusSummaries, activities);

  const endlineSubmitted = hasEndline;

  const flags = [
    diagnosticScoresValid,
    interventionsForPriorityGaps,
    okrsWeightedTo100,
    sessionsOrBootcampComplete,
    outcomesForPriorityGaps,
    endlineSubmitted,
    status === "active",
  ];
  const percentComplete = Math.round(
    (flags.filter(Boolean).length / flags.length) * 100
  );

  return {
    diagnosticScoresValid,
    interventionsForPriorityGaps,
    okrsWeightedTo100,
    sessionsOrBootcampComplete,
    outcomesForPriorityGaps,
    endlineSubmitted,
    percentComplete,
  };
}
