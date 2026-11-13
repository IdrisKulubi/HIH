"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelFieldworkPlan, reopenFieldworkPlan, reviewFieldworkPlan, submitFieldworkPlan, withdrawFieldworkPlan } from "@/lib/actions/fieldwork";
import { canCancelPlan, canEditPlan, canReviewPlan, canWithdrawPlan, outcomeLabel, outcomeNumber, reopenMode, type PlanStatus } from "@/lib/fieldwork/plan-rules";
import { formatNairobi } from "@/lib/fieldwork/time";
import { Button } from "@/components/ui/button";
import { getDocumentViewerHref } from "@/lib/document-view-url";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { FieldworkPlanBuilder, type BuilderStaff } from "./FieldworkPlanBuilder";

type Visit = { id: number; status: string; outcomes: string[]; agenda: string; scheduledStartAt: Date; estimatedDurationMinutes: number; business: { id: number; name: string; county: string | null; city: string }; staffIds: string[]; staffNames: string[] };
type Attachment = { id: number; url: string; fileKey: string | null; fileName: string; fileType: string | null; fileSize: number | null };
type Plan = { attachments: Attachment[]; id: number; title: string; status: PlanStatus; returnReason: string | null; cancellationReason: string | null; createdById: string; assignedRedoId: string | null; scheduledStartAt: Date; scheduledEndAt: Date; visits: Visit[] };
type Props = {
  currentUserId: string;
  plans: Plan[];
  staff: BuilderStaff[];
  counties: string[];
  redos: BuilderStaff[];
  canCreate: boolean;
  reviewerRole: string | null;
  isAdmin: boolean;
};

const STATUS_STYLE: Record<PlanStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-amber-100 text-amber-800",
  returned: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-zinc-200 text-zinc-600",
};
const FILTERS: (PlanStatus | "all")[] = ["all", "draft", "submitted", "returned", "approved", "cancelled"];

type Pending = { kind: "return" | "cancel" | "submit" | "reopen"; plan: Plan } | null;

