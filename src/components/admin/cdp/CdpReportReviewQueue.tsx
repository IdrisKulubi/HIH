"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveCdpSupportSession,
  rejectCdpSupportSession,
  type CdpReportReviewRow,
} from "@/lib/actions/cdp";
import { CdpSessionReturnDialog } from "@/components/admin/cdp/CdpSessionReturnDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Building2,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  Link2,
  Paperclip,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

function formatDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ReportField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{value.trim()}</p>
    </div>
  );
}

function EvidenceList({ row }: { row: CdpReportReviewRow }) {
  if (row.evidenceCount === 0) {
    return <p className="text-sm text-muted-foreground">No evidence attached.</p>;
  }

  return (
    <ul className="space-y-2">
      {row.evidenceFiles.map((file) => (
        <li key={`${file.url}-${file.name}`}>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <Paperclip className="size-3.5 shrink-0 text-slate-500" />
            <span className="truncate">{file.name || "Evidence file"}</span>
          </a>
        </li>
      ))}
      {row.evidenceUrls.map((url) => (
        <li key={url}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <Link2 className="size-3.5 shrink-0 text-slate-500" />
            <span className="truncate">{url}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function CdpReportReviewQueue({
  rows,
  showSectionHeader = true,
}: {
  rows: CdpReportReviewRow[];
  showSectionHeader?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [queueRows, setQueueRows] = useState(rows);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [reviewing, setReviewing] = useState<CdpReportReviewRow | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CdpReportReviewRow | null>(null);

  useEffect(() => {
    setQueueRows(rows);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return queueRows;
    return queueRows.filter((row) =>
      [
        row.businessName,
        row.applicantName,
        row.topic,
        row.focusCode,
        row.submittedByName,
        row.reportSummary,
        `session ${row.sessionNumber}`,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query, queueRows]);

  const removeFromQueue = (sessionId: number) => {
    setQueueRows((current) => current.filter((row) => row.sessionId !== sessionId));
  };

  const reviewApprove = (row: CdpReportReviewRow) => {
    setActiveSessionId(row.sessionId);
    startTransition(async () => {
      const result = await approveCdpSupportSession(row.sessionId);
      setActiveSessionId(null);

      if (!result.success) {
        toast.error(result.error ?? "Failed to approve report");
        return;
      }

      removeFromQueue(row.sessionId);
      toast.success("Report approved");
      if (reviewing?.sessionId === row.sessionId) setReviewing(null);
      router.refresh();
    });
  };

  const confirmReject = (reason: string) => {
    if (!rejectTarget) return;

    const rejectedSessionId = rejectTarget.sessionId;
    setActiveSessionId(rejectedSessionId);
    startTransition(async () => {
      const result = await rejectCdpSupportSession(rejectedSessionId, reason);
      setActiveSessionId(null);

      if (!result.success) {
        toast.error(result.error ?? "Failed to return report");
        return;
      }

      removeFromQueue(rejectedSessionId);
      toast.success("Report returned for edits");
      if (reviewing?.sessionId === rejectedSessionId) setReviewing(null);
      setRejectTarget(null);
      router.refresh();
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {showSectionHeader ? (
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <FileCheck2 className="size-4" />
                </span>
                <h2 className="text-base font-semibold text-slate-950">Report approvals</h2>
                <Badge
                  className={cn(
                    "rounded-full border-0 font-medium",
                    queueRows.length > 0
                      ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                      : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  )}
                >
                  {queueRows.length} pending
                </Badge>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Open a report, check the outcomes and evidence, then approve or return it. Approvals stay on this page.
              </p>
            </div>

            {queueRows.length > 0 ? (
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search enterprise, topic, or submitter"
                  className="h-10 border-slate-200 bg-white pl-9"
                  aria-label="Search pending reports"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : queueRows.length > 0 ? (
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Badge
              className={cn(
                "w-fit rounded-full border-0 font-medium",
                queueRows.length > 0
                  ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                  : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
              )}
            >
              {queueRows.length} pending
            </Badge>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search enterprise, topic, or submitter"
                className="h-10 border-slate-200 bg-white pl-9"
                aria-label="Search pending reports"
              />
            </div>
          </div>
        </div>
      ) : null}

      {queueRows.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Check className="size-5" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-900">No reports waiting for approval</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Submitted session reports will appear here automatically.
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-900">No matching reports</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different enterprise, topic, or submitter.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filteredRows.map((row) => {
            const isActive = pending && activeSessionId === row.sessionId;
            return (
              <li
                key={row.sessionId}
                className="grid gap-4 px-4 py-4 transition hover:bg-slate-50/70 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"
              >
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Building2 className="size-4 shrink-0 text-slate-400" />
                        <p className="font-semibold text-slate-950">{row.businessName}</p>
                        <Badge variant="outline" className="rounded-full border-slate-200 text-slate-600">
                          Session {row.sessionNumber} · {row.focusCode}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{row.applicantName}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-900">{row.topic}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        Session {formatDate(row.sessionDate)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="size-3.5" />
                        {row.submittedByName}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="size-3.5" />
                        Submitted {formatDateTime(row.submittedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="size-3.5" />
                        {row.evidenceCount} evidence item{row.evidenceCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <p className="line-clamp-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                    {row.reportSummary}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-200 bg-white"
                    onClick={() => setReviewing(row)}
                  >
                    Review
                  </Button>

                  {row.canReview ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-700 text-white hover:bg-emerald-800"
                        onClick={() => reviewApprove(row)}
                        disabled={pending}
                      >
                        <Check className="mr-1.5 size-3.5" />
                        {isActive ? "Saving..." : "Approve"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={() => setRejectTarget(row)}
                        disabled={pending}
                      >
                        <X className="mr-1.5 size-3.5" />
                        Return
                      </Button>
                    </>
                  ) : (
                    <span className="rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
                      Another approver required
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={Boolean(reviewing)} onOpenChange={(open) => !open && setReviewing(null)}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-xl">
          {reviewing ? (
            <>
              <SheetHeader className="border-b border-slate-200 pb-4 text-left">
                <SheetTitle className="pr-8 text-lg">{reviewing.businessName}</SheetTitle>
                <SheetDescription className="space-y-1 text-sm text-slate-600">
                  <span className="block">
                    Session {reviewing.sessionNumber} · {reviewing.focusCode} · {reviewing.topic}
                  </span>
                  <span className="block">
                    Submitted by {reviewing.submittedByName} · {formatDateTime(reviewing.submittedAt)}
                  </span>
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-5 overflow-y-auto py-5">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Enterprise contact</p>
                    <p className="mt-1 font-medium text-slate-900">{reviewing.applicantName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Session date</p>
                    <p className="mt-1 font-medium text-slate-900">{formatDate(reviewing.sessionDate)}</p>
                  </div>
                  {reviewing.durationHours ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Duration</p>
                      <p className="mt-1 font-medium text-slate-900">{reviewing.durationHours} hours</p>
                    </div>
                  ) : null}
                  {reviewing.followUpDate ? (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Follow-up</p>
                      <p className="mt-1 font-medium text-slate-900">{formatDate(reviewing.followUpDate)}</p>
                    </div>
                  ) : null}
                </div>

                <ReportField label="Observation / notes" value={reviewing.evidenceNotes} />
                <ReportField label="Key actions agreed" value={reviewing.keyActionsAgreed} />
                <ReportField label="Challenges raised" value={reviewing.challengesRaised} />
                <ReportField label="Next steps" value={reviewing.nextSteps} />

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Evidence</p>
                  <EvidenceList row={reviewing} />
                </div>

                <Button variant="outline" size="sm" asChild className="w-fit">
                  <Link href={`/admin/cdp/${reviewing.businessId}?planId=${reviewing.planId}`}>
                    <ExternalLink className="mr-1.5 size-3.5" />
                    Open full CDP plan
                  </Link>
                </Button>
              </div>

              <SheetFooter className="border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                {reviewing.canReview ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                      onClick={() => setRejectTarget(reviewing)}
                      disabled={pending}
                    >
                      <X className="mr-1.5 size-3.5" />
                      Return
                    </Button>
                    <Button
                      type="button"
                      className="bg-emerald-700 text-white hover:bg-emerald-800"
                      onClick={() => reviewApprove(reviewing)}
                      disabled={pending}
                    >
                      <Check className="mr-1.5 size-3.5" />
                      {pending && activeSessionId === reviewing.sessionId ? "Saving..." : "Approve report"}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Another approver is required for this report.</p>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <CdpSessionReturnDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        description={
          rejectTarget
            ? `${rejectTarget.businessName} · Session ${rejectTarget.sessionNumber}. The session owner can edit and resubmit it.`
            : undefined
        }
        pending={Boolean(pending && rejectTarget && activeSessionId === rejectTarget.sessionId)}
        onConfirm={confirmReject}
      />
    </section>
  );
}
