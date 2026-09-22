import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Svg,
  Rect,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { MelReportingDataset } from "./reporting-data";

const BRAND_BLUE = "#1da1db";
const SLATE_900 = "#0f172a";
const SLATE_600 = "#475569";
const SLATE_200 = "#e2e8f0";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: SLATE_900,
    lineHeight: 1.35,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: SLATE_600,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: SLATE_200,
    paddingTop: 6,
  },
  kicker: {
    fontSize: 8,
    color: BRAND_BLUE,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 9,
    color: SLATE_600,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 4,
    color: SLATE_900,
  },
  note: {
    fontSize: 8,
    color: SLATE_600,
    marginBottom: 6,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 4,
    padding: 8,
  },
  kpiLabel: {
    fontSize: 7,
    color: SLATE_600,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  kpiDetail: {
    fontSize: 7,
    color: SLATE_600,
    marginTop: 3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  cell: { flex: 1 },
  cellRight: { flex: 1, textAlign: "right" },
  cellWide: { flex: 1.6 },
  bullet: {
    marginBottom: 3,
    paddingLeft: 8,
  },
  chartCaption: {
    fontSize: 7,
    color: SLATE_600,
    marginTop: 4,
    marginBottom: 8,
  },
});

export type MelExecutiveSummaryPdfInput = Pick<
  MelReportingDataset,
  "selectedPeriod" | "filters" | "summary" | "financeBreakdown" | "wasteReporting" | "panelAnalysis"
>;

function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
}

