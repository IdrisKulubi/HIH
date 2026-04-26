import { CDP_FOCUS_AREAS, CDP_FOCUS_CODES, type CdpFocusCode } from "@/lib/cdp/focus-areas";

const DIMENSION_ORDER = ["financial", "market", "operations", "compliance"] as const;

const DIMENSION_LABELS: Record<(typeof DIMENSION_ORDER)[number], string> = {
  financial: "Financial management",
  market: "Market reach",
  operations: "Operations",
  compliance: "Compliance",
};

/** Legacy quick CNA (four dimensions, 1–5). */
export type CnaScoreInput = {
  financialManagementScore: number;
  marketReachScore: number;
  operationsScore: number;
  complianceScore: number;
};

/** Lowest score wins; ties break financial → market → operations → compliance. Resilience = average × 20 (0–100). */
export function computeLegacyCnaOutputs(scores: CnaScoreInput): {
  topRiskArea: string;
  resilienceIndex: string;
} {
  const map: Record<(typeof DIMENSION_ORDER)[number], number> = {
    financial: scores.financialManagementScore,
    market: scores.marketReachScore,
    operations: scores.operationsScore,
    compliance: scores.complianceScore,
  };
  const minScore = Math.min(map.financial, map.market, map.operations, map.compliance);
  const tiedFirst = DIMENSION_ORDER.find((k) => map[k] === minScore)!;
  const topRiskArea = DIMENSION_LABELS[tiedFirst];
  const avg = (map.financial + map.market + map.operations + map.compliance) / 4;
  const resilienceIndex = (avg * 20).toFixed(2);
  return { topRiskArea, resilienceIndex };
}

export type CnaFullSurveyRow = { focusCode: CdpFocusCode; score0to10: number };

/**
 * Full A–L CNA: lowest discrete score (0/5/10) wins; ties break A→L.
 * Resilience index 0–100 = average of twelve scores × 10.
 */
export function computeFullCnaSurveyOutputs(rows: CnaFullSurveyRow[]): {
  topRiskArea: string;
  resilienceIndex: string;
} {
  const byCode = new Map(rows.map((r) => [r.focusCode, r.score0to10]));
  let bestCode: CdpFocusCode = "A";
  let bestScore = 10;
  for (const focusCode of CDP_FOCUS_CODES) {
    const v = byCode.get(focusCode) ?? 0;
    if (v < bestScore || (v === bestScore && focusCode < bestCode)) {
      bestScore = v;
      bestCode = focusCode;
    }
  }
  const topRiskArea = CDP_FOCUS_AREAS[bestCode].label;
  let sum = 0;
  for (const focusCode of CDP_FOCUS_CODES) {
    sum += byCode.get(focusCode) ?? 0;
  }
  const avg = sum / 12;
  const resilienceIndex = (avg * 10).toFixed(2);
  return { topRiskArea, resilienceIndex };
}
