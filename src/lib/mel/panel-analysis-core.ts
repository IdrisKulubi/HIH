import { median, safePercentage } from "./indicator-engine";

export const PANEL_OUTLIER_MONTHLY_THRESHOLD = 10_000_000;
export const PANEL_MIN_DISAGGREGATION_N = 10;

export type PanelFinancialValues = {
  revenue: number | null;
  costs: number | null;
  profit: number | null;
};

export type PanelMatchedEnterprise = {
  businessId: number;
  businessName: string;
  track: string | null;
  ownerGender: string | null;
  ownerYouth: boolean | null;
  sector: string | null;
  county: string | null;
  baseline: PanelFinancialValues;
  monitoring: PanelFinancialValues;
  flags: string[];
};

export type PanelDataQualitySummary = {
  duplicateBaselineIds: Array<{ businessId: string; names: string[] }>;
  missingBaselineIds: number;
  missingMonitoringIds: number;
  monitoringAllZeroCount: number;
  baselineNegativeProfitCount: number;
  outlierCount: number;
  excludedDuplicateRows: number;
  notes: string[];
};

export type PanelCoverage = {
  baselineTotalRows: number;
  baselineUniqueIds: number;
  monitoringTotal: number;
  matched: number;
  unmatchedMonitoringCount: number;
  unmatchedBaselineCount: number;
  matchPercentOfBaseline: number | null;
  monitoringEligible: number;
  unmatched: number;
  matchPercent: number | null;
  unmatchedMonitoringIds: number[];
};

export type PanelDisaggregationGroup = {
  key: string;
  label: string;
  n: number;
  baseline: PanelFinancialValues;
  monitoring: PanelFinancialValues;
  change: PanelFinancialValues;
  changePercent: PanelFinancialValues;
};

export type PanelDisaggregation = {
  dimension: string;
  groups: PanelDisaggregationGroup[];
};

export type PanelComparisonSummary = {
  label: string;
  enterpriseCount: number;
  baseline: PanelFinancialValues;
  monitoring: PanelFinancialValues;
  changePercent: PanelFinancialValues;
};

export type PanelSource = "system" | "workbook";

export type PanelTrendPoint = {
  key: string;
  label: string;
  n: number;
  revenue: number | null;
  costs: number | null;
  profit: number | null;
};

export type PanelDashboardFilters = {
  track?: string | null;
  county?: string | null;
  sector?: string | null;
  ownerGender?: string | null;
};

export function shortMonitoringPeriodLabel(label: string): string {
  const paren = /\(([^)]+)\)/.exec(label);
  const inner = (paren ? paren[1] : label).split("·")[0]?.trim() ?? label;
  const shortened = inner.replace(/\s*20\d{2}/g, "").replace(/\s*–\s*/g, "–").replace(/\s+/g, " ").trim();
  return shortened || label;
}

export function snapshotPanelTrend(input: {
  periodCode: string;
  periodLabel: string;
  n: number;
  baseline: PanelFinancialValues;
  monitoring: PanelFinancialValues;
}): PanelTrendPoint[] {
  return [
    {
      key: "baseline",
      label: "Baseline",
      n: input.n,
      revenue: input.baseline.revenue,
      costs: input.baseline.costs,
      profit: input.baseline.profit,
    },
    {
      key: input.periodCode,
      label: shortMonitoringPeriodLabel(input.periodLabel),
      n: input.n,
      revenue: input.monitoring.revenue,
      costs: input.monitoring.costs,
      profit: input.monitoring.profit,
    },
  ];
}

export function panelEnterpriseMatchesFilters(
  enterprise: {
    track: string | null;
    ownerGender: string | null;
    ownerYouth: boolean | null;
    sector: string | null;
    county: string | null;
  },
  filters: PanelDashboardFilters | null | undefined
): boolean {
  if (!filters) return true;
  if (filters.track && enterprise.track !== filters.track) return false;
  if (filters.county && enterprise.county !== filters.county) return false;
  if (filters.sector && enterprise.sector !== filters.sector) return false;
  if (!filters.ownerGender) return true;
  if (filters.ownerGender === "youth") return enterprise.ownerYouth === true;
  return enterprise.ownerGender === filters.ownerGender;
}

