import { median, safePercentage, type ApprovedMonitoringRecord } from "./indicator-engine";
import { snapshotMonthlyField, withReportedFinancialActivity } from "./financial-baselines";
import {
  computePanelAnalysis,
  shortMonitoringPeriodLabel,
  type MelPanelAnalysis,
  type PanelCoverage,
  type PanelDataQualitySummary,
  type PanelEnterpriseInput,
  type PanelFinancialValues,
  type PanelTrendPoint,
  PANEL_OUTLIER_MONTHLY_THRESHOLD,
  hasFinancialActivity,
  isPanelMatchedCandidate,
} from "./panel-analysis-core";

export const PANEL_MONITORING_PERIOD_CODE = "Y1-MQ1";

export type {
  MelPanelAnalysis,
  PanelCoverage,
  PanelDashboardFilters,
  PanelDataQualitySummary,
  PanelDisaggregation,
  PanelFinancialValues,
  PanelMatchedEnterprise,
  PanelSource,
  PanelTrendPoint,
} from "./panel-analysis-core";

export type PanelMonitoringPeriod = {
  id: number;
  code: string;
  label: string;
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

function buildSystemCoverage(input: {
  baselineTotalRows: number;
  baselineUniqueIds: number;
  monitoringTotal: number;
  matched: number;
  unmatchedMonitoringIds: number[];
  unmatchedBaselineCount: number;
  monitoringEligible: number;
}): PanelCoverage {
  const unmatchedMonitoringCount = input.unmatchedMonitoringIds.length;
  const matchPercentOfBaseline =
    input.baselineUniqueIds === 0 ? null : safePercentage(input.matched, input.baselineUniqueIds);
  return {
    baselineTotalRows: input.baselineTotalRows,
    baselineUniqueIds: input.baselineUniqueIds,
    monitoringTotal: input.monitoringTotal,
    matched: input.matched,
    unmatchedMonitoringCount,
    unmatchedBaselineCount: input.unmatchedBaselineCount,
    matchPercentOfBaseline,
    monitoringEligible: input.monitoringEligible,
    unmatched: unmatchedMonitoringCount,
    matchPercent: matchPercentOfBaseline,
    unmatchedMonitoringIds: input.unmatchedMonitoringIds.sort((left, right) => left - right),
  };
}

function medianField(values: Array<number | null>): number | null {
  return median(values.filter((value): value is number => value !== null && Number.isFinite(value)));
}

function trendPoint(key: string, label: string, rows: PanelFinancialValues[]): PanelTrendPoint {
  return {
    key,
    label,
    n: rows.length,
    revenue: medianField(rows.map((row) => row.revenue)),
    costs: medianField(rows.map((row) => row.costs)),
    profit: medianField(rows.map((row) => row.profit)),
  };
}

export function buildSystemPanelTrend(input: {
  records: ApprovedMonitoringRecord[];
  monitoringPeriods: PanelMonitoringPeriod[];
  activeBaselinesByBusinessId: Map<number, ActiveEnterpriseBaseline>;
  panelBusinessId: number | null;
}): PanelTrendPoint[] {
  const periods = input.monitoringPeriods;
  if (periods.length === 0) return [];

  const cohort = new Map<number, PanelFinancialValues>();
  const periodRows = new Map<number, PanelFinancialValues[]>();

  for (const period of periods) {
    const rows: PanelFinancialValues[] = [];
    const seen = new Set<number>();
    for (const record of input.records) {
      if (record.periodId !== period.id || seen.has(record.businessId)) continue;
      if (input.panelBusinessId !== null && record.businessId !== input.panelBusinessId) continue;
      const baseline = resolveEnterpriseOwnBaseline(
        record.financialBaselineSnapshot,
        input.activeBaselinesByBusinessId.get(record.businessId)
      );
      const monitoring = monitoringMonthly(record);
      if (!hasOwnBaseline(baseline) || !hasFinancialActivity(monitoring)) continue;
      seen.add(record.businessId);
      if (!cohort.has(record.businessId)) cohort.set(record.businessId, baseline);
      rows.push(monitoring);
    }
    periodRows.set(period.id, rows);
  }

  const baselineRows = [...cohort.values()];
  return [
    trendPoint("baseline", "Baseline", baselineRows),
    ...periods.map((period) =>
      trendPoint(period.code, shortMonitoringPeriodLabel(period.label), periodRows.get(period.id) ?? [])
    ),
  ];
}

export function buildPanelAnalysis(input: {
  records: ApprovedMonitoringRecord[];
  monitoringPeriodId: number;
  monitoringPeriodLabel: string;
  monitoringPeriodCode: string;
  monitoringPeriods?: PanelMonitoringPeriod[];
  activeBaselinesByBusinessId: Map<number, ActiveEnterpriseBaseline>;
  panelBusinessId: number | null;
}): MelPanelAnalysis {
  const monitoringPeriods = input.monitoringPeriods?.length
    ? input.monitoringPeriods
    : [{
        id: input.monitoringPeriodId,
        code: input.monitoringPeriodCode,
        label: input.monitoringPeriodLabel,
      }];
  const focusPeriod = monitoringPeriods.find((period) => period.id === input.monitoringPeriodId) ?? monitoringPeriods[monitoringPeriods.length - 1];
  const panelPeriodRecords = input.records.filter((record) => record.periodId === focusPeriod.id);
  const monitoringEligible = withReportedFinancialActivity(panelPeriodRecords);
  const monitoringByBusinessId = new Map(panelPeriodRecords.map((record) => [record.businessId, record]));

  const baselineUniqueIds = new Set<number>();
  for (const businessId of input.activeBaselinesByBusinessId.keys()) {
    baselineUniqueIds.add(businessId);
  }
  for (const record of panelPeriodRecords) {
    const baseline = resolveEnterpriseOwnBaseline(
      record.financialBaselineSnapshot,
      input.activeBaselinesByBusinessId.get(record.businessId)
    );
    if (hasOwnBaseline(baseline)) baselineUniqueIds.add(record.businessId);
  }
  const monitoringIds = new Set(panelPeriodRecords.map((record) => record.businessId));

  const enterprises: PanelEnterpriseInput[] = [];
  const allBusinessIds = new Set([...baselineUniqueIds, ...monitoringIds]);

  let monitoringAllZeroCount = 0;
  let baselineNegativeProfitCount = 0;
  let outlierCount = 0;

  for (const businessId of allBusinessIds) {
    const record = monitoringByBusinessId.get(businessId);
    const tableRow = input.activeBaselinesByBusinessId.get(businessId);
    const baseline = resolveEnterpriseOwnBaseline(record?.financialBaselineSnapshot, tableRow);
    const monitoring = record ? monitoringMonthly(record) : null;
    const flags: string[] = [];

    if (monitoring && !hasFinancialActivity(monitoring)) {
      monitoringAllZeroCount += 1;
      flags.push("monitoring_all_zero_non_response");
    }
    if (baseline.profit !== null && baseline.profit < 0) baselineNegativeProfitCount += 1;
    if (
      [baseline, monitoring].some((values) =>
        values &&
        [values.revenue, values.costs, values.profit].some(
          (value) => value !== null && Math.abs(value) > PANEL_OUTLIER_MONTHLY_THRESHOLD
        )
      )
    ) {
      outlierCount += 1;
      flags.push("outlier_monthly_value");
    }

    const inBaselineUniverse = hasOwnBaseline(baseline);
    enterprises.push({
      businessId,
      businessName: record?.businessName ?? `Enterprise ${businessId}`,
      track: record?.dimensions.track ?? null,
      ownerGender: record?.dimensions.ownerGender ?? null,
      ownerYouth: record?.dimensions.ownerYouth ?? null,
      sector: record?.dimensions.sector ?? null,
      county: record?.dimensions.county ?? null,
      baseline,
      monitoring,
      inBaselineUniverse,
      inMonitoringRound: monitoringIds.has(businessId),
      excludedFromPanel: false,
      flags,
    });
  }

  const matchedIds = enterprises.filter((row) => isPanelMatchedCandidate(row)).map((row) => row.businessId);
  const matchedSet = new Set(matchedIds);
  const unmatchedMonitoringIds = [...monitoringIds].filter((id) => !matchedSet.has(id));
  const unmatchedBaselineCount = [...baselineUniqueIds].filter((id) => !matchedSet.has(id)).length;

  const dataQuality: PanelDataQualitySummary = {
    duplicateBaselineIds: [],
    missingBaselineIds: 0,
    missingMonitoringIds: 0,
    monitoringAllZeroCount,
    baselineNegativeProfitCount,
    outlierCount,
    excludedDuplicateRows: 0,
    notes: [
      "Live monitoring quarterly totals are converted to monthly (÷ 3).",
      "Missing financial fields are not treated as zero; medians use non-null values only.",
      "All-zero monitoring (revenue, costs, and profit) is treated as non-response and excluded from the matched panel.",
      "Each monitoring quarter through the selected period is matched to the enterprise baseline. Later quarters join the trend when their reports are approved.",
    ],
  };

  const coverage = buildSystemCoverage({
    baselineTotalRows: input.activeBaselinesByBusinessId.size,
    baselineUniqueIds: baselineUniqueIds.size,
    monitoringTotal: panelPeriodRecords.length,
    matched: matchedSet.size,
    unmatchedMonitoringIds,
    unmatchedBaselineCount,
    monitoringEligible: monitoringEligible.length,
  });

  const analysis = computePanelAnalysis({
    source: "system",
    monitoringPeriodLabel: focusPeriod.label,
    monitoringPeriodCode: focusPeriod.code,
    enterprises,
    panelBusinessId: input.panelBusinessId,
    dataQuality,
    coverage,
  });
  return {
    ...analysis,
    trend: buildSystemPanelTrend({
      records: input.records,
      monitoringPeriods,
      activeBaselinesByBusinessId: input.activeBaselinesByBusinessId,
      panelBusinessId: input.panelBusinessId,
    }),
  };
}
