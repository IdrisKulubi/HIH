"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CdpEvidenceFile, CdpPlanFull, CdpPlanListItem } from "@/lib/actions/cdp";
import {
  addCdpSessionActionItem,
  approveCdpSupportSession,
  buildCdpCsvExport,
  convertCdpGapToActivity,
  createCdpActivity,
  createCdpKeyResult,
  createCdpObjective,
  createCdpSupportSession,
  createCdpWeeklyMilestone,
  deleteCdpActivity,
  deleteCdpKeyResult,
  deleteCdpObjective,
  deleteCdpSupportSession,
  deleteCdpWeeklyMilestone,
  dismissCdpGap,
  generateCdpFromFinalizedCna,
  getCdpPipelineCompletenessForPlan,
  importCdpSummariesFromLatestCna,
  rejectCdpSupportSession,
  saveCdpFocusSummaries,
  setCdpDiagnosticLocked,
  submitCdpEndline,
  updateCdpActivity,
  updateCdpPlan,
  updateCdpSessionActionItem,
  upsertCdpActivityProgress,
  type FinalizedCnaForCdp,
} from "@/lib/actions/cdp";
import {
  CDP_FOCUS_AREAS,
  CDP_FOCUS_CODES,
  priorityFromScore0to10,
  priorityLabel,
} from "@/lib/cdp/focus-areas";
import type { CdpFocusSummaryInput } from "@/lib/cdp/focus-areas";
import {
  computeCdpTopRiskFocus,
  sumKeyResultWeightsPercent,
  type PipelineCompleteness,
} from "@/lib/cdp/pipeline";
import { CDP_KR_WEIGHT_SUM_TOLERANCE } from "@/lib/cdp/constants";
import {
  krFinalScoreRatio,
  krWeightedScore,
  parseOutcomeMetric,
  sumObjectiveWeightedScores,
} from "@/lib/cdp/okr-scoring";
import {
  CDP_INTERVENTION_CATALOG,
  getInterventionByKey,
} from "@/lib/cdp/intervention-catalog";
import { expectedSessionType } from "@/lib/cdp/session-rules";
import { getDocumentViewerHref } from "@/lib/document-view-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CdpSessionEditSheet } from "./CdpSessionEditSheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { FileText, Loader2, Pencil, Trash2 } from "lucide-react";

const SCORE_OPTIONS = [0, 5, 10] as const;

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
const PROGRESS_STATUSES = ["not_started", "in_progress", "done", "blocked"] as const;

type EditableSummary = CdpFocusSummaryInput;
type CdpSessionEvidenceFile = CdpEvidenceFile;

const CDP_APPROVER_ROLES = ["admin", "oversight", "redo"] as const;

function cdpRatingForScore(score: number | null | undefined) {
  if (score === 0) {
    return {
      label: "Poor",
      className: "border-red-200 bg-red-50 text-red-800",
      description: "Needs urgent support",
    };
  }
  if (score === 5) {
    return {
      label: "Fair",
      className: "border-amber-200 bg-amber-50 text-amber-800",
      description: "Needs improvement",
    };
  }
  return {
    label: "Great",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    description: "Strength to maintain",
  };
}

function cnaRatingForLabel(label: "poor" | "fair" | "great") {
  if (label === "poor") return cdpRatingForScore(0);
  if (label === "fair") return cdpRatingForScore(5);
  return cdpRatingForScore(10);
}