export type MelPanelAnalysis = {
  source: PanelSource;
  monitoringPeriodLabel: string;
  monitoringPeriodCode: string;
  coverage: PanelCoverage;
  dataQuality: PanelDataQualitySummary;
  viewMode: "cohort" | "single" | "empty";
  selectedBusinessId: number | null;
  summaryLabel: string;
  baseline: PanelFinancialValues;
  monitoring: PanelFinancialValues;
  change: PanelFinancialValues;
  changePercent: PanelFinancialValues;
  sensitivityBaseline: PanelFinancialValues;
  sensitivityMonitoring: PanelFinancialValues;
  sensitivityChangePercent: PanelFinancialValues;
  unpairedMonitoring: PanelComparisonSummary;
  matchedPanel: PanelComparisonSummary;
  disaggregations: PanelDisaggregation[];
  interpretation: string[];
  matchedEnterprises: PanelMatchedEnterprise[];
  enterpriseOptions: Array<{ businessId: number; label: string }>;
  trend: PanelTrendPoint[];
};

export type PanelEnterpriseInput = {
  businessId: number;
  businessName: string;
  track: string | null;
  ownerGender: string | null;
  ownerYouth: boolean | null;
  sector: string | null;
  county: string | null;
  baseline: PanelFinancialValues;
  monitoring: PanelFinancialValues | null;
  inBaselineUniverse: boolean;
  inMonitoringRound: boolean;
  excludedFromPanel: boolean;
  flags: string[];
};

export function hasFinancialActivity(values: PanelFinancialValues): boolean {
  return [values.revenue, values.costs, values.profit].some(
    (value) => value !== null && Number.isFinite(value) && value !== 0
  );
}

function hasBaselinePresent(baseline: PanelFinancialValues): boolean {
  return baseline.revenue !== null || baseline.costs !== null || baseline.profit !== null;
}

/** Matched panel: same ID, baseline present, monitoring with at least one non-zero financial value. */
export function isPanelMatchedCandidate(row: PanelEnterpriseInput): boolean {
  if (row.excludedFromPanel || !row.inBaselineUniverse || !row.inMonitoringRound || !row.monitoring) return false;
  if (!hasBaselinePresent(row.baseline)) return false;
  return hasFinancialActivity(row.monitoring);
}

function medianField(rows: PanelMatchedEnterprise[], field: keyof PanelFinancialValues): number | null {
  return median(
    rows
      .map((row) => row.baseline[field])
      .filter((value): value is number => value !== null && Number.isFinite(value))
  );
}

function medianMonitoringField(rows: PanelMatchedEnterprise[], field: keyof PanelFinancialValues): number | null {
  return median(
    rows
      .map((row) => row.monitoring[field])
      .filter((value): value is number => value !== null && Number.isFinite(value))
  );
}

function medianValuesFromMatched(
  rows: PanelMatchedEnterprise[],
  selector: "baseline" | "monitoring"
): PanelFinancialValues {
  const pick = (field: keyof PanelFinancialValues) =>
    selector === "baseline" ? medianField(rows, field) : medianMonitoringField(rows, field);
  return { revenue: pick("revenue"), costs: pick("costs"), profit: pick("profit") };
}

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
    return base === null || delta === null ? null : safePercentage(delta, base);
  };
  return { revenue: pct("revenue"), costs: pct("costs"), profit: pct("profit") };
}

function isOutlier(row: PanelMatchedEnterprise): boolean {
  return [row.baseline, row.monitoring].some((values) =>
    [values.revenue, values.costs, values.profit].some(
      (value) => value !== null && Math.abs(value) > PANEL_OUTLIER_MONTHLY_THRESHOLD
    )
  );
}

function buildDisaggregation(
  dimension: string,
  matched: PanelMatchedEnterprise[],
  groupBy: (row: PanelMatchedEnterprise) => string | null,
  labelFor: (key: string) => string
): PanelDisaggregation {
  const keys = [...new Set(matched.map((row) => groupBy(row)).filter((key): key is string => Boolean(key)))].sort();
  const groups = keys.map((key) => {
    const rows = matched.filter((row) => groupBy(row) === key);
    const baseline = medianValuesFromMatched(rows, "baseline");
    const monitoring = medianValuesFromMatched(rows, "monitoring");
    const change = diffValues(monitoring, baseline);
    return {
      key,
      label: labelFor(key),
      n: rows.length,
      baseline,
      monitoring,
      change,
      changePercent: percentChangeValues(change, baseline),
    };
  });
  return { dimension, groups };
}

