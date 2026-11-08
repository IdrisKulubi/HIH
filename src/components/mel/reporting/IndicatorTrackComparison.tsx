"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type IndicatorTrackRow = {
  key: string;
  label: string;
  n: number | null;
  baseline: number | null;
  monitoring: number | null;
  changePercent: number | null;
};

export type IndicatorTrackMeasure = {
  key: "revenue" | "costs" | "profit";
  label: string;
  rows: IndicatorTrackRow[];
  note?: string | null;
};

const BASELINE_COLOR = "#1e3a8a";
const MONITORING_COLOR = "#22c55e";

export function IndicatorTrackComparison({
  monitoringLabel,
  caption,
  measures,
}: {
  monitoringLabel: string;
  caption: string;
  measures: IndicatorTrackMeasure[];
}) {
  return (
    <div className="space-y-6">
      {measures.map((measure) => (
        <IndicatorBlock
          key={measure.key}
          measure={measure}
          monitoringLabel={monitoringLabel}
          caption={caption}
        />
      ))}
    </div>
  );
}

function IndicatorBlock({
  measure,
  monitoringLabel,
  caption,
}: {
  measure: IndicatorTrackMeasure;
  monitoringLabel: string;
  caption: string;
}) {
  const chartRows = chartTracks(measure.rows);
  const chartData = chartRows.map((row) => ({
    track: row.label,
    Baseline: row.baseline,
    [monitoringLabel]: row.monitoring,
  }));
  const hasChart = chartData.some((row) => row.Baseline !== null || row[monitoringLabel] !== null);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-background" aria-labelledby={`indicator-${measure.key}`}>
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 id={`indicator-${measure.key}`} className="text-sm font-semibold text-slate-900">
          {measure.label}: by enterprise track
        </h3>
        <p className="mt-0.5 text-xs text-slate-600">{caption}</p>
      </div>
      <div className="grid gap-5 p-4 xl:grid-cols-2 xl:items-start">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2.5 font-medium">Track</th>
                <th className="px-3 py-2.5 text-right font-medium">n</th>
                <th className="px-3 py-2.5 text-right font-medium">Baseline</th>
                <th className="px-3 py-2.5 text-right font-medium">{monitoringLabel}</th>
                <th className="px-3 py-2.5 text-right font-medium">% change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {measure.rows.map((row) => (
                <tr key={row.key} className={isOverall(row.key) ? "bg-slate-50/80 font-medium" : undefined}>
                  <td className="px-3 py-2.5 text-slate-900">{row.label}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{row.n ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(row.baseline)}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${varianceClass(measure.key, row.monitoring, row.baseline)}`}>
                    {money(row.monitoring)}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${changeClass(measure.key, row.changePercent)}`}>
                    {formatPercent(row.changePercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">
            Median {measure.label.toLowerCase()} · baseline vs {monitoringLabel.toLowerCase()}
          </p>
          {!hasChart ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-600">
              No baseline or monitoring values for this indicator.
            </p>
          ) : (
            <div className="mt-3 h-72 w-full" role="img" aria-label={`${measure.label} baseline versus ${monitoringLabel} by enterprise track`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="track" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={compactKes}
                    tick={{ fontSize: 11 }}
                    width={72}
                    label={{ value: "KES / month", angle: -90, position: "insideLeft", offset: 4, style: { fontSize: 11, fill: "#64748b" } }}
                  />
                  <Tooltip formatter={(value) => formatKes(Number(value))} />
                  <Legend />
                  <Bar dataKey="Baseline" fill={BASELINE_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey={monitoringLabel} fill={MONITORING_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      {measure.note ? <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600">{measure.note}</p> : null}
    </section>
  );
}

function chartTracks(rows: IndicatorTrackRow[]) {
  const tracks = rows.filter((row) => !isOverall(row.key));
  return tracks.length > 0 ? tracks : rows;
}

function isOverall(key: string) {
  return key === "overall" || key === "all";
}

function varianceClass(measure: IndicatorTrackMeasure["key"], current: number | null, baseline: number | null) {
  if (current === null || baseline === null || current === baseline) return "";
  const improved = measure === "costs" ? current < baseline : current > baseline;
  return improved ? "font-medium text-emerald-700" : "font-medium text-red-700";
}

function changeClass(measure: IndicatorTrackMeasure["key"], change: number | null) {
  if (change === null || change === 0) return "";
  const improved = measure === "costs" ? change < 0 : change > 0;
  return improved ? "font-medium text-emerald-700" : "font-medium text-red-700";
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
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
