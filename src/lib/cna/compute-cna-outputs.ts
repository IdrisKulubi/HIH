const DIMENSION_ORDER = [
  "financial",
  "market",
  "operations",
  "compliance",
] as const;

const DIMENSION_LABELS: Record<(typeof DIMENSION_ORDER)[number], string> = {
  financial: "Financial management",
  market: "Market reach",
  operations: "Operations",
  compliance: "Compliance",
};

export type CnaScoreInput = {
  financialManagementScore: number;
  marketReachScore: number;
  operationsScore: number;
  complianceScore: number;
};

/** Lowest score wins; ties break financial → market → operations → compliance. Resilience = average × 20 (0–100 style). */
export function computeCnaOutputs(scores: CnaScoreInput): {
  topRiskArea: string;
  resilienceIndex: string;
} {
  const map: Record<(typeof DIMENSION_ORDER)[number], number> = {
    financial: scores.financialManagementScore,
    market: scores.marketReachScore,
    operations: scores.operationsScore,
    compliance: scores.complianceScore,
  };
  const minScore = Math.min(
    map.financial,
    map.market,
    map.operations,
    map.compliance
  );
  const tiedFirst = DIMENSION_ORDER.find((k) => map[k] === minScore)!;
  const topRiskArea = DIMENSION_LABELS[tiedFirst];
  const avg =
    (map.financial + map.market + map.operations + map.compliance) / 4;
  const resilienceIndex = (avg * 20).toFixed(2);
  return { topRiskArea, resilienceIndex };
}
