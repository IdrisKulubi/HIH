"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type {
  MelFinancialDemographic,
  MelFinancialMeasureTrend,
  MelFinancialMeasureTrendTrack,
} from "@/lib/mel/reporting-data";

const MEASURES = [
  { key: "revenue" as const, label: "Monthly Revenue" },
  { key: "costs" as const, label: "Monthly costs" },
  { key: "profit" as const, label: "Monthly profit" },
];

const SERIES_COLORS = ["#2563eb", "#ea580c", "#16a34a", "#9333ea", "#dc2626", "#0891b2", "#ca8a04"];

const DEMOGRAPHICS: Array<{ key: MelFinancialDemographic; label: string }> = [
  { key: "all", label: "All owners" },
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
  { key: "youth", label: "Youth" },
];

type Props = {
  trend: MelFinancialMeasureTrend;
  selectedTrack: string | null;
  selectedDemographic?: string | null;
};

function toDemographic(value: string | null | undefined): MelFinancialDemographic {
  if (value === "male" || value === "female" || value === "youth") return value;
  return "all";
}

export function ProfitabilityMeasureChart({ trend, selectedTrack, selectedDemographic }: Props) {
  const [demographic, setDemographic] = useState<MelFinancialDemographic>(() => toDemographic(selectedDemographic));
  const tracks = trend.tracks.filter((item) => {
    if (!selectedTrack) return true;
    return item.track === selectedTrack;
  });
  if (tracks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
        No track baselines are available for this filter.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Period performance by owner gender">
        {DEMOGRAPHICS.map((item) => {
          const active = demographic === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDemographic(item.key)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-brand-blue/40 hover:bg-blue-50"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="space-y-8">
        {tracks.map((track) => (
          <TrackProfitabilityPanel key={track.track} track={track} demographic={demographic} />
        ))}
      </div>
    </div>
  );
}

function TrackProfitabilityPanel({
  track,
  demographic,
}: {
  track: MelFinancialMeasureTrendTrack;
  demographic: MelFinancialDemographic;
}) {
  const periods = track.demographics[demographic];
  const periodsWithData = useMemo(
    () => periods.filter((period) => period.revenue !== null || period.costs !== null || period.profit !== null),
    [periods]
  );
  const tableRows = [
    { period: "Baseline", revenue: track.baseline.revenue, costs: track.baseline.costs, profit: track.baseline.profit },
    ...periodsWithData.map((period) => ({
      period: period.periodLabel,
      revenue: period.revenue,
      costs: period.costs,
      profit: period.profit,
    })),
  ];

  const seriesNames = ["Baseline", ...periodsWithData.map((period) => period.periodLabel)];
  const chartData = MEASURES.map((measure) => {
    const row: Record<string, string | number | null> = { measure: measure.label };
    row.Baseline = track.baseline[measure.key];
    for (const period of periodsWithData) {
      row[period.periodLabel] = period[measure.key];
    }
    return row;
  });

  const hasChartData = periodsWithData.length > 0;
  const trackLabel = track.track === "all" ? "Overall" : track.track === "acceleration" ? "Accelerator" : "Foundation";
  const demographicLabel = DEMOGRAPHICS.find((item) => item.key === demographic)?.label ?? "All owners";

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-background" aria-labelledby={`profitability-measure-${track.track}`}>
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
        <h3 id={`profitability-measure-${track.track}`} className="text-base font-semibold text-slate-900">
          {trackLabel} · All median values
        </h3>
        <p className="mt-0.5 text-sm text-slate-600">
          {demographicLabel}: monthly medians from approved reports in each quarter, compared with the programme ITT baseline.
        </p>
      </div>
      <div className="grid gap-6 p-4 sm:p-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:items-start">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2.5 font-medium">Period</th>
                <th className="px-3 py-2.5 text-right font-medium">Monthly revenue</th>
                <th className="px-3 py-2.5 text-right font-medium">Monthly costs</th>
                <th className="px-3 py-2.5 text-right font-medium">Monthly profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.map((row) => (
                <tr key={row.period} className={row.period === "Baseline" ? "bg-slate-50/80" : undefined}>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{row.period}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${row.period === "Baseline" ? "" : varianceClass("revenue", row.revenue, track.baseline.revenue)}`}>{money(row.revenue)}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${row.period === "Baseline" ? "" : varianceClass("costs", row.costs, track.baseline.costs)}`}>{money(row.costs)}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${row.period === "Baseline" ? "" : varianceClass("profit", row.profit, track.baseline.profit)}`}>{money(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-800">Monthly financial performance over time</h4>
          {!hasChartData ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-600">
              No approved quarterly medians yet for this track and owner group. The baseline row is shown; period lines appear when monitoring data is approved.
            </p>
          ) : (
            <div className="mt-4 h-80 w-full" role="img" aria-label={`${trackLabel} ${demographicLabel} monthly financial performance by revenue, costs, and profit`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="measure" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tickFormatter={compactKes} tick={{ fontSize: 11 }} width={72} />
                  <Tooltip formatter={(value) => formatKes(Number(value))} />
                  <Legend />
                  {seriesNames.map((name, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={name === "Baseline" ? "#64748b" : SERIES_COLORS[index % SERIES_COLORS.length]}
                      strokeWidth={name === "Baseline" ? 2.5 : 2}
                      strokeDasharray={name === "Baseline" ? "6 4" : undefined}
                      dot={name === "Baseline" ? { r: 4, fill: "#64748b" } : <VarianceDot />}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function measureKeyFromLabel(label: string): "revenue" | "costs" | "profit" | null {
  if (label === "Monthly Revenue") return "revenue";
  if (label === "Monthly costs") return "costs";
  if (label === "Monthly profit") return "profit";
  return null;
}

function varianceClass(measure: "revenue" | "costs" | "profit", current: number | null, baseline: number | null) {
  const color = varianceColor(measure, current, baseline);
  if (color === "#334155") return "";
  return color === "#047857" ? "font-medium text-emerald-700" : "font-medium text-red-700";
}

function varianceColor(measure: "revenue" | "costs" | "profit", current: number | null, baseline: number | null) {
  if (current === null || baseline === null || current === baseline) return "#334155";
  const improved = measure === "costs" ? current < baseline : current > baseline;
  return improved ? "#047857" : "#b91c1c";
}

function VarianceDot({ cx, cy, payload, value }: { cx?: number; cy?: number; payload?: { measure?: string; Baseline?: number | null }; value?: number }) {
  if (cx == null || cy == null) return null;
  const measure = measureKeyFromLabel(payload?.measure ?? "");
  const fill = measure ? varianceColor(measure, typeof value === "number" ? value : null, payload?.Baseline ?? null) : "#334155";
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={1.5} />;
}

function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
}

function formatKes(value: number) {
  if (!Number.isFinite(value)) return "Not available";
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
}

function compactKes(value: number) {
  return new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
