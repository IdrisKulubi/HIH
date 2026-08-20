import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HubQueueRow } from "@/components/staff/HubQueueRow";
import type { OversightDashboardSummary } from "@/lib/actions/oversight-dashboard";
import { isA2fDdOnlyStaffRole } from "@/lib/a2f-nav";
import {
  ArrowRight,
  Bank,
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

export function OversightHub({
  user,
  summary,
}: {
  user: HubUser;
  summary: OversightDashboardSummary;
}) {
  const displayName = user.firstName?.trim() || "Approver";
  const showPreScreening = user.role === "redo" || user.role === "admin";
  const showMelHub = user.role === "redo" || user.role === "admin";
  const showA2fDdQueue = isA2fDdOnlyStaffRole(user.role) || user.role === "admin";
  const ddOnlyA2f = isA2fDdOnlyStaffRole(user.role);
  const isAdmin = user.role === "admin";
  const summaryCardCount = 3 + (showPreScreening ? 1 : 0) + (showMelHub ? 1 : 0);

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
        <div className="flex flex-wrap gap-2 shrink-0">
          {summary.pendingApprovals > 0 && (
            <Button asChild>
              <Link href="/oversight/approvals">
                Review approvals
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          )}
          {summary.pendingCdpReports > 0 && (
            <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
              <Link href="/admin/cdp/approvals">
                Review reports
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          )}
          {summary.melReviewPending > 0 && showMelHub && (
            <Button asChild className="bg-brand-blue hover:bg-brand-blue/90">
              <Link href="/admin/mel/review">
                Review MEL reports
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          )}
          {summary.a2fDdAwaiting > 0 && ddOnlyA2f && (
            <Button asChild className="bg-emerald-700 hover:bg-emerald-800">
              <Link href="/a2f">
                Open A2F due diligence
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          )}
        </div>
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
        className={`grid gap-4 sm:grid-cols-2 ${
          summaryCardCount >= 5
            ? "lg:grid-cols-5"
            : summaryCardCount === 4
              ? "lg:grid-cols-4"
              : "lg:grid-cols-3"
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
        <div
          className={`rounded-xl border px-4 py-4 ${
            !ddOnlyA2f && summary.pendingCdpReports > 0
              ? "border-emerald-200/60 bg-emerald-50/80"
              : "border-slate-200 bg-muted/50"
          }`}
        >
          <p
            className={`text-xs font-medium uppercase tracking-wide ${
              !ddOnlyA2f && summary.pendingCdpReports > 0
                ? "text-emerald-800"
                : "text-muted-foreground"
            }`}
          >
            {ddOnlyA2f ? "A2F due diligence" : "Session report approvals"}
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
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
                {summary.pendingCdpReports}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {summary.pendingCdpReports === 1
                  ? "Report awaiting your review"
                  : "Reports awaiting your review"}
              </p>
              <Link
                href="/admin/cdp/approvals"
                className="mt-2 inline-flex text-xs font-medium text-emerald-800 hover:text-emerald-900 hover:underline"
              >
                Open report approvals
              </Link>
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
        {showMelHub && (
          <div
            className={`rounded-xl border px-4 py-4 ${
              summary.melReviewPending > 0
                ? "border-brand-blue/30 bg-brand-blue/5"
                : "border-slate-200 bg-muted/50"
            }`}
          >
            <p
              className={`text-xs font-medium uppercase tracking-wide ${
                summary.melReviewPending > 0 ? "text-brand-blue" : "text-muted-foreground"
              }`}
            >
              MEL reviews
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
              {summary.melReviewPending}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              {summary.melReturnedToMe > 0
                ? `${summary.melReturnedToMe} returned to you for correction`
                : "BDS EDO reports awaiting REDO review"}
            </p>
            {summary.melReviewPending > 0 ? (
              <Link
                href="/admin/mel/review"
                className="mt-2 inline-flex text-xs font-medium text-brand-blue hover:underline"
              >
                Open MEL review queue
              </Link>
            ) : null}
          </div>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Queues
        </h2>
        <div className="space-y-2">
          <HubQueueRow
            title="Due diligence approvals"
            description="Approve or query DD assessments assigned to you"
            href="/oversight/approvals"
            count={summary.pendingApprovals}
            countLabel="assigned"
            primary={summary.pendingApprovals > 0}
          />
          <HubQueueRow
            title="Session report approvals"
            description="Approve or return submitted CDP session reports"
            href="/admin/cdp/approvals"
            count={summary.pendingCdpReports}
            countLabel="pending"
            primary={summary.pendingCdpReports > 0}
          />
          <HubQueueRow
            title="CDP work queue"
            description="Review CNA progress and manage capacity development plans"
            href="/admin/cdp"
          />
          {showPreScreening && (
            <HubQueueRow
              title="KYC workspace"
              description="Open qualified enterprises and update KYC documents, staff assignment, and geolocation"
              href="/reviewer/kyc"
            />
          )}
          {showA2fDdQueue && (
            <HubQueueRow
              title="A2F due diligence"
              description="Complete initial due diligence for pipeline cases that passed pre-screening"
              href="/a2f"
              count={summary.a2fDdAwaiting}
              countLabel="awaiting DD"
              primary={summary.a2fDdAwaiting > 0}
            />
          )}
          {!ddOnlyA2f && (
            <HubQueueRow
              title="A2F portal"
              description="Matching grant pipeline, scoring, contracts, and disbursements"
              href="/a2f"
            />
          )}
          {showPreScreening && (
            <HubQueueRow
              title="Document resolutions"
              description="Follow up application document issues assigned by Access to Finance"
              href="/application-resolutions"
            />
          )}
          {showPreScreening && (
            <HubQueueRow
              title="A2F pre-screening"
              description="Score DD-qualified enterprises before finance access is unlocked"
              href="/finance-screening"
              count={summary.preScreeningNotScreened}
              countLabel="not screened"
            />
          )}
          {showMelHub && (
            <>
              <HubQueueRow
                title="MEL report reviews"
                description="Validate BDS EDO quarterly monitoring reports before final MEL approval"
                href="/admin/mel/review"
                count={summary.melReviewPending}
                countLabel="awaiting review"
                primary={summary.melReviewPending > 0}
              />
              <HubQueueRow
                title="Quarterly monitoring"
                description="Collect or correct enterprise monitoring reports across all enterprises"
                href="/admin/mel/monitoring"
                count={summary.melReturnedToMe}
                countLabel="returned"
                primary={summary.melReturnedToMe > 0 && summary.melReviewPending === 0}
              />
            </>
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
                {showMelHub ? (
                  <li>Review BDS EDO quarterly monitoring reports before they advance to MEL</li>
                ) : null}
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
