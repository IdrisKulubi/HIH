import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HubQueueRow } from "@/components/staff/HubQueueRow";
import { ArrowRight, ChartLineUp, CheckCircle, FileText } from "@phosphor-icons/react/dist/ssr";

type MelOfficerHubSummary = {
  melReviewPending: number;
};

export function MelOfficerHub({ summary }: { summary: MelOfficerHubSummary }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">MEL programme hub</h1>
            <Badge className="bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/10">MEL Officer</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Final quality assurance, reporting, and CNA diagnostics in one place
          </p>
        </div>
        {summary.melReviewPending > 0 && (
          <Button asChild className="shrink-0 bg-brand-blue hover:bg-brand-blue/90">
            <Link href="/admin/mel/review">
              Review MEL reports
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-brand-blue">
            <CheckCircle className="size-3.5" weight="fill" />
            MEL reviews
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{summary.melReviewPending}</p>
          <p className="mt-1 text-xs text-slate-600">Reports awaiting final MEL approval</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Queues</h2>
        <div className="space-y-2">
          <HubQueueRow
            title="MEL report reviews"
            description="Complete final quality assurance and approve trusted monitoring reports"
            href="/admin/mel/review"
            count={summary.melReviewPending}
            countLabel="awaiting review"
            primary={summary.melReviewPending > 0}
          />
          <HubQueueRow
            title="MEL reporting"
            description="Programme-wide indicator dashboard, trends, and exports"
            href="/admin/mel/reporting"
          />
          <HubQueueRow
            title="Evidence repository"
            description="Browse and verify supporting evidence linked to monitoring reports"
            href="/admin/mel/evidence"
          />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Your responsibilities</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 size-4 shrink-0 text-brand-blue" weight="duotone" />
            Final QA and approval of quarterly monitoring reports
          </li>
          <li className="flex items-start gap-2">
            <ChartLineUp className="mt-0.5 size-4 shrink-0 text-brand-blue" weight="duotone" />
            Maintain programme reporting and indicator configuration
          </li>
          <li className="flex items-start gap-2">
            <FileText className="mt-0.5 size-4 shrink-0 text-brand-blue" weight="duotone" />
            Complete CNA impact diagnostics for assigned enterprises
          </li>
        </ul>
      </section>
    </div>
  );
}
