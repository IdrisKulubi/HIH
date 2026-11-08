"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaretUpDown, Check } from "@phosphor-icons/react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MelPanelAnalysis, PanelTrendPoint } from "@/lib/mel/panel-analysis";
import type { MelReportingDataset } from "@/lib/mel/reporting-data";
import { PANEL_MIN_DISAGGREGATION_N } from "@/lib/mel/panel-analysis-core";
import { IndicatorTrackComparison, type IndicatorTrackRow } from "@/components/mel/reporting/IndicatorTrackComparison";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { pushKeepingScroll } from "@/components/mel/reporting/keep-scroll";

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
  const trackGroups = panel.disaggregations.find((item) => item.dimension === "Track")?.groups ?? [];
  const indicatorMeasures = MEASURES.map((measure) => ({
    key: measure.key,
    label: measure.label,
    rows: indicatorRows(panel, trackGroups, measure.key),
  }));

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
    pushKeepingScroll(router, `/admin/mel/reporting?${params.toString()}`);
  };

  const handleEnterpriseChange = (value: string) => {
    pushParams({ panelBusinessId: value || null });
  };

  const sourceLabel = "Imported workbook";

  return (
    <section className="space-y-4 overflow-hidden rounded-lg border border-slate-200 bg-background" aria-labelledby="panel-analysis-heading">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
        <h2 id="panel-analysis-heading" className="text-lg font-semibold text-slate-900">Panel analysis (matched enterprises)</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Compare opening baselines with monitoring for the same enterprises, matched by Enterprise ID.
          Main results use only IDs present at both time points with non-zero monitoring financials (all-zero rows are non-response and excluded).
          Match rate is measured against unique baseline IDs. Figures are monthly. Demographics are joined from programme records.
          Track, county, sector, owner, and enterprise filters apply to every point.
        </p>
      </div>
      <div className="space-y-5 px-4 pb-5 sm:px-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-end">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <CoverageStat label="Baseline rows" value={panel.coverage.baselineTotalRows.toLocaleString()} />
            <CoverageStat label="Unique baseline IDs" value={panel.coverage.baselineUniqueIds.toLocaleString()} />
            <CoverageStat label="Monitoring enterprises" value={panel.coverage.monitoringTotal.toLocaleString()} />
            <CoverageStat label="Matched" value={panel.coverage.matched.toLocaleString()} />
            <CoverageStat label="Match % (of baseline)" value={formatPercent(panel.coverage.matchPercentOfBaseline)} />
            <CoverageStat label="Unmatched monitoring" value={panel.coverage.unmatchedMonitoringCount.toLocaleString()} />
          </dl>
          <EnterpriseFilter
            value={filters.panelBusinessId ?? null}
            options={panel.enterpriseOptions}
            onChange={handleEnterpriseChange}
          />
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
              All-zero monitoring rows ({panel.dataQuality.monitoringAllZeroCount}) are excluded from the matched panel; negatives in baseline profit (
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

        <PanelProgressChart trend={panel.trend} sourceLabel={sourceLabel} />

        {panel.viewMode === "empty" ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
            {panel.summaryLabel}
          </p>
        ) : (
          <>
            <IndicatorTrackComparison
              monitoringLabel="Monitoring"
              caption={`Matched panel · monthly medians · baseline vs ${monitoringShort} · ${panel.summaryLabel}`}
              measures={indicatorMeasures}
            />

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

            {panel.disaggregations
              .filter((disaggregation) => disaggregation.dimension !== "Track")
              .map((disaggregation) => (
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

function PanelProgressChart({ trend, sourceLabel }: { trend: PanelTrendPoint[]; sourceLabel: string }) {
  const hasValues = trend.some((point) => point.revenue !== null || point.costs !== null || point.profit !== null);
  return (
    <section className="space-y-3" aria-labelledby="panel-progress-heading">
      <div>
        <h3 id="panel-progress-heading" className="text-sm font-semibold text-slate-900">Progress from baseline</h3>
        <p className="mt-0.5 text-xs text-slate-600">
          Median KES per month. Each later point is the enterprises matched in that quarter. Source: {sourceLabel}.
        </p>
      </div>
      {!hasValues ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
          No matched baseline or monitoring values for the current filters.
        </p>
      ) : (
        <div className="h-80 w-full" role="img" aria-label="Revenue, costs, and profit from baseline through each monitoring quarter">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={compactKes}
                tick={{ fontSize: 11 }}
                width={72}
                label={{ value: "KES / month", angle: -90, position: "insideLeft", offset: 4, style: { fontSize: 11, fill: "#64748b" } }}
              />
              <Tooltip formatter={(value) => formatKes(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
              <Line type="monotone" dataKey="costs" name="Costs" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#64748b" strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {trend.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2.5 font-medium">Period</th>
                <th className="px-3 py-2.5 text-right font-medium">n matched</th>
                <th className="px-3 py-2.5 text-right font-medium">Revenue</th>
                <th className="px-3 py-2.5 text-right font-medium">Costs</th>
                <th className="px-3 py-2.5 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trend.map((point) => (
                <tr key={point.key} className={point.key === "baseline" ? "bg-slate-50/80" : undefined}>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{point.label}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{point.n}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(point.revenue)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(point.costs)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(point.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function indicatorRows(
  panel: MelPanelAnalysis,
  groups: MelPanelAnalysis["disaggregations"][number]["groups"],
  measure: "revenue" | "costs" | "profit"
): IndicatorTrackRow[] {
  if (panel.viewMode === "single" || groups.length === 0) {
    return [{
      key: "selected",
      label: panel.viewMode === "single" ? "Selected enterprise" : "Overall",
      n: panel.viewMode === "single" ? 1 : panel.coverage.matched,
      baseline: panel.baseline[measure],
      monitoring: panel.monitoring[measure],
      changePercent: panel.changePercent[measure],
    }];
  }
  return groups.map((group) => ({
    key: group.key,
    label: group.label,
    n: group.n,
    baseline: group.baseline[measure],
    monitoring: group.monitoring[measure],
    changePercent: group.changePercent[measure],
  }));
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

function EnterpriseFilter({
  value,
  options,
  onChange,
}: {
  value: number | null;
  options: Array<{ businessId: number; label: string }>;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.businessId === value);

  return (
    <div className="space-y-1.5 text-sm font-medium text-slate-700">
      <span id="panel-enterprise-label">Enterprise (panel only)</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-labelledby="panel-enterprise-label"
            className="h-10 w-full justify-between px-3 font-normal"
          >
            <span className="truncate text-left">{selected?.label ?? "All matched enterprises (median)"}</span>
            <CaretUpDown className="ml-2 size-4 shrink-0 text-slate-500" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-72 p-0" align="end">
          <Command>
            <CommandInput placeholder="Search by name or ID…" />
            <CommandList>
              <CommandEmpty>No matching enterprises.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all matched enterprises median"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <Check className={`size-4 shrink-0 ${value === null ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate">All matched enterprises (median)</span>
                </CommandItem>
                {options.map((option) => (
                  <CommandItem
                    key={option.businessId}
                    value={`${option.businessId} ${option.label}`}
                    onSelect={() => {
                      onChange(String(option.businessId));
                      setOpen(false);
                    }}
                  >
                    <Check className={`size-4 shrink-0 ${value === option.businessId ? "opacity-100" : "opacity-0"}`} />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  if (value > 0 && value < 0.1) return `${value.toFixed(2)}%`;
  return `${value.toFixed(1)}%`;
}