function percent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function kilograms(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value)} kg`;
}

function filterLines(filters: MelExecutiveSummaryPdfInput["filters"]) {
  const lines: string[] = [];
  if (filters.track) lines.push(`Track: ${filters.track}`);
  if (filters.county) lines.push(`County: ${filters.county}`);
  if (filters.sector) lines.push(`Sector: ${filters.sector}`);
  if (filters.ownerGender) lines.push(`Owner: ${filters.ownerGender}`);
  if (filters.panelSource) lines.push(`Panel: ${filters.panelSource}`);
  return lines.length ? lines.join(" · ") : "All enterprises (no segment filters)";
}

function PageFooter() {
  return (
    <Text style={styles.footer} fixed>
      Approved, currently valid MEL records only · not a public GIS extract
    </Text>
  );
}

function FinanceShareBar({ percentage }: { percentage: number }) {
  const width = 72;
  const fill = Math.min(100, Math.max(0, percentage));
  return (
    <Svg width={width} height={8}>
      <Rect x={0} y={0} width={width} height={8} fill={SLATE_200} rx={2} />
      <Rect x={0} y={0} width={(width * fill) / 100} height={8} fill={BRAND_BLUE} rx={2} />
    </Svg>
  );
}

function GroupedMeasureBars({
  baseline,
  monitoring,
  maxValue,
}: {
  baseline: number | null;
  monitoring: number | null;
  maxValue: number;
}) {
  const barMaxWidth = 48;
  const height = 36;
  const scale = (value: number | null) => {
    if (value === null || !Number.isFinite(value) || maxValue <= 0) return 0;
    return (Math.abs(value) / maxValue) * barMaxWidth;
  };
  const bW = scale(baseline);
  const mW = scale(monitoring);
  return (
    <Svg width={barMaxWidth * 2 + 12} height={height}>
      <Rect x={0} y={4} width={bW} height={10} fill="#64748b" />
      <Rect x={barMaxWidth + 12} y={20} width={mW} height={10} fill={BRAND_BLUE} />
    </Svg>
  );
}

export function MelExecutiveSummaryPdfDocument({
  data,
  exportedAt,
}: {
  data: MelExecutiveSummaryPdfInput;
  exportedAt: Date;
}) {
  const { summary, panelAnalysis, wasteReporting } = data;
  const generated = exportedAt.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const panelMax = Math.max(
    panelAnalysis.baseline.revenue ?? 0,
    panelAnalysis.monitoring.revenue ?? 0,
    panelAnalysis.baseline.costs ?? 0,
    panelAnalysis.monitoring.costs ?? 0,
    panelAnalysis.baseline.profit ?? 0,
    panelAnalysis.monitoring.profit ?? 0,
    1
  );
  const measures = [
    { key: "revenue" as const, label: "Revenue" },
    { key: "costs" as const, label: "Costs" },
    { key: "profit" as const, label: "Profit" },
  ];
  const trackGroups = panelAnalysis.disaggregations.find((item) => item.dimension === "Track")?.groups ?? [];
  const jobs = summary.jobDisaggregation;

  return (
    <Document title="MEL executive summary">
      <Page size="A4" style={styles.page}>
        <Text style={styles.kicker}>Hand in Hand · MEL executive summary</Text>
        <Text style={styles.title}>Executive summary</Text>
        <Text style={styles.subtitle}>
          Period: {data.selectedPeriod.label} · Generated {generated}
        </Text>
        <Text style={[styles.subtitle, { marginBottom: 8 }]}>Filters: {filterLines(data.filters)}</Text>

        <Text style={styles.sectionTitle}>Jobs</Text>
        <Text style={styles.note}>Cumulative jobs from approved reports in the selected filters.</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Cumulative jobs</Text>
            <Text style={styles.kpiValue}>{summary.jobs.toLocaleString()}</Text>
            <Text style={styles.kpiDetail}>
              Direct quality {summary.directQualityJobs.toLocaleString()} · Direct non-quality{" "}
              {summary.directNonQualityJobs.toLocaleString()} · Indirect {summary.indirectJobs.toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.cell}>Male</Text>
          <Text style={styles.cell}>Female</Text>
          <Text style={styles.cell}>Youth</Text>
          <Text style={styles.cell}>PLWD</Text>
          <Text style={styles.cell}>Refugee</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.cell}>{jobs.male.toLocaleString()}</Text>
          <Text style={styles.cell}>{jobs.female.toLocaleString()}</Text>
          <Text style={styles.cell}>{jobs.youth.toLocaleString()}</Text>
          <Text style={styles.cell}>{jobs.plwd.toLocaleString()}</Text>
          <Text style={styles.cell}>{jobs.refugee.toLocaleString()}</Text>
        </View>

        <Text style={styles.sectionTitle}>Profitability (matched vs unmatched)</Text>
        <Text style={styles.note}>
          Median monthly profit, revenue, and costs. Overall monitoring is every reached enterprise with reported
          activity, including unmatched enterprises. The matched panel is the same enterprise at baseline and monitoring.
        </Text>
        <View style={styles.tableHeader}>
          <Text style={styles.cellWide}>Cohort</Text>
          <Text style={styles.cellRight}>n</Text>
          <Text style={styles.cellRight}>Profit</Text>
          <Text style={styles.cellRight}>Δ profit</Text>
          <Text style={styles.cellRight}>Revenue</Text>
          <Text style={styles.cellRight}>Costs</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.cellWide}>Overall monitoring</Text>
          <Text style={styles.cellRight}>{panelAnalysis.unpairedMonitoring.enterpriseCount.toLocaleString()}</Text>
          <Text style={styles.cellRight}>{money(panelAnalysis.unpairedMonitoring.monitoring.profit)}</Text>
          <Text style={styles.cellRight}>{percent(panelAnalysis.unpairedMonitoring.changePercent.profit)}</Text>
          <Text style={styles.cellRight}>{money(panelAnalysis.unpairedMonitoring.monitoring.revenue)}</Text>
          <Text style={styles.cellRight}>{money(panelAnalysis.unpairedMonitoring.monitoring.costs)}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.cellWide}>Matched panel</Text>
          <Text style={styles.cellRight}>{panelAnalysis.matchedPanel.enterpriseCount.toLocaleString()}</Text>
          <Text style={styles.cellRight}>{money(panelAnalysis.matchedPanel.monitoring.profit)}</Text>
          <Text style={styles.cellRight}>{percent(panelAnalysis.matchedPanel.changePercent.profit)}</Text>
          <Text style={styles.cellRight}>{money(panelAnalysis.matchedPanel.monitoring.revenue)}</Text>
          <Text style={styles.cellRight}>{money(panelAnalysis.matchedPanel.monitoring.costs)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Waste collected</Text>
        <Text style={styles.note}>
          OP3.3 · Monthly median kg by stream for waste-management enterprises in {data.selectedPeriod.label}
          (quarterly ÷ 3). Baseline is the monthly median from each enterprise&apos;s earliest approved report.
        </Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Monthly median waste (all streams)</Text>
            <Text style={styles.kpiValue}>{kilograms(wasteReporting.totalActualMonthlyMedianKilograms)}</Text>
            <Text style={styles.kpiDetail}>
              {percent(wasteReporting.totalChangePercent)} vs baseline {kilograms(wasteReporting.totalBaselineKilograms)}
              {" · "}
              {wasteReporting.reportingEnterprises.toLocaleString()} enterprise
              {wasteReporting.reportingEnterprises === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.cellWide}>Waste stream</Text>
          <Text style={styles.cellRight}>Baseline (monthly median)</Text>
          <Text style={styles.cellRight}>Actual (monthly median)</Text>
          <Text style={styles.cellRight}>% change</Text>
        </View>
        {wasteReporting.byStream.map((row) => (
          <View key={row.stream} style={styles.tableRow}>
            <Text style={styles.cellWide}>{row.label}</Text>
            <Text style={styles.cellRight}>{kilograms(row.baselineMonthlyMedianKilograms)}</Text>
            <Text style={styles.cellRight}>{kilograms(row.actualMonthlyMedianKilograms)}</Text>
            <Text style={styles.cellRight}>{percent(row.changePercent)}</Text>
          </View>
        ))}
        <View style={styles.tableRow}>
          <Text style={[styles.cellWide, { fontFamily: "Helvetica-Bold" }]}>Total</Text>
          <Text style={[styles.cellRight, { fontFamily: "Helvetica-Bold" }]}>{kilograms(wasteReporting.totalBaselineKilograms)}</Text>
          <Text style={[styles.cellRight, { fontFamily: "Helvetica-Bold" }]}>{kilograms(wasteReporting.totalActualMonthlyMedianKilograms)}</Text>
          <Text style={[styles.cellRight, { fontFamily: "Helvetica-Bold" }]}>{percent(wasteReporting.totalChangePercent)}</Text>
        </View>

        <Text style={styles.sectionTitle}>External finance</Text>
        <Text style={styles.note}>
          Loan, repayable grant, and other count toward the external funding target. BIRE matching grant is excluded.
        </Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>External finance accessed</Text>
            <Text style={styles.kpiValue}>{money(summary.externalFinanceAccessed)}</Text>
            <Text style={styles.kpiDetail}>
              Target {money(summary.externalFinanceTarget)} ({percent(summary.externalFinanceAchievement)})
            </Text>
          </View>
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.cellWide}>Type</Text>
          <Text style={styles.cellRight}>Enterprises</Text>
          <Text style={styles.cellRight}>Amount (KES)</Text>
          <Text style={styles.cell}>Share</Text>
        </View>
        {data.financeBreakdown.map((item) => (
          <View key={item.type} style={styles.tableRow}>
            <Text style={styles.cellWide}>
              {item.label}
              {item.type === "matching_grant" ? " (excluded from target)" : ""}
            </Text>
            <Text style={styles.cellRight}>{item.enterpriseCount.toLocaleString()}</Text>
            <Text style={styles.cellRight}>{money(item.amount)}</Text>
            <View style={styles.cell}>
              <FinanceShareBar percentage={item.percentage} />
              <Text style={{ fontSize: 7 }}>{percent(item.percentage)}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Panel analysis (matched enterprises)</Text>
        <Text style={styles.note}>
          {panelAnalysis.summaryLabel} · Source: {panelAnalysis.source === "workbook" ? "imported workbook" : "live monitoring"} ·{" "}
          {panelAnalysis.monitoringPeriodLabel}
        </Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Unique baseline IDs</Text>
            <Text style={styles.kpiValue}>{panelAnalysis.coverage.baselineUniqueIds.toLocaleString()}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Monitoring</Text>
            <Text style={styles.kpiValue}>{panelAnalysis.coverage.monitoringTotal.toLocaleString()}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Matched</Text>
            <Text style={styles.kpiValue}>{panelAnalysis.coverage.matched.toLocaleString()}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Match % of baseline</Text>
            <Text style={styles.kpiValue}>{percent(panelAnalysis.coverage.matchPercentOfBaseline)}</Text>
          </View>
        </View>
        <View style={styles.tableHeader}>
          <Text style={styles.cell}>Measure</Text>
          <Text style={styles.cellRight}>Baseline</Text>
          <Text style={styles.cellRight}>Monitoring</Text>
          <Text style={styles.cellRight}>Δ%</Text>
          <Text style={styles.cell}>Chart</Text>
        </View>
        {measures.map((measure) => (
          <View key={measure.key} style={styles.tableRow}>
            <Text style={styles.cell}>{measure.label}</Text>
            <Text style={styles.cellRight}>{money(panelAnalysis.baseline[measure.key])}</Text>
            <Text style={styles.cellRight}>{money(panelAnalysis.monitoring[measure.key])}</Text>
            <Text style={styles.cellRight}>{percent(panelAnalysis.changePercent[measure.key])}</Text>
            <View style={styles.cell}>
              <GroupedMeasureBars
                baseline={panelAnalysis.baseline[measure.key]}
                monitoring={panelAnalysis.monitoring[measure.key]}
                maxValue={panelMax}
              />
            </View>
          </View>
        ))}
        <Text style={styles.chartCaption}>Grey = baseline median · Blue = monitoring median</Text>

        <Text style={styles.sectionTitle}>Panel by overall &amp; track</Text>
        {trackGroups.length === 0 ? (
          <Text style={styles.note}>No track breakdown for the current filters.</Text>
        ) : (
          measures.map((measure) => (
            <View key={measure.key}>
              <Text style={[styles.note, { marginTop: 4, fontFamily: "Helvetica-Bold", color: SLATE_900 }]}>
                {measure.label}
              </Text>
              <View style={styles.tableHeader}>
                <Text style={styles.cell}>Track</Text>
                <Text style={styles.cellRight}>n</Text>
                <Text style={styles.cellRight}>Baseline</Text>
                <Text style={styles.cellRight}>Monitoring</Text>
                <Text style={styles.cellRight}>Δ%</Text>
              </View>
              {trackGroups.map((group) => (
                <View key={`${measure.key}-${group.key}`} style={styles.tableRow}>
                  <Text style={[styles.cell, group.key === "overall" ? { fontFamily: "Helvetica-Bold" } : {}]}>
                    {group.label}
                  </Text>
                  <Text style={styles.cellRight}>{group.n.toLocaleString()}</Text>
                  <Text style={styles.cellRight}>{money(group.baseline[measure.key])}</Text>
                  <Text style={styles.cellRight}>{money(group.monitoring[measure.key])}</Text>
                  <Text style={styles.cellRight}>{percent(group.changePercent[measure.key])}</Text>
                </View>
              ))}
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Panel interpretation</Text>
        {panelAnalysis.interpretation.length === 0 ? (
          <Text style={{ color: SLATE_600 }}>No matched panel interpretation available for current filters.</Text>
        ) : (
          panelAnalysis.interpretation.map((line) => (
            <Text key={line} style={styles.bullet}>• {line}</Text>
          ))
        )}

        <PageFooter />
      </Page>
    </Document>
  );
}

export async function renderMelExecutiveSummaryPdf(
  data: MelExecutiveSummaryPdfInput,
  exportedAt: Date = new Date()
): Promise<Buffer> {
  const buffer = await renderToBuffer(<MelExecutiveSummaryPdfDocument data={data} exportedAt={exportedAt} />);
  return Buffer.from(buffer);
}