export function FieldworkWorkspace({ currentUserId, plans, staff, counties, redos, canCreate, reviewerRole, isAdmin }: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [builder, setBuilder] = useState<{ open: boolean; plan: Plan | null }>({ open: false, plan: null });
  const [filter, setFilter] = useState<PlanStatus | "all">("all");
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState("");
  const [redoId, setRedoId] = useState("");

  const user = { id: currentUserId, role: isAdmin ? "admin" : reviewerRole ?? (canCreate ? "bds_edo" : "oversight") };
  const visible = plans.filter((p) => filter === "all" || p.status === filter);
  const awaitingReview = reviewerRole ? plans.filter((p) => canReviewPlan(user, p)).length : 0;

  function run(work: () => Promise<{ success: boolean; error?: string }>, success: string, after?: () => void) {
    startTransition(async () => {
      const result = await work();
      if (!result.success) return void toast.error(result.error ?? "Something went wrong.");
      toast.success(success);
      setPending(null); setReason(""); setRedoId("");
      after?.();
      router.refresh();
    });
  }

  /** An approved plan can be changed only while every visit is still just scheduled. */
  const changeMode = (plan: Plan) => (plan.visits.every((v) => v.status === "scheduled") ? reopenMode(user, plan) : null);

  const closeBuilder = () => { setBuilder({ open: false, plan: null }); router.refresh(); };

  return (
    <main className="container mx-auto space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Fieldwork</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canCreate ? "Plan enterprise visits and submit itineraries for REDO approval." : "Review fieldwork itineraries submitted for approval."}
            {reviewerRole && ` ${awaitingReview} plan${awaitingReview === 1 ? "" : "s"} awaiting your review.`}
          </p>
        </div>
        <div className="flex gap-2"><Button asChild variant="outline"><Link href="/fieldwork/execution">Visit execution</Link></Button>{canCreate && !builder.open && <Button onClick={() => setBuilder({ open: true, plan: null })}>New visit plan</Button>}</div>
      </header>

      {builder.open && canCreate && (
        <FieldworkPlanBuilder key={builder.plan?.id ?? "new"} staff={staff} counties={counties} onDone={closeBuilder}
          editing={builder.plan ? { id: builder.plan.id, title: builder.plan.title, attachments: builder.plan.attachments, visits: builder.plan.visits.map((v) => ({ outcomes: v.outcomes, agenda: v.agenda, scheduledStartAt: v.scheduledStartAt, estimatedDurationMinutes: v.estimatedDurationMinutes, business: v.business, staffIds: v.staffIds })) } : null} />
      )}

      <section className="rounded-xl border bg-background" aria-labelledby="plans-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="plans-heading" className="font-semibold">Plans</h2>
            <div className="flex gap-1" role="group" aria-label="Export plans">
              <Button asChild size="sm" variant="outline"><a href={`/api/fieldwork/plans-export?format=xlsx${filter === "all" ? "" : `&status=${filter}`}`}>Export Excel</a></Button>
              <Button asChild size="sm" variant="outline"><a href={`/api/fieldwork/plans-export?format=csv${filter === "all" ? "" : `&status=${filter}`}`}>Export CSV</a></Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter plans by status">
            {FILTERS.map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">{f}</Button>
            ))}
          </div>
        </div>
        <div className="divide-y">
          {visible.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {plans.length === 0
                ? canCreate ? "No fieldwork plans yet. Create your first visit plan to get started." : "No plans have been routed to you yet."
                : `No ${filter} plans.`}
            </p>
          )}
          {visible.map((plan) => (
            <article key={plan.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{plan.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[plan.status]}`}>{plan.status}</span>
                    {plan.visits.length} enterprise{plan.visits.length === 1 ? "" : "s"} · {formatNairobi(plan.scheduledStartAt)} → {formatNairobi(plan.scheduledEndAt)}
                    {plan.status === "submitted" && !plan.assignedRedoId && " · admin fallback queue"}
                  </p>
                  {plan.returnReason && plan.status === "returned" && <p className="mt-2 rounded-md bg-orange-50 p-2 text-sm text-orange-900"><strong>Returned:</strong> {plan.returnReason}</p>}
                  {plan.cancellationReason && plan.status === "cancelled" && <p className="mt-2 text-sm text-muted-foreground"><strong>Cancelled:</strong> {plan.cancellationReason}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {canCreate && canEditPlan(user, plan) && (
                    <>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => { setBuilder({ open: true, plan }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>
                      <Button size="sm" disabled={busy} onClick={() => { setRedoId(plan.assignedRedoId ?? ""); setPending({ kind: "submit", plan }); }}>Submit for review</Button>
                    </>
                  )}
                  {canReviewPlan(user, plan) && (
                    <>
                      <Button size="sm" disabled={busy} onClick={() => run(() => reviewFieldworkPlan(plan.id, "approved"), "Plan approved. Itinerary emails are being recorded.")}>Approve</Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setPending({ kind: "return", plan })}>Return</Button>
                    </>
                  )}
                  {canCreate && canWithdrawPlan(user, plan) && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => withdrawFieldworkPlan(plan.id), "Plan withdrawn. You can now edit it.", () => { setBuilder({ open: true, plan }); window.scrollTo({ top: 0, behavior: "smooth" }); })}>Withdraw to edit</Button>}
                  {changeMode(plan) === "draft" && <Button size="sm" variant="outline" disabled={busy} onClick={() => setPending({ kind: "reopen", plan })}>Change schedule or details</Button>}
                  {changeMode(plan) === "returned" && <Button size="sm" variant="outline" disabled={busy} onClick={() => setPending({ kind: "reopen", plan })}>Request changes</Button>}
                  {canCreate && canCancelPlan(user, plan) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPending({ kind: "cancel", plan })}>Cancel plan</Button>}
                </div>
              </div>
              <details className="mt-3" open={plan.status === "submitted" && !!reviewerRole}>
                <summary className="cursor-pointer text-sm text-primary">View itinerary</summary>
                {plan.attachments.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2" aria-label="Supporting documents">
                    {plan.attachments.map((file) => (
                      <li key={file.id}><a href={getDocumentViewerHref(file.url, file.fileName)} target="_blank" rel="noreferrer" className="inline-flex max-w-xs items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs text-primary hover:underline"><span aria-hidden>📎</span><span className="truncate">{file.fileName}</span></a></li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-xs"><tr><th className="p-2">When</th><th className="p-2">Enterprise</th><th className="p-2">Agenda</th><th className="p-2">Outcomes</th><th className="p-2">Officers</th></tr></thead>
                    <tbody>
                      {plan.visits.map((v) => (
                        <tr key={v.id} className="border-t align-top">
                          <td className="whitespace-nowrap p-2">{formatNairobi(v.scheduledStartAt)}<br /><span className="text-xs text-muted-foreground">{v.estimatedDurationMinutes} min</span></td>
                          <td className="p-2">{v.business.name}<br /><span className="text-xs text-muted-foreground">{[v.business.city, v.business.county?.replace(/_/g, " ")].filter(Boolean).join(", ")}</span></td>
                          <td className="p-2">{v.agenda}</td>
                          <td className="p-2"><div className="flex flex-wrap gap-1">{v.outcomes.map((o) => <span key={o} title={outcomeLabel(o)} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">Outcome {outcomeNumber(o)}</span>)}</div></td>
                          <td className="p-2">{v.staffNames.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <Dialog open={!!pending} onOpenChange={(open) => { if (!open) { setPending(null); setReason(""); } }}>
        <DialogContent>
          {pending?.kind === "submit" && (
            <>
              <DialogHeader>
                <DialogTitle>Submit “{pending.plan.title}” for review</DialogTitle>
                <DialogDescription>Choose the REDO who should review this plan. Leave it unassigned to send it to the admin fallback queue.</DialogDescription>
              </DialogHeader>
              <label className="text-sm font-medium" htmlFor="redo-select">Reviewing REDO</label>
              <select id="redo-select" className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={redoId} onChange={(e) => setRedoId(e.target.value)}>
                <option value="">Admin fallback queue</option>
                {redos.map((r) => <option key={r.userId} value={r.userId}>{r.firstName} {r.lastName}</option>)}
              </select>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPending(null)}>Back</Button>
                <Button disabled={busy} onClick={() => run(() => submitFieldworkPlan(pending.plan.id, redoId || null), "Plan submitted for review.")}>Submit</Button>
              </DialogFooter>
            </>
          )}
          {pending && pending.kind !== "submit" && (
            <>
              <DialogHeader>
                <DialogTitle>{pending.kind === "return" ? "Return plan for correction" : pending.kind === "reopen" ? (changeMode(pending.plan) === "draft" ? "Change an approved plan" : "Request changes to an approved plan") : "Cancel plan"}</DialogTitle>
                <DialogDescription>
                  {pending.kind === "return" ? "The EDO will see this reason and can edit and resubmit."
                    : pending.kind === "reopen" ? (changeMode(pending.plan) === "draft"
                      ? "The plan goes back to draft so you can edit dates, times, agendas or staff. Visits cannot start until your REDO approves it again, and everyone is emailed the revised itinerary."
                      : "The plan goes back to the EDO as returned, with your reason. They edit it and your approval is needed again.")
                    : "Cancelling is recorded in the audit trail and cancels all scheduled visits."}
                </DialogDescription>
              </DialogHeader>
              <Textarea aria-label="Reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setPending(null)}>Back</Button>
                <Button variant="destructive" disabled={busy || reason.trim().length < 3}
                  onClick={() => {
                    const target = pending.plan;
                    if (pending.kind === "reopen") {
                      const mode = changeMode(target);
                      return run(() => reopenFieldworkPlan(target.id, reason), mode === "draft" ? "Plan reopened. Make your changes, then submit it again." : "Changes requested. The EDO has been notified on the plan.",
                        mode === "draft" ? () => { setBuilder({ open: true, plan: target }); window.scrollTo({ top: 0, behavior: "smooth" }); } : undefined);
                    }
                    run(() => pending.kind === "return" ? reviewFieldworkPlan(target.id, "returned", reason) : cancelFieldworkPlan(target.id, reason), pending.kind === "return" ? "Plan returned." : "Plan cancelled.");
                  }}>
                  {pending.kind === "return" ? "Return plan" : pending.kind === "reopen" ? "Continue" : "Cancel plan"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
