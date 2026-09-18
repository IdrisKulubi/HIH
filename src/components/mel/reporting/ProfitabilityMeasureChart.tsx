"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MelFinancialMeasureTrend, MelFinancialMeasureTrendTrack } from "@/lib/mel/reporting-data";

const MEASURES = [
  { key: "revenue" as const, label: "Monthly Revenue" },
  { key: "costs" as const, label: "Monthly costs" },
  { key: "profit" as const, label: "Monthly profit" },
];

const SERIES_COLORS = ["#2563eb", "#ea580c", "#16a34a", "#9333ea", "#dc2626", "#0891b2", "#ca8a04"];

type Props = {
  trend: MelFinancialMeasureTrend;
  selectedTrack: string | null;
};

export function ProfitabilityMeasureChart({ trend, selectedTrack }: Props) {
  const tracks = trend.tracks.filter((item) => !selectedTrack || item.track === selectedTrack);
  if (tracks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
        Select Foundation or Acceleration to view the profitability measure chart.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {tracks.map((track) => (
        <TrackProfitabilityPanel key={track.track} track={track} />
      ))}
    </div>
  );
}

function TrackProfitabilityPanel({ track }: { track: MelFinancialMeasureTrendTrack }) {
  const periodsWithData = track.periods.filter(
    (period) => period.revenue !== null || period.costs !== null || period.profit !== null
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

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-background" aria-labelledby={`profitability-measure-${track.track}`}>
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
        <h3 id={`profitability-measure-${track.track}`} className="text-base font-semibold capitalize text-slate-900">
          {track.track} · All median values
        </h3>
        <p className="mt-0.5 text-sm text-slate-600">
          Monthly medians from approved reports in each quarter, compared with the programme ITT baseline for this track.
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
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(row.revenue)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(row.costs)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(row.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-800">Profitability trend over time</h4>
          {!hasChartData ? (
            <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-600">
              No approved quarterly medians yet. The baseline row is shown; period lines appear when monitoring data is approved.
            </p>
          ) : (
            <div className="mt-4 h-80 w-full" role="img" aria-label={`${track.track} profitability trend by revenue, costs, and profit`}>
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
                      stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                      strokeWidth={name === "Baseline" ? 2.5 : 2}
                      strokeDasharray={name === "Baseline" ? "6 4" : undefined}
                      dot={{ r: 4 }}
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
