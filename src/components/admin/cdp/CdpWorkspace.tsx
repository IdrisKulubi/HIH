"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CdpPlanFull, CdpPlanListItem } from "@/lib/actions/cdp";
import {
  buildCdpCsvExport,
  createCdpActivity,
  createCdpPlan,
  createCdpSupportSession,
  deleteCdpActivity,
  deleteCdpSupportSession,
  importCdpSummariesFromLatestCna,
  saveCdpFocusSummaries,
  updateCdpPlan,
  upsertCdpActivityProgress,
} from "@/lib/actions/cdp";
import { CDP_FOCUS_AREAS, CDP_FOCUS_CODES, priorityFromScore0to10, priorityLabel } from "@/lib/cdp/focus-areas";
import type { CdpFocusSummaryInput } from "@/lib/cdp/focus-areas";
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

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
const PROGRESS_STATUSES = ["not_started", "in_progress", "done", "blocked"] as const;

type EditableSummary = CdpFocusSummaryInput;

function summaryRowsFromPlan(plan: CdpPlanFull): EditableSummary[] {
  return CDP_FOCUS_CODES.map((code) => {
    const s = plan.focusSummaries.find((f) => f.focusCode === code);
    return {
      focusCode: code,
      score0to10: s?.score0to10 ?? 0,
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
  hasLegacyCna,
}: {
  businessId: number;
  businessName: string;
  plans: CdpPlanListItem[];
  initialPlan: CdpPlanFull | null;
  hasLegacyCna: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [summaryRows, setSummaryRows] = useState<EditableSummary[]>(() =>
    initialPlan ? summaryRowsFromPlan(initialPlan) : []
  );

  useEffect(() => {
    if (initialPlan) setSummaryRows(summaryRowsFromPlan(initialPlan));
  }, [initialPlan?.id]);

  const planId = initialPlan?.id;

  const handleCreatePlan = (formData: FormData) => {
    const diagnosticDate = String(formData.get("diagnosticDate") ?? "");
    const cdpReviewDate = String(formData.get("cdpReviewDate") ?? "");
    start(async () => {
      const res = await createCdpPlan({
        businessId,
        diagnosticDate,
        cdpReviewDate: cdpReviewDate || null,
        leadStaffId: null,
        notes: null,
        linkedCnaDiagnosticId: null,
      });
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Could not create plan");
        return;
      }
      toast.success("CDP plan created");
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
      <div className="max-w-lg space-y-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium">Create a Capacity Development Plan</h2>
        <p className="text-sm text-muted-foreground">
          {businessName} — no CDP yet. Creating a plan opens the full A–L diagnostic summary, activity plan,
          session log, and quarterly progress tracker.
        </p>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreatePlan(new FormData(e.currentTarget));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="diagnosticDate">Date of diagnostic</Label>
            <Input id="diagnosticDate" name="diagnosticDate" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cdpReviewDate">CDP review date (optional)</Label>
            <Input id="cdpReviewDate" name="cdpReviewDate" type="date" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create CDP plan"}
          </Button>
        </form>
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
          {hasLegacyCna ? (
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
        </p>
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="summary">Summary (A–L)</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Focus</TableHead>
                  <TableHead className="w-24">Score 0–10</TableHead>
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
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={row.score0to10}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setSummaryRows((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], score0to10: Number.isFinite(v) ? v : 0 };
                              return next;
                            });
                          }}
                          className="h-8 w-20"
                        />
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
        </TabsContent>

        <TabsContent value="activities">
          <CdpActivitiesPanel plan={initialPlan} businessId={businessId} disabled={pending} />
        </TabsContent>

        <TabsContent value="sessions">
          <CdpSessionsPanel plan={initialPlan} businessId={businessId} disabled={pending} />
        </TabsContent>

        <TabsContent value="progress">
          <CdpProgressPanel plan={initialPlan} disabled={pending} />
        </TabsContent>
      </Tabs>
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
              {CDP_FOCUS_CODES.map((c) => (
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
            <Label htmlFor="sessionNumber">Session #</Label>
            <Input id="sessionNumber" name="sessionNumber" type="number" min={1} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sessionDate">Date</Label>
            <Input id="sessionDate" name="sessionDate" type="datetime-local" required />
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
          <Button type="submit" disabled={pending}>
            Save session
          </Button>
        </form>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Codes</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.supportSessions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground text-sm">
                No sessions logged.
              </TableCell>
            </TableRow>
          ) : (
            plan.supportSessions.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.sessionNumber}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">
                  {s.sessionDate ? new Date(s.sessionDate).toLocaleString() : "—"}
                </TableCell>
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
      <p className="text-xs text-muted-foreground">Business #{businessId}</p>
    </div>
  );
}

function CdpProgressPanel({ plan, disabled }: { plan: CdpPlanFull; disabled: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const statusFor = (activityId: number, q: (typeof QUARTERS)[number]) => {
    const a = plan.activities.find((x) => x.id === activityId);
    const pr = a?.progressReviews.find((r) => r.reviewPeriod === q);
    return pr?.status ?? "not_started";
  };

  const onStatus = (activityId: number, q: (typeof QUARTERS)[number], status: (typeof PROGRESS_STATUSES)[number]) => {
    start(async () => {
      const res = await upsertCdpActivityProgress({
        activityId,
        reviewPeriod: q,
        status,
        outcomeAchieved: null,
        staffNotes: null,
      });
      if (!res.success) toast.error(res.error ?? "Failed");
      else router.refresh();
    });
  };

  return (
    <div className="space-y-2 overflow-x-auto">
      <p className="text-sm text-muted-foreground">Review cycle status per activity (Q1–Q4).</p>
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
                {QUARTERS.map((q) => (
                  <TableCell key={q}>
                    <select
                      className="h-8 w-full max-w-[130px] rounded-md border border-input bg-background text-xs"
                      value={statusFor(a.id, q)}
                      disabled={disabled || pending}
                      onChange={(e) =>
                        onStatus(a.id, q, e.target.value as (typeof PROGRESS_STATUSES)[number])
                      }
                    >
                      {PROGRESS_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
