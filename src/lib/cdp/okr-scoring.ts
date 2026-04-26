/**
 * OKR display math: interpret `target_outcome` / `achieved_outcome` as numeric when possible
 * (e.g. "100", "75", "15%"). Weighted score = (achieved/target) × (weight%/100).
 */

export function parseOutcomeMetric(text: string | null | undefined): number | null {
  if (text == null) return null;
  const t = text.trim();
  if (!t) return null;
  const n = Number(t.replace(/%$/u, "").replace(/,/gu, ""));
  if (!Number.isFinite(n)) return null;
  return n;
}

export function krFinalScoreRatio(achieved: number | null, target: number | null): number | null {
  if (achieved == null || target == null) return null;
  if (target <= 0) return null;
  return achieved / target;
}

export function krWeightedScore(finalRatio: number | null, weightPercent: number): number | null {
  if (finalRatio == null) return null;
  if (!Number.isFinite(weightPercent)) return null;
  return finalRatio * (weightPercent / 100);
}

export function sumObjectiveWeightedScores(
  keyResults: { weightPercent: string | null; targetOutcome: string | null; achievedOutcome: string | null }[]
): number | null {
  let sum = 0;
  let any = false;
  for (const kr of keyResults) {
    const w = parseFloat(String(kr.weightPercent ?? "0"));
    const ratio = krFinalScoreRatio(
      parseOutcomeMetric(kr.achievedOutcome),
      parseOutcomeMetric(kr.targetOutcome)
    );
    const ws = krWeightedScore(ratio, w);
    if (ws != null) {
      sum += ws;
      any = true;
    }
  }
  return any ? sum : null;
}
