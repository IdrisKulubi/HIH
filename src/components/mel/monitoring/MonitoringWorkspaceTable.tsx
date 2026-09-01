"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import type { MelReportingPeriod } from "@/db/schema";
import type {
  MelMonitoringWorkspace,
  MelMonitoringWorkspaceRow,
} from "@/lib/actions/mel-monitoring";
import { isCollectorEditableStatus } from "@/lib/mel/review-workflow";
import { AssignmentForm, StartMonitoringForm } from "@/components/mel/monitoring/MonitoringRowActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type StatusFilter = "all" | "draft" | "returned" | "submitted";

const RETURNED_STATUSES = new Set(["returned", "returned_by_redo", "returned_by_mel", "reopened"]);
const SUBMITTED_STATUSES = new Set([
  "submitted",
  "resubmitted",
  "redo_review",
  "mel_review",
  "approved",
]);

function rowMatchesStatusFilter(row: MelMonitoringWorkspaceRow, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  const statuses = row.submissions.map((submission) => submission.status);
  if (filter === "draft") return statuses.some((status) => status === "draft");
  if (filter === "returned") return statuses.some((status) => RETURNED_STATUSES.has(status));
  if (filter === "submitted") return statuses.some((status) => SUBMITTED_STATUSES.has(status));
  return true;
}

function findResumableSubmission(
  row: MelMonitoringWorkspaceRow,
  availablePeriods: MelReportingPeriod[]
) {
  const availableIds = new Set(availablePeriods.map((period) => period.id));
  return row.submissions.find(
    (submission) =>
      availableIds.has(submission.reportingPeriodId) &&
      isCollectorEditableStatus(submission.status)
  );
}

export function MonitoringWorkspaceTable({
  actor,
  collectors,
  periods,
  rows,
  availablePeriods,
}: {
  actor: MelMonitoringWorkspace["actor"];
  collectors: MelMonitoringWorkspace["collectors"];
  periods: MelReportingPeriod[];
  rows: MelMonitoringWorkspaceRow[];
  availablePeriods: MelReportingPeriod[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!rowMatchesStatusFilter(row, statusFilter)) return false;
      if (!q) return true;
      const haystack = [
        row.businessName,
        row.applicantName,
        row.email,
        String(row.businessId),
        `enterprise #${row.businessId}`,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, rows, statusFilter]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-background">
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or enterprise ID"
              aria-label="Search enterprises"
              className="bg-background pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by report status">
            {([
              ["all", "All"],
              ["draft", "Drafts"],
              ["returned", "Returned"],
              ["submitted", "Submitted"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={statusFilter === value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === value
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-slate-200 bg-background text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {query.trim() || statusFilter !== "all" ? (
          <p className="mt-2 text-xs text-slate-500">
            Showing {filtered.length} of {rows.length} enterprises
          </p>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Enterprise</th>
              <th className="px-4 py-3">Profile</th>
              <th className="px-4 py-3">Report history</th>
              <th className="px-4 py-3">Next action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <tr key={row.businessId} className="align-top">
                <td className="px-4 py-4">
                  <Link href={`/admin/mel/enterprises/${row.businessId}`} className="font-semibold text-brand-blue hover:underline">{row.businessName}</Link>
                  <p className="mt-1 text-xs text-slate-500">
                    Enterprise #{row.businessId} · {row.applicantName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{row.email}</p>
                  {row.assignedCollectorIds.length > 0 ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Assigned:{" "}
                      {row.assignedCollectorIds
                        .map((id) => collectors.find((collector) => collector.id === id)?.name ?? "collector")
                        .join(", ")}
                    </p>
                  ) : actor.canAssignEnterprises ? (
                    <p className="mt-1 text-xs text-slate-400">Not yet assigned</p>
                  ) : null}
                  {actor.canAssignEnterprises ? (
                    <AssignmentForm
                      businessId={row.businessId}
                      collectors={collectors}
                      defaultCollectorId={actor.role === "bds_edo" ? actor.id : undefined}
                    />
                  ) : null}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  <p>{humanize(row.track ?? "unassigned")} track</p>
                  <p className="mt-1 text-xs">
                    {humanize(row.sector)} · {humanize(row.county ?? "county not recorded")}
                  </p>
                </td>
                <td className="px-4 py-4">
                  {row.submissions.length > 0 ? (
                    <div className="flex max-w-sm flex-wrap gap-1.5">
                      {row.submissions.map((submission) => {
                        const period = periods.find((item) => item.id === submission.reportingPeriodId);
                        return (
                          <Link
                            key={submission.id}
                            href={`/admin/mel/monitoring/${row.businessId}/${submission.reportingPeriodId}`}
                          >
                            <Badge variant="outline" className="hover:bg-slate-50">
                              {period?.code ?? `Period ${submission.reportingPeriodId}`}: {submission.status}
                            </Badge>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">No monitoring history</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {(() => {
                    const resumable = findResumableSubmission(row, availablePeriods);
                    const canCollect =
                      availablePeriods.length > 0 &&
                      (actor.canAccessAllEnterprises || row.assignedCollectorIds.includes(actor.id));

                    if (resumable && canCollect) {
                      const period = periods.find((item) => item.id === resumable.reportingPeriodId);
                      return (
                        <div className="space-y-2">
                          <Button asChild size="sm" className="bg-brand-blue hover:bg-brand-blue-dark">
                            <Link href={`/admin/mel/monitoring/${row.businessId}/${resumable.reportingPeriodId}`}>
                              Resume draft
                            </Link>
                          </Button>
                          <p className="text-xs text-slate-500">
                            {period?.label ?? "Open period"} · {resumable.status}
                          </p>
                        </div>
                      );
                    }

                    if (canCollect) {
                      return <StartMonitoringForm businessId={row.businessId} periods={availablePeriods} />;
                    }

                    if (availablePeriods.length === 0) {
                      return <span className="text-xs text-slate-500">Collection unavailable</span>;
                    }

                    return (
                      <span className="text-xs text-slate-500">Assign this enterprise to start collection</span>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <ClipboardList className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900">
            {actor.canAssignEnterprises ? "No enterprises to assign" : "No enterprises assigned"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {actor.canAssignEnterprises
              ? "Programme enterprises will appear here so you can assign them to a collector."
              : "Ask an EDO to assign an enterprise to your monitoring queue."}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-slate-500">
          No enterprises match these filters.
        </p>
      ) : null}
    </div>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
