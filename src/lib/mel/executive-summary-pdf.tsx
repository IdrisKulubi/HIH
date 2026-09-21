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
const GREEN = "#047857";
const AMBER = "#b45309";
const RED = "#b91c1c";

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
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 6,
    color: SLATE_900,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
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
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  statusPill: {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    alignItems: "center",
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
  cellWide: { flex: 1.4 },
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
  "selectedPeriod" | "filters" | "summary" | "financeBreakdown" | "financialPerformance" | "panelAnalysis"
>;

function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
}

function percent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
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
  const width = 120;
  const fill = Math.min(100, Math.max(0, percentage));
  return (
    <Svg width={width} height={10}>
      <Rect x={0} y={0} width={width} height={10} fill={SLATE_200} rx={2} />
      <Rect x={0} y={0} width={(width * fill) / 100} height={10} fill={BRAND_BLUE} rx={2} />
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
  const { summary, panelAnalysis } = data;
  const generated = exportedAt.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const completeness = summary.reportingCompleteness;
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

  return (
    <Document title="MEL executive summary">
      <Page size="A4" style={styles.page}>
        <Text style={styles.kicker}>Hand in Hand · MEL executive summary</Text>
        <Text style={styles.title}>Programme results and ITT</Text>
        <Text style={styles.subtitle}>
          Period: {data.selectedPeriod.label} · Generated {generated}
        </Text>
        <Text style={styles.subtitle}>Filters: {filterLines(data.filters)}</Text>

        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Enterprises reporting</Text>
            <Text style={styles.kpiValue}>{summary.reportingEnterprises.toLocaleString()}</Text>
            <Text style={styles.kpiDetail}>
              of {summary.eligibleEnterprises.toLocaleString()} eligible ({percent(completeness)})
            </Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Median monthly revenue</Text>
            <Text style={styles.kpiValue}>{money(summary.monthlyMedianRevenue)}</Text>
            <Text style={styles.kpiDetail}>
              vs ITT {money(summary.monthlyMedianRevenueBaseline)} ({percent(summary.monthlyMedianRevenueChangePercent)})
            </Text>
          </View>
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Cumulative jobs</Text>
            <Text style={styles.kpiValue}>{summary.jobs.toLocaleString()}</Text>
            <Text style={styles.kpiDetail}>
              Direct {summary.directJobs.toLocaleString()} · Indirect {summary.indirectJobs.toLocaleString()}
            </Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>External finance accessed</Text>
            <Text style={styles.kpiValue}>{money(summary.externalFinanceAccessed)}</Text>
            <Text style={styles.kpiDetail}>
              Target {money(summary.externalFinanceTarget)} ({percent(summary.externalFinanceAchievement)})
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>ITT status (indicator count)</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusPill, { backgroundColor: "#d1fae5" }]}>
            <Text style={{ fontFamily: "Helvetica-Bold", color: GREEN }}>On track</Text>
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 }}>{summary.greenResults}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: "#fef3c7" }]}>
            <Text style={{ fontFamily: "Helvetica-Bold", color: AMBER }}>Needs attention</Text>
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 }}>{summary.amberResults}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: "#fee2e2" }]}>
            <Text style={{ fontFamily: "Helvetica-Bold", color: RED }}>Off track</Text>
            <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 }}>{summary.redResults}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Finance accessed by funding type</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.cellWide}>Type</Text>
          <Text style={styles.cellRight}>Enterprises</Text>
          <Text style={styles.cellRight}>Amount (KES)</Text>
          <Text style={styles.cell}>Share</Text>
        </View>
        {data.financeBreakdown.map((item) => (
          <View key={item.type} style={styles.tableRow}>
            <Text style={styles.cellWide}>{item.label}</Text>
            <Text style={styles.cellRight}>{item.enterpriseCount}</Text>
            <Text style={styles.cellRight}>{money(item.amount)}</Text>
            <View style={styles.cell}>
              <FinanceShareBar percentage={item.percentage} />
              <Text style={{ fontSize: 7 }}>{percent(item.percentage)}</Text>
            </View>
          </View>
        ))}

        <PageFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Monthly financial performance by track</Text>
        <Text style={{ fontSize: 8, color: SLATE_600, marginBottom: 6 }}>
          Quarterly monitoring converted to monthly (÷ 3). % change vs programme ITT baseline.
        </Text>
        <View style={styles.tableHeader}>
          <Text style={styles.cell}>Track</Text>
          <Text style={styles.cellRight}>n</Text>
          <Text style={styles.cellRight}>Revenue</Text>
          <Text style={styles.cellRight}>Δ%</Text>
          <Text style={styles.cellRight}>Costs</Text>
          <Text style={styles.cellRight}>Δ%</Text>
          <Text style={styles.cellRight}>Profit</Text>
          <Text style={styles.cellRight}>Δ%</Text>
        </View>
        {data.financialPerformance.map((track) => (
          <View key={track.track} style={styles.tableRow}>
            <Text style={[styles.cell, { fontFamily: "Helvetica-Bold" }]}>
              {track.track === "all" ? "Overall" : track.track}
            </Text>
            <Text style={styles.cellRight}>{track.enterpriseCount}</Text>
            <Text style={styles.cellRight}>{money(track.monthlyMedianRevenue)}</Text>
            <Text style={styles.cellRight}>{percent(track.variancePercentage.revenue)}</Text>
            <Text style={styles.cellRight}>{money(track.monthlyMedianCosts)}</Text>
            <Text style={styles.cellRight}>{percent(track.variancePercentage.costs)}</Text>
            <Text style={styles.cellRight}>{money(track.monthlyMedianProfit)}</Text>
            <Text style={styles.cellRight}>{percent(track.variancePercentage.profit)}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Panel analysis (matched enterprises)</Text>
        <Text style={{ fontSize: 8, color: SLATE_600, marginBottom: 4 }}>
          {panelAnalysis.summaryLabel} · Source: {panelAnalysis.source === "workbook" ? "imported workbook" : "live monitoring"} ·{" "}
          {panelAnalysis.monitoringPeriodLabel}
        </Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Unique baseline IDs</Text>
            <Text style={styles.kpiValue}>{panelAnalysis.coverage.baselineUniqueIds}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Monitoring</Text>
            <Text style={styles.kpiValue}>{panelAnalysis.coverage.monitoringTotal}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Matched</Text>
            <Text style={styles.kpiValue}>{panelAnalysis.coverage.matched}</Text>
          </View>
          <View style={styles.kpiTile}>
            <Text style={styles.kpiLabel}>Match % of baseline</Text>
            <Text style={styles.kpiValue}>{percent(panelAnalysis.coverage.matchPercentOfBaseline)}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 8, marginBottom: 4 }}>
          Unpaired monitoring (with activity): n={panelAnalysis.unpairedMonitoring.enterpriseCount} · Matched panel: n=
          {panelAnalysis.matchedPanel.enterpriseCount}
        </Text>

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

        <PageFooter />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Panel interpretation</Text>
        {panelAnalysis.interpretation.length === 0 ? (
          <Text style={{ color: SLATE_600 }}>No matched panel interpretation available for current filters.</Text>
        ) : (
          panelAnalysis.interpretation.slice(0, 8).map((line) => (
            <Text key={line} style={styles.bullet}>• {line}</Text>
          ))
        )}

        {(panelAnalysis.dataQuality.duplicateBaselineIds.length > 0 ||
          panelAnalysis.dataQuality.notes.length > 0 ||
          panelAnalysis.coverage.unmatchedMonitoringIds.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Data quality notes</Text>
            {panelAnalysis.dataQuality.duplicateBaselineIds.map((item) => (
              <Text key={item.businessId} style={styles.bullet}>
                • Duplicate baseline ID {item.businessId}: {item.names.join(" · ")}
              </Text>
            ))}
            {panelAnalysis.coverage.unmatchedMonitoringIds.length > 0 ? (
              <Text style={styles.bullet}>
                • Unmatched monitoring IDs: {panelAnalysis.coverage.unmatchedMonitoringIds.join(", ")}
              </Text>
            ) : null}
            {panelAnalysis.dataQuality.notes.slice(0, 4).map((note) => (
              <Text key={note} style={styles.bullet}>• {note}</Text>
            ))}
          </>
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
