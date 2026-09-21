import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { safePercentage } from "./indicator-engine";
import {
  computePanelAnalysis,
  emptyPanelAnalysis,
  hasFinancialActivity,
  PANEL_OUTLIER_MONTHLY_THRESHOLD,
  type MelPanelAnalysis,
  type PanelDataQualitySummary,
  type PanelEnterpriseInput,
  type PanelFinancialValues,
} from "./panel-analysis-core";

export const PANEL_WORKBOOK_RELATIVE_PATH = "data/mel/panel-analysis.xlsx";

export type PanelWorkbookDemographics = {
  businessId: number;
  businessName: string;
  track: string | null;
  ownerGender: string | null;
  ownerYouth: boolean | null;
  sector: string | null;
  county: string | null;
};

export type ParsedPanelWorkbook = {
  baselineRows: Array<{
    businessId: number;
    businessName: string;
    track: string | null;
    baseline: PanelFinancialValues;
  }>;
  monitoringRows: Array<{
    businessId: number;
    businessName: string;
    monitoring: PanelFinancialValues;
  }>;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sheetRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false });
}

function pickField(row: Record<string, unknown>, candidates: string[]): unknown {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const match = entries.find(([key]) => normalizeHeader(key) === candidate);
    if (match) return match[1];
  }
  return null;
}

