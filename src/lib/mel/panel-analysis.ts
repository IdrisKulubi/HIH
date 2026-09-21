import { median, safePercentage, type ApprovedMonitoringRecord } from "./indicator-engine";
import { snapshotMonthlyField, withReportedFinancialActivity } from "./financial-baselines";

export const PANEL_MONITORING_PERIOD_CODE = "Y1-MQ1";

export type PanelFinancialValues = {
  revenue: number | null;
  costs: number | null;
  profit: number | null;
};

export type PanelMatchedEnterprise = {
  businessId: number;
  businessName: string;
  track: string | null;
  baseline: PanelFinancialValues;
  monitoring: PanelFinancialValues;
};

export type MelPanelAnalysis = {
  monitoringPeriodLabel: string;
  monitoringPeriodCode: string;
  coverage: {
    monitoringEligible: number;
    matched: number;
    unmatched: number;
    matchPercent: number | null;
  };
  viewMode: "cohort" | "single" | "empty";
  selectedBusinessId: number | null;
  summaryLabel: string;
  baseline: PanelFinancialValues;
  monitoring: PanelFinancialValues;
  change: PanelFinancialValues;
  changePercent: PanelFinancialValues;
  matchedEnterprises: PanelMatchedEnterprise[];
  enterpriseOptions: Array<{ businessId: number; label: string }>;
};

export type ActiveEnterpriseBaseline = {
  businessId: number;
  monthlyRevenue: string | number | null;
  monthlyCosts: string | number | null;
  monthlyProfit: string | number | null;
};

