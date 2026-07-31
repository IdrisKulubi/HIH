"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { MelReviewQueueRow } from "@/lib/actions/mel-review";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ReviewQueueTable({
  rows,
  periods,
}: {
  rows: MelReviewQueueRow[];
  periods: Array<{ id: number; label: string }>;
}) {
  const [query, setQuery] = useState("");
  const [periodId, setPeriodId] = useState("all");
  const [stage, setStage] = useState("all");
  const [attention, setAttention] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (periodId !== "all" && row.periodId !== Number(periodId)) return false;
      if (stage !== "all" && row.stage !== stage) return false;
      if (attention === "dqa" && row.dqaOpenCount === 0) return false;
      if (attention === "evidence" && row.verifiedEvidenceCount >= row.evidenceCount) return false;
      return !q || [row.businessName, row.county, row.sector, row.track, row.periodLabel]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [attention, periodId, query, rows, stage]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-background">
      <div className="grid gap-3 border-b bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_150px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search enterprise, county, sector" className="bg-background pl-9" />
        </div>
        <Filter value={periodId} onChange={setPeriodId} label="Period">
          <option value="all">All periods</option>
          {periods.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}
        </Filter>
        <Filter value={stage} onChange={setStage} label="Stage">
          <option value="all">All stages</option><option value="redo">REDO</option><option value="mel">MEL</option>
        </Filter>
        <Filter value={attention} onChange={setAttention} label="Attention">
          <option value="all">All reports</option><option value="dqa">Open DQA findings</option><option value="evidence">Evidence incomplete</option>
        </Filter>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Enterprise</th><th className="px-4 py-3">Review stage</th>
              <th className="px-4 py-3">Quality and evidence</th><th className="px-4 py-3">Submission</th><th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <tr key={row.submissionId} className="hover:bg-slate-50/70">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{row.businessName}</p>
                  <p className="mt-1 text-xs text-slate-500">{humanize(row.track)} · {humanize(row.sector)} · {humanize(row.county)}</p>
                </td>
                <td className="px-4 py-4">
                  <Badge variant="outline">{row.stage.toUpperCase()} review</Badge>
                  <p className="mt-1.5 text-xs text-slate-500">{row.periodCode} · v{row.version}</p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={row.dqaErrorCount ? "border-red-200 bg-red-50 text-red-700" : ""}>
                      {row.dqaOpenCount} DQA open
                    </Badge>
                    <Badge variant="outline" className={row.verifiedEvidenceCount < row.evidenceCount ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>
                      {row.verifiedEvidenceCount}/{row.evidenceCount} evidence verified
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-4 text-xs text-slate-600">
                  <p>{row.sourceMode === "catch_up" ? "Catch-up" : "Current period"}</p>
                  <p className="mt-1">{row.submittedAt ? formatDate(row.submittedAt) : "Not timestamped"}</p>
                </td>
                <td className="px-4 py-4 text-right">
                  <Button asChild size="sm" className="bg-brand-blue hover:bg-brand-blue-dark">
                    <Link href={`/admin/mel/review/${row.submissionId}`}>Open review</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? <p className="px-4 py-12 text-center text-sm text-slate-500">No reports match these filters.</p> : null}
    </div>
  );
}

function Filter({ value, onChange, label, children }: { value: string; onChange: (value: string) => void; label: string; children: React.ReactNode }) {
  return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{children}</select>;
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(value);
}
