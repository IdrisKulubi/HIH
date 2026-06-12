"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  overridePreScreeningOutcome,
  type AdminA2fDashboardData,
  type AdminA2fPreScreeningRow,
  type AdminA2fPipelineRow,
} from "@/lib/actions/admin-a2f";
import type { PreScreeningOutcome } from "@/lib/a2f-pre-screening-outcome";
import { PIPELINE_STAGE_LABELS, type A2fPipelineStatus } from "@/lib/a2f-constants";
import { CommitteeScoreOverridePanel } from "@/components/a2f/committee/CommitteeScoreOverridePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowSquareOut,
  Bank,
  ChartBar,
  CheckCircle,
  ClipboardText,
  Clock,
  Eye,
  MagnifyingGlass,
  Scales,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";

function titleCase(value: string | null) {
  if (!value) return "-";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return <Badge variant="outline">Pending</Badge>;
  const className =
    outcome === "pass"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : outcome === "conditional"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";
  return (
    <Badge variant="outline" className={className}>
      {titleCase(outcome)}
    </Badge>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; weight?: "duotone" }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <Icon weight="duotone" className="size-7 text-brand-blue" />
      </CardContent>
    </Card>
  );
}

function OverrideDialog({ row }: { row: AdminA2fPreScreeningRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<PreScreeningOutcome | "">("");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!row.attemptId || !outcome) return;
    startTransition(async () => {
      const result = await overridePreScreeningOutcome(row.attemptId!, outcome, reason);
      if (!result.success) {
        toast.error(result.error ?? "Override failed");
        return;
      }
      toast.success(
        result.data?.emailStatus === "failed"
          ? "Outcome updated. Invitation delivery failed and can be retried."
          : "Effective outcome updated"
      );
      setOpen(false);
      setOutcome("");
      setReason("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!row.originalOutcome}>
          Override
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override effective outcome</DialogTitle>
          <DialogDescription>
            The original score, answers, hard stops, and outcome remain unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{row.businessName}</p>
            <p className="mt-1 text-muted-foreground">
              Original: {titleCase(row.originalOutcome)} ({row.originalScore}/100) · Effective:{" "}
              {titleCase(row.effectiveOutcome)}
            </p>
            {row.hardStopReasons.length > 0 && (
              <p className="mt-2 text-red-700">
                Hard stop: {row.hardStopReasons.join("; ")}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>New effective outcome</Label>
            <Select value={outcome} onValueChange={(value) => setOutcome(value as PreScreeningOutcome)}>
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="conditional">Conditional</SelectItem>
                <SelectItem value="stop">Stop</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Audit reason</Label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why the effective outcome is changing."
              rows={4}
            />
          </div>
          <Button className="w-full" onClick={submit} disabled={pending || !outcome || reason.trim().length < 5}>
            {pending ? "Applying..." : "Apply audited override"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreScreeningTable({ rows }: { rows: AdminA2fPreScreeningRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim();
    return rows.filter((row) => {
      const matchesQuery =
        !term ||
        row.businessName.toLowerCase().includes(term) ||
        row.applicantName.toLowerCase().includes(term) ||
        String(row.applicationId).includes(term);
      const matchesStatus =
        status === "all" ||
        row.status === status ||
        row.effectiveOutcome === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, rows, status]);

  return (
    <Card>
      <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base">DD-qualified enterprise register ({rows.length})</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Admin inspection is read-only until a reviewer submits an assessment.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="w-64 pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search enterprise or ID"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="not_screened">Not screened</SelectItem>
              <SelectItem value="draft">Being scored</SelectItem>
              <SelectItem value="pass">Passed</SelectItem>
              <SelectItem value="conditional">Conditional</SelectItem>
              <SelectItem value="stop">Stopped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-3">Enterprise</th>
              <th className="px-2 py-3">Track / DD</th>
              <th className="px-2 py-3">Reviewer</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3">Original</th>
              <th className="px-2 py-3">Effective</th>
              <th className="px-2 py-3">Assessed</th>
              <th className="px-2 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.applicationId} className="border-b last:border-0">
                <td className="px-2 py-3">
                  <p className="font-medium">{row.businessName}</p>
                  <p className="text-xs text-muted-foreground">{row.applicantName} · #{row.applicationId}</p>
                </td>
                <td className="px-2 py-3">{titleCase(row.track)} · {row.ddScore}%</td>
                <td className="px-2 py-3">{row.reviewerName ?? "Unassigned"}</td>
                <td className="px-2 py-3"><Badge variant="secondary">{titleCase(row.status)}</Badge></td>
                <td className="px-2 py-3">
                  {row.originalOutcome ? `${titleCase(row.originalOutcome)} · ${row.originalScore}/100` : "-"}
                </td>
                <td className="px-2 py-3"><OutcomeBadge outcome={row.effectiveOutcome} /></td>
                <td className="px-2 py-3">
                  {row.assessedAt ? format(new Date(row.assessedAt), "dd MMM yyyy") : "-"}
                </td>
                <td className="px-2 py-3">
                  <div className="flex justify-end gap-2">
                    {row.attemptId && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/finance-screening/${row.attemptId}`}>
                          <Eye className="mr-1 size-4" /> Inspect
                        </Link>
                      </Button>
                    )}
                    <OverrideDialog row={row} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ScoreDialog({ row }: { row: AdminA2fPipelineRow }) {
  const router = useRouter();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!row.scores}>Adjust score</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pre-IC score override · {row.businessName}</DialogTitle>
          <DialogDescription>
            Parameter changes recalculate the total and are added to the audit history.
          </DialogDescription>
        </DialogHeader>
        <CommitteeScoreOverridePanel
          a2fId={row.a2fId}
          currentScores={row.scores}
          onOverride={() => router.refresh()}
        />
      </DialogContent>
    </Dialog>
  );
}

function PipelineTable({ rows }: { rows: AdminA2fPipelineRow[] }) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter((row) =>
    `${row.businessName} ${row.applicationId}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <Card>
      <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base">Effective Pass pipeline ({rows.length})</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Only enterprises whose current effective outcome is Pass appear here.
          </p>
        </div>
        <Input className="w-64" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pipeline" />
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-3">Enterprise</th>
              <th className="px-2 py-3">Finance application</th>
              <th className="px-2 py-3">Stage</th>
              <th className="px-2 py-3">Pre-IC</th>
              <th className="px-2 py-3">Officer</th>
              <th className="px-2 py-3">Next action</th>
              <th className="px-2 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.a2fId} className="border-b last:border-0">
                <td className="px-2 py-3">
                  <p className="font-medium">{row.businessName}</p>
                  <p className="text-xs text-muted-foreground">{titleCase(row.track)} · #{row.applicationId}</p>
                </td>
                <td className="px-2 py-3">{titleCase(row.financeApplicationStatus)}</td>
                <td className="px-2 py-3">
                  {PIPELINE_STAGE_LABELS[row.stage as A2fPipelineStatus] ?? titleCase(row.stage)}
                </td>
                <td className="px-2 py-3 font-medium tabular-nums">
                  {row.preIcScore === null ? "Not scored" : `${row.preIcScore}/100`}
                </td>
                <td className="px-2 py-3">{row.officerName ?? "Unassigned"}</td>
                <td className="px-2 py-3">{row.nextAction}</td>
                <td className="px-2 py-3">
                  <div className="flex justify-end gap-2">
                    <ScoreDialog row={row} />
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/a2f/${row.a2fId}`}>
                        Open <ArrowSquareOut className="ml-1 size-4" />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function AdminA2fDashboard({ initialData }: { initialData: AdminA2fDashboardData }) {
  const [overrideQuery, setOverrideQuery] = useState("");
  const overrideRows = initialData.overrides.filter((row) =>
    `${row.businessName} ${row.adminName} ${row.reason}`.toLowerCase().includes(overrideQuery.toLowerCase())
  );
  const stats = initialData.overview;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">Administration</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Access to Finance workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow every DD-qualified enterprise from pre-screening through Matching Grant review.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/finance-screening">EDO/REDO workspace</Link></Button>
          <Button asChild><Link href="/a2f">Passed pipeline</Link></Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pre-screening">Pre-Screening</TabsTrigger>
          <TabsTrigger value="pipeline">Passed Pipeline</TabsTrigger>
          <TabsTrigger value="overrides">Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Not screened" value={stats.notScreened} icon={Clock} />
            <StatCard label="Being scored" value={stats.beingScored} icon={ClipboardText} />
            <StatCard label="Completed" value={stats.completed} icon={ShieldCheck} />
            <StatCard label="Passed" value={stats.passed} icon={CheckCircle} />
            <StatCard label="Conditional" value={stats.conditional} icon={WarningCircle} />
            <StatCard label="Stopped" value={stats.stopped} icon={Scales} />
            <StatCard label="Pipeline cases" value={stats.pipelineCases} icon={Bank} />
            <StatCard label="Pre-IC scored" value={stats.preIcScored} icon={ChartBar} />
            <StatCard label="Pending committee" value={stats.pendingCommittee} icon={Eye} />
          </div>
          <Card>
            <CardContent className="grid gap-6 p-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">DD-qualified cohort</p>
                <p className="mt-1 text-3xl font-bold">{initialData.preScreening.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Screening completion</p>
                <p className="mt-1 text-3xl font-bold">
                  {initialData.preScreening.length
                    ? Math.round((stats.completed / initialData.preScreening.length) * 100)
                    : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Effective pass rate</p>
                <p className="mt-1 text-3xl font-bold">
                  {stats.completed ? Math.round((stats.passed / stats.completed) * 100) : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pre-screening">
          <PreScreeningTable rows={initialData.preScreening} />
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelineTable rows={initialData.pipeline} />
        </TabsContent>

        <TabsContent value="overrides">
          <Card>
            <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base">Consolidated override history</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pre-screening outcome decisions and later Pre-IC parameter changes.
                </p>
              </div>
              <Input className="w-72" value={overrideQuery} onChange={(event) => setOverrideQuery(event.target.value)} placeholder="Search enterprise, admin, or reason" />
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-3">Type</th>
                    <th className="px-2 py-3">Enterprise</th>
                    <th className="px-2 py-3">Change</th>
                    <th className="px-2 py-3">Reason</th>
                    <th className="px-2 py-3">Administrator</th>
                    <th className="px-2 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {overrideRows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-2 py-3"><Badge variant="outline">{row.kind === "pre_ic" ? "Pre-IC score" : "Pre-screening"}</Badge></td>
                      <td className="px-2 py-3 font-medium">{row.businessName}</td>
                      <td className="px-2 py-3">{titleCase(row.before)} → {titleCase(row.after)}</td>
                      <td className="max-w-sm px-2 py-3">{row.reason}</td>
                      <td className="px-2 py-3">{row.adminName}</td>
                      <td className="px-2 py-3">{format(new Date(row.createdAt), "dd MMM yyyy HH:mm")}</td>
                    </tr>
                  ))}
                  {overrideRows.length === 0 && (
                    <tr><td colSpan={6} className="px-2 py-10 text-center text-muted-foreground">No override records found.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
