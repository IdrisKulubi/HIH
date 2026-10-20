"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import type {
  MentorshipAnalyticsBusinessRow,
  MentorshipAnalyticsMentorRow,
  MentorshipAnalyticsSessionRow,
} from "@/lib/mentorship/analytics";
import { formatMentorshipDurationMinutes } from "@/lib/mentorship/session-display";
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
import { cn } from "@/lib/utils";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function statusClass(status: string): string {
  if (status === "completed" || status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "pending_approval") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (status === "terminated" || status === "missed") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", statusClass(status))}>
      {formatLabel(status)}
    </Badge>
  );
}

function SessionList({ sessions }: { sessions: MentorshipAnalyticsSessionRow[] }) {
  if (sessions.length === 0) {
    return <p className="text-sm text-slate-500">No sessions recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <article
          key={session.id}
          className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-900">
              Session {session.sessionNumber}
              <span className="ml-2 font-normal capitalize text-slate-500">
                {session.sessionType}
              </span>
            </p>
            <StatusBadge status={session.status} />
          </div>
          <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Scheduled</dt>
              <dd>{formatDate(session.scheduledDate)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Completed</dt>
              <dd>{formatDate(session.completedDate)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Duration</dt>
              <dd>{formatMentorshipDurationMinutes(session.durationMinutes)}</dd>
            </div>
          </dl>
          {session.diagnosticNotes ? (
            <p className="mt-2 text-xs leading-5 text-slate-700">{session.diagnosticNotes}</p>
          ) : null}
          {session.rejectionReason ? (
            <p className="mt-2 text-xs text-red-700">Returned: {session.rejectionReason}</p>
          ) : null}
          {session.evidenceUrl?.trim() ? (
            <a
              href={session.evidenceUrl.trim()}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-medium text-brand-blue hover:underline"
            >
              View evidence
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ScrollableTable({
  title,
  countLabel,
  query,
  onQueryChange,
  searchPlaceholder,
  searchId,
  headers,
  children,
}: {
  title: string;
  countLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  searchId: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {countLabel}. Click a row for the full record.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <MagnifyingGlass
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-9"
            autoComplete="off"
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="max-h-[min(28rem,65vh)] overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]">
              <tr>
                {headers.map((header) => (
                  <th
                    key={header}
                    className="h-10 bg-slate-50 px-3 text-left align-middle text-xs font-semibold whitespace-nowrap text-slate-600"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ClickableRow({
  children,
  label,
  onOpen,
}: {
  children: ReactNode;
  label: string;
  onOpen: () => void;
}) {
  return (
    <tr
      tabIndex={0}
      aria-label={label}
      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      {children}
    </tr>
  );
}

export function MentorshipAnalyticsEntityTables({
  mentorRows,
  businessRows,
}: {
  mentorRows: MentorshipAnalyticsMentorRow[];
  businessRows: MentorshipAnalyticsBusinessRow[];
}) {
  const [mentorQuery, setMentorQuery] = useState("");
  const [businessQuery, setBusinessQuery] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<MentorshipAnalyticsMentorRow | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<MentorshipAnalyticsBusinessRow | null>(
    null
  );

  const filteredMentors = useMemo(() => {
    const q = mentorQuery.trim().toLowerCase();
    if (!q) return mentorRows;
    return mentorRows.filter((row) =>
      [row.mentorName, row.mentorEmail, row.expertiseArea].join(" ").toLowerCase().includes(q)
    );
  }, [mentorQuery, mentorRows]);

  const filteredBusinesses = useMemo(() => {
    const q = businessQuery.trim().toLowerCase();
    if (!q) return businessRows;
    return businessRows.filter((row) =>
      [row.businessName, row.applicantName, row.mentorName, row.matchStatus]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [businessQuery, businessRows]);

  return (
    <>
      <ScrollableTable
        title="Per mentor"
        countLabel={`Showing ${filteredMentors.length} of ${mentorRows.length}`}
        query={mentorQuery}
        onQueryChange={setMentorQuery}
        searchPlaceholder="Search mentors"
        searchId="analytics-mentor-search"
        headers={["Mentor", "Email", "Enterprises", "Completed", "Pending", "Total hours"]}
      >
        {filteredMentors.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
              {mentorQuery.trim() ? "No mentors match this search." : "No mentors yet."}
            </td>
          </tr>
        ) : (
          filteredMentors.map((row) => (
            <ClickableRow
              key={row.mentorId}
              label={`Open details for ${row.mentorName}`}
              onOpen={() => setSelectedMentor(row)}
            >
              <td className="px-3 py-2.5 font-medium text-slate-900">{row.mentorName}</td>
              <td className="px-3 py-2.5 text-slate-600">{row.mentorEmail}</td>
              <td className="px-3 py-2.5">{row.enterprisesAssigned}</td>
              <td className="px-3 py-2.5">{row.sessionsCompleted}</td>
              <td className="px-3 py-2.5">{row.pendingSubmissions}</td>
              <td className="px-3 py-2.5">{row.totalHours}</td>
            </ClickableRow>
          ))
        )}
      </ScrollableTable>

      <ScrollableTable
        title="Per business"
        countLabel={`Showing ${filteredBusinesses.length} of ${businessRows.length}`}
        query={businessQuery}
        onQueryChange={setBusinessQuery}
        searchPlaceholder="Search businesses"
        searchId="analytics-business-search"
        headers={["Business", "Mentor", "Match status", "Completed", "Pending", "Total hours"]}
      >
        {filteredBusinesses.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
              {businessQuery.trim() ? "No businesses match this search." : "No businesses yet."}
            </td>
          </tr>
        ) : (
          filteredBusinesses.map((row) => (
            <ClickableRow
              key={row.matchId}
              label={`Open details for ${row.businessName}`}
              onOpen={() => setSelectedBusiness(row)}
            >
              <td className="px-3 py-2.5 font-medium text-slate-900">{row.businessName}</td>
              <td className="px-3 py-2.5 text-slate-600">{row.mentorName}</td>
              <td className="px-3 py-2.5 capitalize">{formatLabel(row.matchStatus)}</td>
              <td className="px-3 py-2.5">{row.sessionsCompleted}/6</td>
              <td className="px-3 py-2.5">{row.pendingCount}</td>
              <td className="px-3 py-2.5">{row.totalHours}</td>
            </ClickableRow>
          ))
        )}
      </ScrollableTable>

      <Dialog open={selectedMentor != null} onOpenChange={(open) => !open && setSelectedMentor(null)}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          {selectedMentor ? (
            <>
              <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                <DialogTitle>{selectedMentor.mentorName}</DialogTitle>
                <DialogDescription>
                  {selectedMentor.mentorEmail}
                  {selectedMentor.expertiseArea
                    ? ` · ${formatLabel(selectedMentor.expertiseArea)}`
                    : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <DetailStat label="Status" value={selectedMentor.isActive ? "Active" : "Inactive"} />
                  <DetailStat label="Enterprises" value={selectedMentor.enterprisesAssigned} />
                  <DetailStat label="Completed" value={selectedMentor.sessionsCompleted} />
                  <DetailStat label="Hours" value={selectedMentor.totalHours} />
                </div>
                {selectedMentor.matches.length === 0 ? (
                  <p className="text-sm text-slate-500">This mentor has no matches yet.</p>
                ) : (
                  selectedMentor.matches.map((match) => (
                    <section key={match.matchId} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{match.businessName}</h3>
                          <p className="text-xs text-slate-500">{match.applicantName}</p>
                        </div>
                        <StatusBadge status={match.matchStatus} />
                      </div>
                      <p className="text-xs text-slate-500">
                        Started {formatDate(match.startDate)} · {match.sessionsCompleted}/6 completed ·{" "}
                        {match.totalHours} hr
                      </p>
                      <SessionList sessions={match.sessions} />
                    </section>
                  ))
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedBusiness != null}
        onOpenChange={(open) => !open && setSelectedBusiness(null)}
      >
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          {selectedBusiness ? (
            <>
              <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                <DialogTitle>{selectedBusiness.businessName}</DialogTitle>
                <DialogDescription>
                  {selectedBusiness.applicantName} · Mentor {selectedBusiness.mentorName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 overflow-y-auto px-6 py-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <DetailStat label="Match" value={formatLabel(selectedBusiness.matchStatus)} />
                  <DetailStat label="Started" value={formatDate(selectedBusiness.startDate)} />
                  <DetailStat label="Completed" value={`${selectedBusiness.sessionsCompleted}/6`} />
                  <DetailStat label="Hours" value={selectedBusiness.totalHours} />
                </div>
                <p className="text-sm text-slate-600">
                  {selectedBusiness.mentorName}
                  <span className="text-slate-500"> · {selectedBusiness.mentorEmail}</span>
                </p>
                <SessionList sessions={selectedBusiness.sessions} />
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/mentorship/matches/${selectedBusiness.businessId}`}>
                    Open match workspace
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
