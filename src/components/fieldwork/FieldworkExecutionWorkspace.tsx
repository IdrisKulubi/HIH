"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  approveFieldworkVisitException, checkInFieldworkVisit, checkOutFieldworkVisit, grantFieldworkGateOverride, markFieldworkVisitMissed,
  retryFieldworkFeedback, revokeFieldworkGateOverride, type LocationInput,
} from "@/lib/actions/fieldwork-execution";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FieldworkLocationDialog } from "./FieldworkLocationDialog";

type VisitRow = {
  id: number; status: string; verificationStatus: string; verificationNotes: string | null; scheduledStartAt: Date; estimatedDurationMinutes: number;
  agenda: string; missedReason: string | null; businessName: string; planTitle: string; reportId: number | null; reportStatus: string | null;
  reportReturnReason: string | null; missedReasonDue: boolean; isToday: boolean; whenLabel: string;
};
type Props = {
  isField: boolean; reviewer: boolean; role: string;
  pending: { reports: number; missed: number; total: number };
  visits: VisitRow[];
  reviewQueue: { reportId: number; visitId: number; businessName: string; planTitle: string; submittedAt: Date | null }[];
  exceptionQueue: { visitId: number; businessName: string; planTitle: string; notes: string | null }[];
  feedbackIssues: { reportId: number; businessName: string; status: string; reason: string | null; attempts: number }[];
  blockedOfficers: { userId: string; name: string; total: number; overridden: boolean }[];
};
type DialogState = { kind: "in" | "out"; visit: VisitRow } | { kind: "missed" | "exception" | "override"; id: string | number; label: string } | null;

function Section({ title, count, children, id }: { title: string; count?: number; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-xl border bg-background" aria-labelledby={`${id ?? title}-h`}>
      <h2 id={`${id ?? title}-h`} className="border-b px-5 py-3 font-semibold">{title}{count !== undefined && <span className="ml-2 text-sm font-normal text-muted-foreground">({count})</span>}</h2>
      <div className="divide-y">{children}</div>
    </section>
  );
}
const Empty = ({ children }: { children: React.ReactNode }) => <p className="p-6 text-center text-sm text-muted-foreground">{children}</p>;
const Row = ({ children }: { children: React.ReactNode }) => <article className="flex flex-wrap items-center justify-between gap-3 p-4">{children}</article>;

