"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import type { EnterpriseProgressRow, EnterpriseStageProgress } from "@/lib/actions/enterprise-progress";
import { ExcelExportButton, type ExcelExportColumn } from "@/components/shared/ExcelExportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "application", label: "Application" },
  { key: "dueDiligence", label: "Due Diligence" },
  { key: "kyc", label: "KYC" },
  { key: "cna", label: "CNA" },
  { key: "cdp", label: "CDP" },
  { key: "mentorship", label: "Mentorship" },
  { key: "accessToFinance", label: "Access to Finance" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

type EnterpriseProgressExportRow = {
  enterprise: string;
  applicant: string;
  email: string;
  track: string;
  sector: string;
  county: string;
  application: string;
  dueDiligence: string;
  kyc: string;
  cna: string;
  cdp: string;
  mentorship: string;
  accessToFinance: string;
  currentStage: string;
  progress: string;
  lastUpdated: string;
};

const EXPORT_COLUMNS: ExcelExportColumn<EnterpriseProgressExportRow>[] = [
  { key: "enterprise", header: "Enterprise", width: 28 },
  { key: "applicant", header: "Applicant", width: 24 },
  { key: "email", header: "Email", width: 30 },
  { key: "track", header: "Track", width: 16 },
  { key: "sector", header: "Sector", width: 24 },
  { key: "county", header: "County", width: 18 },
  { key: "application", header: "Application", width: 20 },
  { key: "dueDiligence", header: "Due Diligence", width: 20 },
  { key: "kyc", header: "KYC", width: 18 },
  { key: "cna", header: "CNA", width: 18 },
  { key: "cdp", header: "CDP", width: 18 },
  { key: "mentorship", header: "Mentorship", width: 18 },
  { key: "accessToFinance", header: "Access to Finance", width: 24 },
  { key: "currentStage", header: "Current Stage", width: 22 },
  { key: "progress", header: "Overall Progress", width: 18 },
  { key: "lastUpdated", header: "Last Updated", width: 22 },
];

function stageBadgeClass(stage: EnterpriseStageProgress) {
  switch (stage.state) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "in_progress":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "stopped":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function StageBadge({ stage }: { stage: EnterpriseStageProgress }) {
  return (
    <Badge variant="outline" className={cn("whitespace-nowrap border font-medium", stageBadgeClass(stage))}>
      {stage.label}
    </Badge>
  );
}

export function EnterpriseProgressTable({ rows }: { rows: EnterpriseProgressRow[] }) {
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (stageFilter !== "all" && row.currentStage !== stageFilter) return false;
      if (stateFilter !== "all") {
        const stages = STAGES.map((stage) => row[stage.key]);
        if (stateFilter === "attention" && !stages.some((stage) => stage.state === "stopped")) return false;
        if (stateFilter === "active" && !stages.some((stage) => stage.state === "in_progress")) return false;
        if (stateFilter === "complete" && row.progressPercent !== 100) return false;
      }
      if (!normalizedQuery) return true;
      return [row.businessName, row.applicantName, row.applicantEmail, row.track, row.sector, row.county, row.currentStageLabel]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, rows, stageFilter, stateFilter]);

  const exportRows = useMemo<EnterpriseProgressExportRow[]>(
    () =>
      filteredRows.map((row) => ({
        enterprise: row.businessName,
        applicant: row.applicantName,
        email: row.applicantEmail,
        track: row.track,
        sector: row.sector,
        county: row.county,
        application: row.application.label,
        dueDiligence: row.dueDiligence.label,
        kyc: row.kyc.label,
        cna: row.cna.label,
        cdp: row.cdp.label,
        mentorship: row.mentorship.label,
        accessToFinance: row.accessToFinance.label,
        currentStage: row.currentStageLabel,
        progress: `${row.progressPercent}%`,
        lastUpdated: new Date(row.lastUpdatedAt).toLocaleString(),
      })),
    [filteredRows]
  );

  const stoppedCount = rows.filter((row) => STAGES.some((stage) => row[stage.key].state === "stopped")).length;
  const a2fCount = rows.filter((row) => row.accessToFinance.state !== "not_started").length;
  const completedCount = rows.filter((row) => row.progressPercent === 100).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Enterprises tracked</p>
          <p className="mt-2 text-2xl font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">In Access to Finance</p>
          <p className="mt-2 text-2xl font-semibold text-sky-700">{a2fCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">All stages complete</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{completedCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Stopped or rejected</p>
          <p className="mt-2 text-2xl font-semibold text-red-700">{stoppedCount}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_210px_190px_auto] lg:items-end">
          <div className="relative">
            <Label htmlFor="enterprise-progress-search" className="sr-only">Search enterprises</Label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="enterprise-progress-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search enterprise, applicant, email, sector..."
              className="pl-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Current stage</Label>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {STAGES.map((stage) => <SelectItem key={stage.key} value={stage.key === "accessToFinance" ? "access_to_finance" : stage.key === "dueDiligence" ? "due_diligence" : stage.key}>{stage.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Progress state</Label>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                <SelectItem value="active">In progress</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="attention">Stopped / rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ExcelExportButton
            rows={exportRows}
            columns={EXPORT_COLUMNS}
            fileName={`enterprise-progress-${new Date().toISOString().slice(0, 10)}`}
            sheetName="Enterprise Progress"
            label="Export filtered view"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Showing {filteredRows.length} of {rows.length} enterprises.</p>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <Table className="min-w-[1500px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="sticky left-0 z-10 min-w-72 bg-muted">Enterprise</TableHead>
                {STAGES.map((stage) => <TableHead key={stage.key}>{stage.label}</TableHead>)}
                <TableHead className="min-w-44">Overall progress</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="h-28 text-center text-muted-foreground">No enterprises match the selected filters.</TableCell></TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.applicationId}>
                    <TableCell className="sticky left-0 z-10 bg-card">
                      <p className="font-semibold">{row.businessName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.applicantName} · {row.track}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.sector} · {row.county}</p>
                    </TableCell>
                    {STAGES.map((stage) => <TableCell key={stage.key}><StageBadge stage={row[stage.key]} /></TableCell>)}
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>{row.currentStageLabel}</span>
                          <span className="font-medium">{row.progressPercent}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-brand-blue" style={{ width: `${row.progressPercent}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={row.nextActionHref}>View <ArrowUpRight className="size-3.5" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
