import Link from "next/link";
import { ArrowDown, ArrowSquareOut, ArrowUp, ChartLineUp, CheckCircle, CurrencyCircleDollar, DownloadSimple, Factory, Minus, UsersThree, Warning } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMelReportingDashboard } from "@/lib/actions/mel-reporting";
import type { MelDashboardFilters } from "@/lib/mel/reporting-data";
import { ReportingFilters } from "@/components/mel/reporting/ReportingFilters";
import { RecalculateButton } from "@/components/mel/reporting/RecalculateButton";
import { DashboardAutoRefresh } from "@/components/mel/reporting/DashboardAutoRefresh";
import { IndicatorExplorer } from "@/components/mel/reporting/IndicatorExplorer";
import { FeedbackAccountabilitySection } from "@/components/mel/reporting/FeedbackAccountabilitySection";
import { WasteRecycledSection } from "@/components/mel/reporting/WasteRecycledSection";
import { PanelAnalysisSection } from "@/components/mel/reporting/PanelAnalysisSection";
import { ProfitabilityMeasureChart } from "@/components/mel/reporting/ProfitabilityMeasureChart";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MelReportingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters: MelDashboardFilters = {
    periodId: positiveNumber(params.periodId),
    track: scalar(params.track),
    county: scalar(params.county),
    sector: scalar(params.sector),
    ownerGender: scalar(params.ownerGender),
    panelBusinessId: positiveNumber(params.panelBusinessId),
    panelSource: params.panelSource === "system" ? "system" : "workbook",
  };
  const result = await getMelReportingDashboard(filters);
  if (!result.success || !result.data) return <LoadError message={result.error ?? "Unable to load reporting dashboard."} />;
  const data = result.data;
  const exportQuery = new URLSearchParams({ periodId: String(data.selectedPeriod.id) });
  if (data.filters.track) exportQuery.set("track", data.filters.track);
  if (data.filters.county) exportQuery.set("county", data.filters.county);
  if (data.filters.sector) exportQuery.set("sector", data.filters.sector);
  if (data.filters.ownerGender) exportQuery.set("ownerGender", data.filters.ownerGender);
  if (data.filters.panelBusinessId) exportQuery.set("panelBusinessId", String(data.filters.panelBusinessId));
  if (data.filters.panelSource) exportQuery.set("panelSource", data.filters.panelSource);

  return (
    <div className="container mx-auto space-y-7 px-4 py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">MEL reporting · Live indicator dashboard</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Programme results and ITT</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">All active ITT indicators are visualized from approved, currently valid records. Every result links back to its calculation and source records.</p>
          <p className="mt-2 text-xs text-slate-500">Programme years stay Oct→Oct for ITT targets (Y1 250 / Y2 150 / total 400). BDS monitoring starts Jun 2026: Y1 Pre-delivery (Oct 2025–May 2026), then Monitoring Q1 Jun–Aug 2026. OP1.1 Y1 actuals: mobilized 240/250 (96%), CNA &amp; CDP 235/250 (94%).</p>
          <div className="mt-2"><DashboardAutoRefresh /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-brand-blue hover:bg-brand-blue-dark" asChild>
            <a className="inline-flex items-center gap-1.5" href={`/api/mel/exports?type=executive-summary&format=pdf&${exportQuery}`}>
              <DownloadSimple className="size-4" />
              Executive summary PDF
            </a>
          </Button>
          <Button variant="outline" asChild><Link href="/admin/mel/reporting/data-quality">Data quality</Link></Button>
          <Button variant="outline" asChild><Link href="/admin/mel/gis">Protected GIS</Link></Button>
          <Button variant="outline" asChild><Link href="/admin/mel/programme-results">Programme entries</Link></Button>
          <RecalculateButton filters={data.filters} />
        </div>
      </header>

      <ReportingFilters dataset={data} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Executive reporting summary">
        <Metric
          icon={Factory}
          label="Enterprises reporting"
          value={data.summary.reportingEnterprises.toLocaleString()}
          detail={`${data.summary.reportingEnterprises} of ${data.summary.eligibleEnterprises.toLocaleString()} active enterprises (${percentage(data.summary.reportingCompleteness)})`}
        />
        <MonthlyMedianRevenueMetric
          current={data.summary.monthlyMedianRevenue}
          baseline={data.summary.monthlyMedianRevenueBaseline}
          change={data.summary.monthlyMedianRevenueChange}
          changePercent={data.summary.monthlyMedianRevenueChangePercent}
          baselineLabel={data.summary.monthlyMedianRevenueBaselineLabel}
        />
        <CumulativeJobsMetric summary={data.summary} />
        <FinanceAccessedMetric
          actual={data.summary.externalFinanceAccessed}
          target={data.summary.externalFinanceTarget}
          achievement={data.summary.externalFinanceAchievement}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-background" aria-labelledby="funding-breakdown-heading">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="funding-breakdown-heading" className="text-base font-semibold text-slate-900">Finance accessed by funding type</h2>
            <p className="mt-0.5 text-sm text-slate-600">Cumulative approved funding through {data.selectedPeriod.label}. Loan, repayable grant, and other count toward the {money(data.summary.externalFinanceTarget)} external funding target. BIRE matching grant is excluded from that target.</p>
          </div>
          <div className="text-sm text-slate-700 sm:text-right">
            <p>Actual vs target <span className="ml-1 font-semibold tabular-nums text-slate-900">{money(data.summary.externalFinanceAccessed)} / {money(data.summary.externalFinanceTarget)}</span></p>
            <p className="mt-0.5 text-xs text-slate-500">Achievement {percentage(data.summary.externalFinanceAchievement)} · all types {money(data.summary.financeAccessed)}</p>
          </div>
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
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {item.label}
                      {item.type === "matching_grant" ? <span className="ml-2 text-xs font-normal text-slate-500">excluded from target</span> : null}
                    </td>
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

      <WasteRecycledSection
        periodLabel={data.selectedPeriod.label}
        periodId={data.selectedPeriod.id}
        waste={data.wasteReporting}
      />

      <FeedbackAccountabilitySection
        periodLabel={data.selectedPeriod.label}
        responseCount={data.feedbackAccountability.responseCount}
        positiveEffects={data.feedbackAccountability.positiveEffects}
        enterpriseChallenges={data.feedbackAccountability.enterpriseChallenges}
        supportNeeded={data.feedbackAccountability.supportNeeded}
        negativeEffects={data.feedbackAccountability.negativeEffects}
      />

      <section className="space-y-3" aria-labelledby="financial-performance-heading">
        <div>
          <h2 id="financial-performance-heading" className="text-lg font-semibold text-slate-900">Monthly financial performance by track</h2>
          <p className="text-sm text-slate-600">Quarterly values are converted to monthly equivalents (÷ 3), using one latest approved report per enterprise. Each measure shows change vs the programme ITT baseline (revenue, costs, and profit), including Overall (all tracks). LT1 tracks a <span className="font-medium text-slate-800">50% increase in median revenue</span>. <span className="font-medium text-slate-800">vs own baseline</span> counts enterprises whose monthly profit is at or above their imported opening baseline.</p>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3">Track</th>
                <th className="px-4 py-3">Enterprises</th>
                <th className="px-4 py-3">Monthly revenue</th>
                <th className="px-4 py-3">Monthly costs</th>
                <th className="px-4 py-3">Monthly profit</th>
                <th className="px-4 py-3">ITT revenue baseline</th>
                <th className="px-4 py-3">vs own baseline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.financialPerformance.map((track) => (
                <tr key={track.track} className={track.track === "all" ? "bg-slate-50/80" : undefined}>
                  <td className="px-4 py-3 font-semibold capitalize text-slate-900">{track.track === "all" ? "Overall" : track.track}</td>
                  <td className="px-4 py-3 tabular-nums">{track.enterpriseCount}</td>
                  <FinancialMeasureCell measure="revenue" current={track.monthlyMedianRevenue} variance={track.variance.revenue} variancePercent={track.variancePercentage.revenue} baseline={track.baseline?.revenue ?? null} />
                  <FinancialMeasureCell measure="costs" current={track.monthlyMedianCosts} variance={track.variance.costs} variancePercent={track.variancePercentage.costs} baseline={track.baseline?.costs ?? null} />
                  <FinancialMeasureCell measure="profit" current={track.monthlyMedianProfit} variance={track.variance.profit} variancePercent={track.variancePercentage.profit} baseline={track.baseline?.profit ?? null} emphasis />
                  <td className="px-4 py-3 tabular-nums">{track.baseline ? money(track.baseline.revenue) : "Not applicable"}</td>
                  <td className="px-4 py-3"><OwnBaselineCell summary={track.ownBaseline} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="financial-performance-over-time-heading">
        <div>
          <h2 id="financial-performance-over-time-heading" className="text-lg font-semibold text-slate-900">Monthly financial performance over time</h2>
          <p className="text-sm text-slate-600">
            Compare monthly median revenue, costs, and profit against the programme baseline for Foundation, Accelerator, and Overall. Costs: increase is red, decrease is green. Profit and revenue: increase is green, decrease is red. Use Male, Female, or Youth to view period performance for that owner group.
          </p>
        </div>
        <ProfitabilityMeasureChart
          trend={data.financialMeasureTrend}
          selectedTrack={data.filters.track ?? null}
          selectedDemographic={data.filters.ownerGender}
        />
      </section>

      <PanelAnalysisSection panel={data.panelAnalysis} filters={data.filters} />

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-background" aria-labelledby="approved-reports-export-heading">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="approved-reports-export-heading" className="text-base font-semibold text-slate-900">Approved reports dataset</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">Excel opens on <span className="font-medium text-slate-800">Period vs baseline</span>: each quarter&apos;s overall monthly revenue, costs, and profit against both the ITT track baseline and the cohort&apos;s own imported baselines. The Approved reports sheet then lists every enterprise with those baseline values beside the period figures. CSV is the enterprise sheet; use Period vs baseline CSV for the overall comparison.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <a className="inline-flex items-center gap-1.5" href={`/api/mel/exports?type=full&format=csv&${exportQuery}`}><DownloadSimple className="size-4" />Enterprise CSV</a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a className="inline-flex items-center gap-1.5" href={`/api/mel/exports?type=period-baseline&format=csv&${exportQuery}`}><DownloadSimple className="size-4" />Period vs baseline CSV</a>
            </Button>
            <Button size="sm" className="bg-brand-blue hover:bg-brand-blue-dark" asChild>
              <a className="inline-flex items-center gap-1.5" href={`/api/mel/exports?type=full&format=xlsx&${exportQuery}`}><DownloadSimple className="size-4" />Excel workbook</a>
            </Button>
          </div>
        </div>
      </section>

      <IndicatorExplorer indicators={data.indicatorVisualizations} profitabilityTrend={data.profitabilityTrend} selectedTrack={data.filters.track ?? null} />

      <section className="grid gap-5 xl:grid-cols-[1fr_0.5fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">How to read this dashboard</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Each point is the official cumulative result available through that quarter, using the same formula as the ITT table below.</p>
            <p>When Track is All, enterprise indicators keep Foundation and Acceleration separate. Programme-wide indicators remain Overall.</p>
            <p>Finance accessed on this dashboard is external funding (loan, repayable grant, and other) against the Ksh 130M target. BIRE matching grant is listed in the breakdown but excluded from that KPI.</p>
            <p>Waste collected and recycled compares ITT baseline and targets with the sum of cumulative kg reported by waste-management enterprises (OP3.3), disaggregated by stream.</p>
            <p>LT1 (revenue increase) is the only visualization with baseline lines; other indicators show observed approved results only.</p>
            <p>Revenue vs ITT baseline can be negative while vs own baseline is mostly positive: many firms can beat their own opening profit while the cohort median is still below the programme revenue bar.</p>
          </CardContent>
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
                    <td className="px-4 py-3 tabular-nums">
                      {row.targetBreakdown.length ? (
                        <div className="space-y-0.5">
                          {row.targetBreakdown.map((item) => (
                            <p key={item.label} className={item.label === "Total" ? "font-semibold text-slate-900" : "text-slate-600"}>
                              {item.label}={measure(item.value, row.unit)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        measure(row.target, row.unit)
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <p className="font-semibold text-slate-900">{measure(row.calculation.actual, row.unit)}</p>
                      {row.unit === "percentage" && row.calculation.numerator !== null && row.calculation.denominator !== null ? (
                        <p className="mt-1 text-xs font-normal tabular-nums text-slate-500">
                          {formatNumber(row.calculation.numerator)}/{formatNumber(row.calculation.denominator)}
                        </p>
                      ) : null}
                      {row.unit === "count" && row.calculation.actual !== null && row.target !== null ? (
                        <p className="mt-1 text-xs font-normal tabular-nums text-slate-500">
                          {formatNumber(row.calculation.actual)}/{formatNumber(row.target)}
                        </p>
                      ) : null}
                      {row.calculation.exclusions.some((note) => note.startsWith("Data-quality warning:")) ? (
                        <p className="mt-1 text-xs font-medium text-amber-700">Data-quality warning</p>
                      ) : null}
                    </td>
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

function OwnBaselineCell({
  summary,
}: {
  summary: {
    comparableCount: number;
    atOrAboveCount: number;
    declinedCount: number;
    atOrAboveShare: number | null;
    medianProfitChange: number | null;
    missingBaselineCount: number;
  };
}) {
  if (summary.comparableCount === 0) {
    return <p className="text-sm text-slate-500">No own baselines to compare</p>;
  }
  const shareTone = (summary.atOrAboveShare ?? 0) >= 50 ? "text-emerald-800" : "text-amber-800";
  return (
    <div className="min-w-[220px] space-y-1">
      <p className={`font-medium tabular-nums ${shareTone}`}>
        {summary.atOrAboveCount}/{summary.comparableCount} at or above ({percentage(summary.atOrAboveShare)})
      </p>
      <p className="text-xs tabular-nums text-slate-600">
        {summary.declinedCount} below · median change {money(summary.medianProfitChange)}
      </p>
      {summary.missingBaselineCount > 0 ? (
        <p className="text-xs text-slate-500">{summary.missingBaselineCount} without an imported baseline</p>
      ) : null}
    </div>
  );
}

function MonthlyMedianRevenueMetric({
  current,
  baseline,
  change,
  changePercent,
  baselineLabel,
}: {
  current: number | null;
  baseline: number | null;
  change: number | null;
  changePercent: number | null;
  baselineLabel: string | null;
}) {
  const direction = change === null ? null : change > 0 ? "up" : change < 0 ? "down" : "flat";
  const tone = direction === "up"
    ? "border-emerald-200 bg-emerald-50"
    : direction === "down"
      ? "border-red-200 bg-red-50"
      : "border-brand-blue/15 bg-brand-blue/5";
  const badge = direction === "up"
    ? "bg-emerald-600 text-white"
    : direction === "down"
      ? "bg-red-600 text-white"
      : "bg-slate-500 text-white";
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  const statusLabel = direction === "up" ? "Growth" : direction === "down" ? "Decline" : direction === "flat" ? "Unchanged" : "No baseline";
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <CurrencyCircleDollar className="size-4 text-brand-blue" weight="duotone" />
          Monthly median revenue
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badge}`}>
          <Icon className="size-3" weight="bold" />
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{money(current)}</p>
      <p className="mt-1 text-xs text-slate-600">
        {baseline === null
          ? "No baseline available for this filter"
          : `${money(change)} vs ${money(baseline)} ${baselineLabel ?? "baseline"} (${percentage(changePercent)})`}
      </p>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: React.ComponentType<{ className?: string; weight?: "duotone" }>; label: string; value: string; detail: string }) {
  return <div className="rounded-lg border border-brand-blue/15 bg-brand-blue/5 p-4"><div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Icon className="size-4 text-brand-blue" weight="duotone" />{label}</div><p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-600">{detail}</p></div>;
}

function CumulativeJobsMetric({
  summary,
}: {
  summary: {
    jobs: number;
    directQualityJobs: number;
    directNonQualityJobs: number;
    indirectJobs: number;
    jobDisaggregation: { male: number; female: number; youth: number; plwd: number; refugee: number };
  };
}) {
  const { jobDisaggregation: jobs } = summary;
  return (
    <div className="rounded-lg border border-brand-blue/15 bg-brand-blue/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <UsersThree className="size-4 text-brand-blue" weight="duotone" />
        Cumulative jobs
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{summary.jobs.toLocaleString()}</p>
      <p className="mt-1 text-xs text-slate-600">
        Direct jobs (Quality={summary.directQualityJobs}, Non-quality={summary.directNonQualityJobs}),{" "}
        {summary.indirectJobs.toLocaleString()} indirect
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Male</dt>
          <dd className="font-medium tabular-nums text-slate-800">{jobs.male.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Female</dt>
          <dd className="font-medium tabular-nums text-slate-800">{jobs.female.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Youths</dt>
          <dd className="font-medium tabular-nums text-slate-800">{jobs.youth.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-slate-500">PLWD</dt>
          <dd className="font-medium tabular-nums text-slate-800">{jobs.plwd.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Refugees</dt>
          <dd className="font-medium tabular-nums text-slate-800">{jobs.refugee.toLocaleString()}</dd>
        </div>
      </dl>
    </div>
  );
}

function FinanceAccessedMetric({ actual, target, achievement }: { actual: number; target: number; achievement: number | null }) {
  const progress = Math.min(100, Math.max(0, achievement ?? 0));
  return (
    <div className="rounded-lg border border-brand-blue/15 bg-brand-blue/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <ChartLineUp className="size-4 text-brand-blue" weight="duotone" />
        Finance accessed
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{money(actual)}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 text-xs">
        <div>
          <dt className="text-slate-500">Target</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-slate-800">{money(target)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Achievement</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-slate-800">{percentage(achievement)}</dd>
        </div>
      </dl>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-blue" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-600">External funding: loan, repayable grant, and other</p>
    </div>
  );
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
function varianceTone(measure: "revenue" | "costs" | "profit", current: number | null, baseline: number | null) {
  if (current === null || baseline === null) return "text-slate-800";
  return changeTone(measure, current - baseline);
}
function changeTone(measure: "revenue" | "costs" | "profit", change: number | null) {
  if (change === null || change === 0) return "text-slate-800";
  const improved = measure === "costs" ? change < 0 : change > 0;
  return improved ? "font-medium text-emerald-700" : "font-medium text-red-700";
}
function FinancialMeasureCell({
  measure,
  current,
  variance,
  variancePercent,
  baseline,
  emphasis = false,
}: {
  measure: "revenue" | "costs" | "profit";
  current: number | null;
  variance: number | null;
  variancePercent: number | null;
  baseline: number | null;
  emphasis?: boolean;
}) {
  const tone = varianceTone(measure, current, baseline);
  const showDelta = baseline !== null && current !== null && variance !== null;
  return (
    <td className={`px-4 py-3 tabular-nums ${tone} ${emphasis ? "font-medium" : ""}`}>
      <div>{money(current)}</div>
      {showDelta ? (
        <div className={`text-xs ${changeTone(measure, variance)}`}>
          {signedMoney(variance)} ({percentage(variancePercent)})
        </div>
      ) : null}
    </td>
  );
}
function signedMoney(value: number | null) {
  if (value === null) return "Not available";
  const formatted = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", notation: "compact", maximumFractionDigits: 1 }).format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}
function percentage(value: number | null) {
  if (value === null) return "Not available";
  if (value > 0 && value < 0.1) return `${value.toFixed(2)}%`;
  return `${value.toFixed(1)}%`;
}
function measure(value: number | null, unit: string) { if (value === null) return "Not available"; if (unit === "percentage") return `${value.toFixed(1)}%`; if (unit === "kes") return money(value); return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value); }
function formatNumber(value: number) { return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 }).format(value); }
function formatDate(value: Date) { return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" }).format(value); }
function LoadError({ message }: { message: string }) { return <div className="container mx-auto px-4 py-12"><div className="rounded-lg border border-red-200 bg-red-50 p-5"><h1 className="font-semibold text-red-900">Reporting dashboard could not be loaded</h1><p className="mt-1 text-sm text-red-700">{message}</p></div></div>; }