export function FieldworkExecutionWorkspace({ isField, reviewer, role, pending, visits, reviewQueue, exceptionQueue, feedbackIssues, blockedOfficers }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [reason, setReason] = useState("");

  const act = (work: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
    startTransition(async () => {
      const result = await work();
      if (!result.success) return void toast.error(result.error ?? "Something went wrong.");
      toast.success(ok); setDialog(null); setReason(""); router.refresh();
    });

  const today = visits.filter((v) => v.isToday && ["scheduled", "checked_in"].includes(v.status));
  const upcoming = visits.filter((v) => !v.isToday && !v.missedReasonDue && v.status === "scheduled" && v.scheduledStartAt > new Date());
  const missedDue = visits.filter((v) => v.missedReasonDue);
  const reportsDue = visits.filter((v) => v.reportStatus === "draft" || v.reportStatus === "returned");
  const awaitingVerification = visits.filter((v) => v.status === "completed" && v.verificationStatus === "needs_review");
  const history = visits.filter((v) => ["completed", "missed"].includes(v.status) && !reportsDue.includes(v) && !awaitingVerification.includes(v)).slice(0, 15);

  return (
    <main className="container mx-auto space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visit execution</h1>
          <p className="mt-1 text-sm text-muted-foreground">Check in and out on site, record missed visits, complete reports, and review submissions.</p>
        </div>
        <Button asChild variant="outline"><Link href="/fieldwork">Visit plans</Link></Button>
      </header>

      {isField && (
        <div role="status" className={`rounded-xl border p-4 text-sm ${pending.total ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          {pending.total === 0 ? "You have no pending fieldwork items." : (
            <>You have <strong>{pending.total}</strong> pending {pending.total === 1 ? "item" : "items"}: <a className="underline" href="#reports-due">{pending.reports} report{pending.reports === 1 ? "" : "s"}</a> and <a className="underline" href="#missed-due">{pending.missed} missed-visit reason{pending.missed === 1 ? "" : "s"}</a>. New bookings are blocked until these are done.</>
          )}
        </div>
      )}

      {isField && (
        <>
          <Section title="Today" count={today.length}>
            {today.length === 0 && <Empty>No visits scheduled for today.</Empty>}
            {today.map((v) => (
              <Row key={v.id}>
                <div><p className="font-medium">{v.businessName}</p><p className="text-sm text-muted-foreground">{v.whenLabel} · {v.estimatedDurationMinutes} min · {v.planTitle}</p><p className="mt-1 text-sm">{v.agenda}</p></div>
                <div className="flex flex-wrap gap-2">
                  {v.status === "scheduled" && <><Button size="sm" disabled={busy} onClick={() => setDialog({ kind: "in", visit: v })}>Check in</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => setDialog({ kind: "missed", id: v.id, label: v.businessName })}>Mark missed</Button></>}
                  {v.status === "checked_in" && <Button size="sm" disabled={busy} onClick={() => setDialog({ kind: "out", visit: v })}>Check out</Button>}
                </div>
              </Row>
            ))}
          </Section>

          <Section id="missed-due" title="Missed-visit reasons due" count={missedDue.length}>
            {missedDue.length === 0 && <Empty>Nothing to explain. Every past visit was completed or has a reason.</Empty>}
            {missedDue.map((v) => (
              <Row key={v.id}>
                <div><p className="font-medium">{v.businessName}</p><p className="text-sm text-muted-foreground">Scheduled {v.whenLabel} · {v.planTitle}</p></div>
                <Button size="sm" disabled={busy} onClick={() => setDialog({ kind: "missed", id: v.id, label: v.businessName })}>Record reason</Button>
              </Row>
            ))}
          </Section>

          <Section id="reports-due" title="Reports due" count={reportsDue.length}>
            {reportsDue.length === 0 && <Empty>No reports are waiting. A report opens after a visit is completed and verified.</Empty>}
            {reportsDue.map((v) => (
              <Row key={v.id}>
                <div><p className="font-medium">{v.businessName}</p><p className="text-sm text-muted-foreground">{v.planTitle} · {v.whenLabel} · {v.reportStatus}</p>{v.reportReturnReason && <p className="mt-1 text-sm text-orange-800">Returned: {v.reportReturnReason}</p>}</div>
                <Button asChild size="sm"><Link href={`/fieldwork/reports/${v.id}`}>{v.reportStatus === "returned" ? "Fix report" : "Write report"}</Link></Button>
              </Row>
            ))}
          </Section>

          {awaitingVerification.length > 0 && (
            <Section title="Awaiting location review" count={awaitingVerification.length}>
              {awaitingVerification.map((v) => <Row key={v.id}><div><p className="font-medium">{v.businessName}</p><p className="text-sm text-muted-foreground">{v.verificationNotes ?? "Location could not be verified."} A REDO must accept this visit before the report opens.</p></div></Row>)}
            </Section>
          )}

          <Section title="Upcoming" count={upcoming.length}>
            {upcoming.length === 0 && <Empty>No upcoming visits.</Empty>}
            {upcoming.map((v) => <Row key={v.id}><div><p className="font-medium">{v.businessName}</p><p className="text-sm text-muted-foreground">{v.whenLabel} · {v.planTitle}</p></div></Row>)}
          </Section>

          {history.length > 0 && (
            <Section title="Recent history">
              {history.map((v) => <Row key={v.id}><div><p className="font-medium">{v.businessName}</p><p className="text-sm text-muted-foreground">{v.whenLabel} · {v.status}{v.reportStatus ? ` · report ${v.reportStatus}` : ""}{v.missedReason ? ` · ${v.missedReason}` : ""}</p></div>{v.reportId && <Button asChild size="sm" variant="ghost"><Link href={`/fieldwork/reports/${v.id}`}>View report</Link></Button>}</Row>)}
            </Section>
          )}
        </>
      )}

      {reviewer && (
        <>
          <Section title="Reports awaiting review" count={reviewQueue.length}>
            {reviewQueue.length === 0 && <Empty>No reports are waiting for your review.</Empty>}
            {reviewQueue.map((r) => <Row key={r.reportId}><div><p className="font-medium">{r.businessName}</p><p className="text-sm text-muted-foreground">{r.planTitle}</p></div><Button asChild size="sm"><Link href={`/fieldwork/reports/${r.visitId}`}>Review</Link></Button></Row>)}
          </Section>
          <Section title="Location exceptions" count={exceptionQueue.length}>
            {exceptionQueue.length === 0 && <Empty>No visits need a location decision.</Empty>}
            {exceptionQueue.map((e) => (
              <Row key={e.visitId}>
                <div><p className="font-medium">{e.businessName}</p><p className="text-sm text-muted-foreground">{e.planTitle} · {e.notes ?? "Could not be verified"}</p></div>
                <Button size="sm" disabled={busy} onClick={() => setDialog({ kind: "exception", id: e.visitId, label: e.businessName })}>Accept visit</Button>
              </Row>
            ))}
          </Section>
          <Section title="Client feedback delivery issues" count={feedbackIssues.length}>
            {feedbackIssues.length === 0 && <Empty>All approved feedback has been delivered.</Empty>}
            {feedbackIssues.map((f) => (
              <Row key={f.reportId}>
                <div><p className="font-medium">{f.businessName}</p><p className="text-sm text-muted-foreground">{f.status} after {f.attempts} attempt{f.attempts === 1 ? "" : "s"}{f.reason ? ` · ${f.reason}` : ""}</p></div>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => retryFieldworkFeedback(f.reportId), "Retry attempted. Check the status below.")}>Retry send</Button>
              </Row>
            ))}
          </Section>
        </>
      )}

      {role === "admin" && (
        <Section title="Booking gate" count={blockedOfficers.length}>
          {blockedOfficers.length === 0 && <Empty>No officers are currently blocked.</Empty>}
          {blockedOfficers.map((o) => (
            <Row key={o.userId}>
              <div><p className="font-medium">{o.name}</p><p className="text-sm text-muted-foreground">{o.total} pending item{o.total === 1 ? "" : "s"}{o.overridden && " · override active (48h)"}</p></div>
              {o.overridden
                ? <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => revokeFieldworkGateOverride(o.userId), "Override revoked.")}>Revoke override</Button>
                : <Button size="sm" variant="outline" disabled={busy} onClick={() => setDialog({ kind: "override", id: o.userId, label: o.name })}>Lift gate</Button>}
            </Row>
          ))}
        </Section>
      )}

      {dialog && (dialog.kind === "in" || dialog.kind === "out") && (
        <FieldworkLocationDialog kind={dialog.kind} enterprise={dialog.visit.businessName}
          onClose={() => { setDialog(null); router.refresh(); }}
          onSubmit={(input: LocationInput) => dialog.kind === "in" ? checkInFieldworkVisit(dialog.visit.id, input) : checkOutFieldworkVisit(dialog.visit.id, input)} />
      )}

      <Dialog open={!!dialog && !["in", "out"].includes(dialog.kind)} onOpenChange={(open) => { if (!open) { setDialog(null); setReason(""); } }}>
        <DialogContent>
          {dialog && !("visit" in dialog) && (
            <>
              <DialogHeader>
                <DialogTitle>{dialog.kind === "missed" ? "Why was this visit missed?" : dialog.kind === "exception" ? "Accept this visit" : "Lift the booking gate"} — {dialog.label}</DialogTitle>
                <DialogDescription>
                  {dialog.kind === "missed" ? "This reason is saved against the visit and shown to your REDO."
                    : dialog.kind === "exception" ? "Location could not be verified automatically. Record why you are accepting it; the report will then open."
                    : "The officer can create and submit plans for 48 hours. This is recorded with your name and reason."}
                </DialogDescription>
              </DialogHeader>
              <Textarea aria-label="Reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (at least 10 characters)" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialog(null)}>Back</Button>
                <Button disabled={busy || reason.trim().length < 10} onClick={() => act(
                  () => dialog.kind === "missed" ? markFieldworkVisitMissed(Number(dialog.id), reason)
                    : dialog.kind === "exception" ? approveFieldworkVisitException(Number(dialog.id), reason)
                    : grantFieldworkGateOverride(String(dialog.id), reason),
                  "Saved.")}>Save</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
