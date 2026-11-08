"use client";

import type { MentorStats } from "@/lib/mentorship/mentor-stats";
import { formatMentorshipDurationMinutes } from "@/lib/mentorship/session-display";
import { Buildings, ChartLineUp, CheckCircle, Clock, Hourglass } from "@phosphor-icons/react";

function ProgressTrack({ value, label }: { value: number; label: string }) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-2">
      <div
        className="h-2.5 overflow-hidden rounded-full bg-emerald-100"
        role="progressbar"
        aria-valuenow={width}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Buildings;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
        <Icon className="size-5" weight="duotone" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-lg font-semibold tabular-nums text-slate-950">{value}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}

export function MentorAnalytics({ stats }: { stats: MentorStats }) {
  const hoursLabel = formatMentorshipDurationMinutes(Math.round(stats.totalHours * 60));

  if (stats.businessesAssigned === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-500">
        No businesses assigned yet. Your stats will appear here after an admin creates a match.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-5 py-6 sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
          Your caseload
        </p>
        <p className="mt-3 max-w-xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          {stats.businessesWithApprovedSession} of {stats.businessesAssigned}{" "}
          {stats.businessesAssigned === 1 ? "business has" : "businesses have"} an approved session
        </p>
        <p className="mt-2 text-sm text-emerald-900/80">
          {stats.businessApprovedPercent}% of your enterprises have at least one REDO-approved
          session.
        </p>
        <div className="mt-5 max-w-lg">
          <ProgressTrack
            value={stats.businessApprovedPercent}
            label={`${stats.businessesFullyComplete} of ${stats.businessesAssigned} have finished all ${stats.enterprises[0]?.sessionsTotal ?? 6} sessions`}
          />
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatChip
          icon={Buildings}
          label="Businesses"
          value={`${stats.businessesWithApprovedSession}/${stats.businessesAssigned}`}
          hint={`${stats.businessApprovedPercent}% with approved work`}
        />
        <StatChip
          icon={CheckCircle}
          label="Sessions approved"
          value={`${stats.sessionsApproved}/${stats.sessionsTotal}`}
          hint={`${stats.sessionApprovedPercent}% of all sessions`}
        />
        <StatChip
          icon={Hourglass}
          label="Awaiting REDO"
          value={String(stats.sessionsPending)}
          hint="Submitted, not yet signed off"
        />
        <StatChip
          icon={Clock}
          label="Approved hours"
          value={hoursLabel === "—" ? "0 hr" : hoursLabel}
          hint={`${stats.sessionsScheduled} still scheduled`}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <ChartLineUp className="size-4 text-emerald-700" weight="duotone" />
          <h2 className="text-sm font-semibold text-slate-900">Progress by enterprise</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {stats.enterprises.map((enterprise) => (
            <li key={enterprise.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{enterprise.businessName}</p>
                  <p className="text-xs text-slate-500">{enterprise.applicantName}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-slate-900">
                  {enterprise.sessionsApproved}/{enterprise.sessionsTotal}
                  <span className="ml-1.5 font-normal text-slate-500">
                    {enterprise.percent}% approved
                  </span>
                </p>
              </div>
              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={enterprise.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${enterprise.businessName} session progress`}
              >
                <div
                  className="h-full rounded-full bg-emerald-600"
                  style={{ width: `${enterprise.percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {enterprise.sessionsPending > 0
                  ? `${enterprise.sessionsPending} waiting for REDO review`
                  : enterprise.percent === 100
                    ? "All sessions approved"
                    : "Keep logging sessions to raise this percentage"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
