"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  returnMentorshipSession,
  searchSubmittedMentorshipSessions,
  type MentorshipSubmittedSessionRow,
} from "@/lib/actions/mentorship";
import { CdpSessionReturnDialog } from "@/components/admin/cdp/CdpSessionReturnDialog";
import { MentorshipEvidenceLinks } from "@/components/admin/mentorship/MentorshipEvidenceLinks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  CalendarDays,
  Clock3,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

function formatDate(value: string | null) {
  if (!value) return "—";
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

function statusLabel(status: MentorshipSubmittedSessionRow["status"]) {
  return status === "completed" ? "Approved" : "Awaiting approval";
}

function statusBadgeClass(status: MentorshipSubmittedSessionRow["status"]) {
  return status === "completed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-amber-200 bg-amber-50 text-amber-900";
}

export function MentorshipSubmittedSessionsSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<MentorshipSubmittedSessionRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pending, startTransition] = useTransition();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [returnTarget, setReturnTarget] = useState<MentorshipSubmittedSessionRow | null>(
    null
  );

  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setRows([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchSubmittedMentorshipSessions(trimmed);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Failed to search sessions");
        setRows([]);
      } else {
        setRows(result.data);
      }
      setHasSearched(true);
    } catch {
      toast.error("Failed to search sessions");
      setRows([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void runSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

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

      setRows((current) => current.filter((row) => row.sessionId !== returnedSessionId));
      toast.success("Session returned to mentor");
      setReturnTarget(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search by enterprise, mentor, or applicant…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
            autoComplete="off"
          />
        </div>

        {isSearching ? (
          <p className="text-sm text-slate-500">Searching submitted reports…</p>
        ) : !hasSearched ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">Search for a submitted report</p>
            <p className="mt-1 text-sm text-slate-500">
              Enter at least 2 characters of an enterprise name to find pending or approved
              sessions you can return to the mentor.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">No submitted sessions found</p>
            <p className="mt-1 text-sm text-slate-500">Try a different enterprise or mentor name.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {rows.map((row) => {
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
                          <Badge
                            variant="outline"
                            className={`rounded-full ${statusBadgeClass(row.status)}`}
                          >
                            {statusLabel(row.status)}
                          </Badge>
                          {!row.hasEvidence ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-rose-200 bg-rose-50 text-rose-800"
                            >
                              No evidence
                            </Badge>
                          ) : null}
                        </div>
                        <div>
                          <p className="flex items-center gap-1.5 text-base font-semibold text-slate-950">
                            <Building2 className="size-4 text-slate-400" />
                            {row.businessName}
                          </p>
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
                        <MentorshipEvidenceLinks files={row.evidenceFiles} />
                        <p className="text-xs text-slate-500">
                          <Link
                            href={`/admin/mentorship/matches/${row.businessId}`}
                            className="text-sky-700 hover:underline"
                          >
                            Open match page
                          </Link>
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setReturnTarget(row)}
                          disabled={busy}
                        >
                          <X className="mr-1 size-4" />
                          Return to mentor
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
