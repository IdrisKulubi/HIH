"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import type { MelReportingPeriod } from "@/db/schema";
import type {
  MelMonitoringWorkspace,
  MelMonitoringWorkspaceRow,
} from "@/lib/actions/mel-monitoring";
import { AssignmentForm, StartMonitoringForm } from "@/components/mel/monitoring/MonitoringRowActions";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
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
  }, [query, rows]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-background">
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or enterprise ID"
            aria-label="Search enterprises"
            className="bg-background pl-9"
          />
        </div>
        {query.trim() ? (
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
                  {actor.canAccessAllEnterprises ? (
                    <AssignmentForm businessId={row.businessId} collectors={collectors} />
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
                  {availablePeriods.length > 0 ? (
                    <StartMonitoringForm businessId={row.businessId} periods={availablePeriods} />
                  ) : (
                    <span className="text-xs text-slate-500">Collection unavailable</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <ClipboardList className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-900">No enterprises assigned</p>
          <p className="mt-1 text-sm text-slate-500">
            Ask your REDO to assign an enterprise to your monitoring queue.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-slate-500">
          No enterprises match “{query.trim()}”.
        </p>
      ) : null}
    </div>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
