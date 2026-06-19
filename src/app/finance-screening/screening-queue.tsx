"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getOrCreatePreScreeningDraft,
  getPreScreeningQueue,
  type PreScreeningQueueItem,
} from "@/lib/actions/a2f-pre-screening";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowsClockwise,
  Buildings,
  Clock,
  MagnifyingGlass,
  ClipboardText,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  formatRescreenDate,
  canStartPreScreeningRescreen,
  isRescreenDateReached,
} from "@/lib/a2f-pre-screening-rescreen";

const OUTCOME_FILTER_OPTIONS = [
  { value: "all", label: "All outcomes" },
  { value: "not_screened", label: "Not screened" },
  { value: "draft", label: "Draft in progress" },
  { value: "pass", label: "Passed" },
  { value: "conditional", label: "Conditional" },
  { value: "stop", label: "Stopped" },
] as const;

const ASSIGNMENT_FILTER_OPTIONS = [
  { value: "all", label: "All assignments" },
  { value: "mine", label: "My drafts" },
  { value: "unassigned", label: "Unassigned" },
  { value: "locked", label: "With another reviewer" },
] as const;

function outcomeBadge(row: PreScreeningQueueItem) {
  if (row.latestStatus === "draft") return <Badge variant="secondary">Draft</Badge>;
  if (row.latestOutcome === "pass") return <Badge className="bg-emerald-600">Pass</Badge>;
  if (row.latestOutcome === "conditional") return <Badge className="bg-amber-500">Conditional</Badge>;
  if (row.latestOutcome === "stop") return <Badge variant="destructive">Stop</Badge>;
  return <Badge variant="outline">Not screened</Badge>;
}

function matchesOutcome(row: PreScreeningQueueItem, filter: string) {
  if (filter === "all") return true;
  if (filter === "not_screened") return !row.latestStatus;
  if (filter === "draft") return row.latestStatus === "draft";
  return row.latestOutcome === filter;
}

function matchesAssignment(row: PreScreeningQueueItem, filter: string) {
  if (filter === "all") return true;
  if (filter === "mine") return row.isMine;
  if (filter === "unassigned") return !row.assignedReviewerId && row.latestStatus === "draft";
  if (filter === "locked") return Boolean(row.assignedReviewerId) && !row.canOpen;
  return true;
}

function actionLabel(row: PreScreeningQueueItem) {
  if (!row.canOpen) return "Locked";
  if (canStartPreScreeningRescreen(row)) return "Re-screen";
  if (
    row.latestOutcome === "conditional" &&
    row.rescreenEligibleAt &&
    !isRescreenDateReached(row.rescreenEligibleAt)
  ) {
    const date = formatRescreenDate(row.rescreenEligibleAt);
    return date ? `From ${date}` : "Scheduled";
  }
  if (row.latestAttemptId) return "Open";
  return row.canClaim ? "Claim" : "Waiting";
}

function actionTitle(row: PreScreeningQueueItem) {
  if (!row.canOpen) return "Assigned to another reviewer";
  if (canStartPreScreeningRescreen(row)) return "Start a new re-screening assessment";
  if (row.latestAttemptId) return "Open the latest screening attempt";
  return row.canClaim ? "Claim and screen this enterprise" : "Awaiting an available reviewer";
}

const ACTION_HEAD =
  "sticky right-0 z-20 w-[5.75rem] bg-card pr-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.2)] sm:w-[6.5rem]";
const ACTION_CELL =
  "sticky right-0 z-10 bg-card pr-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.2)] group-hover:bg-muted/50";

