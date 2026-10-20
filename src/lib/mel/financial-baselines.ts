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
  if (input.baseline) {
    comparators.push({
      source: "baseline",
      label: input.baseline.label ?? "Enterprise baseline",
      values: monthly(input.baseline),
    });
  }
  if (input.priorApprovedQuarter) comparators.push({ source: "prior_approved", label: input.priorApprovedQuarter.label ?? "Previous approved quarter", values: monthly(input.priorApprovedQuarter, 3) });

  const variances: FinancialVariance[] = [];
  const flags: FinancialVarianceFlag[] = [];
  if (currentMonthly.profit < 0) flags.push({ code: "negative_profit", source: "current", message: "The enterprise reports a loss for this quarter." });

  for (const comparator of comparators) {
    const reference =
      comparator.source === "baseline" ? "enterprise's baseline" : comparator.label;
    for (const measure of ["revenue", "costs", "profit"] as const) {
      const currentValue = currentMonthly[measure];
      const comparisonValue = comparator.values[measure];
      const percentageVariance = percentageChange(currentValue, comparisonValue);
      variances.push({ measure, source: comparator.source, comparisonValue, currentValue, absoluteVariance: currentValue - comparisonValue, percentageVariance });
    }
    if (Math.sign(currentMonthly.profit) !== 0 && Math.sign(comparator.values.profit) !== 0 && Math.sign(currentMonthly.profit) !== Math.sign(comparator.values.profit)) {
      flags.push({ code: "profit_sign_reversal", source: comparator.source, message: `Profitability changed direction compared with ${reference}.` });
    }
    for (const measure of ["revenue", "costs"] as const) {
      const comparison = comparator.values[measure];
      const current = currentMonthly[measure];
      const change = percentageChange(current, comparison);
      if ((comparison === 0 && current !== 0) || (change !== null && Math.abs(change) >= thresholdPercent)) {
        flags.push({
          code: measure === "revenue" ? "large_revenue_change" : "large_cost_change",
          source: comparator.source,
          message: `${measure === "revenue" ? "Revenue" : "Costs"} changed by ${change === null ? "more than the zero starting value" : `${Math.abs(change).toFixed(1)}%`} compared with ${reference}.`,
        });
      }
    }
  }

  return { thresholdPercent, currentMonthly, comparators, variances, flags, explanationRequired: flags.length > 0 };
}

export type OwnBaselineProfitSummary = {
  comparableCount: number;
  improvedCount: number;
  declinedCount: number;
  unchangedCount: number;
  atOrAboveCount: number;
  missingBaselineCount: number;
  missingProfitCount: number;
  atOrAboveShare: number | null;
  medianProfitChange: number | null;
};

export function snapshotMonthlyField(
  snapshot: Record<string, unknown> | null | undefined,
  field: "revenue" | "costs" | "profit"
): number | null {
  if (!snapshot) return null;
  const raw = snapshot[field];
  const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function snapshotMonthlyProfit(snapshot: Record<string, unknown> | null | undefined): number | null {
  return snapshotMonthlyField(snapshot, "profit");
}

function isAbsentFinancialValue(value: number | null | undefined): boolean {
  return value === null || value === undefined || !Number.isFinite(value) || value === 0;
}

/** True when the enterprise reported at least one non-zero revenue, cost, or profit figure. */
export function hasReportedFinancialActivity(input: {
  revenue: number | null;
  costs: number | null;
  profitLoss?: number | null;
}): boolean {
  return !isAbsentFinancialValue(input.revenue)
    || !isAbsentFinancialValue(input.costs)
    || !isAbsentFinancialValue(input.profitLoss);
}

export function withReportedFinancialActivity<T extends { revenue: number | null; costs: number | null; profitLoss: number | null }>(records: T[]): T[] {
  return records.filter(hasReportedFinancialActivity);
}

function medianChange(values: number[]): number | null {
  const valid = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const middle = Math.floor(valid.length / 2);
  const value = valid.length % 2 === 0 ? (valid[middle - 1] + valid[middle]) / 2 : valid[middle];
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Pairwise monthly profit vs each enterprise's own imported baseline, not the ITT track median. */
export function summarizeOwnBaselineProfitability(
  records: Array<{ profitLoss: number | null; financialBaselineSnapshot?: Record<string, unknown> | null }>
): OwnBaselineProfitSummary {
  const changes: number[] = [];
  let improvedCount = 0;
  let declinedCount = 0;
  let unchangedCount = 0;
  let missingBaselineCount = 0;
  let missingProfitCount = 0;

  for (const record of records) {
    if (record.profitLoss === null || !Number.isFinite(record.profitLoss)) {
      missingProfitCount += 1;
      continue;
    }
    const baselineProfit = snapshotMonthlyProfit(record.financialBaselineSnapshot);
    if (baselineProfit === null) {
      missingBaselineCount += 1;
      continue;
    }
    const change = record.profitLoss / 3 - baselineProfit;
    changes.push(change);
    if (change > 0) improvedCount += 1;
    else if (change < 0) declinedCount += 1;
    else unchangedCount += 1;
  }

  const comparableCount = improvedCount + declinedCount + unchangedCount;
  const atOrAboveCount = improvedCount + unchangedCount;
  return {
    comparableCount,
    improvedCount,
    declinedCount,
    unchangedCount,
    atOrAboveCount,
    missingBaselineCount,
    missingProfitCount,
    atOrAboveShare: comparableCount === 0 ? null : Math.round((atOrAboveCount / comparableCount) * 1000) / 10,
    medianProfitChange: medianChange(changes),
  };
}

export type OwnBaselineProfitComparison = {
  monthlyProfit: number | null;
  ownBaselineMonthlyProfit: number | null;
  profitChangeVsOwnBaseline: number | null;
  vsOwnBaseline: "at_or_above" | "below" | "no_baseline" | "no_profit";
};

export function compareMonthlyProfitToOwnBaseline(input: {
  profitLoss: number | null;
  financialBaselineSnapshot?: Record<string, unknown> | null;
}): OwnBaselineProfitComparison {
  const monthlyProfit = input.profitLoss === null || !Number.isFinite(input.profitLoss)
    ? null
    : Math.round((input.profitLoss / 3 + Number.EPSILON) * 100) / 100;
  const ownBaselineMonthlyProfit = snapshotMonthlyProfit(input.financialBaselineSnapshot);
  if (monthlyProfit === null) {
    return { monthlyProfit, ownBaselineMonthlyProfit, profitChangeVsOwnBaseline: null, vsOwnBaseline: "no_profit" };
  }
  if (ownBaselineMonthlyProfit === null) {
    return { monthlyProfit, ownBaselineMonthlyProfit, profitChangeVsOwnBaseline: null, vsOwnBaseline: "no_baseline" };
  }
  const profitChangeVsOwnBaseline = Math.round((monthlyProfit - ownBaselineMonthlyProfit + Number.EPSILON) * 100) / 100;
  return {
    monthlyProfit,
    ownBaselineMonthlyProfit,
    profitChangeVsOwnBaseline,
    vsOwnBaseline: profitChangeVsOwnBaseline >= 0 ? "at_or_above" : "below",
  };
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
