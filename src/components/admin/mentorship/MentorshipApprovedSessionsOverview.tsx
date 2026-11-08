"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import type { MentorshipApprovedSessionRow } from "@/lib/actions/mentorship";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MentorshipEvidenceLinks } from "@/components/admin/mentorship/MentorshipEvidenceLinks";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-0.5 text-sm text-slate-900">{value}</div>
    </div>
  );
}

export function MentorshipApprovedSessionsOverview({
  rows,
  pendingCount,
}: {
  rows: MentorshipApprovedSessionRow[];
  pendingCount: number;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MentorshipApprovedSessionRow | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.businessName,
        row.applicantName,
        row.mentorName,
        row.mentorEmail,
        row.approverName,
        row.approverEmail,
        String(row.sessionNumber),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query, rows]);

  return (
    <section className="space-y-4">
      {pendingCount > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pendingCount} session{pendingCount === 1 ? " is" : "s are"} still with REDO for review.
          Admins can monitor progress here after those sessions are approved.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-slate-600">
          Showing {filtered.length} of {rows.length} approved session{rows.length === 1 ? "" : "s"}.
          Click a row for the full record.
        </p>
        <div className="relative w-full sm:max-w-xs">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            id="approved-session-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search business, mentor, or approver"
            className="h-9 pl-9"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="max-h-[min(36rem,70vh)] overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]">
              <tr>
                {[
                  "Business",
                  "Mentor",
                  "Session",
                  "Approver",
                  "Approved",
                  "Duration",
                ].map((header) => (
                  <th
                    key={header}
                    className="h-10 bg-slate-50 px-3 text-left align-middle text-xs font-semibold whitespace-nowrap text-slate-600"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                    {query.trim()
                      ? "No approved sessions match this search."
                      : "No sessions have been approved yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.sessionId}
                    tabIndex={0}
                    aria-label={`Open approved session ${row.sessionNumber} for ${row.businessName}`}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
                    onClick={() => setSelected(row)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(row);
                      }
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">{row.businessName}</p>
                      <p className="text-xs text-slate-500">{row.applicantName}</p>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{row.mentorName}</td>
                    <td className="px-3 py-2.5">
                      #{row.sessionNumber}
                      <span className="ml-1.5 capitalize text-slate-500">{row.sessionType}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">{row.approverName}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                      {formatDateTime(row.approvedAt)}
                    </td>
                    <td className="px-3 py-2.5">{row.durationLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          {selected ? (
            <>
              <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                <DialogTitle>
                  {selected.businessName} · Session {selected.sessionNumber}
                </DialogTitle>
                <DialogDescription>
                  Approved {formatDateTime(selected.approvedAt)} by {selected.approverName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 overflow-y-auto px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    {selected.sessionType}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-800"
                  >
                    Approved
                  </Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Detail label="Applicant" value={selected.applicantName} />
                  <Detail
                    label="Mentor"
                    value={
                      <>
                        {selected.mentorName}
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {selected.mentorEmail}
                        </span>
                      </>
                    }
                  />
                  <Detail
                    label="Approver"
                    value={
                      <>
                        {selected.approverName}
                        {selected.approverEmail ? (
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {selected.approverEmail}
                          </span>
                        ) : null}
                      </>
                    }
                  />
                  <Detail label="Approved at" value={formatDateTime(selected.approvedAt)} />
                  <Detail label="Scheduled" value={formatDate(selected.scheduledDate)} />
                  <Detail label="Session date" value={formatDate(selected.completedDate)} />
                  <Detail label="Duration" value={selected.durationLabel} />
                </div>
                {selected.diagnosticNotes ? (
                  <Detail label="Session notes" value={selected.diagnosticNotes} />
                ) : null}
                {selected.evidenceFiles.length > 0 ? (
                  <MentorshipEvidenceLinks
                    files={selected.evidenceFiles}
                    className="flex-col items-start gap-2 [&_a]:text-sm [&_a]:font-medium [&_a]:text-brand-blue"
                  />
                ) : null}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/mentorship/matches/${selected.businessId}`}>
                    Open match workspace
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