export function ScreeningQueue({
  rows: initialRows,
  initialError,
}: {
  rows: PreScreeningQueueItem[];
  initialError?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const result = await getPreScreeningQueue();
    if (result.success && result.data) setRows(result.data);
    else toast.error(result.error ?? "Failed to load screening queue");
    setRefreshing(false);
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return rows.filter((row) => {
      const matchSearch =
        !term ||
        row.businessName.toLowerCase().includes(term) ||
        row.applicantName.toLowerCase().includes(term) ||
        String(row.applicationId).includes(term);
      return (
        matchSearch &&
        matchesOutcome(row, outcomeFilter) &&
        matchesAssignment(row, assignmentFilter)
      );
    });
  }, [rows, search, outcomeFilter, assignmentFilter]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((row) => !row.latestStatus).length,
      pass: rows.filter((row) => row.latestOutcome === "pass").length,
      conditional: rows.filter((row) => row.latestOutcome === "conditional").length,
      mine: rows.filter((row) => row.isMine).length,
    }),
    [rows]
  );

  const hasActiveFilters =
    Boolean(search) || outcomeFilter !== "all" || assignmentFilter !== "all";

  function startDraft(row: PreScreeningQueueItem) {
    setOpeningId(row.applicationId);
    startTransition(async () => {
      const result = await getOrCreatePreScreeningDraft(row.applicationId);
      setOpeningId(null);
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Could not start screening");
        return;
      }
      router.push(`/finance-screening/${result.data.attemptId}`);
      router.refresh();
    });
  }

  function open(row: PreScreeningQueueItem) {
    if (!row.canOpen || pending) return;
    if (canStartPreScreeningRescreen(row)) {
      startDraft(row);
      return;
    }
    if (row.latestAttemptId) {
      router.push(`/finance-screening/${row.latestAttemptId}`);
      return;
    }
    startDraft(row);
  }

  return (
    <div className="space-y-6">
      {initialError && rows.length === 0 && (
        <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          {initialError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            A2F pre-screening
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Screen submitted Foundation and Accelerator enterprises before DD and finance access
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refresh()}
          disabled={refreshing}
        >
          <ArrowsClockwise className={`mr-1.5 size-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
            Screening candidates
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{counts.total}</p>
          <p className="mt-1 text-xs text-slate-600">Ready for EDO/REDO screening</p>
        </div>
        <div className="rounded-xl border bg-muted/50 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Not screened
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{counts.pending}</p>
          <p className="mt-1 text-xs text-muted-foreground">Awaiting first assessment</p>
        </div>
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">Passed</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{counts.pass}</p>
          <p className="mt-1 text-xs text-slate-600">Ready for due diligence</p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-4">
          <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-amber-800">
            <Clock className="size-3.5" />
            Conditional
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
            {counts.conditional}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {counts.mine > 0 ? `${counts.mine} draft${counts.mine === 1 ? "" : "s"} assigned to you` : "May require re-screening"}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search enterprise, applicant, or application ID…"
                className="pl-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All outcomes" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All assignments" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setOutcomeFilter("all");
                  setAssignmentFilter("all");
                }}
              >
                <X className="mr-1 size-3.5" />
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Screening queue
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({filtered.length} of {rows.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <ClipboardText className="mx-auto mb-2 size-10 opacity-30" />
              {rows.length === 0
                ? "No eligible enterprises in the screening queue."
                : "No enterprises match your filters."}
            </div>
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[34%] min-w-[8rem] pl-6">Enterprise</TableHead>
                  <TableHead className="hidden w-[5.5rem] sm:table-cell">Track</TableHead>
                  <TableHead className="hidden w-[6.5rem] md:table-cell">Revenue</TableHead>
                  <TableHead className="hidden w-[4.5rem] lg:table-cell">DD</TableHead>
                  <TableHead className="hidden w-[6rem] xl:table-cell">Assigned</TableHead>
                  <TableHead className="w-[5.5rem]">Outcome</TableHead>
                  <TableHead className={ACTION_HEAD}>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const label = actionLabel(row);
                  const isOpening = openingId === row.applicationId;
                  const button = (
                    <Button
                      size="sm"
                      title={actionTitle(row)}
                      className="h-8 min-w-0 px-2.5 text-xs"
                      variant={
                        canStartPreScreeningRescreen(row)
                          ? "default"
                          : row.latestAttemptId && row.canOpen
                            ? "outline"
                            : "default"
                      }
                      disabled={!row.canOpen || pending || isOpening}
                      onClick={() => open(row)}
                    >
                      {isOpening ? "…" : label}
                    </Button>
                  );

                  return (
                    <TableRow key={row.applicationId} className="group">
                      <TableCell className="pl-6">
                        <div className="flex min-w-0 gap-2">
                          <Buildings className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                          <div className="min-w-0">
                            <p className="truncate font-medium" title={row.businessName}>
                              {row.businessName}
                            </p>
                            <p
                              className="truncate text-xs text-muted-foreground"
                              title={`${row.applicantName} · Application #${row.applicationId}`}
                            >
                              {row.applicantName} · #{row.applicationId}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden capitalize sm:table-cell">
                        {row.track ?? "Unset"}
                      </TableCell>
                      <TableCell className="hidden tabular-nums text-xs md:table-cell">
                        <span title={`KES ${row.annualRevenue.toLocaleString("en-KE")}`}>
                          {row.annualRevenue >= 1_000_000
                            ? `${(row.annualRevenue / 1_000_000).toFixed(1)}M`
                            : `${Math.round(row.annualRevenue / 1_000)}K`}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {row.ddScore !== null ? `${row.ddScore}%` : "—"}
                      </TableCell>
                      <TableCell className="hidden truncate text-sm xl:table-cell" title={row.assignedReviewerName ?? undefined}>
                        {row.assignedReviewerName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {outcomeBadge(row)}
                          {row.latestScore !== null && (
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {row.latestScore}/100
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={ACTION_CELL}>
                        {!row.canOpen && row.assignedReviewerName ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">{button}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Assigned to {row.assignedReviewerName}. Only they or an admin can
                              open this draft.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          button
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
