"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveMentorshipSession,
  returnMentorshipSession,
  type MentorshipSessionReviewRow,
} from "@/lib/actions/mentorship";
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
import {
  Building2,
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
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

function SessionField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{value.trim()}</p>
    </div>
  );
}

export function MentorshipSessionReviewQueue({
  rows,
  showSectionHeader = true,
}: {
  rows: MentorshipSessionReviewRow[];
  showSectionHeader?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [queueRows, setQueueRows] = useState(rows);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [reviewing, setReviewing] = useState<MentorshipSessionReviewRow | null>(null);
  const [returnTarget, setReturnTarget] = useState<MentorshipSessionReviewRow | null>(null);

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
        row.mentorName,
        row.mentorEmail,
        row.diagnosticNotes,
        row.sessionType,
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

  const reviewApprove = (row: MentorshipSessionReviewRow) => {
    setActiveSessionId(row.sessionId);
    startTransition(async () => {
      const result = await approveMentorshipSession(row.sessionId);
      setActiveSessionId(null);

      if (!result.success) {
        toast.error(result.error ?? "Failed to approve session");
        return;
      }

      removeFromQueue(row.sessionId);
      toast.success("Session approved");
      if (reviewing?.sessionId === row.sessionId) setReviewing(null);
      router.refresh();
    });
  };

  const confirmReturn = (reason: string) => {
    if (!returnTarget) return;

    const returnedSessionId = returnTarget.sessionId;
    setActiveSessionId(returnedSessionId);
    startTransition(async () => {
      const result = await returnMentorshipSession(returnedSessionId, reason);
      setActiveSessionId(null);

      if (!result.success) {
        toast.error(result.error ?? "Failed to return session");
        return;
      }

      removeFromQueue(returnedSessionId);
      toast.success("Session returned for edits");
      if (reviewing?.sessionId === returnedSessionId) setReviewing(null);
      setReturnTarget(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="space-y-4">
        {showSectionHeader ? (
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Pending sessions</h2>
            <p className="text-sm text-slate-600">
              Review logged sessions, confirm the details, then approve or return them to the mentor.
            </p>
          </div>
        ) : null}

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search business, mentor, or session…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">No sessions waiting for approval</p>
            <p className="mt-1 text-sm text-slate-500">
              {query.trim()
                ? "Try a different search term."
                : "New submissions from mentors will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const busy = pending && activeSessionId === row.sessionId;
                return (
                  <li key={row.sessionId} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full">
                            Session {row.sessionNumber}
                          </Badge>
                          <Badge variant="secondary" className="rounded-full capitalize">
                            {row.sessionType}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-base font-semibold text-slate-950">{row.businessName}</p>
                          <p className="text-sm text-slate-600">{row.applicantName}</p>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="size-4 text-slate-400" />
                            {row.mentorName}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="size-4 text-slate-400" />
                            {formatDate(row.completedDate)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="size-4 text-slate-400" />
                            {row.durationLabel}
                          </span>
                        </div>
                        {row.diagnosticNotes ? (
                          <p className="line-clamp-2 text-sm text-slate-700">{row.diagnosticNotes}</p>
                        ) : null}
                        <p className="text-xs text-slate-500">
                          Submitted {formatDateTime(row.submittedAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReviewing(row)}
                          disabled={busy}
                        >
                          Review
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-700 text-white hover:bg-emerald-800"
                          onClick={() => reviewApprove(row)}
                          disabled={busy}
                        >
                          <Check className="mr-1 size-4" />
                          {busy ? "Approving…" : "Approve"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnTarget(row)}
                          disabled={busy}
                        >
                          <X className="mr-1 size-4" />
                          Return
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <Sheet open={reviewing != null} onOpenChange={(open) => !open && setReviewing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {reviewing ? (
            <>
              <SheetHeader>
                <SheetTitle>
                  Session {reviewing.sessionNumber} · {reviewing.sessionType}
                </SheetTitle>
                <SheetDescription>
                  Confirm the session details before approving or returning to the mentor.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-1 py-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 size-4 text-slate-500" />
                    <div>
                      <p className="font-medium text-slate-900">{reviewing.businessName}</p>
                      <p className="text-sm text-slate-600">{reviewing.applicantName}</p>
                      <Link
                        href={`/admin/mentorship/matches/${reviewing.businessId}`}
                        className="mt-1 inline-block text-xs text-sky-700 hover:underline"
                      >
                        Open match page
                      </Link>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Mentor</p>
                      <p className="text-slate-800">{reviewing.mentorName}</p>
                      <p className="text-xs text-slate-500">{reviewing.mentorEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Submitted</p>
                      <p className="text-slate-800">{formatDateTime(reviewing.submittedAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Scheduled</p>
                      <p className="text-slate-800">{formatDate(reviewing.scheduledDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Actual date</p>
                      <p className="text-slate-800">{formatDate(reviewing.completedDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Duration</p>
                      <p className="text-slate-800">{reviewing.durationLabel}</p>
                    </div>
                  </div>
                </div>

                <SessionField label="Diagnostic notes" value={reviewing.diagnosticNotes} />

                {reviewing.photographicEvidenceUrl?.trim() ? (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Evidence
                    </p>
                    <a
                      href={reviewing.photographicEvidenceUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <ExternalLink className="size-3.5 shrink-0 text-slate-500" />
                      View evidence
                    </a>
                  </div>
                ) : null}
              </div>

              <SheetFooter className="gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReturnTarget(reviewing)}
                  disabled={pending && activeSessionId === reviewing.sessionId}
                >
                  Return
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-700 text-white hover:bg-emerald-800"
                  onClick={() => reviewApprove(reviewing)}
                  disabled={pending && activeSessionId === reviewing.sessionId}
                >
                  Approve session
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <CdpSessionReturnDialog
        open={returnTarget != null}
        onOpenChange={(open) => !open && setReturnTarget(null)}
        title="Return this session?"
        description="The mentor will see your reason and can edit the session log before resubmitting."
        pending={pending && activeSessionId === returnTarget?.sessionId}
        onConfirm={confirmReturn}
      />
    </>
  );
}
