"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MelIndicatorGroup, MelIndicatorVisualization, MelProfitabilityTrendPoint } from "@/lib/mel/reporting-data";

const GROUPS: Array<{ key: MelIndicatorGroup; label: string }> = [
  { key: "impact", label: "Impact" },
  { key: "long_term_outcomes", label: "Long-term Outcomes" },
  { key: "enterprise_capacity", label: "Enterprise Capacity" },
  { key: "finance_markets", label: "Finance & Markets" },
  { key: "green_growth", label: "Green Growth" },
  { key: "policy_environment", label: "Policy Environment" },
];

type Props = {
  indicators: MelIndicatorVisualization[];
  profitabilityTrend: MelProfitabilityTrendPoint[];
  selectedTrack: string | null;
};

export function IndicatorExplorer({ indicators, profitabilityTrend, selectedTrack }: Props) {
  const [selectedId, setSelectedId] = useState(() => indicators[0]?.indicatorId ?? 0);
  const selected = indicators.find((indicator) => indicator.indicatorId === selectedId) ?? indicators[0];
  const grouped = useMemo(() => GROUPS.map((group) => ({
    ...group,
    indicators: indicators.filter((indicator) => indicator.group === group.key),
  })), [indicators]);

  if (!selected) return <p className="rounded-lg border border-slate-200 p-6 text-sm text-slate-600">No active ITT definitions are configured.</p>;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-background" aria-labelledby="indicator-explorer-heading">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <h2 id="indicator-explorer-heading" className="text-lg font-semibold text-slate-900">Indicator explorer</h2>
        <p className="mt-0.5 text-sm text-slate-600">All {indicators.length} active ITT indicators, calculated as of the selected quarter from approved records.</p>
      </div>
      <div className="grid min-h-[640px] lg:grid-cols-[390px_minmax(0,1fr)]">
        <ScrollArea className="h-[560px] border-b border-slate-200 lg:h-[720px] lg:border-b-0 lg:border-r">
          <div className="space-y-5 p-3">
            {grouped.map((group) => (
              <div key={group.key}>
                <h3 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label} · {group.indicators.length}</h3>
                <div className="space-y-1">
                  {group.indicators.map((indicator) => (
                    <button
                      key={indicator.indicatorId}
                      type="button"
                      aria-pressed={indicator.indicatorId === selected.indicatorId}
                      onClick={() => setSelectedId(indicator.indicatorId)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 ${indicator.indicatorId === selected.indicatorId ? "border-brand-blue/40 bg-brand-blue/5" : "border-transparent hover:border-slate-200 hover:bg-slate-50"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-brand-blue">{indicator.code}</p>
                          <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-slate-800">{indicator.name}</p>
                        </div>
                        <StatusDot status={indicator.trafficLight} />
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-2 text-xs">
                        <CurrentValue indicator={indicator} selectedTrack={selectedTrack} />
                        <span className="shrink-0 text-slate-500">{sourceCount(indicator, selectedTrack)} sources</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-brand-blue">{selected.code} · {selected.resultCode}</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">{selected.name}</h3>
              <p className="mt-1 text-sm text-slate-600">Official cumulative/as-of-quarter trend · {unitLabel(selected.unit)}</p>
            </div>
            <Badge variant="outline" className="w-fit capitalize">{selected.trafficLight.replaceAll("_", " ")}</Badge>
          </div>

          {selected.unavailableExplanation ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{selected.unavailableExplanation}</div>
          ) : null}

          {selected.preDeliveryNote ? (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              {selected.preDeliveryNote}
            </div>
          ) : null}

          {selected.code === "LT1-PROFITABILITY-INCREASE" ? (
            <>
              <IndicatorChart indicator={selected} selectedTrack={selectedTrack} />
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h4 className="text-sm font-semibold text-slate-800">Supporting view: monthly median profit vs baseline</h4>
                <p className="mt-1 text-sm text-slate-600">Kenyan shillings from approved monitoring records. The chart above shows the official ITT percentage actual vs target.</p>
                <ProfitabilityChart data={profitabilityTrend} selectedTrack={selectedTrack} />
              </div>
            </>
          ) : (
            <IndicatorChart indicator={selected} selectedTrack={selectedTrack} />
          )}
        </div>
      </div>
    </section>
  );
}

function IndicatorChart({ indicator, selectedTrack }: { indicator: MelIndicatorVisualization; selectedTrack: string | null }) {
  const separateTracks = !selectedTrack && !indicator.programmeWide;
  const hasData = indicator.trend.some((point) => separateTracks
    ? point.foundation !== null || point.acceleration !== null
      || point.foundationTarget !== null || point.accelerationTarget !== null
    : point.overall !== null || point.overallTarget !== null);
  if (!hasData) return <EmptyChart />;
  const actualSeries = separateTracks
    ? [{ key: "foundation", label: "Foundation", color: "#0891b2" }, { key: "acceleration", label: "Acceleration", color: "#d97706" }] as const
    : [{ key: "overall", label: selectedTrack ? title(selectedTrack) : "Overall", color: "#0284c7" }] as const;
  const sharedTrackTarget = separateTracks && tracksShareTarget(indicator.trend);
  const targetSeries = separateTracks
    ? sharedTrackTarget
      ? [{ key: "foundationTarget", label: "Target", color: "#64748b" }] as const
      : [
          { key: "foundationTarget", label: "Foundation target", color: "#67e8f9" },
          { key: "accelerationTarget", label: "Acceleration target", color: "#fcd34d" },
        ] as const
    : [{ key: "overallTarget", label: "Target", color: "#64748b" }] as const;
  return (
    <>
      <p className="sr-only">{accessibleSummary(indicator, actualSeries.map((item) => item.key))}</p>
      <div className="mt-6 h-80 w-full" role="img" aria-label={`${indicator.name} quarterly trend`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={indicator.trend} margin={{ top: 10, right: 18, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="periodCode" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(value) => compact(Number(value), indicator.unit)} tick={{ fontSize: 11 }} width={72} />
            <Tooltip
              labelFormatter={(_, payload) => String(payload?.[0]?.payload?.periodLabel ?? "")}
              formatter={(value) => formatMeasure(Number(value), indicator.unit)}
            />
            <Legend />
            {actualSeries.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls={false}
              />
            ))}
            {targetSeries.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={1.75}
                strokeDasharray="6 5"
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TrendTable indicator={indicator} actualSeries={actualSeries} targetSeries={targetSeries} sharedTrackTarget={sharedTrackTarget} />
    </>
  );
}

function ProfitabilityChart({ data, selectedTrack }: { data: MelProfitabilityTrendPoint[]; selectedTrack: string | null }) {
  const series = selectedTrack === "foundation"
    ? [{ key: "foundation", label: "Foundation profit", color: "#0891b2", dashed: false }, { key: "foundationBaseline", label: "Foundation baseline", color: "#67e8f9", dashed: true }] as const
    : selectedTrack === "acceleration"
      ? [{ key: "acceleration", label: "Acceleration profit", color: "#d97706", dashed: false }, { key: "accelerationBaseline", label: "Acceleration baseline", color: "#fcd34d", dashed: true }] as const
      : [
          { key: "foundation", label: "Foundation profit", color: "#0891b2", dashed: false },
          { key: "foundationBaseline", label: "Foundation baseline", color: "#67e8f9", dashed: true },
          { key: "acceleration", label: "Acceleration profit", color: "#d97706", dashed: false },
          { key: "accelerationBaseline", label: "Acceleration baseline", color: "#fcd34d", dashed: true },
        ] as const;
  const hasData = data.some((point) => point.foundation !== null || point.acceleration !== null);
  if (!hasData) return <EmptyChart message="No approved profitability record is available through this reporting period." />;
  return (
    <>
      <div className="mt-6 h-80 w-full" role="img" aria-label="Monthly median profitability by track with validated track baselines">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 18, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(value) => compact(Number(value), "kes")} tick={{ fontSize: 11 }} width={72} />
            <Tooltip formatter={(value) => formatMeasure(Number(value), "kes")} />
            <Legend />
            {series.map((item) => <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={item.dashed ? 1.75 : 2.5} strokeDasharray={item.dashed ? "6 5" : undefined} dot={item.dashed ? false : { r: 3 }} connectNulls={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="px-3 py-2.5">Quarter</th>{series.map((item) => <th key={item.key} className="px-3 py-2.5 text-right">{item.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{data.map((point) => <tr key={point.periodId}><td className="px-3 py-2.5 font-medium text-slate-800">{point.periodLabel}</td>{series.map((item) => <td key={item.key} className="px-3 py-2.5 text-right tabular-nums">{formatMeasure(point[item.key], "kes")}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </>
  );
}

function TrendTable({
  indicator,
  actualSeries,
  targetSeries,
  sharedTrackTarget,
}: {
  indicator: MelIndicatorVisualization;
  actualSeries: ReadonlyArray<{ key: "overall" | "foundation" | "acceleration"; label: string }>;
  targetSeries: ReadonlyArray<{ key: "overallTarget" | "foundationTarget" | "accelerationTarget"; label: string }>;
  sharedTrackTarget: boolean;
}) {
  const columns = [
    ...actualSeries.map((item) => ({ key: item.key, label: item.label, kind: "actual" as const })),
    ...targetSeries.map((item) => ({ key: item.key, label: item.label, kind: "target" as const })),
  ];
  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-600">
          <tr>
            <th className="px-3 py-2.5">Quarter</th>
            {columns.map((item) => <th key={item.key} className="px-3 py-2.5 text-right">{item.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {indicator.trend.map((point) => (
            <tr key={point.periodId}>
              <td className="px-3 py-2.5 font-medium text-slate-800">{point.periodLabel}</td>
              {columns.map((item) => {
                const value = point[item.key];
                const ratioKey = item.kind === "actual" ? item.key : null;
                const ratio = ratioKey ? point.ratios[ratioKey] : null;
                return (
                  <td key={item.key} className={`px-3 py-2.5 text-right tabular-nums ${item.kind === "target" ? "text-slate-600" : ""}`}>
                    <p>{formatMeasure(value, indicator.unit)}</p>
                    {item.kind === "actual" && indicator.unit === "percentage" && ratio?.numerator != null && ratio.denominator != null ? (
                      <p className="mt-0.5 text-xs tabular-nums text-slate-500">{formatCount(ratio.numerator)}/{formatCount(ratio.denominator)}</p>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {sharedTrackTarget ? <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">Foundation and acceleration share the same target.</p> : null}
    </div>
  );
}

function tracksShareTarget(trend: MelIndicatorVisualization["trend"]) {
  const pairs = trend
    .filter((point) => point.foundationTarget !== null || point.accelerationTarget !== null)
    .map((point) => [point.foundationTarget, point.accelerationTarget] as const);
  if (pairs.length === 0) return false;
  return pairs.every(([foundation, acceleration]) => foundation === acceleration);
}
function CurrentValue({ indicator, selectedTrack }: { indicator: MelIndicatorVisualization; selectedTrack: string | null }) {
  if (!selectedTrack && !indicator.programmeWide) return <span className="text-slate-600"><strong className="text-slate-900">F {formatMeasure(indicator.current.foundation, indicator.unit)}</strong> · A {formatMeasure(indicator.current.acceleration, indicator.unit)}</span>;
  return <strong className="text-slate-900">{formatMeasure(indicator.current.overall, indicator.unit)}</strong>;
}
function sourceCount(indicator: MelIndicatorVisualization, selectedTrack: string | null) { return !selectedTrack && !indicator.programmeWide ? (indicator.sourceCounts.foundation ?? 0) + (indicator.sourceCounts.acceleration ?? 0) : indicator.sourceCounts.overall ?? 0; }
function StatusDot({ status }: { status: MelIndicatorVisualization["trafficLight"] }) { const colors = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", not_available: "bg-slate-300" }; return <span className={`mt-1 size-2.5 shrink-0 rounded-full ${colors[status]}`} title={status.replaceAll("_", " ")} />; }
function EmptyChart({ message = "No approved result is available for this indicator and filter selection." }: { message?: string }) { return <div className="mt-6 flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-600">{message}</div>; }
function formatMeasure(value: number | null, unit: string) { if (value === null || value === undefined) return "Not available"; if (unit === "percentage") return `${value.toFixed(1)}%`; if (unit === "kes") return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", notation: "compact", maximumFractionDigits: 1 }).format(value); if (unit === "kilograms") return `${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 1 }).format(value)} kg`; return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value); }
function formatCount(value: number) { return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value); }
function compact(value: number, unit: string) { const formatted = new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(value); return unit === "percentage" ? `${formatted}%` : unit === "kes" ? `KSh ${formatted}` : formatted; }
function unitLabel(unit: string) { return unit === "kes" ? "Kenyan shillings" : unit.replaceAll("_", " "); }
function title(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function accessibleSummary(indicator: MelIndicatorVisualization, keys: Array<"overall" | "foundation" | "acceleration">) { const last = indicator.trend.at(-1); return last ? `${indicator.name}, latest period ${last.periodLabel}: ${keys.map((key) => `${title(key)} ${formatMeasure(last[key], indicator.unit)}`).join(", ")}.` : `${indicator.name}: no quarterly data.`; }