function CdpWorkflowGuide({
  plan,
  pipeline,
}: {
  plan: CdpPlanFull;
  pipeline: PipelineCompleteness | null;
}) {
  const priorityAreas = plan.focusSummaries.filter(
    (row) => priorityFromScore0to10(row.score0to10) !== "low"
  ).length;
  const completedSessions = plan.supportSessions.filter(
    (session) => session.approvalStatus === "approved"
  ).length;
  const hasSessions = plan.supportSessions.length > 0;
  const hasActivities = plan.activities.length > 0;
  const steps = [
    {
      label: "1",
      title: "Review CNA findings",
      body: `${priorityAreas} priority area${priorityAreas === 1 ? "" : "s"} need attention. Use the color ratings to decide where support should start.`,
      status: priorityAreas > 0 ? "Ready" : "Review",
    },
    {
      label: "2",
      title: "Plan advisory sessions",
      body: hasSessions
        ? `${plan.supportSessions.length} session${plan.supportSessions.length === 1 ? "" : "s"} added. Keep planning from the CNA findings.`
        : "Create the first advisory session from a priority focus area.",
      status: hasSessions ? "Started" : "Next",
    },
    {
      label: "3",
      title: "Record session reports",
      body: completedSessions
        ? `${completedSessions} approved report${completedSessions === 1 ? "" : "s"} can feed the final CDP.`
        : "After each visit or advisory session, capture achievements, challenges, next steps, and follow-up date.",
      status: completedSessions ? "In review" : "After session",
    },
    {
      label: "4",
      title: "Generate CDP summary",
      body: hasActivities
        ? "Use the summary and approval checklist to confirm the plan is ready."
        : "The CDP summary should come after planned sessions and session reports are in place.",
      status: pipeline?.percentComplete === 100 ? "Complete" : "Pending",
    },
  ];

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">Start here</p>
          <h2 className="mt-1 text-lg font-semibold">Build the CDP from CNA findings and session reports</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            First review the CNA ratings, then plan advisory sessions. After each session, complete the report.
            The CDP summary is the final output from those approved session reports.
          </p>
        </div>
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Plan status:</span>{" "}
          <span className="font-medium capitalize">{plan.status}</span>
          {pipeline ? (
            <span className="ml-2 text-muted-foreground">({pipeline.percentComplete}% ready)</span>
          ) : null}
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <div key={step.label} className="rounded-md border bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue/10 text-sm font-semibold text-brand-blue">
                {step.label}
              </span>
              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{step.status}</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function normalizeScore(v: number): 0 | 5 | 10 {
  if (v === 0 || v === 5 || v === 10) return v;
  if (v <= 2) return 0;
  if (v <= 7) return 5;
  return 10;
}

function summaryRowsFromPlan(plan: CdpPlanFull): EditableSummary[] {
  return CDP_FOCUS_CODES.map((code) => {
    const s = plan.focusSummaries.find((f) => f.focusCode === code);
    return {
      focusCode: code,
      score0to10: normalizeScore(s?.score0to10 ?? 0),
      keyGaps: s?.keyGaps ?? "",
      recommendedIntervention: s?.recommendedIntervention ?? "",
      responsibleStaff: s?.responsibleStaff ?? "",
      targetDate: s?.targetDate ?? "",
    };
  });
}

export function CdpWorkspace({
  businessId,
  businessName,
  plans,
  initialPlan,
  hasCnaForImport,
  latestFinalizedCna,
  currentUserRole,
  currentUserId,
}: {
  businessId: number;
  businessName: string;
  plans: CdpPlanListItem[];
  initialPlan: CdpPlanFull | null;
  hasCnaForImport: boolean;
  latestFinalizedCna: FinalizedCnaForCdp | null;
  currentUserRole: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [summaryRows, setSummaryRows] = useState<EditableSummary[]>(() =>
    initialPlan ? summaryRowsFromPlan(initialPlan) : []
  );
  const [pipeline, setPipeline] = useState<PipelineCompleteness | null>(null);
  const planId = initialPlan?.id;

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    getCdpPipelineCompletenessForPlan(planId).then((res) => {
      if (!cancelled && res.success && res.data) setPipeline(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [planId, initialPlan]);

  const handleGenerateFromCna = () => {
    if (!latestFinalizedCna) return;
    start(async () => {
      const res = await generateCdpFromFinalizedCna({
        businessId,
        assessmentId: latestFinalizedCna.id,
      });
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Could not generate CDP");
        return;
      }
      toast.success("CDP generated from finalized CNA");
      router.push(`/admin/cdp/${businessId}?planId=${res.data.id}`);
    });
  };

  const handlePlanChange = (id: string) => {
    if (id === "") return;
    router.push(`/admin/cdp/${businessId}?planId=${id}`);
  };

  const handleSaveSummaries = () => {
    if (!planId) return;
    start(async () => {
      const res = await saveCdpFocusSummaries({
        planId,
        rows: summaryRows.map((r) => ({
          ...r,
          keyGaps: r.keyGaps || null,
          recommendedIntervention: r.recommendedIntervention || null,
          responsibleStaff: r.responsibleStaff || null,
          targetDate: r.targetDate || null,
        })),
      });
      if (!res.success) toast.error(res.error ?? "Save failed");
      else {
        toast.success("Diagnostic summary saved");
        router.refresh();
      }
    });
  };

  const handleImportCna = () => {
    if (!planId) return;
    start(async () => {
      const res = await importCdpSummariesFromLatestCna(planId);
      if (!res.success) toast.error(res.error ?? "Import failed");
      else {
        toast.success("Scores prefilled from latest CNA (adjust as needed)");
        router.refresh();
      }
    });
  };

  const handleExportCsv = () => {
    if (!planId) return;
    start(async () => {
      const res = await buildCdpCsvExport(planId);
      if (!res.success || res.data == null) {
        toast.error(res.error ?? "Export failed");
        return;
      }
      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cdp-plan-${planId}-${businessName.replace(/\s+/g, "-")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    });
  };

  const handleSetPlanStatus = (status: "draft" | "active" | "archived") => {
    if (!planId) return;
    start(async () => {
      const res = await updateCdpPlan({ planId, status });
      if (!res.success) toast.error(res.error ?? "Update failed");
      else {
        toast.success("Plan status updated");
        router.refresh();
      }
    });
  };

  if (!initialPlan) {
    return (
      <div className="max-w-3xl space-y-5 rounded-lg border bg-card p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">CDP setup</p>
          <h2 className="mt-2 text-lg font-semibold">Generate the CDP from the finalized CNA</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate the plan from the finalized CNA so scores, priority areas, gaps, and interventions are carried
          forward automatically for {businessName}.
        </p>
        {latestFinalizedCna ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-950">
              Finalized CNA #{latestFinalizedCna.id} is ready.
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              Locked {latestFinalizedCna.lockedAt ? new Date(latestFinalizedCna.lockedAt).toLocaleString() : "recently"}.
            </p>
            <Button type="button" className="mt-3" onClick={handleGenerateFromCna} disabled={pending}>
              {pending ? "Generating..." : "Generate CDP from CNA"}
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-5">
            <p className="text-sm font-medium text-slate-950">CNA must be finalized first.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete and lock the role-based CNA, then return here to generate the CDP automatically.
            </p>
            <Button asChild className="mt-4">
              <Link href={`/admin/cna/${businessId}`}>Open CNA for this business</Link>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CdpWorkflowGuide plan={initialPlan} pipeline={pipeline} />

      <details className="rounded-lg border bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold">Plan settings and admin controls</summary>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-2 min-w-[200px]">
          <Label>Active plan</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={String(planId)}
            onChange={(e) => handlePlanChange(e.target.value)}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} — {p.status} — {p.diagnosticDate}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleExportCsv} disabled={pending}>
            Export CSV
          </Button>
          {hasCnaForImport ? (
            <Button type="button" variant="secondary" size="sm" onClick={handleImportCna} disabled={pending}>
              Import scores from latest CNA
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => handleSetPlanStatus("draft")} disabled={pending}>
            Mark draft
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleSetPlanStatus("active")} disabled={pending}>
            Mark active
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => handleSetPlanStatus("archived")} disabled={pending}>
            Archive
          </Button>
        </div>
        <p className="text-xs text-muted-foreground w-full">
          Status: <strong>{initialPlan.status}</strong> · Diagnostic: {initialPlan.diagnosticDate}
          {initialPlan.cdpReviewDate ? ` · Review: ${initialPlan.cdpReviewDate}` : ""}
          {initialPlan.diagnosticLockedAt ? (
            <span className="ml-2 text-amber-800 font-medium">· Diagnostic locked</span>
          ) : null}
        </p>
        {(() => {
          const top = computeCdpTopRiskFocus(initialPlan.focusSummaries);
          if (!top) return null;
          return (
            <p className="text-xs w-full">
              <span className="text-muted-foreground">Top risk (lowest A–L score):</span>{" "}
              <span className="font-mono font-medium">{top.focusCode}</span> —{" "}
              {CDP_FOCUS_AREAS[top.focusCode].label} (score {top.score0to10})
            </p>
          );
        })()}
        <div className="flex flex-wrap gap-2 w-full">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!planId) return;
              start(async () => {
                const res = await setCdpDiagnosticLocked(planId, true);
                if (!res.success) toast.error(res.error ?? "Failed");
                else {
                  toast.success("Diagnostic locked");
                  router.refresh();
                }
              });
            }}
          >
            Lock diagnostic
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!planId) return;
              start(async () => {
                const res = await setCdpDiagnosticLocked(planId, false);
                if (!res.success) toast.error(res.error ?? "Failed");
                else {
                  toast.success("Diagnostic unlocked");
                  router.refresh();
                }
              });
            }}
          >
            Unlock diagnostic
          </Button>
        </div>
        <p className="text-xs text-muted-foreground w-full max-w-3xl">
          <strong>Mark active</strong> requires: scores 0 / 5 / 10 only; <strong>key gaps</strong> filled for every
          score of 0 or 5; every <strong>high</strong> and <strong>medium</strong> priority focus has an activity
          with responsible staff, intervention text, and a target date.
        </p>
      </div>
      </details>

      <Tabs defaultValue="guide" className="space-y-4">
        <TabsList className="grid h-auto w-full gap-2 rounded-xl border bg-card p-2 shadow-sm sm:grid-cols-2 xl:grid-cols-6">
          <TabsTrigger
            value="guide"
            className="h-auto justify-start rounded-lg px-3 py-3 text-left data-[state=active]:border-brand-blue/20 data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue"
          >
            <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">1</span>
            <span>
              <span className="block text-sm font-semibold">Guide</span>
              <span className="block text-xs font-normal text-muted-foreground">Start here</span>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="overview"
            className="h-auto justify-start rounded-lg px-3 py-3 text-left data-[state=active]:border-brand-blue/20 data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue"
          >
            <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">2</span>
            <span>
              <span className="block text-sm font-semibold">CNA Findings</span>
              <span className="block text-xs font-normal text-muted-foreground">Poor, Fair, Great</span>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="h-auto justify-start rounded-lg px-3 py-3 text-left data-[state=active]:border-brand-blue/20 data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue"
          >
            <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">3</span>
            <span>
              <span className="block text-sm font-semibold">Plan Sessions</span>
              <span className="block text-xs font-normal text-muted-foreground">Before visits</span>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="h-auto justify-start rounded-lg px-3 py-3 text-left data-[state=active]:border-brand-blue/20 data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue"
          >
            <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">4</span>
            <span>
              <span className="block text-sm font-semibold">Session Reports</span>
              <span className="block text-xs font-normal text-muted-foreground">After support</span>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="plan"
            className="h-auto justify-start rounded-lg px-3 py-3 text-left data-[state=active]:border-brand-blue/20 data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue"
          >
            <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">5</span>
            <span>
              <span className="block text-sm font-semibold">CDP Summary</span>
              <span className="block text-xs font-normal text-muted-foreground">Final output</span>
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="approval"
            className="h-auto justify-start rounded-lg px-3 py-3 text-left data-[state=active]:border-brand-blue/20 data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue"
          >
            <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">6</span>
            <span>
              <span className="block text-sm font-semibold">Approval</span>
              <span className="block text-xs font-normal text-muted-foreground">Lock when ready</span>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guide" className="space-y-4">
          <CdpPrioritySummary plan={initialPlan} />
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-base font-semibold">How to complete this CDP</h3>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-sm font-medium">Use the CNA as the reference</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review Poor, Fair, and Great ratings before deciding support topics. The CNA findings explain why the plan exists.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Plan sessions before writing the CDP</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add advisory sessions with focus area, topic, agenda, objective, date, type, and meeting link.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Report after each session</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Capture milestones, achievements, challenges, next steps, follow-up date, and observations. Approved reports become CDP evidence.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="legacy-gaps" className="hidden">
          <CdpGapBoardPanel plan={initialPlan} disabled={pending} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <CdpSummaryCards
            plan={initialPlan}
            rows={summaryRows}
            disabled={pending}
            onRowsChange={setSummaryRows}
            onSave={handleSaveSummaries}
          />
          <div className="hidden">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Focus</TableHead>
                  <TableHead className="w-28">Score (0 / 5 / 10)</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Key gaps</TableHead>
                  <TableHead>Recommended intervention</TableHead>
                  <TableHead>Responsible staff</TableHead>
                  <TableHead className="w-36">Target date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryRows.map((row, idx) => {
                  const pr = priorityFromScore0to10(row.score0to10);
                  return (
                    <TableRow key={row.focusCode}>
                      <TableCell className="font-mono font-medium">{row.focusCode}</TableCell>
                      <TableCell className="text-sm max-w-[200px]">
                        {CDP_FOCUS_AREAS[row.focusCode].label}
                      </TableCell>
                      <TableCell>
                        <select
                          className="h-8 w-[4.5rem] rounded-md border border-input bg-background px-1 text-sm"
                          value={row.score0to10}
                          onChange={(e) => {
                            const v = Number(e.target.value) as 0 | 5 | 10;
                            setSummaryRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], score0to10: v };
                              return next;
                            });
                          }}
                        >
                          {SCORE_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px]">
                        {priorityLabel(pr)}
                      </TableCell>
                      <TableCell className="min-w-[160px] p-1">
                        <Textarea
                          rows={2}
                          value={row.keyGaps ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSummaryRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], keyGaps: v };
                              return next;
                            });
                          }}
                          className="text-xs"
                        />
                      </TableCell>
                      <TableCell className="min-w-[160px] p-1">
                        <Textarea
                          rows={2}
                          value={row.recommendedIntervention ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSummaryRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], recommendedIntervention: v };
                              return next;
                            });
                          }}
                          className="text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          value={row.responsibleStaff ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSummaryRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], responsibleStaff: v };
                              return next;
                            });
                          }}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input
                          type="date"
                          value={row.targetDate ? String(row.targetDate).slice(0, 10) : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSummaryRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], targetDate: v };
                              return next;
                            });
                          }}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Button type="button" onClick={handleSaveSummaries} disabled={pending}>
            {pending ? "Saving…" : "Save diagnostic summary"}
          </Button>
          </div>
        </TabsContent>

        <TabsContent value="plan">
          <CdpSessionSummaryTable plan={initialPlan} />
        </TabsContent>

        <TabsContent value="legacy-okr" className="hidden">
          <CdpOkrPanel plan={initialPlan} disabled={pending} />
        </TabsContent>

        <TabsContent value="legacy-workplan" className="hidden">
          <CdpWorkplanPanel plan={initialPlan} disabled={pending} />
        </TabsContent>

        <TabsContent value="sessions">
          <CdpSessionsPanel
            plan={initialPlan}
            businessId={businessId}
            disabled={pending}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            mode="planning"
          />
        </TabsContent>

        <TabsContent value="reports">
          <CdpSessionsPanel
            plan={initialPlan}
            businessId={businessId}
            disabled={pending}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            mode="reporting"
          />
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <CdpApprovalReadinessPanel plan={initialPlan} pipeline={pipeline} />
          <CdpPipelinePanel pipeline={pipeline} onRefresh={() => router.refresh()} />
          <CdpEndlinePanel plan={initialPlan} disabled={pending} />
        </TabsContent>

        <TabsContent value="legacy-progress" className="hidden">
          <CdpProgressPanel plan={initialPlan} disabled={pending} />
        </TabsContent>

        <TabsContent value="legacy-pipeline" className="hidden">
          <CdpPipelinePanel pipeline={pipeline} onRefresh={() => router.refresh()} />
        </TabsContent>

        <TabsContent value="legacy-endline" className="hidden">
          <CdpEndlinePanel plan={initialPlan} disabled={pending} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function dateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function CdpSummaryCards({
  plan,
  rows,
  disabled,
  onRowsChange,
  onSave,
}: {
  plan: CdpPlanFull;
  rows: EditableSummary[];
  disabled: boolean;
  onRowsChange: (updater: (prev: EditableSummary[]) => EditableSummary[]) => void;
  onSave: () => void;
}) {
  const updateRow = (idx: number, patch: Partial<EditableSummary>) => {
    onRowsChange((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const priorityRows = rows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => priorityFromScore0to10(row.score0to10) !== "low");
  const visibleRows = rows.map((row, idx) => ({ row, idx }));
  const questionResponses = plan.linkedCnaAssessment?.responses ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">CNA Findings</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Review the finalized question ratings before planning advisory sessions. EDOs decide the practical
              topics using their professional judgement.
            </p>
          </div>
          <Button type="button" onClick={onSave} disabled={disabled}>
            {disabled ? "Saving..." : "Save summary"}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border px-2 py-1">Poor/Fair areas: {priorityRows.length}</span>
              <span className="rounded-full border px-2 py-1">All focus areas: {rows.length}</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleRows.map(({ row, idx }) => {
          const priority = priorityFromScore0to10(row.score0to10);
          const rating = cdpRatingForScore(row.score0to10);
          const tone =
            priority === "high"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/25 dark:text-red-300"
              : priority === "medium"
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-300";
          const responsesForArea = questionResponses.filter(
            (response) => response.question.sectionCode === row.focusCode
          ).sort((a, b) => a.question.sortOrder - b.question.sortOrder);

          return (
            <section key={row.focusCode} className="rounded-md border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                      {row.focusCode}
                    </span>
                    <h4 className="text-sm font-semibold">{CDP_FOCUS_AREAS[row.focusCode].label}</h4>
                  </div>
                  <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs ${tone}`}>
                    {priorityLabel(priority)}
                  </span>
                  <span className={`ml-2 mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-medium ${rating.className}`}>
                    {rating.label}: {rating.description}
                  </span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CNA rating score</Label>
                  <select
                    className="h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"
                    value={row.score0to10}
                    onChange={(e) => updateRow(idx, { score0to10: Number(e.target.value) as 0 | 5 | 10 })}
                  >
                    {SCORE_OPTIONS.map((score) => (
                      <option key={score} value={score}>
                        {score}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className="space-y-2 lg:col-span-2">
                  <Label className="text-xs">Survey questions and ratings</Label>
                  {responsesForArea.length > 0 ? (
                    <div className="divide-y rounded-md border">
                      {responsesForArea.map((response) => {
                        const responseRating = cnaRatingForLabel(response.ratingLabel);
                        return (
                          <div key={response.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                            <p className="text-sm leading-relaxed">{response.question.questionText}</p>
                            <span className={`w-fit shrink-0 rounded-full border px-2 py-1 text-xs font-semibold uppercase ${responseRating.className}`}>
                              {responseRating.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      Question-level responses unavailable. Aggregate CNA rating: {rating.label}.
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Responsible staff</Label>
                  <Input
                    value={row.responsibleStaff ?? ""}
                    onChange={(e) => updateRow(idx, { responsibleStaff: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Target date</Label>
                  <Input
                    type="date"
                    value={row.targetDate ? String(row.targetDate).slice(0, 10) : ""}
                    onChange={(e) => updateRow(idx, { targetDate: e.target.value })}
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CdpGapBoardPanel({ plan, disabled }: { plan: CdpPlanFull; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const gaps = plan.gapItems ?? [];
  const openCount = gaps.filter((gap) => gap.status === "open").length;
  const convertedCount = gaps.filter((gap) => gap.status === "converted").length;
  const dismissedCount = gaps.filter((gap) => gap.status === "dismissed").length;

  const convert = (formData: FormData) => {
    start(async () => {
      const res = await convertCdpGapToActivity({
        gapId: Number(formData.get("gapId")),
        interventionKey: String(formData.get("interventionKey") ?? "") || null,
        targetDate: String(formData.get("targetDate") ?? "") || null,
        responsibleStaff: String(formData.get("responsibleStaff") ?? "") || null,
      });
      if (!res.success) toast.error(res.error ?? "Failed");
      else {
        toast.success("Gap converted to activity");
        router.refresh();
      }
    });
  };

  const dismiss = (formData: FormData) => {
    start(async () => {
      const res = await dismissCdpGap({
        gapId: Number(formData.get("gapId")),
        dismissalReason: String(formData.get("dismissalReason") ?? ""),
      });
      if (!res.success) toast.error(res.error ?? "Failed");
      else {
        toast.success("Gap dismissed");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-4">
        <h3 className="text-sm font-medium">CNA Gap Board</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Poor and Fair CNA responses are converted into CDP interventions here. Activation requires every high and
          medium gap to be converted or dismissed with a reason.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded border px-2 py-1">Open: {openCount}</span>
          <span className="rounded border px-2 py-1">Converted: {convertedCount}</span>
          <span className="rounded border px-2 py-1">Dismissed: {dismissedCount}</span>
        </div>
      </div>

      {gaps.length === 0 ? (
        <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
          No Poor/Fair CNA gaps were generated for this plan.
        </div>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap) => {
            const selected = getInterventionByKey(gap.selectedInterventionKey);
            return (
              <div key={gap.id} className="rounded-md border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="font-mono font-medium">{gap.focusCode}</span>
                      <span>{gap.focusName}</span>
                      <span className={gap.priority === "high" ? "text-red-700" : "text-amber-700"}>
                        {gap.priority}
                      </span>
                      <span className="capitalize">{gap.ratingLabel}</span>
                      <span className="capitalize">{gap.reviewerRole.replace(/_/g, " ")}</span>
                      <span className="capitalize">Status: {gap.status}</span>
                    </div>
                    <p className="text-sm font-medium">{gap.questionText}</p>
                    {gap.reviewerComment ? (
                      <p className="text-xs text-muted-foreground">Reviewer note: {gap.reviewerComment}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Recommended: {selected ? `${selected.trainingSection} (${selected.outputDocuments})` : gap.recommendedIntervention ?? "Select an intervention"}
                    </p>
                    {gap.dismissalReason ? (
                      <p className="text-xs text-muted-foreground">Dismissed reason: {gap.dismissalReason}</p>
                    ) : null}
                  </div>
                </div>

                {gap.status === "open" ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
                    <form
                      className="grid gap-2 sm:grid-cols-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        convert(new FormData(e.currentTarget));
                      }}
                    >
                      <input type="hidden" name="gapId" value={gap.id} />
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Intervention</Label>
                        <select
                          name="interventionKey"
                          defaultValue={gap.selectedInterventionKey ?? ""}
                          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                        >
                          {CDP_INTERVENTION_CATALOG.map((entry) => (
                            <option key={entry.key} value={entry.key}>
                              {entry.week ? `Week ${entry.week}: ` : ""}
                              {entry.trainingSection}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label>Target date</Label>
                        <Input name="targetDate" type="date" required />
                      </div>
                      <div className="space-y-1">
                        <Label>Responsible staff</Label>
                        <Input name="responsibleStaff" required />
                      </div>
                      <Button type="submit" size="sm" disabled={disabled || pending} className="sm:col-span-2">
                        Convert to activity
                      </Button>
                    </form>

                    <form
                      className="space-y-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        dismiss(new FormData(e.currentTarget));
                      }}
                    >
                      <input type="hidden" name="gapId" value={gap.id} />
                      <Label>Dismiss reason</Label>
                      <Textarea name="dismissalReason" rows={3} required />
                      <Button type="submit" size="sm" variant="outline" disabled={disabled || pending}>
                        Dismiss gap
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CdpPrioritySummary({ plan }: { plan: CdpPlanFull }) {
  const prioritySummaries = plan.focusSummaries.filter(
    (row) => priorityFromScore0to10(row.score0to10) !== "low"
  );
  const openGaps = plan.gapItems.filter((gap) => gap.status === "open").length;
  const incompleteActivities = plan.activities.filter(
    (activity) =>
      !String(activity.intervention ?? "").trim() ||
      !String(activity.responsibleStaff ?? "").trim() ||
      !activity.targetDate
  ).length;
  const missingOutcomes = plan.activities.filter(
    (activity) => !activity.progressReviews.some((review) => review.outcomeAchieved === true)
  ).length;
  const pendingSessions = plan.supportSessions.filter(
    (session) => session.approvalStatus !== "approved"
  ).length;

  return (
    <div className="mb-4 grid gap-3 md:grid-cols-4">
      <div className="rounded-md border bg-card p-4">
        <p className="text-xs text-muted-foreground">Priority areas</p>
        <p className="mt-1 text-2xl font-semibold">{prioritySummaries.length}</p>
      </div>
      <div className="rounded-md border bg-card p-4">
        <p className="text-xs text-muted-foreground">Open CNA gaps</p>
        <p className="mt-1 text-2xl font-semibold">{openGaps}</p>
      </div>
      <div className="rounded-md border bg-card p-4">
        <p className="text-xs text-muted-foreground">Incomplete activities</p>
        <p className="mt-1 text-2xl font-semibold">{incompleteActivities}</p>
      </div>
      <div className="rounded-md border bg-card p-4">
        <p className="text-xs text-muted-foreground">Pending sessions</p>
        <p className="mt-1 text-2xl font-semibold">{pendingSessions}</p>
      </div>
      {missingOutcomes > 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 md:col-span-4 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          {missingOutcomes} activity rows still need an outcome achieved marker.
        </p>
      ) : null}
    </div>
  );
}

function sessionHasEvidence(session: CdpPlanFull["supportSessions"][number]) {
  const files = ((session.evidenceFiles as CdpSessionEvidenceFile[] | null) ?? []);
  return files.length > 0 || (session.evidenceUrls ?? []).length > 0 || Boolean(session.evidenceNotes?.trim());
}

function CdpSessionSummaryTable({ plan }: { plan: CdpPlanFull }) {
  const statusClassName = (status: CdpPlanFull["supportSessions"][number]["approvalStatus"]) => {
    if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (status === "rejected") return "border-red-200 bg-red-50 text-red-800";
    return "border-amber-200 bg-amber-50 text-amber-800";
  };

  return (
    <section className="overflow-hidden rounded-md border bg-card">
      <div className="overflow-x-auto">
        <Table className="min-w-[1120px]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Code</TableHead>
              <TableHead>Focus Area</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Subtopic</TableHead>
              <TableHead>BDS Date &amp; Time</TableHead>
              <TableHead>Session Type</TableHead>
              <TableHead>Meeting Link (if virtual)</TableHead>
              <TableHead>BDS Objective</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plan.supportSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">
                  No sessions have been planned yet.
                </TableCell>
              </TableRow>
            ) : (
              plan.supportSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-mono font-semibold">{session.focusCode}</TableCell>
                  <TableCell>{CDP_FOCUS_AREAS[session.focusCode].label}</TableCell>
                  <TableCell className="max-w-52 whitespace-normal">{session.agenda || "—"}</TableCell>
                  <TableCell className="max-w-52 whitespace-normal">{session.subtopic || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {session.sessionDate ? new Date(session.sessionDate).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="capitalize">{session.sessionType}</TableCell>
                  <TableCell className="max-w-56 whitespace-normal">
                    {session.sessionType === "virtual" && session.meetingLink ? (
                      <a href={session.meetingLink} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline">
                        {session.meetingLink}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-64 whitespace-normal">{session.supportType || "—"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium capitalize ${statusClassName(session.approvalStatus)}`}>
                      {session.approvalStatus}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function CdpApprovalReadinessPanel({
  plan,
  pipeline,
}: {
  plan: CdpPlanFull;
  pipeline: PipelineCompleteness | null;
}) {
  const approvedSessions = plan.supportSessions.filter((session) => session.approvalStatus === "approved").length;
  const evidenceSessions = plan.supportSessions.filter(sessionHasEvidence).length;
  const checks = [
    {
      label: "CNA findings reviewed",
      ready: plan.focusSummaries.length > 0 && (pipeline?.diagnosticScoresValid ?? false),
      helper: "All A-L CNA ratings should be saved as Poor, Fair, or Great.",
    },
    {
      label: "Advisory sessions planned",
      ready: plan.supportSessions.length > 0,
      helper: "Create session rows from the CNA focus areas before approval.",
    },
    {
      label: "Session reports approved",
      ready: approvedSessions > 0,
      helper: "Approve completed reports after evidence and outcomes are entered.",
    },
    {
      label: "Evidence attached",
      ready: evidenceSessions > 0,
      helper: "Use files, URLs, or report notes as the audit trail.",
    },
    {
      label: "CDP activities ready",
      ready: plan.activities.length > 0 && plan.activities.every((activity) => activity.targetDate && activity.responsibleStaff),
      helper: "Each activity needs a responsible staff member and target date.",
    },
    {
      label: "Endline submitted",
      ready: Boolean(plan.endlineResponse),
      helper: "Capture endline values before final close-out.",
    },
  ];
  const readyCount = checks.filter((check) => check.ready).length;

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h3 className="text-base font-semibold">Approval readiness</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Review the human workflow before marking the CDP as complete. Approved session logs should be treated as
            locked evidence for the final plan.
          </p>
        </div>
        <span className="rounded-full border px-3 py-1 text-sm font-medium">
          {readyCount} of {checks.length} ready
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => (
          <div key={check.label} className="rounded-md border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{check.label}</p>
              <span
                className={
                  check.ready
                    ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
                    : "rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800"
                }
              >
                {check.ready ? "Ready" : "Needs work"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{check.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CdpOkrPanel({ plan, disabled }: { plan: CdpPlanFull; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground max-w-3xl">
        To mark the plan <strong>active</strong>, each objective that has key results must have weights totaling{" "}
        <strong>100%</strong>. Weighted score uses <code className="text-xs">(achieved ÷ target) × (weight ÷ 100)</code>{" "}
        when target and achieved parse as numbers (e.g. <code className="text-xs">100</code> and{" "}
        <code className="text-xs">75</code>).
      </p>
      <form
        className="flex flex-wrap items-end gap-2 rounded-md border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const res = await createCdpObjective({
              planId: plan.id,
              title: String(fd.get("objTitle") ?? ""),
            });
            if (!res.success) toast.error(res.error ?? "Failed");
            else {
              toast.success("Objective added");
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label htmlFor="objTitle">New objective</Label>
          <Input id="objTitle" name="objTitle" required placeholder="e.g. Improve market reach" />
        </div>
        <Button type="submit" disabled={disabled || pending}>
          Add objective
        </Button>
      </form>

      {plan.objectives.map((obj) => {
        const krRows = obj.keyResults.map((k) => ({ weightPercent: k.weightPercent }));
        const weightSum =
          obj.keyResults.length > 0 ? sumKeyResultWeightsPercent(krRows) : 0;
        const weightOk =
          obj.keyResults.length === 0 || Math.abs(weightSum - 100) <= CDP_KR_WEIGHT_SUM_TOLERANCE;
        const weightedTotal = sumObjectiveWeightedScores(obj.keyResults);

        return (
          <div key={obj.id} className="rounded-md border p-4 space-y-3">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="font-medium text-sm">{obj.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Weights sum:{" "}
                  <span className={weightOk ? "text-emerald-800" : "text-destructive"}>
                    {weightSum.toFixed(2)}%
                  </span>{" "}
                  {obj.keyResults.length > 0 ? (weightOk ? "(OK for activation)" : "(must be 100%)") : null}
                </p>
                {weightedTotal != null ? (
                  <p className="text-xs text-muted-foreground">
                    Σ weighted score (numeric KRs):{" "}
                    <span className="font-mono text-foreground">{weightedTotal.toFixed(4)}</span>
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={disabled || pending}
                onClick={() => {
                  if (!confirm("Delete this objective and all its key results?")) return;
                  start(async () => {
                    const res = await deleteCdpObjective(obj.id);
                    if (!res.success) toast.error(res.error ?? "Failed");
                    else {
                      toast.success("Deleted");
                      router.refresh();
                    }
                  });
                }}
              >
                Delete objective
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key result</TableHead>
                    <TableHead className="w-20">Weight %</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Achieved</TableHead>
                    <TableHead className="w-24">Final ratio</TableHead>
                    <TableHead className="w-28">Weighted</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obj.keyResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground text-sm">
                        No key results yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    obj.keyResults.map((kr) => {
                      const w = parseFloat(String(kr.weightPercent ?? "0"));
                      const targetN = parseOutcomeMetric(kr.targetOutcome);
                      const achievedN = parseOutcomeMetric(kr.achievedOutcome);
                      const ratio = krFinalScoreRatio(achievedN, targetN);
                      const weighted = krWeightedScore(ratio, w);
                      return (
                        <TableRow key={kr.id}>
                          <TableCell className="text-sm">{kr.title}</TableCell>
                          <TableCell className="text-xs">{kr.weightPercent}</TableCell>
                          <TableCell className="text-xs max-w-[140px] truncate" title={kr.targetOutcome ?? ""}>
                            {kr.targetOutcome ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs max-w-[140px] truncate" title={kr.achievedOutcome ?? ""}>
                            {kr.achievedOutcome ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {ratio != null ? ratio.toFixed(4) : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {weighted != null ? weighted.toFixed(4) : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              disabled={disabled || pending}
                              onClick={() => {
                                start(async () => {
                                  const res = await deleteCdpKeyResult(kr.id);
                                  if (!res.success) toast.error(res.error ?? "Failed");
                                  else router.refresh();
                                });
                              }}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <form
              className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6 items-end border-t pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                start(async () => {
                  const res = await createCdpKeyResult({
                    objectiveId: obj.id,
                    title: String(fd.get("krTitle") ?? ""),
                    targetOutcome: String(fd.get("krTarget") ?? "") || null,
                    achievedOutcome: String(fd.get("krAchieved") ?? "") || null,
                    weightPercent: Number(fd.get("krWeight")),
                    dueDate: String(fd.get("krDue") ?? "") || null,
                  });
                  if (!res.success) toast.error(res.error ?? "Failed");
                  else {
                    toast.success("Key result added");
                    (e.target as HTMLFormElement).reset();
                    router.refresh();
                  }
                });
              }}
            >
              <input type="hidden" name="objectiveId" value={obj.id} />
              <div className="space-y-1 sm:col-span-2">
                <Label>Key result title</Label>
                <Input name="krTitle" required placeholder="Measurable outcome" />
              </div>
              <div className="space-y-1">
                <Label>Weight %</Label>
                <Input name="krWeight" type="number" step="0.01" min={0} max={100} required />
              </div>
              <div className="space-y-1">
                <Label>Due date</Label>
                <Input name="krDue" type="date" />
              </div>
              <div className="space-y-1 sm:col-span-3 lg:col-span-3">
                <Label>Target (number or text)</Label>
                <Input name="krTarget" placeholder="e.g. 100 or Increase sales 15%" />
              </div>
              <div className="space-y-1 sm:col-span-3 lg:col-span-3">
                <Label>Achieved (optional, number)</Label>
                <Input name="krAchieved" placeholder="e.g. 75" />
              </div>
              <Button type="submit" size="sm" disabled={disabled || pending} className="sm:col-span-2">
                Add key result
              </Button>
            </form>
          </div>
        );
      })}
    </div>
  );
}

function CdpWorkplanPanel({ plan, disabled }: { plan: CdpPlanFull; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const krOptions = plan.objectives.flatMap((o) =>
    o.keyResults.map((kr) => ({ id: kr.id, label: `${o.title.slice(0, 24)}… — ${kr.title.slice(0, 32)}` }))
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Weekly milestones (0–100% progress).</p>
      <form
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 rounded-md border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const krRaw = String(fd.get("mKrId") ?? "");
            const res = await createCdpWeeklyMilestone({
              planId: plan.id,
              weekIndex: fd.get("mWeekIdx") ? Number(fd.get("mWeekIdx")) : null,
              weekLabel: String(fd.get("mWeekLabel") ?? "") || null,
              actionText: String(fd.get("mAction") ?? ""),
              dueDate: String(fd.get("mDue") ?? "") || null,
              progressPercent: fd.get("mProg") ? Number(fd.get("mProg")) : 0,
              keyResultId: krRaw ? Number(krRaw) : null,
            });
            if (!res.success) toast.error(res.error ?? "Failed");
            else {
              toast.success("Milestone added");
              (e.target as HTMLFormElement).reset();
              router.refresh();
            }
          });
        }}
      >
        <div className="space-y-1">
          <Label>Week # (optional)</Label>
          <Input name="mWeekIdx" type="number" min={1} max={104} />
        </div>
        <div className="space-y-1">
          <Label>Week label</Label>
          <Input name="mWeekLabel" placeholder="Week 3" />
        </div>
        <div className="space-y-1">
          <Label>Progress %</Label>
          <Input name="mProg" type="number" min={0} max={100} defaultValue={0} />
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-3">
          <Label>Action</Label>
          <Input name="mAction" required placeholder="Concrete action for the week" />
        </div>
        <div className="space-y-1">
          <Label>Due date</Label>
          <Input name="mDue" type="date" />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label>Link to key result (optional)</Label>
          <select name="mKrId" className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="">—</option>
            {krOptions.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={disabled || pending}>
          Add milestone
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Week</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.weeklyMilestones.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-sm">
                No milestones yet.
              </TableCell>
            </TableRow>
          ) : (
            plan.weeklyMilestones.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-xs whitespace-nowrap">
                  {m.weekIndex != null ? `#${m.weekIndex}` : ""} {m.weekLabel ?? ""}
                </TableCell>
                <TableCell className="text-sm max-w-md">{m.actionText}</TableCell>
                <TableCell className="text-xs">{m.progressPercent}%</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={disabled || pending}
                    onClick={() => {
                      start(async () => {
                        const res = await deleteCdpWeeklyMilestone(m.id);
                        if (!res.success) toast.error(res.error ?? "Failed");
                        else router.refresh();
                      });
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function CdpPipelinePanel({
  pipeline,
  onRefresh,
}: {
  pipeline: PipelineCompleteness | null;
  onRefresh: () => void;
}) {
  const [, start] = useTransition();
  return (
    <div className="space-y-3 max-w-xl">
      <p className="text-sm text-muted-foreground">
        Definition-of-done checklist. Session completion counts if you log at least six support sessions{" "}
        <em>or</em> all thirteen bootcamp weeks.
      </p>
      <Button type="button" size="sm" variant="outline" onClick={() => start(onRefresh)}>
        Refresh after edits
      </Button>
      {!pipeline ? (
        <p className="text-sm text-muted-foreground">Loading status…</p>
      ) : (
        <ul className="text-sm space-y-2 list-disc pl-5">
          <li>Diagnostic uses only 0 / 5 / 10 scores: {pipeline.diagnosticScoresValid ? "Yes" : "No"}</li>
          <li>Interventions for high + medium gaps: {pipeline.interventionsForPriorityGaps ? "Yes" : "No"}</li>
          <li>Each objective: OKR weights total 100%: {pipeline.okrsWeightedTo100 ? "Yes" : "No"}</li>
          <li>Sessions or bootcamp weeks: {pipeline.sessionsOrBootcampComplete ? "Yes" : "No"}</li>
          <li>Outcomes recorded for priority areas: {pipeline.outcomesForPriorityGaps ? "Yes" : "No"}</li>
          <li>Endline submitted: {pipeline.endlineSubmitted ? "Yes" : "No"}</li>
          <li className="list-none pl-0 pt-2 font-medium">Approximate completion: {pipeline.percentComplete}%</li>
        </ul>
      )}
    </div>
  );
}

function CdpEndlinePanel({ plan, disabled }: { plan: CdpPlanFull; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const existing = plan.endlineResponse;

  return (
    <div className="space-y-4 max-w-xl">
      <p className="text-sm text-muted-foreground">
        Capture end-of-program metrics. Values are stored with the plan and used for baseline vs. endline deltas
        where KYC baselines exist (<code className="text-xs">endlineRevenue</code>,{" "}
        <code className="text-xs">endlineEmployeeCount</code>).
      </p>
      {existing ? (
        <p className="text-xs text-muted-foreground">
          Last submitted: {existing.submittedAt ? new Date(existing.submittedAt).toLocaleString() : "—"}
        </p>
      ) : null}
      <form
        className="space-y-3 rounded-md border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          start(async () => {
            const responses: Record<string, unknown> = {
              endlineRevenue: fd.get("endlineRevenue") ? Number(fd.get("endlineRevenue")) : null,
              endlineEmployeeCount: fd.get("endlineEmployeeCount")
                ? Number(fd.get("endlineEmployeeCount"))
                : null,
              commercializationScale: String(fd.get("commercializationScale") ?? "").trim() || null,
              notes: String(fd.get("endlineNotes") ?? "").trim() || null,
            };
            const res = await submitCdpEndline({ planId: plan.id, responses });
            if (!res.success) toast.error(res.error ?? "Failed");
            else {
              toast.success("Endline saved");
              router.refresh();
            }
          });
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="endlineRevenue">Endline revenue (number)</Label>
          <Input
            id="endlineRevenue"
            name="endlineRevenue"
            type="number"
            step="0.01"
            min={0}
            defaultValue={
              existing?.responses && typeof (existing.responses as { endlineRevenue?: number }).endlineRevenue === "number"
                ? String((existing.responses as { endlineRevenue?: number }).endlineRevenue)
                : ""
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endlineEmployeeCount">Endline employee count</Label>
          <Input
            id="endlineEmployeeCount"
            name="endlineEmployeeCount"
            type="number"
            min={0}
            defaultValue={
              existing?.responses &&
              typeof (existing.responses as { endlineEmployeeCount?: number }).endlineEmployeeCount === "number"
                ? String((existing.responses as { endlineEmployeeCount?: number }).endlineEmployeeCount)
                : ""
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="commercializationScale">Commercialization scale (text)</Label>
          <Input
            id="commercializationScale"
            name="commercializationScale"
            defaultValue={
              existing?.responses
                ? String((existing.responses as { commercializationScale?: string }).commercializationScale ?? "")
                : ""
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endlineNotes">Notes</Label>
          <Textarea
            id="endlineNotes"
            name="endlineNotes"
            rows={3}
            defaultValue={
              existing?.responses ? String((existing.responses as { notes?: string }).notes ?? "") : ""
            }
          />
        </div>
        <Button type="submit" disabled={disabled || pending}>
          {pending ? "Saving…" : "Save endline"}
        </Button>
      </form>
    </div>
  );
}

function CdpActivitiesPanel({
  plan,
  businessId,
  disabled,
}: {
  plan: CdpPlanFull;
  businessId: number;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const activityFocusOptions = CDP_FOCUS_CODES;
  const focusGroups = activityFocusOptions.map((code) => ({
    code,
    sessions: plan.supportSessions.filter((session) => session.focusCode === code),
  }));

  const submitAdd = (formData: FormData) => {
    start(async () => {
      const res = await createCdpActivity({
        planId: plan.id,
        focusCode: formData.get("focusCode") as (typeof CDP_FOCUS_CODES)[number],
        gapChallenge: String(formData.get("gapChallenge") ?? ""),
        intervention: String(formData.get("intervention") ?? ""),
        supportType: String(formData.get("supportType") ?? ""),
        deliveryMethod: String(formData.get("deliveryMethod") ?? ""),
        responsibleStaff: String(formData.get("responsibleStaff") ?? ""),
        targetDate: String(formData.get("targetDate") ?? "") || null,
      });
      if (!res.success) toast.error(res.error ?? "Failed");
      else {
        toast.success("Activity added");
        setShowAdd(false);
        router.refresh();
      }
    });
  };

  const remove = (id: number) => {
    if (!confirm("Delete this activity?")) return;
    start(async () => {
      const res = await deleteCdpActivity(id);
      if (!res.success) toast.error(res.error ?? "Failed");
      else {
        toast.success("Deleted");
        router.refresh();
      }
    });
  };

  const submitEdit = (activityId: number, formData: FormData) => {
    start(async () => {
      const res = await updateCdpActivity({
        activityId,
        focusCode: formData.get("focusCode") as (typeof CDP_FOCUS_CODES)[number],
        gapChallenge: String(formData.get("gapChallenge") ?? ""),
        intervention: String(formData.get("intervention") ?? ""),
        supportType: String(formData.get("supportType") ?? ""),
        deliveryMethod: String(formData.get("deliveryMethod") ?? ""),
        responsibleStaff: String(formData.get("responsibleStaff") ?? ""),
        targetDate: String(formData.get("targetDate") ?? "") || null,
      });
      if (!res.success) toast.error(res.error ?? "Failed");
      else {
        toast.success("Activity updated");
        setEditingActivityId(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <p className="text-sm text-muted-foreground">Detailed capacity-building activities by focus area.</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => setShowAdd((s) => !s)} disabled={disabled || pending}>
          {showAdd ? "Close" : "Add activity"}
        </Button>
      </div>
      {showAdd ? (
        <form
          className="grid gap-3 rounded-md border p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitAdd(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1">
            <Label>Focus code</Label>
            <select name="focusCode" className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" required>
              {activityFocusOptions.map((c) => (
                <option key={c} value={c}>
                  {c} — {CDP_FOCUS_AREAS[c].label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="targetDate">Target date</Label>
            <Input id="targetDate" name="targetDate" type="date" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="gapChallenge">Gap / challenge</Label>
            <Textarea id="gapChallenge" name="gapChallenge" rows={2} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="intervention">Capacity dev. activity / intervention</Label>
            <Textarea id="intervention" name="intervention" rows={2} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="supportType">Type of support</Label>
            <Input id="supportType" name="supportType" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="deliveryMethod">Delivery method</Label>
            <Input id="deliveryMethod" name="deliveryMethod" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="responsibleStaff">Responsible staff</Label>
            <Input id="responsibleStaff" name="responsibleStaff" />
          </div>
          <Button type="submit" disabled={pending}>
            Save activity
          </Button>
        </form>
      ) : null}

      <div className="hidden">
        {focusGroups.map(({ code, sessions }) => (
          <section key={code} className="rounded-md border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                    {code}
                  </span>
                  <h3 className="text-sm font-semibold">{CDP_FOCUS_AREAS[code].label}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sessions.length} session{sessions.length === 1 ? "" : "s"} logged
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions logged for this focus area.</p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">Session {session.sessionNumber}</span>
                      <span className="rounded-full border px-2 py-0.5 text-xs capitalize">
                        {session.approvalStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {session.sessionDate ? new Date(session.sessionDate).toLocaleString() : "No date"} ·{" "}
                      {session.sessionType}
                      {session.durationHours ? ` · ${session.durationHours} hrs` : ""}
                    </p>
                    {session.agenda ? <p className="mt-2 text-xs">{session.agenda}</p> : null}
                    {session.evidenceNotes ? (
                      <p className="mt-2 text-xs text-slate-700">{session.evidenceNotes}</p>
                    ) : null}
                    {((session.evidenceFiles as CdpSessionEvidenceFile[] | null) ?? []).length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {((session.evidenceFiles as CdpSessionEvidenceFile[] | null) ?? []).map((file, index) => (
                          <a
                            key={`${file.url}-${index}`}
                            href={getDocumentViewerHref(file.url, file.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-xs text-sky-700 hover:bg-sky-50"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Intervention</TableHead>
            <TableHead>Support</TableHead>
            <TableHead>Target</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.activities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-sm">
                No activities yet.
              </TableCell>
            </TableRow>
          ) : (
            plan.activities.map((a) => (
              <TableRow key={a.id}>
                {editingActivityId === a.id ? (
                  <TableCell colSpan={5} className="bg-muted/30">
                    <form
                      className="grid gap-3 py-2 sm:grid-cols-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        submitEdit(a.id, new FormData(e.currentTarget));
                      }}
                    >
                      <div className="space-y-1">
                        <Label>Focus code</Label>
                        <select
                          name="focusCode"
                          className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                          defaultValue={a.focusCode}
                          required
                        >
                          {CDP_FOCUS_CODES.map((c) => (
                            <option key={c} value={c}>
                              {c} - {CDP_FOCUS_AREAS[c].label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`targetDate-${a.id}`}>Target date</Label>
                        <Input id={`targetDate-${a.id}`} name="targetDate" type="date" defaultValue={dateInputValue(a.targetDate)} />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor={`gapChallenge-${a.id}`}>Gap / challenge</Label>
                        <Textarea id={`gapChallenge-${a.id}`} name="gapChallenge" rows={2} defaultValue={a.gapChallenge ?? ""} />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor={`intervention-${a.id}`}>Capacity dev. activity / intervention</Label>
                        <Textarea id={`intervention-${a.id}`} name="intervention" rows={2} defaultValue={a.intervention ?? ""} required />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`supportType-${a.id}`}>Type of support</Label>
                        <Input id={`supportType-${a.id}`} name="supportType" defaultValue={a.supportType ?? ""} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`deliveryMethod-${a.id}`}>Delivery method</Label>
                        <Input id={`deliveryMethod-${a.id}`} name="deliveryMethod" defaultValue={a.deliveryMethod ?? ""} />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor={`responsibleStaff-${a.id}`}>Responsible staff</Label>
                        <Input id={`responsibleStaff-${a.id}`} name="responsibleStaff" defaultValue={a.responsibleStaff ?? ""} />
                      </div>
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <Button type="submit" size="sm" disabled={pending}>
                          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Save changes
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingActivityId(null)}
                          disabled={pending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </TableCell>
                ) : (
                  <>
                <TableCell className="font-mono">{a.focusCode}</TableCell>
                <TableCell className="text-sm max-w-md">{a.intervention}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.supportType ?? "—"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{a.targetDate ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingActivityId(a.id)}
                      disabled={disabled || pending}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => remove(a.id)}
                      disabled={disabled || pending}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
                  </>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">Business #{businessId} - use Edit to update logged activities.</p>
    </div>
  );
}

const SESSION_ACTION_STATUSES = ["open", "done", "waived", "blocked"] as const;

function SessionActionItemsBlock({ plan, disabled }: { plan: CdpPlanFull; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const rows = plan.supportSessions.flatMap((s) =>
    (s.actionItems ?? []).map((ai) => ({
      sessionNumber: s.sessionNumber,
      actionItemId: ai.id,
      description: ai.description,
      status: ai.status,
    }))
  );

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Session action items</h4>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No structured action items yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-36">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.actionItemId}>
                  <TableCell className="text-xs">{r.sessionNumber}</TableCell>
                  <TableCell className="text-sm max-w-md">{r.description}</TableCell>
                  <TableCell>
                    <select
                      className="h-8 w-full max-w-[140px] rounded-md border border-input bg-background text-xs"
                      value={r.status}
                      disabled={disabled || pending}
                      onChange={(e) => {
                        const status = e.target.value as (typeof SESSION_ACTION_STATUSES)[number];
                        start(async () => {
                          const res = await updateCdpSessionActionItem({
                            actionItemId: r.actionItemId,
                            status,
                            statusNotes: null,
                          });
                          if (!res.success) toast.error(res.error ?? "Failed");
                          else router.refresh();
                        });
                      }}
                    >
                      {SESSION_ACTION_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {plan.supportSessions.length > 0 ? (
        <form
          className="flex flex-wrap gap-2 items-end rounded-md border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await addCdpSessionActionItem({
                sessionId: Number(fd.get("sessId")),
                description: String(fd.get("newActionDesc") ?? ""),
              });
              if (!res.success) toast.error(res.error ?? "Failed");
              else {
                toast.success("Action item added");
                (e.target as HTMLFormElement).reset();
                router.refresh();
              }
            });
          }}
        >
          <div className="space-y-1">
            <Label>Session</Label>
            <select
              name="sessId"
              required
              className="h-10 min-w-[120px] rounded-md border border-input bg-background px-2 text-sm"
            >
              {plan.supportSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.sessionNumber}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label>New action description</Label>
            <Input name="newActionDesc" required placeholder="Follow-up task" />
          </div>
          <Button type="submit" size="sm" disabled={disabled || pending}>
            Add to session
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function CdpSessionsPanel({
  plan,
  businessId,
  disabled,
  currentUserRole,
  currentUserId,
  mode = "planning",
}: {
  plan: CdpPlanFull;
  businessId: number;
  disabled: boolean;
  currentUserRole: string;
  currentUserId: string;
  mode?: "planning" | "reporting";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const canApproveSessions = CDP_APPROVER_ROLES.includes(currentUserRole as (typeof CDP_APPROVER_ROLES)[number]);
  const priorityFocusCodes = plan.focusSummaries
    .filter((row) => priorityFromScore0to10(row.score0to10) !== "low")
    .map((row) => row.focusCode);
  const focusGroups = (priorityFocusCodes.length > 0 ? priorityFocusCodes : CDP_FOCUS_CODES).map((code) => ({
    code,
    sessions: plan.supportSessions.filter((session) => session.focusCode === code),
  }));
  const editingSession = editingSessionId
    ? plan.supportSessions.find((session) => session.id === editingSessionId)
    : null;
  const approvedSessionCount = plan.supportSessions.filter((session) => session.approvalStatus === "approved").length;
  const evidenceSessionCount = plan.supportSessions.filter(sessionHasEvidence).length;
  const reportReadyCount = plan.supportSessions.filter(
    (session) => Boolean(session.keyActionsAgreed?.trim()) || Boolean(session.evidenceNotes?.trim())
  ).length;

  const submitAdd = (formData: FormData) => {
    const rawCodes = String(formData.get("focusCodes") ?? "")
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const focusCodes = rawCodes.filter((c): c is (typeof CDP_FOCUS_CODES)[number] =>
      (CDP_FOCUS_CODES as readonly string[]).includes(c)
    );
    start(async () => {
      const res = await createCdpSupportSession({
        planId: plan.id,
        focusCode: formData.get("focusCode") as (typeof CDP_FOCUS_CODES)[number],
        sessionNumber: Number(formData.get("sessionNumber")),
        sessionDate: String(formData.get("sessionDate")),
        focusCodes,
        agenda: String(formData.get("agenda") ?? ""),
        subtopic: String(formData.get("subtopic") ?? ""),
        supportType: String(formData.get("supportType") ?? ""),
        durationHours: null,
        keyActionsAgreed: null,
        challengesRaised: null,
        nextSteps: null,
        followUpDate: null,
        bootcampWeek: null,
        sessionType: String(formData.get("sessionType") ?? "") as "physical" | "virtual",
        meetingLink: String(formData.get("meetingLink") ?? "") || null,
        evidenceNotes: null,
        evidenceUrls: null,
        evidenceFiles: null,
        initialActionDescriptions: null,
      });
      if (!res.success) toast.error(res.error ?? "Failed");
      else {
        toast.success("Session logged");
        setShowAdd(false);
        router.refresh();
      }
    });
  };

  const remove = (id: number) => {
    if (!confirm("Delete this session row?")) return;
    start(async () => {
      const res = await deleteCdpSupportSession(id);
      if (!res.success) toast.error(res.error ?? "Failed");
      else {
        toast.success("Removed");
        router.refresh();
      }
    });
  };

  const approve = (id: number) => {
    start(async () => {
      const res = await approveCdpSupportSession(id);
      if (!res.success) toast.error(res.error ?? "Failed");
      else {
        toast.success("Session approved");
        router.refresh();
      }
    });
  };

  const reject = (id: number) => {
    if (!confirm("Reject this session report? The EDO can edit and resubmit it.")) return;
    start(async () => {
      const res = await rejectCdpSupportSession(id);
      if (!res.success) toast.error(res.error ?? "Failed");
      else {
        toast.success("Session report rejected");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-start">
        <div>
          <h3 className="text-base font-semibold">
            {mode === "planning" ? "Plan advisory sessions" : "Complete session reports"}
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {mode === "planning"
              ? "Create the session plan before the visit or advisory meeting. Start from a CNA focus area, then define the topic, agenda, objective, date, type, and meeting link."
              : "Use this after the advisory session. Add the agreed milestones, achievements, challenges, next steps, follow-up date, deviations, observations, and supporting evidence."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-2 py-1">Planned: {plan.supportSessions.length}</span>
            <span className="rounded-full border px-2 py-1">Reports started: {reportReadyCount}</span>
            <span className="rounded-full border px-2 py-1">Approved: {approvedSessionCount}</span>
            <span className="rounded-full border px-2 py-1">With evidence: {evidenceSessionCount}</span>
          </div>
        </div>
        {mode === "planning" ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAdd((s) => !s)} disabled={disabled || pending}>
            {showAdd ? "Close" : "Add planned session"}
          </Button>
        ) : null}
      </div>
      {mode === "planning" && showAdd ? (
        <form
          className="grid gap-3 rounded-md border p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            submitAdd(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="focusCode">Focus area</Label>
            <select
              id="focusCode"
              name="focusCode"
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              required
            >
              {CDP_FOCUS_CODES.map((code) => (
                <option key={code} value={code}>
                  {code} - {CDP_FOCUS_AREAS[code].label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sessionNumber">Session #</Label>
            <Input
              id="sessionNumber"
              name="sessionNumber"
              type="number"
              min={1}
              max={6}
              required
              onChange={(e) => {
                const n = Number(e.currentTarget.value);
                const select = e.currentTarget.form?.elements.namedItem("sessionType") as HTMLSelectElement | null;
                if (select && Number.isFinite(n)) select.value = expectedSessionType(n);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sessionDate">Date</Label>
            <Input id="sessionDate" name="sessionDate" type="datetime-local" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sessionType">Session type</Label>
            <select
              id="sessionType"
              name="sessionType"
              defaultValue="virtual"
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="physical">Physical</option>
              <option value="virtual">Virtual</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="meetingLink">Meeting link or physical venue note</Label>
            <Input id="meetingLink" name="meetingLink" placeholder="Virtual link, venue name, or field location" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="focusCodes">Focus codes (e.g. A,C,F)</Label>
            <Input id="focusCodes" name="focusCodes" placeholder="A, D" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="agenda">Topic</Label>
            <Input id="agenda" name="agenda" placeholder="Example: Cash-flow management" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="subtopic">Subtopic</Label>
            <Input id="subtopic" name="subtopic" placeholder="Example: Separating business and household expenses" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="supportType">BDS objective</Label>
            <Textarea id="supportType" name="supportType" rows={3} placeholder="What should the enterprise be able to do after this session?" required />
          </div>
          <Button type="submit" disabled={pending}>
            Save session
          </Button>
        </form>
      ) : null}

      {mode === "planning" ? (
      <div className="grid gap-3 lg:grid-cols-2">
        {focusGroups.map(({ code, sessions }) => (
          <section key={code} className="rounded-md border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                    {code}
                  </span>
                  <h3 className="text-sm font-semibold">{CDP_FOCUS_AREAS[code].label}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {sessions.length} session{sessions.length === 1 ? "" : "s"} logged
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions logged for this focus area.</p>
              ) : (
                sessions.map((session) => (
                  <div key={session.id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">Session {session.sessionNumber}</span>
                      <span className="rounded-full border px-2 py-0.5 text-xs capitalize">
                        {session.approvalStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {session.sessionDate ? new Date(session.sessionDate).toLocaleString() : "No date"} -{" "}
                      {session.sessionType}
                      {session.durationHours ? ` - ${session.durationHours} hrs` : ""}
                    </p>
                    {session.agenda ? <p className="mt-2 text-xs">{session.agenda}</p> : null}
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Session</TableHead>
            <TableHead>Focus area</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead>Date and type</TableHead>
            <TableHead>{mode === "planning" ? "Subtopic" : "Report progress"}</TableHead>
            <TableHead>{mode === "planning" ? "Status" : "Evidence"}</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.supportSessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground text-sm">
                {mode === "planning"
                  ? "No sessions planned yet. Add the first advisory session from a CNA priority area."
                  : "No reports submitted yet. Complete a report after the advisory session or field visit."}
              </TableCell>
            </TableRow>
          ) : (
            plan.supportSessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.sessionNumber}</TableCell>
                <TableCell className="text-xs">
                  <span className="font-mono font-semibold">{s.focusCode}</span>
                  <span className="ml-2">{CDP_FOCUS_AREAS[s.focusCode].label}</span>
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal text-xs">{s.agenda || "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {s.sessionDate ? new Date(s.sessionDate).toLocaleString() : "—"}
                  <span className="ml-2 capitalize text-muted-foreground">{s.sessionType}</span>
                </TableCell>
                <TableCell className="text-xs">
                  {mode === "planning" ? (
                    s.subtopic || "—"
                  ) : (
                    <div className="space-y-1">
                      <span className="capitalize">{s.approvalStatus}</span>
                      <p className="text-muted-foreground">
                        {s.evidenceNotes?.trim() || s.keyActionsAgreed?.trim() ? "Report started" : "Awaiting report"}
                      </p>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {mode === "planning" ? (
                    <span className="capitalize">{s.approvalStatus}</span>
                  ) : ((s.evidenceFiles as CdpSessionEvidenceFile[] | null) ?? []).length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {((s.evidenceFiles as CdpSessionEvidenceFile[] | null) ?? []).slice(0, 2).map((file, index) => (
                        <a
                          key={`${file.url}-${index}`}
                          href={getDocumentViewerHref(file.url, file.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex max-w-[180px] items-center gap-1 text-sky-700 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </a>
                      ))}
                    </div>
                  ) : (s.evidenceUrls ?? []).length > 0 ? (
                    <span>{s.evidenceUrls.length} URL{s.evidenceUrls.length === 1 ? "" : "s"}</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSessionId(s.id)}
                      disabled={disabled || pending}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      {mode === "planning" ? "Edit plan" : "Complete report"}
                    </Button>
                    {mode === "planning" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => remove(s.id)}
                        disabled={disabled || pending}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <CdpSessionEditSheet
        planId={plan.id}
        session={editingSession ?? null}
        mode={mode}
        currentUserId={currentUserId}
        open={Boolean(editingSession)}
        onOpenChange={(open) => {
          if (!open) setEditingSessionId(null);
        }}
        onSaved={() => {
          setEditingSessionId(null);
          router.refresh();
        }}
        disabled={disabled || pending}
      />

      {mode === "reporting" && canApproveSessions && plan.supportSessions.some((s) => s.approvalStatus !== "approved") ? (
        <div className="flex flex-wrap gap-2">
          {plan.supportSessions
            .filter((s) => s.approvalStatus !== "approved" && s.conductedById !== currentUserId)
            .map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md border p-2">
                <span className="text-sm">Session {s.sessionNumber}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => approve(s.id)}
                  disabled={disabled || pending}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => reject(s.id)}
                  disabled={disabled || pending}
                >
                  Reject
                </Button>
              </div>
            ))}
        </div>
      ) : null}

      {mode === "reporting" ? <SessionActionItemsBlock plan={plan} disabled={disabled} /> : null}

      <p className="text-xs text-muted-foreground">Business #{businessId}</p>
    </div>
  );
}

function CdpProgressPanel({ plan, disabled }: { plan: CdpPlanFull; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const reviewFor = (activityId: number, q: (typeof QUARTERS)[number]) => {
    const a = plan.activities.find((x) => x.id === activityId);
    return a?.progressReviews.find((r) => r.reviewPeriod === q);
  };

  const statusFor = (activityId: number, q: (typeof QUARTERS)[number]) => {
    return reviewFor(activityId, q)?.status ?? "not_started";
  };

  const patchProgress = (
    activityId: number,
    q: (typeof QUARTERS)[number],
    patch: {
      status?: (typeof PROGRESS_STATUSES)[number];
      outcomeAchieved?: boolean | null;
      staffNotes?: string | null;
    }
  ) => {
    const pr = reviewFor(activityId, q);
    const status = patch.status ?? (pr?.status as (typeof PROGRESS_STATUSES)[number]) ?? "not_started";
    const outcomeAchieved =
      patch.outcomeAchieved !== undefined ? patch.outcomeAchieved : (pr?.outcomeAchieved ?? null);
    const staffNotes = patch.staffNotes !== undefined ? patch.staffNotes : (pr?.staffNotes ?? null);

    start(async () => {
      const res = await upsertCdpActivityProgress({
        activityId,
        reviewPeriod: q,
        status,
        outcomeAchieved,
        staffNotes,
      });
      if (!res.success) toast.error(res.error ?? "Failed");
      else router.refresh();
    });
  };

  return (
    <div className="space-y-2 overflow-x-auto">
      <p className="text-sm text-muted-foreground">
        Quarterly status and <strong>outcome achieved</strong> per activity (feeds the pipeline checklist).
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activity</TableHead>
            {QUARTERS.map((q) => (
              <TableHead key={q}>{q}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.activities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-sm">
                Add activities first.
              </TableCell>
            </TableRow>
          ) : (
            plan.activities.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-sm max-w-xs">
                  <span className="font-mono text-xs">{a.focusCode}</span> — {a.intervention.slice(0, 80)}
                  {a.intervention.length > 80 ? "…" : ""}
                </TableCell>
                {QUARTERS.map((q) => {
                  const pr = reviewFor(a.id, q);
                  const oc = pr?.outcomeAchieved;
                  const outcomeVal = oc === true ? "yes" : oc === false ? "no" : "";
                  return (
                    <TableCell key={q}>
                      <div className="space-y-1 min-w-[120px]">
                        <select
                          className="h-8 w-full rounded-md border border-input bg-background text-xs"
                          value={statusFor(a.id, q)}
                          disabled={disabled || pending}
                          onChange={(e) =>
                            patchProgress(a.id, q, {
                              status: e.target.value as (typeof PROGRESS_STATUSES)[number],
                            })
                          }
                        >
                          {PROGRESS_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                        <select
                          className="h-8 w-full rounded-md border border-input bg-background text-xs"
                          value={outcomeVal}
                          disabled={disabled || pending}
                          onChange={(e) => {
                            const v = e.target.value;
                            patchProgress(a.id, q, {
                              outcomeAchieved: v === "" ? null : v === "yes",
                            });
                          }}
                        >
                          <option value="">Outcome —</option>
                          <option value="yes">Outcome yes</option>
                          <option value="no">Outcome no</option>
                        </select>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