function buildInterpretation(
  matched: PanelMatchedEnterprise[],
  coverage: PanelCoverage,
  changePercent: PanelFinancialValues,
  disaggregations: PanelDisaggregation[]
): string[] {
  const lines: string[] = [];
  if (matched.length === 0) {
    lines.push("No enterprises could be matched on Enterprise ID with both baseline and monitoring financial data.");
    return lines;
  }
  const direction = (measure: keyof PanelFinancialValues, label: string) => {
    const pct = changePercent[measure];
    if (pct === null) return;
    if (pct > 0) lines.push(`${label} increased by ${pct.toFixed(1)}% (median, matched panel).`);
    else if (pct < 0) lines.push(`${label} decreased by ${Math.abs(pct).toFixed(1)}% (median, matched panel).`);
    else lines.push(`${label} was unchanged at the median (matched panel).`);
  };
  direction("revenue", "Revenue");
  direction("costs", "Costs");
  direction("profit", "Profit");

  const magnitudes = (["revenue", "costs", "profit"] as const)
    .map((key) => ({ key, value: Math.abs(changePercent[key] ?? 0) }))
    .sort((left, right) => right.value - left.value);
  if (magnitudes[0]?.value) {
    const labels = { revenue: "Revenue", costs: "Costs", profit: "Profit" };
    lines.push(`The largest median shift was in ${labels[magnitudes[0].key]} (${magnitudes[0].value.toFixed(1)}% absolute change).`);
  }

  const track = disaggregations.find((item) => item.dimension === "Track");
  const overall = track?.groups.find((group) => group.key === "overall");
  const foundation = track?.groups.find((group) => group.key === "foundation");
  const acceleration = track?.groups.find((group) => group.key === "acceleration");
  if (overall && overall.changePercent.profit !== null) {
    lines.push(
      `Overall matched enterprises (n=${overall.n}) had median profit change of ${formatPct(overall.changePercent.profit)} (revenue ${formatPct(overall.changePercent.revenue)}).`
    );
  }
  if (foundation && acceleration && foundation.n >= PANEL_MIN_DISAGGREGATION_N && acceleration.n >= PANEL_MIN_DISAGGREGATION_N) {
    const fProfit = foundation.changePercent.profit;
    const aProfit = acceleration.changePercent.profit;
    if (fProfit !== null && aProfit !== null) {
      lines.push(
        `By track: Foundation (n=${foundation.n}) median profit change ${fProfit.toFixed(1)}%; Accelerator (n=${acceleration.n}) ${aProfit.toFixed(1)}%.`
      );
    }
  }

  const gender = disaggregations.find((item) => item.dimension === "Owner gender");
  const female = gender?.groups.find((group) => group.key === "female");
  const male = gender?.groups.find((group) => group.key === "male");
  if (female && male && female.n >= PANEL_MIN_DISAGGREGATION_N && male.n >= PANEL_MIN_DISAGGREGATION_N) {
    lines.push(
      `Female-led matched enterprises (n=${female.n}) had median profit change of ${formatPct(female.changePercent.profit)}; male-led (n=${male.n}) had ${formatPct(male.changePercent.profit)}.`
    );
  }

  const youth = disaggregations.find((item) => item.dimension === "Youth-led");
  const youthYes = youth?.groups.find((group) => group.key === "youth");
  const youthNo = youth?.groups.find((group) => group.key === "non_youth");
  if (youthYes && youthNo && youthYes.n >= PANEL_MIN_DISAGGREGATION_N && youthNo.n >= PANEL_MIN_DISAGGREGATION_N) {
    lines.push(
      `Youth-led matched enterprises (n=${youthYes.n}) had median profit change of ${formatPct(youthYes.changePercent.profit)}; non-youth-led (n=${youthNo.n}) had ${formatPct(youthNo.changePercent.profit)}.`
    );
  }

  if (coverage.baselineUniqueIds > 0 && coverage.matched < coverage.baselineUniqueIds) {
    const notReached = coverage.baselineUniqueIds - coverage.matched;
    const pct = ((notReached / coverage.baselineUniqueIds) * 100).toFixed(1);
    lines.push(
      `Limitation: ${notReached} baseline enterprises (${pct}%) are not in the matched panel, so results describe enterprises reached in monitoring—not the full baseline cohort of ${coverage.baselineUniqueIds} unique IDs.`
    );
  }
  return lines;
}

