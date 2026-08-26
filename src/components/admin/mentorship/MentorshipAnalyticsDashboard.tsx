"use client";

import type { MentorshipAnalytics } from "@/lib/mentorship/analytics";
import { formatMentorshipDurationMinutes } from "@/lib/mentorship/session-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function BreakdownTable({
  title,
  description,
  headers,
  rows,
}: {
  title: string;
  description?: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={headers.length} className="text-muted-foreground">
                  No data yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={index}>
                  {row.map((cell, cellIndex) => (
                    <TableCell key={cellIndex}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function MentorshipAnalyticsDashboard({ data }: { data: MentorshipAnalytics }) {
  const { kpis } = data;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active mentors" value={String(kpis.activeMentors)} />
        <StatCard label="Active matches" value={String(kpis.activeMatches)} />
        <StatCard label="Enterprises in programme" value={String(kpis.enterprisesInProgramme)} />
        <StatCard label="Pending approvals" value={String(kpis.pendingApprovals)} />
        <StatCard label="Completed sessions" value={String(kpis.completedSessions)} />
        <StatCard
          label="Total mentoring hours"
          value={String(kpis.totalMentoringHours)}
          detail="From approved sessions only"
        />
        <StatCard
          label="Avg session duration"
          value={
            kpis.avgSessionDurationMinutes != null
              ? formatMentorshipDurationMinutes(kpis.avgSessionDurationMinutes)
              : "—"
          }
        />
        <StatCard
          label="Avg review turnaround"
          value={
            kpis.avgReviewTurnaroundHours != null
              ? `${kpis.avgReviewTurnaroundHours} hr`
              : "—"
          }
          detail="Submission to approval"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownTable
          title="Session status"
          description="Current state of all programme sessions."
          headers={["Status", "Count"]}
          rows={Object.entries(data.sessionStatusCounts).map(([status, count]) => [status, count])}
        />
        <BreakdownTable
          title="Session type"
          description="Physical vs virtual across all sessions and completed only."
          headers={["Type", "All sessions", "Completed"]}
          rows={["physical", "virtual"].map((type) => [
            type,
            data.sessionTypeCounts.all[type] ?? 0,
            data.sessionTypeCounts.completed[type] ?? 0,
          ])}
        />
      </div>

      <BreakdownTable
        title="Session funnel"
        description="Completion rate by session number across all matches."
        headers={["Session", "Scheduled", "Pending", "Completed", "Completion rate"]}
        rows={data.sessionFunnel.map((row) => [
          `#${row.sessionNumber}`,
          row.scheduled,
          row.pending,
          row.completed,
          `${row.completionRate}%`,
        ])}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Oldest pending submission"
          value={
            data.pendingQueue.oldestSubmission
              ? new Date(data.pendingQueue.oldestSubmission).toLocaleString()
              : "None"
          }
        />
        <StatCard
          label="Pending over 7 days"
          value={String(data.pendingQueue.pendingOver7Days)}
        />
        <StatCard
          label="Currently returned"
          value={String(data.returns.currentlyReturned)}
          detail="Awaiting mentor resubmission"
        />
        <StatCard
          label="Ever returned"
          value={String(data.returns.everReturned)}
          detail="Sessions with a return reason on record"
        />
      </div>

      <BreakdownTable
        title="Per mentor"
        headers={[
          "Mentor",
          "Email",
          "Enterprises",
          "Completed",
          "Pending",
          "Total hours",
        ]}
        rows={data.mentorRows.map((row) => [
          row.mentorName,
          row.mentorEmail,
          row.enterprisesAssigned,
          row.sessionsCompleted,
          row.pendingSubmissions,
          row.totalHours,
        ])}
      />

      <BreakdownTable
        title="Per business"
        headers={["Business", "Mentor", "Match status", "Completed", "Pending", "Total hours"]}
        rows={data.businessRows.map((row) => [
          row.businessName,
          row.mentorName,
          row.matchStatus,
          `${row.sessionsCompleted}/6`,
          row.pendingCount,
          row.totalHours,
        ])}
      />

      <BreakdownTable
        title="Approver activity"
        description="Admin actions on submitted sessions."
        headers={["Approver", "Approvals", "Returns"]}
        rows={data.approverRows.map((row) => [row.approverName, row.approvals, row.returns])}
      />
    </div>
  );
}
