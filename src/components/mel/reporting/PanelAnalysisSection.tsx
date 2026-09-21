"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MelPanelAnalysis } from "@/lib/mel/panel-analysis";
import type { MelReportingDataset } from "@/lib/mel/reporting-data";
import { PANEL_MIN_DISAGGREGATION_N } from "@/lib/mel/panel-analysis-core";

type Props = {
  panel: MelPanelAnalysis;
  filters: MelReportingDataset["filters"];
};

const MEASURES = [
  { key: "revenue" as const, label: "Revenue" },
  { key: "costs" as const, label: "Costs" },
  { key: "profit" as const, label: "Profit" },
];

export function PanelAnalysisSection({ panel, filters }: Props) {
  const router = useRouter();
  const monitoringShort = shortPeriodLabel(panel.monitoringPeriodLabel);
  const chartData = MEASURES.map((measure) => ({
    measure: measure.label,
    Baseline: panel.baseline[measure.key],
    [monitoringShort]: panel.monitoring[measure.key],
  }));
  const hasValues = chartData.some((row) => row.Baseline !== null || row[monitoringShort] !== null);

  const pushParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams();
    params.set("periodId", String(filters.periodId));
    if (filters.track) params.set("track", filters.track);
    if (filters.county) params.set("county", filters.county);
    if (filters.sector) params.set("sector", filters.sector);
    if (filters.ownerGender) params.set("ownerGender", filters.ownerGender);
    if (filters.panelBusinessId) params.set("panelBusinessId", String(filters.panelBusinessId));
    params.set("panelSource", filters.panelSource ?? "workbook");
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`/admin/mel/reporting?${params.toString()}`);
  };

  const handleEnterpriseChange = (value: string) => {
    pushParams({ panelBusinessId: value || null });
  };

  const handleSourceChange = (value: string) => {
    pushParams({ panelSource: value, panelBusinessId: null });
  };

  const sourceLabel = panel.source === "workbook" ? "Imported workbook (239 / 151)" : "Live approved monitoring";

  return (
    <section className="space-y-4 overflow-hidden rounded-lg border border-slate-200 bg-background" aria-labelledby="panel-analysis-heading">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
        <h2 id="panel-analysis-heading" className="text-lg font-semibold text-slate-900">Panel analysis (matched enterprises)</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Compare opening baselines with {monitoringShort} monitoring for the same enterprises, matched by Enterprise ID.
          Main results use only IDs present at both time points. Match rate is measured against unique baseline IDs.
          {panel.source === "system"
            ? " Live panel uses approved monitoring (quarterly ÷ 3). Dashboard track, county, sector, and owner filters apply."
            : " Workbook panel uses Dickson’s Baseline / Monitoring sheets (monthly values, not ÷ 3). Demographics are joined from programme records."}
        </p>
      </div>
      <div className="space-y-5 px-4 pb-5 sm:px-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,200px)_minmax(0,280px)] lg:items-end">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <CoverageStat label="Baseline rows" value={panel.coverage.baselineTotalRows.toLocaleString()} />
            <CoverageStat label="Unique baseline IDs" value={panel.coverage.baselineUniqueIds.toLocaleString()} />
            <CoverageStat label="Monitoring enterprises" value={panel.coverage.monitoringTotal.toLocaleString()} />
            <CoverageStat label="Matched" value={panel.coverage.matched.toLocaleString()} />
            <CoverageStat label="Match % (of baseline)" value={formatPercent(panel.coverage.matchPercentOfBaseline)} />
            <CoverageStat label="Unmatched monitoring" value={panel.coverage.unmatchedMonitoringCount.toLocaleString()} />
          </dl>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            <span>Data source</span>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
              value={filters.panelSource ?? "workbook"}
              onChange={(event) => handleSourceChange(event.target.value)}
            >
              <option value="workbook">Workbook panel</option>
              <option value="system">Live system panel</option>
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium text-slate-700">
            <span>Enterprise (panel only)</span>
            <select
              className="h-10 w-full rounded-md border border-slate-300 bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
              value={filters.panelBusinessId ?? ""}
              onChange={(event) => handleEnterpriseChange(event.target.value)}
            >
              <option value="">All matched enterprises (median)</option>
              {panel.enterpriseOptions.map((option) => (
                <option key={option.businessId} value={String(option.businessId)}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-xs text-slate-500">Source: {sourceLabel}</p>

        {panel.dataQuality.notes.length > 0 || panel.dataQuality.duplicateBaselineIds.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Data quality</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {panel.dataQuality.duplicateBaselineIds.map((item) => (
                <li key={item.businessId}>
                  Duplicate baseline ID {item.businessId}: {item.names.join(" · ")} (excluded from matched panel).
                </li>
              ))}
              {panel.dataQuality.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-amber-900/80">
              Zeros in monitoring ({panel.dataQuality.monitoringAllZeroCount}) are kept in medians where reported; negatives in baseline profit (
              {panel.dataQuality.baselineNegativeProfitCount}); flagged outliers ({panel.dataQuality.outlierCount}) — sensitivity medians below exclude outliers (&gt;10M KES/month).
            </p>
          </div>
        ) : null}

        {panel.coverage.unmatchedMonitoringIds.length > 0 ? (
          <p className="text-xs text-slate-600">
            Monitoring IDs not matched to baseline:{" "}
            <span className="font-mono tabular-nums">{panel.coverage.unmatchedMonitoringIds.join(", ")}</span>
          </p>
        ) : null}

        {panel.interpretation.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Interpretation</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              {panel.interpretation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-sm font-medium text-slate-800">{panel.summaryLabel}</p>

        {panel.viewMode === "empty" ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            {panel.summaryLabel}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Measure</th>
                    <th className="px-3 py-2.5 text-right font-medium">Baseline (monthly)</th>
                    <th className="px-3 py-2.5 text-right font-medium">{monitoringShort} (monthly)</th>
                    <th className="px-3 py-2.5 text-right font-medium">Change</th>
                    <th className="px-3 py-2.5 text-right font-medium">% change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MEASURES.map((measure) => (
                    <tr key={measure.key}>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{measure.label}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{money(panel.baseline[measure.key])}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${varianceClass(measure.key, panel.monitoring[measure.key], panel.baseline[measure.key])}`}>
                        {money(panel.monitoring[measure.key])}
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${changeClass(measure.key, panel.change[measure.key])}`}>
                        {signedMoney(panel.change[measure.key])}
                      </td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${changeClass(measure.key, panel.change[measure.key])}`}>
                        {formatPercent(panel.changePercent[measure.key])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasValues ? (
              <div className="h-80 w-full" role="img" aria-label="Panel analysis baseline versus monitoring">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="measure" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={compactKes} tick={{ fontSize: 11 }} width={72} />
                    <Tooltip formatter={(value) => formatKes(Number(value))} />
                    <Legend />
                    <Bar dataKey="Baseline" fill="#64748b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={monitoringShort} fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : null}

            <ComparisonTable
              title="Unpaired monitoring vs matched panel"
              rows={[
                { label: panel.unpairedMonitoring.label, count: panel.unpairedMonitoring.enterpriseCount, values: panel.unpairedMonitoring },
                { label: panel.matchedPanel.label, count: panel.matchedPanel.enterpriseCount, values: panel.matchedPanel },
              ]}
            />

            {panel.dataQuality.outlierCount > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Sensitivity (matched panel, excluding monthly outliers &gt;10M KES)
                </p>
                <table className="w-full min-w-[480px] text-left text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {MEASURES.map((measure) => (
                      <tr key={measure.key}>
                        <td className="px-3 py-2 font-medium text-slate-900">{measure.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatPercent(panel.sensitivityChangePercent[measure.key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {panel.disaggregations.map((disaggregation) => (
              <DisaggregationTable key={disaggregation.dimension} dimension={disaggregation.dimension} groups={disaggregation.groups} />
            ))}

            {panel.viewMode === "cohort" && panel.matchedEnterprises.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Matched enterprises</p>
                <ul className="mt-2 flex flex-wrap gap-2 text-xs text-slate-700">
                  {panel.matchedEnterprises.slice(0, 24).map((enterprise) => (
                    <li key={enterprise.businessId} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 tabular-nums">
                      {enterprise.businessId} · {enterprise.businessName}
                      {enterprise.track ? ` · ${enterprise.track}` : ""}
                    </li>
                  ))}
                  {panel.matchedEnterprises.length > 24 ? (
                    <li className="px-2 py-1 text-slate-500">+{panel.matchedEnterprises.length - 24} more</li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function ComparisonTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    label: string;
    count: number;
    values: { monitoring: { revenue: number | null; costs: number | null; profit: number | null }; changePercent: { revenue: number | null; costs: number | null; profit: number | null } };
  }>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</p>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Cohort</th>
            <th className="px-3 py-2 text-right font-medium">n</th>
            <th className="px-3 py-2 text-right font-medium">Median revenue</th>
            <th className="px-3 py-2 text-right font-medium">Median costs</th>
            <th className="px-3 py-2 text-right font-medium">Median profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="px-3 py-2 text-slate-800">{row.label}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(row.values.monitoring.revenue)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(row.values.monitoring.costs)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(row.values.monitoring.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DisaggregationTable({
  dimension,
  groups,
}: {
  dimension: string;
  groups: Array<{
    key: string;
    label: string;
    n: number;
    changePercent: { revenue: number | null; costs: number | null; profit: number | null };
  }>;
}) {
  if (!groups.length) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {dimension}
        <span className="ml-2 font-normal normal-case text-slate-500">(matched enterprises; interpret cautiously when n &lt; {PANEL_MIN_DISAGGREGATION_N})</span>
      </p>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Group</th>
            <th className="px-3 py-2 text-right font-medium">n matched</th>
            <th className="px-3 py-2 text-right font-medium">Δ revenue %</th>
            <th className="px-3 py-2 text-right font-medium">Δ costs %</th>
            <th className="px-3 py-2 text-right font-medium">Δ profit %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {groups.map((group) => (
            <tr key={group.key} className={group.n < PANEL_MIN_DISAGGREGATION_N ? "text-slate-500" : undefined}>
              <td className="px-3 py-2 font-medium">{group.label}</td>
              <td className="px-3 py-2 text-right tabular-nums">{group.n}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatPercent(group.changePercent.revenue)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatPercent(group.changePercent.costs)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatPercent(group.changePercent.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CoverageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function shortPeriodLabel(label: string) {
  const match = /\(([^)·]+)\)/.exec(label);
  return match ? match[1].trim() : label;
}

function varianceClass(measure: "revenue" | "costs" | "profit", current: number | null, baseline: number | null) {
  if (current === null || baseline === null || current === baseline) return "";
  const improved = measure === "costs" ? current < baseline : current > baseline;
  return improved ? "font-medium text-emerald-700" : "font-medium text-red-700";
}

function changeClass(measure: "revenue" | "costs" | "profit", change: number | null) {
  if (change === null || change === 0) return "";
  const improved = measure === "costs" ? change < 0 : change > 0;
  return improved ? "font-medium text-emerald-700" : "font-medium text-red-700";
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
}

function signedMoney(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  const formatted = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value > 0 && value < 0.1) return `${value.toFixed(2)}%`;
  return `${value.toFixed(1)}%`;
}

function formatKes(value: number) {
  if (!Number.isFinite(value)) return "Not available";
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
}

function compactKes(value: number) {
  return new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