function formatPct(value: number | null) {
  if (value === null) return "no comparable median";
  return `${value.toFixed(1)}%`;
}

export function computePanelAnalysis(input: {
  source: PanelSource;
  monitoringPeriodLabel: string;
  monitoringPeriodCode: string;
  enterprises: PanelEnterpriseInput[];
  panelBusinessId: number | null;
  dataQuality: PanelDataQualitySummary;
  coverage: PanelCoverage;
}): MelPanelAnalysis {
  const emptyValues: PanelFinancialValues = { revenue: null, costs: null, profit: null };
  const monitoringWithActivity = input.enterprises.filter(
    (row) => row.inMonitoringRound && row.monitoring && hasFinancialActivity(row.monitoring)
  );

  const matched: PanelMatchedEnterprise[] = [];
  for (const row of input.enterprises) {
    if (!isPanelMatchedCandidate(row) || !row.monitoring) continue;
    matched.push({
      businessId: row.businessId,
      businessName: row.businessName,
      track: row.track,
      ownerGender: row.ownerGender,
      ownerYouth: row.ownerYouth,
      sector: row.sector,
      county: row.county,
      baseline: row.baseline,
      monitoring: row.monitoring,
      flags: row.flags,
    });
  }

  const enterpriseOptions = input.enterprises
    .filter((row) => isPanelMatchedCandidate(row))
    .map((row) => ({
      businessId: row.businessId,
      label: `${row.businessId} — ${row.businessName}`,
    }))
    .sort((left, right) => left.businessId - right.businessId);

  const unpairedRows: PanelMatchedEnterprise[] = monitoringWithActivity.map((row) => ({
    businessId: row.businessId,
    businessName: row.businessName,
    track: row.track,
    ownerGender: row.ownerGender,
    ownerYouth: row.ownerYouth,
    sector: row.sector,
    county: row.county,
    baseline: emptyValues,
    monitoring: row.monitoring!,
    flags: row.flags,
  }));
  const unpairedMonitoringMedians = medianValuesFromMatched(unpairedRows, "monitoring");

  const baseResult = {
    source: input.source,
    monitoringPeriodLabel: input.monitoringPeriodLabel,
    monitoringPeriodCode: input.monitoringPeriodCode,
    coverage: input.coverage,
    dataQuality: input.dataQuality,
    matchedEnterprises: matched,
    enterpriseOptions,
    sensitivityBaseline: emptyValues,
    sensitivityMonitoring: emptyValues,
    sensitivityChangePercent: emptyValues,
    unpairedMonitoring: {
      label: "Overall monitoring (all reached enterprises with activity)",
      enterpriseCount: monitoringWithActivity.length,
      baseline: emptyValues,
      monitoring: unpairedMonitoringMedians,
      changePercent: emptyValues,
    },
    matchedPanel: {
      label: "Matched panel (same Enterprise ID at baseline and monitoring)",
      enterpriseCount: matched.length,
      baseline: emptyValues,
      monitoring: emptyValues,
      changePercent: emptyValues,
    },
    disaggregations: [] as PanelDisaggregation[],
    interpretation: [] as string[],
    trend: snapshotPanelTrend({
      periodCode: input.monitoringPeriodCode,
      periodLabel: input.monitoringPeriodLabel,
      n: 0,
      baseline: emptyValues,
      monitoring: emptyValues,
    }),
  };

  if (matched.length === 0) {
    return {
      ...baseResult,
      viewMode: "empty",
      selectedBusinessId: input.panelBusinessId,
      summaryLabel: "No matched panel data",
      baseline: emptyValues,
      monitoring: emptyValues,
      change: emptyValues,
      changePercent: emptyValues,
      interpretation: buildInterpretation(matched, input.coverage, emptyValues, []),
    };
  }

  if (input.panelBusinessId !== null) {
    const selected = matched.find((row) => row.businessId === input.panelBusinessId);
    if (!selected) {
      return {
        ...baseResult,
        viewMode: "empty",
        selectedBusinessId: input.panelBusinessId,
        summaryLabel: `Enterprise ${input.panelBusinessId} is not in the matched panel.`,
        baseline: emptyValues,
        monitoring: emptyValues,
        change: emptyValues,
        changePercent: emptyValues,
        interpretation: buildInterpretation(matched, input.coverage, emptyValues, []),
      };
    }
    const change = diffValues(selected.monitoring, selected.baseline);
    const changePercent = percentChangeValues(change, selected.baseline);
    const disaggregations = buildAllDisaggregations(matched);
    return {
      ...baseResult,
      viewMode: "single",
      selectedBusinessId: input.panelBusinessId,
      summaryLabel: `${selected.businessName} (ID ${selected.businessId})`,
      baseline: selected.baseline,
      monitoring: selected.monitoring,
      change,
      changePercent,
      ...sensitivityFromMatched(matched),
      matchedPanel: {
        label: "Matched panel (same Enterprise ID at baseline and monitoring)",
        enterpriseCount: matched.length,
        baseline: medianValuesFromMatched(matched, "baseline"),
        monitoring: medianValuesFromMatched(matched, "monitoring"),
        changePercent: percentChangeValues(
          diffValues(medianValuesFromMatched(matched, "monitoring"), medianValuesFromMatched(matched, "baseline")),
          medianValuesFromMatched(matched, "baseline")
        ),
      },
      disaggregations,
      interpretation: buildInterpretation(matched, input.coverage, changePercent, disaggregations),
      trend: snapshotPanelTrend({
        periodCode: input.monitoringPeriodCode,
        periodLabel: input.monitoringPeriodLabel,
        n: 1,
        baseline: selected.baseline,
        monitoring: selected.monitoring,
      }),
    };
  }

  const baseline = medianValuesFromMatched(matched, "baseline");
  const monitoring = medianValuesFromMatched(matched, "monitoring");
  const change = diffValues(monitoring, baseline);
  const changePercent = percentChangeValues(change, baseline);
  const disaggregations = buildAllDisaggregations(matched);
  const sensitivity = sensitivityFromMatched(matched);

  return {
    ...baseResult,
    viewMode: "cohort",
    selectedBusinessId: null,
    summaryLabel: `Matched panel median (n=${matched.length})`,
    baseline,
    monitoring,
    change,
    changePercent,
    ...sensitivity,
    matchedPanel: {
      label: "Matched panel (same Enterprise ID at baseline and monitoring)",
      enterpriseCount: matched.length,
      baseline,
      monitoring,
      changePercent,
    },
    disaggregations,
    interpretation: buildInterpretation(matched, input.coverage, changePercent, disaggregations),
    trend: snapshotPanelTrend({
      periodCode: input.monitoringPeriodCode,
      periodLabel: input.monitoringPeriodLabel,
      n: matched.length,
      baseline,
      monitoring,
    }),
  };
}