function parseNumeric(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveEnterpriseOwnBaseline(
  snapshot: Record<string, unknown> | null | undefined,
  tableRow: ActiveEnterpriseBaseline | undefined
): PanelFinancialValues {
  return {
    revenue: snapshotMonthlyField(snapshot, "revenue") ?? (tableRow ? parseNumeric(tableRow.monthlyRevenue) : null),
    costs: snapshotMonthlyField(snapshot, "costs") ?? (tableRow ? parseNumeric(tableRow.monthlyCosts) : null),
    profit: snapshotMonthlyField(snapshot, "profit") ?? (tableRow ? parseNumeric(tableRow.monthlyProfit) : null),
  };
}

function hasOwnBaseline(values: PanelFinancialValues): boolean {
  return values.revenue !== null || values.costs !== null || values.profit !== null;
}

function monthlyFromQuarterly(value: number | null): number | null {
  return value === null ? null : value / 3;
}

function monitoringMonthly(record: ApprovedMonitoringRecord): PanelFinancialValues {
  return {
    revenue: monthlyFromQuarterly(record.revenue),
    costs: monthlyFromQuarterly(record.costs),
    profit: monthlyFromQuarterly(record.profitLoss),
  };
}

function medianValues(rows: PanelMatchedEnterprise[], selector: (row: PanelMatchedEnterprise) => PanelFinancialValues): PanelFinancialValues {
  const pick = (field: keyof PanelFinancialValues) =>
    median(rows.map((row) => selector(row)[field]).filter((value): value is number => value !== null && Number.isFinite(value)));
  return {
    revenue: pick("revenue"),
    costs: pick("costs"),
    profit: pick("profit"),
  };
}

function diffValues(current: PanelFinancialValues, baseline: PanelFinancialValues): PanelFinancialValues {
  const delta = (field: keyof PanelFinancialValues) => {
    const from = baseline[field];
    const to = current[field];
    return from === null || to === null ? null : to - from;
  };
  return {
    revenue: delta("revenue"),
    costs: delta("costs"),
    profit: delta("profit"),
  };
}

function percentChangeValues(change: PanelFinancialValues, baseline: PanelFinancialValues): PanelFinancialValues {
  const pct = (field: keyof PanelFinancialValues) => {
    const base = baseline[field];
    const delta = change[field];
    return base === null || delta === null ? null : safePercentage(delta, base);
  };
  return {
    revenue: pct("revenue"),
    costs: pct("costs"),
    profit: pct("profit"),
  };
}

export function buildPanelAnalysis(input: {
  records: ApprovedMonitoringRecord[];
  monitoringPeriodId: number;
  monitoringPeriodLabel: string;
  monitoringPeriodCode: string;
  activeBaselinesByBusinessId: Map<number, ActiveEnterpriseBaseline>;
  panelBusinessId: number | null;
}): MelPanelAnalysis {
  const monitoringEligible = withReportedFinancialActivity(
    input.records.filter((record) => record.periodId === input.monitoringPeriodId)
  );

  const matched: PanelMatchedEnterprise[] = [];
  for (const record of monitoringEligible) {
    const baseline = resolveEnterpriseOwnBaseline(
      record.financialBaselineSnapshot,
      input.activeBaselinesByBusinessId.get(record.businessId)
    );
    if (!hasOwnBaseline(baseline)) continue;
    matched.push({
      businessId: record.businessId,
      businessName: record.businessName ?? `Enterprise ${record.businessId}`,
      track: record.dimensions.track,
      baseline,
      monitoring: monitoringMonthly(record),
    });
  }

  const enterpriseOptions = monitoringEligible
    .map((record) => ({
      businessId: record.businessId,
      label: `${record.businessId} — ${record.businessName ?? `Enterprise ${record.businessId}`}`,
    }))
    .sort((left, right) => left.businessId - right.businessId);

  const coverage = {
    monitoringEligible: monitoringEligible.length,
    matched: matched.length,
    unmatched: Math.max(0, monitoringEligible.length - matched.length),
    matchPercent: monitoringEligible.length === 0 ? null : safePercentage(matched.length, monitoringEligible.length),
  };

  const emptyValues: PanelFinancialValues = { revenue: null, costs: null, profit: null };
  const empty: MelPanelAnalysis = {
    monitoringPeriodLabel: input.monitoringPeriodLabel,
    monitoringPeriodCode: input.monitoringPeriodCode,
    coverage,
    viewMode: "empty",
    selectedBusinessId: input.panelBusinessId,
    summaryLabel: "No matched panel data",
    baseline: emptyValues,
    monitoring: emptyValues,
    change: emptyValues,
    changePercent: emptyValues,
    matchedEnterprises: matched,
    enterpriseOptions,
  };

  if (matched.length === 0) return empty;

  if (input.panelBusinessId !== null) {
    const selected = matched.find((row) => row.businessId === input.panelBusinessId);
    if (!selected) {
      return {
        ...empty,
        viewMode: "empty",
        summaryLabel: `Enterprise ${input.panelBusinessId} is not in the matched panel (needs imported baseline and Jun–Aug monitoring with financial activity).`,
      };
    }
    const change = diffValues(selected.monitoring, selected.baseline);
    return {
      monitoringPeriodLabel: input.monitoringPeriodLabel,
      monitoringPeriodCode: input.monitoringPeriodCode,
      coverage,
      viewMode: "single",
      selectedBusinessId: input.panelBusinessId,
      summaryLabel: `${selected.businessName} (ID ${selected.businessId})`,
      baseline: selected.baseline,
      monitoring: selected.monitoring,
      change,
      changePercent: percentChangeValues(change, selected.baseline),
      matchedEnterprises: matched,
      enterpriseOptions,
    };
  }

  const baseline = medianValues(matched, (row) => row.baseline);
  const monitoring = medianValues(matched, (row) => row.monitoring);
  const change = diffValues(monitoring, baseline);
  return {
    monitoringPeriodLabel: input.monitoringPeriodLabel,
    monitoringPeriodCode: input.monitoringPeriodCode,
    coverage,
    viewMode: "cohort",
    selectedBusinessId: null,
    summaryLabel: `Matched panel median (${matched.length} enterprises)`,
    baseline,
    monitoring,
    change,
    changePercent: percentChangeValues(change, baseline),
    matchedEnterprises: matched,
    enterpriseOptions,
  };
}
