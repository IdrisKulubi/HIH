import Link from "next/link";
import { ChartLineUp, ClockCounterClockwise, Gear, Target } from "@phosphor-icons/react/dist/ssr";
import { getMelAdminOverview, listMelAuditEvents } from "@/lib/actions/mel-admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ReportingPeriodForm, PeriodStatusForm, ProgrammeSettingsForm } from "@/components/admin/mel/MelOverviewForms";

const statusStyle = {
  planned: "border-slate-200 bg-slate-50 text-slate-700",
  open: "border-emerald-200 bg-emerald-50 text-emerald-700",
  closed: "border-blue-200 bg-blue-50 text-blue-700",
  archived: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

export default async function MelAdminPage() {
  const [overviewResult, auditResult] = await Promise.all([
    getMelAdminOverview(),
    listMelAuditEvents(12),
  ]);

  if (!overviewResult.success || !overviewResult.data) {
    return <LoadError message={overviewResult.error ?? "Unable to load MEL configuration"} />;
  }

  const { canManage, indicators, periods, settings, unresolvedIndicatorCount } = overviewResult.data;
  const activeIndicators = indicators.filter((indicator) => indicator.isActive).length;
  const auditEvents = auditResult.success ? auditResult.data ?? [] : [];

  return (
    <div className="container mx-auto space-y-7 px-4 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">MEL foundation · Phase 1</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Monitoring configuration</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Govern reporting periods, the ITT indicator catalogue, baselines, targets, and programme-wide rules.
        </p>
      </div>
      <div className="flex justify-end">
        <Link href="/admin/mel/monitoring" className="text-sm font-medium text-brand-blue hover:underline">
          Open quarterly monitoring workspace
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="MEL configuration summary">
        <Summary icon={Target} label="Active indicators" value={activeIndicators} detail={`${indicators.length} total definitions`} />
        <Summary icon={ChartLineUp} label="Reporting periods" value={periods.length} detail={`${periods.filter((period) => period.status === "open").length} currently open`} />
        <Summary icon={Gear} label="Needs definition" value={unresolvedIndicatorCount} detail="ITT questions retained for resolution" tone="warning" />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Reporting calendar</h2>
          <p className="text-sm text-slate-600">Periods cannot overlap. Archived periods remain available for audit.</p>
        </div>
        {periods.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {periods.map((period) => (
              <Card key={period.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{period.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{period.code} · Programme year {period.programmeYear}</p>
                    </div>
                    <Badge variant="outline" className={statusStyle[period.status]}>{period.status}</Badge>
                  </div>
                  <dl className="mt-4 space-y-2 text-sm">
                    <DateRow label="Reporting" value={`${formatDate(period.startDate)} – ${formatDate(period.endDate)}`} />
                    <DateRow label="Collection" value={`${formatDate(period.collectionOpenDate)} – ${formatDate(period.collectionCloseDate)}`} />
                  </dl>
                  {canManage ? <PeriodStatusForm period={period} /> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState text="No reporting periods have been configured." />
        )}
        {canManage ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Add reporting period</CardTitle></CardHeader>
            <CardContent><ReportingPeriodForm /></CardContent>
          </Card>
        ) : null}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">ITT indicator catalogue</h2>
          <p className="text-sm text-slate-600">Definitions are versioned whenever a MEL manager saves a change.</p>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code and indicator</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Measure</th>
                  <th className="px-4 py-3">Configuration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {indicators.map((indicator) => (
                  <tr key={indicator.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link href={`/admin/mel/indicators/${indicator.id}`} className="font-semibold text-brand-blue hover:underline">
                        {indicator.code}
                      </Link>
                      <p className="mt-1 max-w-2xl text-slate-700">{indicator.name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{indicator.resultLevel.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{indicator.unit} · {indicator.frequency}</p>
                      <p className="mt-1 text-xs text-slate-500">{indicator.aggregation.replaceAll("_", " ")}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">v{indicator.version}</Badge>
                        <Badge variant="outline">{indicator.baselines.length} baseline{indicator.baselines.length === 1 ? "" : "s"}</Badge>
                        <Badge variant="outline">{indicator.targets.length} target{indicator.targets.length === 1 ? "" : "s"}</Badge>
                        {indicator.unresolvedNotes ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                tabIndex={0}
                                className="cursor-help border-amber-200 bg-amber-50 text-amber-700"
                                aria-label={`Needs decision: ${indicator.unresolvedNotes}`}
                              >
                                needs decision
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-sm text-left leading-relaxed">
                              <p className="font-medium">Decision still required</p>
                              <p className="mt-1 font-normal">{indicator.unresolvedNotes}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {indicators.length === 0 ? <EmptyState text="Run the Phase 1 ITT seed to load the agreed indicator catalogue." /> : null}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Programme rules</CardTitle>
          </CardHeader>
          <CardContent>
            {canManage ? <ProgrammeSettingsForm settings={settings} /> : (
              <p className="text-sm text-slate-600">You have read-only access to programme settings.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClockCounterClockwise className="size-4 text-brand-blue" weight="duotone" />
              Recent audit activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditEvents.length > 0 ? (
              <ol className="space-y-4">
                {auditEvents.map((event) => (
                  <li key={event.id} className="border-l-2 border-slate-200 pl-3">
                    <p className="text-sm font-medium text-slate-800">{event.action.replaceAll("_", " ")}</p>
                    <p className="text-xs text-slate-500">{event.entityType.replaceAll("_", " ")} · {formatDateTime(event.createdAt)}</p>
                    {event.reason ? <p className="mt-1 text-xs text-slate-600">{event.reason}</p> : null}
                  </li>
                ))}
              </ol>
            ) : <EmptyState text="Changes to MEL configuration will appear here." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  detail,
  tone = "brand",
}: {
  icon: React.ComponentType<{ className?: string; weight?: "duotone" }>;
  label: string;
  value: number;
  detail: string;
  tone?: "brand" | "warning";
}) {
  return (
    <div className={`rounded-lg border p-4 ${tone === "warning" ? "border-amber-200 bg-amber-50/60" : "border-brand-blue/15 bg-brand-blue/5"}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Icon className="size-4 text-brand-blue" weight="duotone" />
        {label}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
    </div>
  );
}

function DateRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-700">{value}</dd></div>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="px-4 py-8 text-center text-sm text-slate-500">{text}</p>;
}

function LoadError({ message }: { message: string }) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <h1 className="font-semibold text-red-900">MEL configuration could not be loaded</h1>
        <p className="mt-1 text-sm text-red-700">{message}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" }).format(value);
}
