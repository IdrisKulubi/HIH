import Link from "next/link";
import { ArrowSquareOut, ChartLineUp, CheckCircle, CurrencyCircleDollar, Factory, UsersThree, Warning } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMelReportingDashboard } from "@/lib/actions/mel-reporting";
import { ReportingFilters } from "@/components/mel/reporting/ReportingFilters";
import { ReportingTrendChart } from "@/components/mel/reporting/ReportingTrendChart";
import { RecalculateButton } from "@/components/mel/reporting/RecalculateButton";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MelReportingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters = {
    periodId: positiveNumber(params.periodId),
    track: scalar(params.track),
    county: scalar(params.county),
    sector: scalar(params.sector),
  };
  const result = await getMelReportingDashboard(filters);
  if (!result.success || !result.data) return <LoadError message={result.error ?? "Unable to load reporting dashboard."} />;
  const data = result.data;
  const exportQuery = new URLSearchParams({ periodId: String(data.selectedPeriod.id) });
  if (data.filters.track) exportQuery.set("track", data.filters.track);
  if (data.filters.county) exportQuery.set("county", data.filters.county);
  if (data.filters.sector) exportQuery.set("sector", data.filters.sector);

  return (
    <div className="container mx-auto space-y-7 px-4 py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">MEL reporting · Phase 4</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Programme results and ITT</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">Only approved, currently valid records contribute. Every result links back to its calculation and source records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link href="/admin/mel/reporting/data-quality">Data quality</Link></Button>
          <Button variant="outline" asChild><Link href="/admin/mel/gis">Protected GIS</Link></Button>
          <Button variant="outline" asChild><Link href="/admin/mel/programme-results">Programme entries</Link></Button>
          <RecalculateButton filters={data.filters} />
        </div>
      </header>

      <ReportingFilters dataset={data} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Executive reporting summary">
        <Metric icon={Factory} label="Enterprises reporting" value={data.summary.reportingEnterprises.toLocaleString()} detail={percentage(data.summary.reportingCompleteness) + " complete"} />
        <Metric icon={CurrencyCircleDollar} label="Monthly median revenue" value={money(data.summary.monthlyMedianRevenue)} detail={`${money(data.summary.monthlyMedianProfit)} monthly median profit`} />
        <Metric icon={UsersThree} label="Cumulative jobs" value={data.summary.jobs.toLocaleString()} detail={`${data.summary.directJobs} direct, ${data.summary.indirectJobs} indirect`} />
        <Metric icon={ChartLineUp} label="Finance accessed" value={money(data.summary.financeAccessed)} detail={`${data.financeBreakdown.filter((item) => item.amount > 0).length} funding types recorded`} />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-background" aria-labelledby="funding-breakdown-heading">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="funding-breakdown-heading" className="text-base font-semibold text-slate-900">Finance accessed by funding type</h2>
            <p className="mt-0.5 text-sm text-slate-600">Cumulative approved funding through {data.selectedPeriod.label}. Dashboard filters apply.</p>
          </div>
          <p className="text-sm text-slate-700">Total <span className="ml-1 font-semibold tabular-nums text-slate-900">{money(data.summary.financeAccessed)}</span></p>
        </div>
        {data.summary.financeAccessed > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Funding type</th>
                  <th className="px-4 py-3 text-right font-medium">Enterprises</th>
                  <th className="px-4 py-3 text-right font-medium">Cumulative amount</th>
                  <th className="px-4 py-3 font-medium">Share of funding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.financeBreakdown.map((item) => (
                  <tr key={item.type} className={item.amount === 0 ? "text-slate-500" : "text-slate-800"}>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.enterpriseCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{money(item.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                          <div className="h-full rounded-full bg-brand-blue" style={{ width: `${Math.min(100, item.percentage)}%` }} />
                        </div>
                        <span className="min-w-12 tabular-nums">{percentage(item.percentage)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-slate-600">No approved finance has been recorded for the selected filters.</p>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="financial-performance-heading">
        <div>
          <h2 id="financial-performance-heading" className="text-lg font-semibold text-slate-900">Monthly financial performance by track</h2>
          <p className="text-sm text-slate-600">Quarterly enterprise values are converted to monthly equivalents after calculating the cohort median. Foundation and Acceleration baselines are never combined.</p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600"><tr><th className="px-4 py-3">Track</th><th className="px-4 py-3">Measure</th><th className="px-4 py-3">Monthly median</th><th className="px-4 py-3">Baseline</th><th className="px-4 py-3">Variance</th><th className="px-4 py-3">Variance %</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.financialPerformance.flatMap((track) => (["revenue", "costs", "profit"] as const).map((measure, index) => (
                <tr key={`${track.track}-${measure}`}>
                  <td className="px-4 py-3 font-semibold capitalize text-slate-900">{index === 0 ? <>{track.track}<span className="ml-2 text-xs font-normal text-slate-500">{track.enterpriseCount} enterprises</span></> : null}</td>
                  <td className="px-4 py-3 capitalize">{measure}</td>
                  <td className="px-4 py-3 tabular-nums">{money(track[`monthlyMedian${measure[0].toUpperCase()}${measure.slice(1)}` as "monthlyMedianRevenue" | "monthlyMedianCosts" | "monthlyMedianProfit"])}</td>
                  <td className="px-4 py-3 tabular-nums">{money(track.baseline[measure])}</td>
                  <td className="px-4 py-3 tabular-nums">{money(track.variance[measure])}</td>
                  <td className="px-4 py-3 tabular-nums">{percentage(track.variancePercentage[measure])}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_0.5fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">Monthly median revenue, profit and jobs trend</CardTitle></CardHeader>
          <CardContent><ReportingTrendChart trends={data.trends} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">ITT status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <StatusRow label="On track" value={data.summary.greenResults} tone="green" />
            <StatusRow label="Needs attention" value={data.summary.amberResults} tone="amber" />
            <StatusRow label="Off track" value={data.summary.redResults} tone="red" />
            <StatusRow label="No comparable target" value={data.ittRows.filter((row) => row.calculation.trafficLight === "not_available").length} tone="neutral" />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Indicator tracking table</h2>
            <p className="text-sm text-slate-600">Actuals reflect the active filters. Targets use the matching period, annual, then overall target.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild><a href={`/api/mel/exports?type=itt&format=csv&${exportQuery}`}>CSV</a></Button>
            <Button size="sm" variant="outline" asChild><a href={`/api/mel/exports?type=itt&format=xlsx&${exportQuery}`}>Excel</a></Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-background">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Result / indicator</th><th className="px-4 py-3">Baseline</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Actual</th><th className="px-4 py-3">Achievement</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Lineage</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.ittRows.map((row) => (
                  <tr key={row.indicatorId} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{row.code}</p><p className="mt-0.5 max-w-xl text-slate-600">{row.name}</p><p className="mt-1 text-xs text-slate-400">{row.resultCode} · {row.resultLevel.replaceAll("_", " ")}</p></td>
                    <td className="px-4 py-3 tabular-nums">{measure(row.baseline, row.unit)}</td>
                    <td className="px-4 py-3 tabular-nums">{measure(row.target, row.unit)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums text-slate-900">{measure(row.calculation.actual, row.unit)}</td>
                    <td className="px-4 py-3 tabular-nums">{percentage(row.calculation.achievementPercentage)}</td>
                    <td className="px-4 py-3"><TrafficBadge status={row.calculation.trafficLight} /></td>
                    <td className="px-4 py-3"><Link href={`/admin/mel/reporting/indicators/${row.indicatorId}?periodId=${data.selectedPeriod.id}`} className="inline-flex items-center gap-1 font-medium text-brand-blue hover:underline">{row.calculation.sourceCount} sources <ArrowSquareOut className="size-3.5" /></Link><p className="mt-1 text-xs text-slate-500">{row.calculatedAt ? `Saved ${formatDate(row.calculatedAt)}` : "Preview, recalculation needed"}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: React.ComponentType<{ className?: string; weight?: "duotone" }>; label: string; value: string; detail: string }) {
  return <div className="rounded-lg border border-brand-blue/15 bg-brand-blue/5 p-4"><div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Icon className="size-4 text-brand-blue" weight="duotone" />{label}</div><p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></div>;
}

function StatusRow({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" | "neutral" }) {
  const styles = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", neutral: "bg-slate-300" };
  return <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-700"><span className={`size-2.5 rounded-full ${styles[tone]}`} />{label}</span><span className="font-semibold tabular-nums text-slate-900">{value}</span></div>;
}

function TrafficBadge({ status }: { status: "green" | "amber" | "red" | "not_available" }) {
  const styles = { green: "border-emerald-200 bg-emerald-50 text-emerald-700", amber: "border-amber-200 bg-amber-50 text-amber-800", red: "border-red-200 bg-red-50 text-red-700", not_available: "border-slate-200 bg-slate-50 text-slate-600" };
  const Icon = status === "green" ? CheckCircle : Warning;
  return <Badge variant="outline" className={styles[status]}><Icon className="mr-1 size-3.5" />{status.replaceAll("_", " ")}</Badge>;
}

function scalar(value: string | string[] | undefined) { return typeof value === "string" && value ? value : null; }
function positiveNumber(value: string | string[] | undefined) { const parsed = Number(scalar(value)); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }
function money(value: number | null) { return value === null ? "Not available" : new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", notation: "compact", maximumFractionDigits: 1 }).format(value); }
function percentage(value: number | null) { return value === null ? "Not available" : `${value.toFixed(1)}%`; }
function measure(value: number | null, unit: string) { if (value === null) return "Not available"; if (unit === "percentage") return `${value.toFixed(1)}%`; if (unit === "kes") return money(value); return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value); }
function formatDate(value: Date) { return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" }).format(value); }
function LoadError({ message }: { message: string }) { return <div className="container mx-auto px-4 py-12"><div className="rounded-lg border border-red-200 bg-red-50 p-5"><h1 className="font-semibold text-red-900">Reporting dashboard could not be loaded</h1><p className="mt-1 text-sm text-red-700">{message}</p></div></div>; }
