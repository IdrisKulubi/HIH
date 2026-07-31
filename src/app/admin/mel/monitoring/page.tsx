import Link from "next/link";
import { ClipboardText, Gear } from "@phosphor-icons/react/dist/ssr";
import { getMelMonitoringWorkspace } from "@/lib/actions/mel-monitoring";
import { AssignmentForm, StartMonitoringForm } from "@/components/mel/monitoring/MonitoringRowActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function MelMonitoringWorkspacePage() {
  const result = await getMelMonitoringWorkspace();
  if (!result.success || !result.data) {
    return <WorkspaceError message={result.error ?? "Unable to load enterprise monitoring"} />;
  }
  const { actor, collectors, periods, rows } = result.data;
  const availablePeriods = periods.filter(
    (period) => period.status === "open" || (period.status === "closed" && period.allowCatchUp)
  );

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">MEL · Phase 2</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Quarterly enterprise monitoring</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Start a current report, resume a draft, or record an honest catch-up against its original period.
          </p>
        </div>
        {actor.canAccessAllEnterprises ? (
          <Button asChild variant="outline">
            <Link href="/admin/mel"><Gear className="mr-2 size-4" /> MEL configuration</Link>
          </Button>
        ) : null}
      </div>

      {availablePeriods.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          No reporting period is open and no closed period currently permits catch-up reporting.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-background">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Enterprise</th>
                <th className="px-4 py-3">Profile</th>
                <th className="px-4 py-3">Report history</th>
                <th className="px-4 py-3">Next action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.businessId} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{row.businessName}</p>
                    <p className="mt-1 text-xs text-slate-500">Enterprise #{row.businessId} · {row.applicantName}</p>
                    {actor.canAccessAllEnterprises ? (
                      <AssignmentForm businessId={row.businessId} collectors={collectors} />
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    <p>{humanize(row.track ?? "unassigned")} track</p>
                    <p className="mt-1 text-xs">{humanize(row.sector)} · {humanize(row.county ?? "county not recorded")}</p>
                  </td>
                  <td className="px-4 py-4">
                    {row.submissions.length > 0 ? (
                      <div className="flex max-w-sm flex-wrap gap-1.5">
                        {row.submissions.map((submission) => {
                          const period = periods.find((item) => item.id === submission.reportingPeriodId);
                          return (
                            <Link key={submission.id} href={`/admin/mel/monitoring/${row.businessId}/${submission.reportingPeriodId}`}>
                              <Badge variant="outline" className="hover:bg-slate-50">
                                {period?.code ?? `Period ${submission.reportingPeriodId}`}: {submission.status}
                              </Badge>
                            </Link>
                          );
                        })}
                      </div>
                    ) : <span className="text-xs text-slate-500">No monitoring history</span>}
                  </td>
                  <td className="px-4 py-4">
                    {availablePeriods.length > 0 ? (
                      <StartMonitoringForm businessId={row.businessId} periods={availablePeriods} />
                    ) : <span className="text-xs text-slate-500">Collection unavailable</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <ClipboardText className="mx-auto size-8 text-slate-300" weight="duotone" />
            <p className="mt-3 text-sm font-medium text-slate-900">No enterprises assigned</p>
            <p className="mt-1 text-sm text-slate-500">Ask your REDO to assign an enterprise to your monitoring queue.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function WorkspaceError({ message }: { message: string }) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">{message}</div>
    </div>
  );
}
