import Link from "next/link";
import { Gear } from "@phosphor-icons/react/dist/ssr";
import { getMelMonitoringWorkspace } from "@/lib/actions/mel-monitoring";
import { MonitoringWorkspaceTable } from "@/components/mel/monitoring/MonitoringWorkspaceTable";
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

      <MonitoringWorkspaceTable
        actor={actor}
        collectors={collectors}
        periods={periods}
        rows={rows}
        availablePeriods={availablePeriods}
      />
    </div>
  );
}

function WorkspaceError({ message }: { message: string }) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800">{message}</div>
    </div>
  );
}