function sensitivityFromMatched(matched: PanelMatchedEnterprise[]) {
  const trimmed = matched.filter((row) => !isOutlier(row));
  const baseline = medianValuesFromMatched(trimmed, "baseline");
  const monitoring = medianValuesFromMatched(trimmed, "monitoring");
  const change = diffValues(monitoring, baseline);
  return {
    sensitivityBaseline: baseline,
    sensitivityMonitoring: monitoring,
    sensitivityChangePercent: percentChangeValues(change, baseline),
  };
}

function buildTrackGroup(
  key: string,
  label: string,
  rows: PanelMatchedEnterprise[]
): PanelDisaggregationGroup {
  const baseline = medianValuesFromMatched(rows, "baseline");
  const monitoring = medianValuesFromMatched(rows, "monitoring");
  const change = diffValues(monitoring, baseline);
  return {
    key,
    label,
    n: rows.length,
    baseline,
    monitoring,
    change,
    changePercent: percentChangeValues(change, baseline),
  };
}

function buildTrackDisaggregation(matched: PanelMatchedEnterprise[]): PanelDisaggregation {
  const foundationRows = matched.filter((row) => normalizeTrack(row.track) === "foundation");
  const accelerationRows = matched.filter((row) => normalizeTrack(row.track) === "acceleration");
  const otherTrackKeys = [
    ...new Set(
      matched
        .map((row) => normalizeTrack(row.track))
        .filter((key): key is string => Boolean(key) && key !== "foundation" && key !== "acceleration")
    ),
  ].sort();

  const groups: PanelDisaggregationGroup[] = [];
  if (matched.length > 0) {
    groups.push(buildTrackGroup("overall", "Overall", matched));
  }
  if (foundationRows.length > 0) {
    groups.push(buildTrackGroup("foundation", "Foundation", foundationRows));
  }
  if (accelerationRows.length > 0) {
    groups.push(buildTrackGroup("acceleration", "Accelerator", accelerationRows));
  }
  for (const key of otherTrackKeys) {
    const rows = matched.filter((row) => normalizeTrack(row.track) === key);
    if (rows.length > 0) {
      groups.push(buildTrackGroup(key, titleCase(key), rows));
    }
  }
  return { dimension: "Track", groups };
}