export function parsePanelAnalysisWorkbook(buffer: Buffer): ParsedPanelWorkbook {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const baselineSheet = workbook.Sheets.Baseline ?? workbook.Sheets[workbook.SheetNames[0] ?? ""];
  const monitoringSheet =
    workbook.Sheets.Monitoring ?? workbook.Sheets[workbook.SheetNames[1] ?? workbook.SheetNames[0] ?? ""];
  if (!baselineSheet || !monitoringSheet) {
    throw new Error("Panel workbook must include Baseline and Monitoring sheets.");
  }

  const baselineRows = sheetRows(baselineSheet)
    .map((row) => {
      const businessId = parseNumber(pickField(row, ["enterprise_id", "enterprise_id_"]));
      if (businessId === null) return null;
      return {
        businessId: Math.trunc(businessId),
        businessName: String(pickField(row, ["business_name", "enterprise", "business"]) ?? `Enterprise ${businessId}`).trim(),
        track: String(pickField(row, ["enterprise_track", "enterprise_track_", "track"]) ?? "").trim() || null,
        baseline: {
          revenue: parseNumber(pickField(row, ["monthly_revenue", "monthly_revenue_kes"])),
          costs: parseNumber(pickField(row, ["monthly_cost", "monthly_costs", "monthly_costs_kes"])),
          profit: parseNumber(pickField(row, ["profit/loss", "profit_loss", "profit", "monthly_profit_kes"])),
        },
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const monitoringRows = sheetRows(monitoringSheet)
    .map((row) => {
      const businessId = parseNumber(pickField(row, ["enterprise_id", "enterprise_id_"]));
      if (businessId === null) return null;
      return {
        businessId: Math.trunc(businessId),
        businessName: String(pickField(row, ["enterprise", "business_name", "business"]) ?? `Enterprise ${businessId}`).trim(),
        monitoring: {
          revenue: parseNumber(pickField(row, ["monthly_revenue_kes", "monthly_revenue"])),
          costs: parseNumber(pickField(row, ["monthly_costs_kes", "monthly_costs", "monthly_cost"])),
          profit: parseNumber(pickField(row, ["monthly_profit_kes", "monthly_profit", "profit/loss", "profit_loss"])),
        },
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return { baselineRows, monitoringRows };
}

export function resolvePanelWorkbookPath(): string {
  return path.join(process.cwd(), PANEL_WORKBOOK_RELATIVE_PATH);
}

export function loadPanelWorkbookBuffer(): Buffer | null {
  const filePath = resolvePanelWorkbookPath();
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath);
}

function buildDataQualityAndEnterprises(
  parsed: ParsedPanelWorkbook,
  demographicsById: Map<number, PanelWorkbookDemographics>
): { enterprises: PanelEnterpriseInput[]; dataQuality: PanelDataQualitySummary; coverage: ReturnType<typeof buildWorkbookCoverage> } {
  const duplicateMap = new Map<number, string[]>();
  for (const row of parsed.baselineRows) {
    const names = duplicateMap.get(row.businessId) ?? [];
    names.push(row.businessName);
    duplicateMap.set(row.businessId, names);
  }
  const duplicateBaselineIds = [...duplicateMap.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([businessId, names]) => ({ businessId: String(businessId), names }));

  const duplicateIdSet = new Set(duplicateBaselineIds.map((item) => Number(item.businessId)));

  const baselineById = new Map<number, ParsedPanelWorkbook["baselineRows"][number]>();
  for (const row of parsed.baselineRows) {
    if (duplicateIdSet.has(row.businessId)) continue;
    if (!baselineById.has(row.businessId)) baselineById.set(row.businessId, row);
  }

  const monitoringById = new Map(parsed.monitoringRows.map((row) => [row.businessId, row]));
  const baselineIds = new Set(parsed.baselineRows.map((row) => row.businessId));
  const monitoringIds = new Set(parsed.monitoringRows.map((row) => row.businessId));

  const matchedIds = [...baselineIds].filter((id) => monitoringById.has(id) && !duplicateIdSet.has(id));
  const unmatchedMonitoringIds = [...monitoringIds].filter((id) => !baselineIds.has(id) || duplicateIdSet.has(id));
  const unmatchedBaselineCount = [...baselineIds].filter((id) => !monitoringIds.has(id) && !duplicateIdSet.has(id)).length;

  const uniqueBaselineIds = new Set(parsed.baselineRows.map((row) => row.businessId));
  const coverage = buildWorkbookCoverage({
    baselineTotalRows: parsed.baselineRows.length,
    baselineUniqueIds: uniqueBaselineIds.size,
    monitoringTotal: parsed.monitoringRows.length,
    matched: matchedIds.length,
    unmatchedMonitoringIds,
    unmatchedBaselineCount,
  });

  let monitoringAllZeroCount = 0;
  let baselineNegativeProfitCount = 0;
  let outlierCount = 0;
  let missingBaselineIds = 0;
  let missingMonitoringIds = 0;

  const allIds = new Set([...baselineIds, ...monitoringIds]);
  const enterprises: PanelEnterpriseInput[] = [];

  for (const businessId of allIds) {
    const baselineRow = baselineById.get(businessId);
    const monitoringRow = monitoringById.get(businessId);
    const demog = demographicsById.get(businessId);
    const excludedFromPanel = duplicateIdSet.has(businessId);
    const flags: string[] = [];
    if (excludedFromPanel) flags.push("duplicate_baseline_id");
    if (unmatchedMonitoringIds.includes(businessId)) flags.push("monitoring_not_in_baseline");

    const baseline: PanelFinancialValues = baselineRow?.baseline ?? { revenue: null, costs: null, profit: null };
    const monitoring = monitoringRow?.monitoring ?? null;

    if (!baselineRow && baselineIds.has(businessId)) missingBaselineIds += 1;
    if (!monitoringRow && monitoringIds.has(businessId)) missingMonitoringIds += 1;
    if (monitoring && !hasFinancialActivity(monitoring)) monitoringAllZeroCount += 1;
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

    enterprises.push({
      businessId,
      businessName: demog?.businessName ?? monitoringRow?.businessName ?? baselineRow?.businessName ?? `Enterprise ${businessId}`,
      track: baselineRow?.track ?? demog?.track ?? null,
      ownerGender: demog?.ownerGender ?? null,
      ownerYouth: demog?.ownerYouth ?? null,
      sector: demog?.sector ?? null,
      county: demog?.county ?? null,
      baseline,
      monitoring,
      inBaselineUniverse: baselineIds.has(businessId) && !excludedFromPanel,
      inMonitoringRound: monitoringIds.has(businessId),
      excludedFromPanel,
      flags,
    });
  }

  const notes: string[] = [];
  if (duplicateBaselineIds.length) {
    notes.push(
      `Duplicate baseline Enterprise IDs (${duplicateBaselineIds.map((item) => item.businessId).join(", ")}) are excluded from the matched panel until resolved.`
    );
  }
  if (unmatchedMonitoringIds.length) {
    notes.push(`Monitoring IDs not on baseline: ${unmatchedMonitoringIds.sort((a, b) => a - b).join(", ")}.`);
  }
  notes.push("Workbook monitoring values are already monthly (not divided by 3).");
  notes.push("Missing financial cells are not treated as zero; medians use non-null values only.");

  const dataQuality: PanelDataQualitySummary = {
    duplicateBaselineIds,
    missingBaselineIds,
    missingMonitoringIds,
    monitoringAllZeroCount,
    baselineNegativeProfitCount,
    outlierCount,
    excludedDuplicateRows: parsed.baselineRows.length - baselineById.size,
    notes,
  };

  return { enterprises, dataQuality, coverage };
}

function buildWorkbookCoverage(input: {
  baselineTotalRows: number;
  baselineUniqueIds: number;
  monitoringTotal: number;
  matched: number;
  unmatchedMonitoringIds: number[];
  unmatchedBaselineCount: number;
}) {
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
    monitoringEligible: input.monitoringTotal,
    unmatched: unmatchedMonitoringCount,
    matchPercent: matchPercentOfBaseline,
    unmatchedMonitoringIds: input.unmatchedMonitoringIds.sort((left, right) => left - right),
  };
}

export function buildPanelAnalysisFromWorkbook(input: {
  buffer: Buffer;
  demographicsById: Map<number, PanelWorkbookDemographics>;
  panelBusinessId: number | null;
  monitoringPeriodLabel: string;
  monitoringPeriodCode: string;
}) {
  const parsed = parsePanelAnalysisWorkbook(input.buffer);
  const { enterprises, dataQuality, coverage } = buildDataQualityAndEnterprises(parsed, input.demographicsById);
  return computePanelAnalysis({
    source: "workbook",
    monitoringPeriodLabel: input.monitoringPeriodLabel,
    monitoringPeriodCode: input.monitoringPeriodCode,
    enterprises,
    panelBusinessId: input.panelBusinessId,
    dataQuality,
    coverage,
  });
}

export function buildEmptyWorkbookPanelAnalysis(
  monitoringPeriodLabel: string,
  monitoringPeriodCode: string,
  panelBusinessId: number | null,
  summaryLabel: string
): MelPanelAnalysis {
  return {
    ...emptyPanelAnalysis({
      monitoringPeriodLabel,
      monitoringPeriodCode,
      selectedBusinessId: panelBusinessId,
      summaryLabel,
    }),
    source: "workbook",
  };
}
