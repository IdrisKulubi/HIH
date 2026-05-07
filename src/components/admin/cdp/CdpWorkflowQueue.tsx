"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CdpWorkflowRow } from "@/lib/actions/cdp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Clock3, FilePlus2, ListChecks, Search } from "lucide-react";

function formatSectorLabel(sector: string) {
  return sector.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function cnaBadgeClass(status: CdpWorkflowRow["cnaStatus"]) {
  switch (status) {
    case "locked":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ready_to_finalize":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "in_progress":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function cdpBadgeClass(status: CdpWorkflowRow["cdpStatus"]) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "draft":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "archived":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-orange-200 bg-orange-50 text-orange-700";
  }
}

function actionIcon(label: string) {
  if (label === "Open CDP") return <ArrowRight className="size-4" />;
  if (label === "Generate CDP") return <FilePlus2 className="size-4" />;
  if (label === "Finalize CNA") return <CheckCircle2 className="size-4" />;
  return <ListChecks className="size-4" />;
}

export function CdpWorkflowQueue({ rows }: { rows: CdpWorkflowRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "needs_cna" | "ready" | "generated">("all");

  const counts = useMemo(
    () => ({
      total: rows.length,
      needsCna: rows.filter((row) => !row.planId && row.cnaStatus !== "locked").length,
      ready: rows.filter((row) => !row.planId && row.cnaStatus === "locked").length,
      generated: rows.filter((row) => row.planId).length,
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "needs_cna" && (row.planId || row.cnaStatus === "locked")) return false;
      if (filter === "ready" && (row.planId || row.cnaStatus !== "locked")) return false;
      if (filter === "generated" && !row.planId) return false;
      if (!q) return true;
      return [
        row.businessName,
        row.applicantName,
        row.applicantEmail,
        row.sector,
        formatSectorLabel(row.sector),
        row.cnaStatusLabel,
        row.cdpStatusLabel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [filter, query, rows]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground">Qualified businesses</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{counts.total}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground">Need CNA work</p>
          <p className="mt-2 text-2xl font-semibold text-sky-700">{counts.needsCna}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground">Ready to generate</p>
          <p className="mt-2 text-2xl font-semibold text-orange-700">{counts.ready}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs font-medium text-muted-foreground">CDPs generated</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{counts.generated}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative min-w-[min(100%,320px)] flex-1">
            <Label htmlFor="cdp-workflow-search" className="sr-only">
              Search CDP workflow queue
            </Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cdp-workflow-search"
              type="search"
              placeholder="Search business, applicant, email, sector..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All", count: counts.total },
              { key: "needs_cna", label: "Needs CNA", count: counts.needsCna },
              { key: "ready", label: "Ready to generate", count: counts.ready },
              { key: "generated", label: "Generated", count: counts.generated },
            ].map((item) => (
              <Button
                key={item.key}
                type="button"
                size="sm"
                variant={filter === item.key ? "default" : "outline"}
                onClick={() => setFilter(item.key as typeof filter)}
              >
                {item.label}
                <span className="ml-1 text-xs opacity-80">{item.count}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length} qualified final due diligence businesses.
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
          No businesses match this view.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((row) => (
            <div
              key={row.businessId}
              className="grid gap-4 rounded-lg border bg-white p-4 shadow-sm transition hover:border-slate-300 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center"
            >
              <div className="min-w-0">
                <Link
                  href={row.actionHref}
                  className="truncate text-base font-semibold text-slate-950 hover:text-sky-700"
                >
                  {row.businessName}
                </Link>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {row.applicantName} - {row.applicantEmail}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{formatSectorLabel(row.sector)}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CNA</p>
                <Badge variant="outline" className={cn("border", cnaBadgeClass(row.cnaStatus))}>
                  {row.cnaStatusLabel}
                </Badge>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3" />
                  {row.submittedRoleCount}/{row.requiredRoleCount} roles submitted
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CDP</p>
                <Badge variant="outline" className={cn("border", cdpBadgeClass(row.cdpStatus))}>
                  {row.cdpStatusLabel}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {row.planId ? `Plan #${row.planId}` : "Generated only after CNA is finalized"}
                </p>
              </div>

              <Button asChild className="justify-center whitespace-nowrap">
                <Link href={row.actionHref}>
                  {actionIcon(row.actionLabel)}
                  {row.actionLabel}
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