function buildAllDisaggregations(matched: PanelMatchedEnterprise[]): PanelDisaggregation[] {
  return [
    buildTrackDisaggregation(matched),
    buildDisaggregation("Owner gender", matched, (row) => row.ownerGender, (key) => titleCase(key)),
    buildDisaggregation(
      "Youth-led",
      matched,
      (row) => (row.ownerYouth === true ? "youth" : row.ownerYouth === false ? "non_youth" : null),
      (key) => (key === "youth" ? "Youth-led" : "Non-youth-led")
    ),
    buildDisaggregation("Sector", matched, (row) => row.sector, (key) => titleCase(key.replaceAll("_", " "))),
    buildDisaggregation("County", matched, (row) => row.county, (key) => titleCase(key)),
  ].filter((item) => item.groups.length > 0);
}

function normalizeTrack(track: string | null) {
  if (!track) return null;
  const value = track.toLowerCase();
  if (value === "acceleration" || value === "accelerator") return "acceleration";
  if (value === "foundation") return "foundation";
  return value;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function emptyPanelAnalysis(
  partial: Partial<MelPanelAnalysis> & Pick<MelPanelAnalysis, "monitoringPeriodLabel" | "monitoringPeriodCode">
): MelPanelAnalysis {
  const emptyValues: PanelFinancialValues = { revenue: null, costs: null, profit: null };
  const emptyCoverage: PanelCoverage = {
    baselineTotalRows: 0,
    baselineUniqueIds: 0,
    monitoringTotal: 0,
    matched: 0,
    unmatchedMonitoringCount: 0,
    unmatchedBaselineCount: 0,
    matchPercentOfBaseline: null,
    monitoringEligible: 0,
    unmatched: 0,
    matchPercent: null,
    unmatchedMonitoringIds: [],
  };
  return {
    source: "system",
    monitoringPeriodLabel: partial.monitoringPeriodLabel,
    monitoringPeriodCode: partial.monitoringPeriodCode,
    coverage: partial.coverage ?? emptyCoverage,
    dataQuality: partial.dataQuality ?? {
      duplicateBaselineIds: [],
      missingBaselineIds: 0,
      missingMonitoringIds: 0,
      monitoringAllZeroCount: 0,
      baselineNegativeProfitCount: 0,
      outlierCount: 0,
      excludedDuplicateRows: 0,
      notes: [],
    },
    viewMode: "empty",
    selectedBusinessId: partial.selectedBusinessId ?? null,
    summaryLabel: partial.summaryLabel ?? "No matched panel data",
    baseline: emptyValues,
    monitoring: emptyValues,
    change: emptyValues,
    changePercent: emptyValues,
    sensitivityBaseline: emptyValues,
    sensitivityMonitoring: emptyValues,
    sensitivityChangePercent: emptyValues,
    unpairedMonitoring: {
      label: "Overall monitoring (all reached enterprises with activity)",
      enterpriseCount: 0,
      baseline: emptyValues,
      monitoring: emptyValues,
      changePercent: emptyValues,
    },
    matchedPanel: {
      label: "Matched panel (same Enterprise ID at baseline and monitoring)",
      enterpriseCount: 0,
      baseline: emptyValues,
      monitoring: emptyValues,
      changePercent: emptyValues,
    },
    disaggregations: [],
    interpretation: [],
    matchedEnterprises: [],
    enterpriseOptions: [],
    trend: [],
  };
}
