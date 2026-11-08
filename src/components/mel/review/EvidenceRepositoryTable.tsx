"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type EvidenceRow = {
  id: number;
  submissionId: number;
  businessName: string;
  periodLabel: string;
  questionCode: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  status: string;
  reviewStatus: string;
  uploaderId: string | null;
  createdAt: Date;
};

export function EvidenceRepositoryTable({ rows }: { rows: EvidenceRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) =>
      (status === "all" || row.reviewStatus === status) &&
      (!q || [row.businessName, row.periodLabel, row.questionCode, row.fileName, row.fileType].join(" ").toLowerCase().includes(q))
    );
  }, [query, rows, status]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background">
      <div className="grid shrink-0 gap-3 border-b bg-slate-50 p-4 sm:grid-cols-[1fr_180px]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search enterprise, period, indicator, file" className="bg-background pl-9" /></div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All review states</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]"><tr><th className="px-4 py-3">Enterprise and period</th><th className="px-4 py-3">Evidence</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Review</th><th className="px-4 py-3">Report</th></tr></thead>
          <tbody className="divide-y">
            {filtered.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3"><p className="font-medium text-slate-900">{row.businessName}</p><p className="mt-1 text-xs text-slate-500">{row.periodLabel}</p></td>
                <td className="px-4 py-3"><a href={row.fileUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-xs items-center gap-1 truncate text-brand-blue hover:underline">{row.fileName}<ExternalLink className="size-3 shrink-0" /></a><p className="mt-1 text-xs text-slate-500">{row.fileType}</p></td>
                <td className="px-4 py-3 text-slate-700">{row.questionCode.replaceAll("_", " ")}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={row.reviewStatus === "verified" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : row.reviewStatus === "rejected" ? "border-red-200 bg-red-50 text-red-700" : ""}>{row.reviewStatus}</Badge></td>
                <td className="px-4 py-3"><Link href={`/admin/mel/review/${row.submissionId}`} className="text-sm font-medium text-brand-blue hover:underline">Open report</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-500">No evidence matches these filters.</p> : null}
      </div>
    </div>
  );
}
