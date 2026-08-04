export type MonthlyFinancialValues = {
  revenue: number;
  costs: number;
  profit: number;
};

export type FinancialComparator = {
  source: "baseline" | "prior_approved";
  label: string;
  values: MonthlyFinancialValues;
};

export type FinancialVariance = {
  measure: keyof MonthlyFinancialValues;
  source: FinancialComparator["source"];
  comparisonValue: number;
  currentValue: number;
  absoluteVariance: number;
  percentageVariance: number | null;
};

export type FinancialVarianceFlag = {
  code: "negative_profit" | "profit_sign_reversal" | "large_revenue_change" | "large_cost_change";
  source: FinancialComparator["source"] | "current";
  message: string;
};

export type FinancialComparison = {
  thresholdPercent: number;
  currentMonthly: MonthlyFinancialValues;
  comparators: FinancialComparator[];
  variances: FinancialVariance[];
  flags: FinancialVarianceFlag[];
  explanationRequired: boolean;
};

const percentageChange = (current: number, comparison: number): number | null =>
  comparison === 0 ? (current === 0 ? 0 : null) : ((current - comparison) / Math.abs(comparison)) * 100;

function monthly(values: { revenue: number; costs: number; profit?: number }, divisor = 1): MonthlyFinancialValues {
  const revenue = values.revenue / divisor;
  const costs = values.costs / divisor;
  return { revenue, costs, profit: (values.profit ?? values.revenue - values.costs) / divisor };
}

export function calculateFinancialComparison(input: {
  quarterly: { revenue: number; costs: number; profit?: number };
  baseline?: { label?: string; revenue: number; costs: number; profit?: number } | null;
  priorApprovedQuarter?: { label?: string; revenue: number; costs: number; profit?: number } | null;
  thresholdPercent?: number;
}): FinancialComparison {
  const thresholdPercent = input.thresholdPercent ?? 100;
  const currentMonthly = monthly(input.quarterly, 3);
  const comparators: FinancialComparator[] = [];
  if (input.baseline) comparators.push({ source: "baseline", label: input.baseline.label ?? "Opening baseline", values: monthly(input.baseline) });
  if (input.priorApprovedQuarter) comparators.push({ source: "prior_approved", label: input.priorApprovedQuarter.label ?? "Previous approved quarter", values: monthly(input.priorApprovedQuarter, 3) });

  const variances: FinancialVariance[] = [];
  const flags: FinancialVarianceFlag[] = [];
  if (currentMonthly.profit < 0) flags.push({ code: "negative_profit", source: "current", message: "The enterprise reports a loss for this quarter." });

  for (const comparator of comparators) {
    for (const measure of ["revenue", "costs", "profit"] as const) {
      const currentValue = currentMonthly[measure];
      const comparisonValue = comparator.values[measure];
      const percentageVariance = percentageChange(currentValue, comparisonValue);
      variances.push({ measure, source: comparator.source, comparisonValue, currentValue, absoluteVariance: currentValue - comparisonValue, percentageVariance });
    }
    if (Math.sign(currentMonthly.profit) !== 0 && Math.sign(comparator.values.profit) !== 0 && Math.sign(currentMonthly.profit) !== Math.sign(comparator.values.profit)) {
      flags.push({ code: "profit_sign_reversal", source: comparator.source, message: `Profitability changed direction compared with ${comparator.label}.` });
    }
    for (const measure of ["revenue", "costs"] as const) {
      const comparison = comparator.values[measure];
      const current = currentMonthly[measure];
      const change = percentageChange(current, comparison);
      if ((comparison === 0 && current !== 0) || (change !== null && Math.abs(change) >= thresholdPercent)) {
        flags.push({
          code: measure === "revenue" ? "large_revenue_change" : "large_cost_change",
          source: comparator.source,
          message: `${measure === "revenue" ? "Revenue" : "Costs"} changed by ${change === null ? "more than the zero starting value" : `${Math.abs(change).toFixed(1)}%`} compared with ${comparator.label}.`,
        });
      }
    }
  }

  return { thresholdPercent, currentMonthly, comparators, variances, flags, explanationRequired: flags.length > 0 };
}

export function normalizeEnterpriseName(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "");
}

/** Soften names for display warnings — ignore legal suffixes, parentheticals, and punctuation. */
export function canonicalizeEnterpriseName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(limited|ltd\.?|llc|inc\.?|incorporated|plc|corp\.?|corporation|pty|co\.?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

export function enterpriseNamesAreEquivalent(left: string, right: string): boolean {
  const a = canonicalizeEnterpriseName(left);
  const b = canonicalizeEnterpriseName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  // Treat shorter core as matching when it is fully contained (e.g. ONJA FOODS vs ONJA FOODS LTD).
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= 6 && longer.includes(shorter);
}

export const KNOWN_BASELINE_ID_CORRECTIONS: Readonly<Record<string, number>> = {
  [normalizeEnterpriseName("Petnam life care limited")]: 826,
  [normalizeEnterpriseName("Digital Legion Limited(trading name BurnerMarket)")]: 1087,
  [normalizeEnterpriseName("Agri flora organic solutions limited")]: 585,
};
