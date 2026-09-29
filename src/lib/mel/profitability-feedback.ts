import { safePercentage } from "./indicator-engine";
import type { PanelFinancialValues, PanelMatchedEnterprise } from "./panel-analysis-core";

export type ProfitabilityMeasureRow = {
  key: keyof PanelFinancialValues;
  label: string;
  baseline: number | null;
  monitoring: number | null;
  changeAmount: number | null;
  changePercent: number | null;
};

export type EnterpriseProfitabilityFeedback = {
  periodLabel: string;
  businessId: number;
  businessName: string;
  rows: ProfitabilityMeasureRow[];
  interpretation: string[];
  recommendation: string | null;
};

function diffValues(current: PanelFinancialValues, baseline: PanelFinancialValues): PanelFinancialValues {
  const delta = (field: keyof PanelFinancialValues) => {
    const from = baseline[field];
    const to = current[field];
    return from === null || to === null ? null : to - from;
  };
  return { revenue: delta("revenue"), costs: delta("costs"), profit: delta("profit") };
}

function percentChangeValues(change: PanelFinancialValues, baseline: PanelFinancialValues): PanelFinancialValues {
  const pct = (field: keyof PanelFinancialValues) => {
    const base = baseline[field];
    const delta = change[field];
    if (base === null || delta === null) return null;
    if (base === 0) return delta === 0 ? 0 : null;
    return safePercentage(delta, base);
  };
  return { revenue: pct("revenue"), costs: pct("costs"), profit: pct("profit") };
}

function trendPhrase(
  label: string,
  baseline: number | null,
  monitoring: number | null,
  changePercent: number | null,
  costsMeasure = false
): string | null {
  if (baseline === null || monitoring === null) {
    return `${label}: not enough baseline or monitoring data to compare.`;
  }
  if (baseline === monitoring) {
    return `${label} is unchanged from your baseline (${formatKes(baseline)} per month).`;
  }
  const direction = monitoring > baseline ? "higher" : "lower";
  const pct =
    changePercent !== null && Number.isFinite(changePercent)
      ? ` (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%)`
      : "";
  if (costsMeasure) {
    return monitoring > baseline
      ? `${label} are above your baseline${pct} — review whether spending is driving growth.`
      : `${label} are below your baseline${pct}.`;
  }
  return `${label} is ${direction} than your baseline${pct} (${formatKes(baseline)} → ${formatKes(monitoring)} per month).`;
}

function buildRecommendation(input: {
  baseline: PanelFinancialValues;
  monitoring: PanelFinancialValues;
  change: PanelFinancialValues;
  changePercent: PanelFinancialValues;
}): string | null {
  const { baseline, monitoring, change, changePercent } = input;
  if (
    [baseline.revenue, baseline.costs, baseline.profit, monitoring.revenue, monitoring.costs, monitoring.profit].some(
      (v) => v === null
    )
  ) {
    return null;
  }

  const profitUp = (change.profit ?? 0) > 0;
  const profitDown = (change.profit ?? 0) < 0;
  const revenueDown = (change.revenue ?? 0) < 0;
  const costsUp = (change.costs ?? 0) > 0;
  const monitoringLoss = (monitoring.profit ?? 0) < 0;
  const baselineProfit = baseline.profit ?? 0;
  const monitoringProfit = monitoring.profit ?? 0;

  if (monitoringLoss && baselineProfit >= 0) {
    return "Your latest monitoring period shows a loss after a profitable baseline. Work with your BDS officer to review cash flow, pricing, and cost controls, and keep financial records up to date for the next quarter.";
  }
  if (monitoringLoss && baselineProfit < 0) {
    return "You are still reporting a loss. Focus on stabilising revenue and essential costs; your BDS officer can help prioritise actions for the next monitoring visit.";
  }
  if (profitUp && revenueDown && costsUp) {
    return "Profit improved despite lower revenue, likely from cost reductions. Sustain disciplined spending while exploring ways to rebuild sales in the next quarter.";
  }
  if (profitDown && costsUp && (changePercent.revenue ?? 0) <= 0) {
    return "Costs rose while revenue did not keep pace. Review your largest expense lines with your BDS officer and align spending with revenue-generating activities.";
  }
  if (revenueDown) {
    return "Revenue dipped compared with your baseline. Consider market outreach, customer retention, and sales support available through the programme for the coming quarter.";
  }
  if (profitUp) {
    return "Profitability improved compared with your baseline. Keep accurate records each quarter and discuss how to protect margins as you grow.";
  }
  if (profitDown) {
    return "Profit is below your baseline. Review revenue and cost drivers with your BDS officer before the next monitoring round.";
  }
  if (monitoringProfit > baselineProfit) {
    return "Your monitoring profit is slightly above baseline. Maintain good record-keeping and build on what is working in your business model.";
  }
  return "Continue tracking revenue, costs, and profit each quarter so your BDS officer can support you with targeted business development.";
}

export function formatKes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(
    value
  );
}

export function buildEnterpriseProfitabilityFeedback(input: {
  enterprise: PanelMatchedEnterprise;
  periodLabel: string;
}): EnterpriseProfitabilityFeedback {
  const { enterprise, periodLabel } = input;
  const change = diffValues(enterprise.monitoring, enterprise.baseline);
  const changePercent = percentChangeValues(change, enterprise.baseline);

  const measures: Array<{ key: keyof PanelFinancialValues; label: string; costsMeasure?: boolean }> = [
    { key: "revenue", label: "Revenue" },
    { key: "costs", label: "Costs", costsMeasure: true },
    { key: "profit", label: "Profit / loss" },
  ];

  const rows: ProfitabilityMeasureRow[] = measures.map(({ key, label }) => ({
    key,
    label,
    baseline: enterprise.baseline[key],
    monitoring: enterprise.monitoring[key],
    changeAmount: change[key],
    changePercent: changePercent[key],
  }));

  const interpretation = measures
    .map(({ key, label, costsMeasure }) =>
      trendPhrase(
        label,
        enterprise.baseline[key],
        enterprise.monitoring[key],
        changePercent[key],
        costsMeasure
      )
    )
    .filter((line): line is string => Boolean(line));

  const profitLine = trendPhrase(
    "Overall profitability",
    enterprise.baseline.profit,
    enterprise.monitoring.profit,
    changePercent.profit
  );
  if (profitLine) interpretation.push(profitLine);

  interpretation.push(
    "Figures are monthly equivalents (monitoring quarterly totals are divided by three) and compare your enterprise baseline with the selected monitoring period."
  );

  return {
    periodLabel,
    businessId: enterprise.businessId,
    businessName: enterprise.businessName,
    rows,
    interpretation,
    recommendation: buildRecommendation({
      baseline: enterprise.baseline,
      monitoring: enterprise.monitoring,
      change,
      changePercent,
    }),
  };
}

export function profitabilityFeedbackEventKey(periodId: number, businessId: number): string {
  return `mel-profitability-feedback:${periodId}:${businessId}`;
}

/** Staff must complete a trial send for this period before bulk owner emails. */
export function profitabilityFeedbackTrialGateKey(periodId: number, staffUserId: string): string {
  return `mel-profitability-feedback-trial-gate:${periodId}:${staffUserId}`;
}

export function isProfitabilityFeedbackProductionEnabled(): boolean {
  return process.env.MEL_PROFITABILITY_FEEDBACK_ENABLED === "true";
}
