import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { OversightDashboardSummary } from "@/lib/actions/oversight-dashboard";
import { isA2fDdOnlyStaffRole } from "@/lib/a2f-nav";
import {
  ArrowRight,
  Bank,
  CaretRight,
  ClipboardText,
  Clock,
  ShieldCheck,
  Warning,
} from "@phosphor-icons/react/dist/ssr";

type HubUser = {
  firstName?: string | null;
  role?: string | null;
};

function roleLabel(role: string | null | undefined) {
  if (role === "redo") return "REDO Approver";
  if (role === "admin") return "Administrator";
  return "Final Approver";
}

function QueueRow({
  title,
  description,
  href,
  count,
  countLabel,
  primary,
}: {
  title: string;
  description: string;
  href: string;
  count?: number;
  countLabel?: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-lg border px-4 py-3.5 transition-colors ${
        primary
          ? "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900">{title}</p>
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {count} {countLabel ?? "waiting"}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <CaretRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function OversightHub({
  user,
  summary,
}: {
  user: HubUser;
  summary: OversightDashboardSummary;
}) {
  const displayName = user.firstName?.trim() || "Approver";
  const showPreScreening = user.role === "redo" || user.role === "admin";
  const showA2fDdQueue = isA2fDdOnlyStaffRole(user.role) || user.role === "admin";
  const ddOnlyA2f = isA2fDdOnlyStaffRole(user.role);
  const isAdmin = user.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {displayName}&apos;s approver hub
            </h1>
            <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100">
              <ShieldCheck className="mr-1 size-3" weight="fill" />
              {roleLabel(user.role)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Review assigned due diligence approvals and open programme queues
          </p>
        </div>
        {summary.pendingApprovals > 0 && (
          <Button asChild className="shrink-0">
            <Link href="/oversight/approvals">
              Review approvals
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        )}
        {summary.a2fDdAwaiting > 0 && ddOnlyA2f && (
          <Button asChild className="shrink-0 bg-emerald-700 hover:bg-emerald-800">
            <Link href="/a2f">
              Open A2F due diligence
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        )}
      </div>

      {summary.urgentApprovals > 0 && (
        <Alert variant="destructive">
          <Warning className="size-4" />
          <AlertTitle>
            {summary.urgentApprovals} approval{summary.urgentApprovals === 1 ? "" : "s"} expiring
            within 4 hours
          </AlertTitle>
          <AlertDescription>
            Review these first to avoid auto-reassignment under the 12-hour approval window.
          </AlertDescription>
        </Alert>
      )}

      <div
        className={`grid gap-4 ${
          showPreScreening ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        <div className="rounded-xl border border-violet-200/60 bg-violet-50/50 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-800">
            Pending DD approvals
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {summary.pendingApprovals}
          </p>
          <p className="mt-1 text-xs text-slate-600">Assigned to you for sign-off</p>
        </div>
        <div
          className={`rounded-xl border px-4 py-4 ${
            summary.urgentApprovals > 0
              ? "border-amber-200/60 bg-amber-50/60"
              : "border-slate-200 bg-muted/50"
          }`}
        >
          <p
            className={`flex items-center gap-1 text-xs font-medium uppercase tracking-wide ${
              summary.urgentApprovals > 0 ? "text-amber-800" : "text-muted-foreground"
            }`}
          >
            <Clock className="size-3.5" />
            Expiring soon
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{summary.urgentApprovals}</p>
          <p className="mt-1 text-xs text-muted-foreground">Less than 4 hours remaining</p>
        </div>
        <div className="rounded-xl border bg-muted/50 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {ddOnlyA2f ? "A2F due diligence" : "CDP work queue"}
          </p>
          {ddOnlyA2f ? (
            <>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                {summary.a2fDdAwaiting}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.a2fDdAwaiting === 1
                  ? "Case awaiting initial DD"
                  : "Cases awaiting initial DD"}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-medium text-slate-700">Open queue for status</p>
              <p className="mt-1 text-xs text-muted-foreground">
                CNA and CDP progress is tracked in the work queue
              </p>
            </>
          )}
        </div>
        {showPreScreening && (
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
                : "Not yet screened"}
            </p>
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Queues
        </h2>
        <div className="space-y-2">
          <QueueRow
            title="Due diligence approvals"
            description="Approve or query DD assessments assigned to you"
            href="/oversight/approvals"
            count={summary.pendingApprovals}
            countLabel="assigned"
            primary={summary.pendingApprovals > 0}
          />
          <QueueRow
            title="CDP work queue"
            description="Review CNA progress and manage capacity development plans"
            href="/admin/cdp"
          />
          {showPreScreening && (
            <QueueRow
              title="KYC workspace"
              description="Open qualified enterprises and update KYC documents, staff assignment, and geolocation"
              href="/reviewer/kyc"
            />
          )}
          {showA2fDdQueue && (
            <QueueRow
              title="A2F due diligence"
              description="Complete initial due diligence for pipeline cases that passed pre-screening"
              href="/a2f"
              count={summary.a2fDdAwaiting}
              countLabel="awaiting DD"
              primary={summary.a2fDdAwaiting > 0}
            />
          )}
          {!ddOnlyA2f && (
            <QueueRow
              title="A2F portal"
              description="Matching grant pipeline, scoring, contracts, and disbursements"
              href="/a2f"
            />
          )}
          {showPreScreening && (
            <QueueRow
              title="Document resolutions"
              description="Follow up application document issues assigned by Access to Finance"
              href="/application-resolutions"
            />
          )}
          {showPreScreening && (
            <QueueRow
              title="A2F pre-screening"
              description="Score DD-qualified enterprises before finance access is unlocked"
              href="/finance-screening"
              count={summary.preScreeningNotScreened}
              countLabel="not screened"
            />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-start gap-3">
          <ClipboardText className="mt-0.5 size-5 shrink-0 text-slate-500" weight="duotone" />
          <div className="space-y-3 text-sm text-slate-600">
            <div>
              <p className="font-medium text-slate-900">Your responsibilities</p>
              <ul className="mt-2 space-y-1.5">
                <li>Review DD assessments from Reviewer 1s</li>
                <li>Approve or query assessments within 12 hours</li>
                <li>Provide clear feedback when querying for revisions</li>
                <li>Recommend qualifying applications for due diligence</li>
              </ul>
            </div>
            <p className="rounded-md border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-amber-900">
              <strong className="font-medium">12-hour approval window:</strong> assessments are
              auto-reassigned if not reviewed within 12 hours.
            </p>
          </div>
        </div>
      </section>

      {isAdmin && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bank className="size-4" />
            You also have administrator access
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">Open admin panel</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
