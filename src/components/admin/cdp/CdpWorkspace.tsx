"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CdpPlanFull, CdpPlanListItem } from "@/lib/actions/cdp";
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
  saveCdpFocusSummaries,
  setCdpDiagnosticLocked,
  submitCdpEndline,
  updateCdpPlan,
  updateCdpSessionActionItem,
  updateCdpWeeklyMilestone,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const SCORE_OPTIONS = [0, 5, 10] as const;

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
const PROGRESS_STATUSES = ["not_started", "in_progress", "done", "blocked"] as const;

type EditableSummary = CdpFocusSummaryInput;

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
}: {
  businessId: number;
  businessName: string;
  plans: CdpPlanListItem[];
  initialPlan: CdpPlanFull | null;
  hasCnaForImport: boolean;
  latestFinalizedCna: FinalizedCnaForCdp | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [summaryRows, setSummaryRows] = useState<EditableSummary[]>(() =>
    initialPlan ? summaryRowsFromPlan(initialPlan) : []
  );
  const [pipeline, setPipeline] = useState<PipelineCompleteness | null>(null);
  const planId = initialPlan?.id;

  useEffect(() => {
    if (initialPlan) setSummaryRows(summaryRowsFromPlan(initialPlan));
  }, [initialPlan?.id]);

  useEffect(() => {
    if (!planId) {
      setPipeline(null);
      return;
    }
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
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plan">CDP Plan</TabsTrigger>
          <TabsTrigger value="sessions">Session Log</TabsTrigger>
        </TabsList>

        <TabsContent value="legacy-gaps" className="hidden">
          <CdpGapBoardPanel plan={initialPlan} disabled={pending} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <CdpSummaryCards
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
          <CdpPrioritySummary plan={initialPlan} />
          <CdpActivitiesPanel plan={initialPlan} businessId={businessId} disabled={pending} />
          <CdpProgressPanel plan={initialPlan} disabled={pending} />
        </TabsContent>

        <TabsContent value="legacy-okr" className="hidden">
          <CdpOkrPanel plan={initialPlan} disabled={pending} />
        </TabsContent>

        <TabsContent value="legacy-workplan" className="hidden">
          <CdpWorkplanPanel plan={initialPlan} disabled={pending} />
        </TabsContent>

        <TabsContent value="sessions">
          <CdpSessionsPanel plan={initialPlan} businessId={businessId} disabled={pending} />
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

function CdpSummaryCards({
  rows,
  disabled,
  onRowsChange,
  onSave,
}: {
  rows: EditableSummary[];
  disabled: boolean;
  onRowsChange: (updater: (prev: EditableSummary[]) => EditableSummary[]) => void;
  onSave: () => void;
}) {
  const [showAllAreas, setShowAllAreas] = useState(false);
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
  const visibleRows = showAllAreas ? rows.map((row, idx) => ({ row, idx })) : priorityRows;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium">Diagnostic Summary</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              A clean plan-level view of the A-L diagnostic. Use the Gap Board for question-level actions and this
              summary for the final CDP narrative.
            </p>
          </div>
          <Button type="button" onClick={onSave} disabled={disabled}>
            {disabled ? "Saving..." : "Save summary"}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border px-2 py-1">Priority areas: {priorityRows.length}</span>
          <span className="rounded-full border px-2 py-1">All focus areas: {rows.length}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowAllAreas((v) => !v)}>
            {showAllAreas ? "Show priority only" : "Show all A-L areas"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {visibleRows.map(({ row, idx }) => {
          const priority = priorityFromScore0to10(row.score0to10);
          const tone =
            priority === "high"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/25 dark:text-red-300"
              : priority === "medium"
                ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-300";

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
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Score</Label>
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
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-xs">Key gaps</Label>
                  <Textarea
                    rows={6}
                    value={row.keyGaps ?? ""}
                    onChange={(e) => updateRow(idx, { keyGaps: e.target.value })}
                    className="min-h-32 resize-y text-sm leading-relaxed"
                  />
                </div>
                <div className="space-y-1 lg:col-span-2">
                  <Label className="text-xs">Recommended intervention</Label>
                  <Textarea
                    rows={4}
                    value={row.recommendedIntervention ?? ""}
                    onChange={(e) => updateRow(idx, { recommendedIntervention: e.target.value })}
                    className="min-h-24 resize-y text-sm leading-relaxed"
                  />
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
  const priorityFocusCodes = plan.focusSummaries
    .filter((row) => priorityFromScore0to10(row.score0to10) !== "low")
    .map((row) => row.focusCode);
  const activityFocusOptions = priorityFocusCodes.length > 0 ? priorityFocusCodes : CDP_FOCUS_CODES;
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
                <TableCell className="font-mono">{a.focusCode}</TableCell>
                <TableCell className="text-sm max-w-md">{a.intervention}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.supportType ?? "—"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{a.targetDate ?? "—"}</TableCell>
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">
        Business #{businessId} — edit inline in a future iteration; for now delete and re-add to change details.
      </p>
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
}: {
  plan: CdpPlanFull;
  businessId: number;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const priorityFocusCodes = plan.focusSummaries
    .filter((row) => priorityFromScore0to10(row.score0to10) !== "low")
    .map((row) => row.focusCode);
  const focusGroups = (priorityFocusCodes.length > 0 ? priorityFocusCodes : CDP_FOCUS_CODES).map((code) => ({
    code,
    sessions: plan.supportSessions.filter((session) => session.focusCode === code),
  }));

  const submitAdd = (formData: FormData) => {
    const rawCodes = String(formData.get("focusCodes") ?? "")
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const focusCodes = rawCodes.filter((c): c is (typeof CDP_FOCUS_CODES)[number] =>
      (CDP_FOCUS_CODES as readonly string[]).includes(c)
    );
    const bootRaw = String(formData.get("bootcampWeek") ?? "").trim();
    const bootcampWeek = bootRaw ? Number(bootRaw) : null;
    const evidenceLines = String(formData.get("evidenceUrls") ?? "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const actionLines = String(formData.get("initialActionDescriptions") ?? "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    start(async () => {
      const res = await createCdpSupportSession({
        planId: plan.id,
        focusCode: formData.get("focusCode") as (typeof CDP_FOCUS_CODES)[number],
        sessionNumber: Number(formData.get("sessionNumber")),
        sessionDate: String(formData.get("sessionDate")),
        focusCodes,
        agenda: String(formData.get("agenda") ?? ""),
        supportType: String(formData.get("supportType") ?? ""),
        durationHours: formData.get("durationHours") ? Number(formData.get("durationHours")) : null,
        keyActionsAgreed: String(formData.get("keyActionsAgreed") ?? ""),
        challengesRaised: String(formData.get("challengesRaised") ?? ""),
        nextSteps: String(formData.get("nextSteps") ?? ""),
        followUpDate: String(formData.get("followUpDate") ?? "") || null,
        bootcampWeek: bootcampWeek != null && Number.isFinite(bootcampWeek) ? bootcampWeek : null,
        sessionType: String(formData.get("sessionType") ?? "") as "physical" | "virtual",
        meetingLink: String(formData.get("meetingLink") ?? "") || null,
        evidenceUrls: evidenceLines.length ? evidenceLines : null,
        initialActionDescriptions: actionLines.length ? actionLines : null,
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <p className="text-sm text-muted-foreground">Business support session log.</p>
        <Button type="button" size="sm" variant="secondary" onClick={() => setShowAdd((s) => !s)} disabled={disabled || pending}>
          {showAdd ? "Close" : "Add session"}
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
            <Label htmlFor="meetingLink">Meeting link</Label>
            <Input id="meetingLink" name="meetingLink" placeholder="Required for virtual unless evidence is added" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="focusCodes">Focus codes (e.g. A,C,F)</Label>
            <Input id="focusCodes" name="focusCodes" placeholder="A, D" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="agenda">Agenda / topics</Label>
            <Textarea id="agenda" name="agenda" rows={2} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="supportType">Type of support</Label>
            <Input id="supportType" name="supportType" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="durationHours">Duration (hours)</Label>
            <Input id="durationHours" name="durationHours" type="number" step="0.25" min={0} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="keyActionsAgreed">Key actions agreed</Label>
            <Textarea id="keyActionsAgreed" name="keyActionsAgreed" rows={2} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="challengesRaised">Challenges raised</Label>
            <Textarea id="challengesRaised" name="challengesRaised" rows={2} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="nextSteps">Next steps</Label>
            <Textarea id="nextSteps" name="nextSteps" rows={2} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="followUpDate">Follow-up date</Label>
            <Input id="followUpDate" name="followUpDate" type="date" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bootcampWeek">Bootcamp week (1–13, optional)</Label>
            <Input id="bootcampWeek" name="bootcampWeek" type="number" min={1} max={13} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="evidenceUrls">Evidence URLs (one per line)</Label>
            <Textarea id="evidenceUrls" name="evidenceUrls" rows={2} placeholder="https://…" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="initialActionDescriptions">Follow-up action items (one per line)</Label>
            <Textarea
              id="initialActionDescriptions"
              name="initialActionDescriptions"
              rows={3}
              placeholder="Each line becomes a trackable action. Required before the next session if you fill key actions agreed on a prior session."
            />
          </div>
          <Button type="submit" disabled={pending}>
            Save session
          </Button>
        </form>
      ) : null}

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Focus</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Bootcamp</TableHead>
            <TableHead>Codes</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.supportSessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground text-sm">
                No sessions logged.
              </TableCell>
            </TableRow>
          ) : (
            plan.supportSessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.sessionNumber}</TableCell>
                <TableCell className="font-mono text-xs">{s.focusCode}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {s.sessionDate ? new Date(s.sessionDate).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-xs">{s.bootcampWeek ?? "—"}</TableCell>
                <TableCell className="text-xs">{(s.focusCodes ?? []).join(", ") || "—"}</TableCell>
                <TableCell className="text-xs">{s.durationHours ?? "—"}</TableCell>
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {plan.supportSessions.some((s) => s.approvalStatus !== "approved") ? (
        <div className="flex flex-wrap gap-2">
          {plan.supportSessions
            .filter((s) => s.approvalStatus !== "approved")
            .map((s) => (
              <Button
                key={s.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => approve(s.id)}
                disabled={disabled || pending}
              >
                Approve session {s.sessionNumber}
              </Button>
            ))}
        </div>
      ) : null}

      <SessionActionItemsBlock plan={plan} disabled={disabled} />

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
