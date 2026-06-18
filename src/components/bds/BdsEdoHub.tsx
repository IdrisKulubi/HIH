import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HubQueueRow } from "@/components/staff/HubQueueRow";
import type { BdsEdoDashboardSummary } from "@/lib/actions/bds-edo-dashboard";
import {
  ArrowRight,
  Briefcase,
  ClipboardText,
  Clock,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

type HubUser = {
  firstName?: string | null;
  role?: string | null;
};

export function BdsEdoHub({
  user,
  summary,
}: {
  user: HubUser;
  summary: BdsEdoDashboardSummary;
}) {
  const displayName = user.firstName?.trim() || "Reviewer";
  const screeningPriority = summary.preScreeningNotScreened > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {displayName}&apos;s programme hub
            </h1>
            <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">
              <ShieldCheck className="mr-1 size-3" weight="fill" />
              BA / EDO
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            CNA diagnostics, A2F pre-screening, and pipeline due diligence in one place
          </p>
        </div>
        {screeningPriority && (
          <Button asChild className="shrink-0 bg-emerald-700 hover:bg-emerald-800">
            <Link href="/finance-screening">
              Open pre-screening
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        )}
        {!screeningPriority && summary.a2fDdAwaiting > 0 && (
          <Button asChild className="shrink-0 bg-emerald-700 hover:bg-emerald-800">
            <Link href="/a2f">
              Open A2F due diligence
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-teal-200/60 bg-teal-50/50 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
            CNA candidates
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {summary.cnaCandidates}
          </p>
          <p className="mt-1 text-xs text-slate-600">Enterprises awaiting BA / EDO diagnostics</p>
        </div>
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
            Pre-screening queue
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {summary.preScreeningNotScreened}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {summary.preScreeningMyDrafts > 0
              ? `${summary.preScreeningMyDrafts} draft${summary.preScreeningMyDrafts === 1 ? "" : "s"} assigned to you`
              : "Not yet screened for A2F"}
          </p>
        </div>
        <div className="rounded-xl border bg-muted/50 px-4 py-4">
          <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Briefcase className="size-3.5" />
            A2F due diligence
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {summary.a2fDdAwaiting}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.a2fDdAwaiting === 1
              ? "Case awaiting initial DD"
              : "Cases awaiting initial DD"}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-4">
          <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-amber-800">
            <Clock className="size-3.5" />
            My screening drafts
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {summary.preScreeningMyDrafts}
          </p>
          <p className="mt-1 text-xs text-slate-600">Pre-screening in progress</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Queues
        </h2>
        <div className="space-y-2">
          <HubQueueRow
            title="CNA diagnostic reviews"
            description="Complete BA / EDO questions for enterprises in the qualified cohort"
            href="#cna-reviews"
            count={summary.cnaCandidates}
            countLabel="enterprises"
            primary={summary.cnaCandidates > 0}
          />
          <HubQueueRow
            title="A2F pre-screening"
            description="Score DD-qualified enterprises before finance access is unlocked"
            href="/finance-screening"
            count={summary.preScreeningNotScreened}
            countLabel="not screened"
            primary={screeningPriority}
          />
          <HubQueueRow
            title="A2F due diligence"
            description="Complete initial due diligence for pipeline cases that passed pre-screening"
            href="/a2f"
            count={summary.a2fDdAwaiting}
            countLabel="awaiting DD"
            primary={!screeningPriority && summary.a2fDdAwaiting > 0}
          />
          <HubQueueRow
            title="KYC workspace"
            description="Update KYC documents, staff assignment, and geolocation for qualified enterprises"
            href="/reviewer/kyc"
          />
          <HubQueueRow
            title="Document resolutions"
            description="Follow up application document issues assigned by Access to Finance"
            href="/application-resolutions"
          />
          <HubQueueRow
            title="CDP work queue"
            description="Review CNA progress and manage capacity development plans"
            href="/admin/cdp"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-start gap-3">
          <ClipboardText className="mt-0.5 size-5 shrink-0 text-slate-500" weight="duotone" />
          <div className="space-y-3 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-900">Your responsibilities</p>
              <ul className="mt-2 space-y-1.5">
                <li>Complete CNA diagnostic reviews for enterprises in your cohort</li>
                <li>Pre-screen DD-qualified Foundation and Accelerator applications</li>
                <li>Complete initial A2F due diligence after enterprises pass screening</li>
                <li>Resolve KYC and document issues when assigned to you</li>
              </ul>
            </div>
            <p className="rounded-md border border-teal-200/80 bg-teal-50/50 px-3 py-2 text-teal-900">
              <strong className="font-medium">Workflow order:</strong> CNA and pre-screening
              unlock A2F pipeline due diligence. Use the queues above rather than the global
              header links.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
