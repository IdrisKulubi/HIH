"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  calculatePreScreening,
  PRE_SCREENING_CATEGORY_MAX,
  PRE_SCREENING_CRITERIA,
  type PreScreeningRatings,
  type PreScreeningTrack,
} from "@/lib/a2f-pre-screening";
import {
  resendPreScreeningInvitation,
  savePreScreeningDraft,
  submitPreScreening,
} from "@/lib/actions/a2f-pre-screening";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  FloppyDisk,
  PaperPlaneTilt,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";

type Workspace = {
  attempt: {
    id: number;
    status: string;
    track: string;
    ratings: Record<string, string>;
    notes: string | null;
    totalScore: number;
    outcome: string | null;
    hardStopReasons: string[];
    rescreenEligibleAt: string | null;
    invitationStatus: string;
    invitationError: string | null;
  };
  enterprise: {
    applicationId: number;
    businessName: string;
    applicantName: string;
    track: string | null;
    annualRevenue: number;
    ddScore: number;
  };
  reviewerName: string;
};

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function addMonths(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function formatOutcome(outcome: string) {
  return outcome.charAt(0).toUpperCase() + outcome.slice(1);
}

function ScoreSidebar({
  calculated,
  completed,
  readonly,
  workspace,
  pending,
  onSave,
  onSubmit,
  onResend,
}: {
  calculated: ReturnType<typeof calculatePreScreening>;
  completed: number;
  readonly: boolean;
  workspace: Workspace;
  pending: boolean;
  onSave: () => void;
  onSubmit: () => void;
  onResend: () => void;
}) {
  const displayScore = readonly ? workspace.attempt.totalScore : calculated.totalScore;
  const displayOutcome = readonly
    ? workspace.attempt.outcome ?? "—"
    : calculated.outcome;

  function scrollToCriterion(id: string) {
    document.getElementById(`criterion-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Card className="border-emerald-200/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Assessment progress</CardTitle>
        <CardDescription>
          {completed}/12 criteria rated
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-medium tabular-nums">{completed}/12</span>
          </div>
          <Progress className="h-2" value={(completed / 12) * 100} />
        </div>

        <div className="rounded-lg border bg-emerald-50/50 px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">Current score</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {displayScore}/100
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-700">
            Outcome: {formatOutcome(displayOutcome)}
          </p>
        </div>

        <div className="space-y-2 text-sm">
          {Object.entries(PRE_SCREENING_CATEGORY_MAX).map(([category, max]) => (
            <div key={category} className="flex items-center justify-between border-b border-dashed pb-1.5 last:border-0">
              <span className="text-muted-foreground">{category}</span>
              <strong className="tabular-nums">
                {(calculated.categoryScores[category] ?? 0)}/{max}
              </strong>
            </div>
          ))}
        </div>

        {!readonly && calculated.missing.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-sm">
            <p className="font-medium text-amber-900">Incomplete criteria</p>
            <ul className="mt-1.5 space-y-1">
              {calculated.missing.map((id) => {
                const criterion = PRE_SCREENING_CRITERIA.find((item) => item.id === id);
                if (!criterion) return null;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className="text-left text-amber-800 underline-offset-2 hover:underline"
                      onClick={() => scrollToCriterion(id)}
                    >
                      {criterion.number} {criterion.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {readonly ? (
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span>Submitted assessment is read-only.</span>
            </div>
            {workspace.attempt.outcome === "pass" &&
              workspace.attempt.invitationStatus === "failed" && (
                <Button className="w-full" onClick={onResend} disabled={pending}>
                  Retry invitation email
                </Button>
              )}
          </div>
        ) : (
          <div className="space-y-2 border-t pt-3">
            <Button variant="outline" className="w-full" onClick={onSave} disabled={pending}>
              <FloppyDisk className="mr-2 size-4" />
              Save draft
            </Button>
            <Button
              className="w-full"
              onClick={onSubmit}
              disabled={pending || calculated.missing.length > 0}
            >
              <PaperPlaneTilt className="mr-2 size-4" />
              Submit assessment
            </Button>
            {calculated.missing.length > 0 && (
              <p className="text-center text-xs text-muted-foreground">
                Complete all criteria before submitting
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ScreeningForm({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const track = workspace.attempt.track as PreScreeningTrack;
  const readonly = workspace.attempt.status === "submitted";
  const [ratings, setRatings] = useState<Partial<PreScreeningRatings>>(
    workspace.attempt.ratings as Partial<PreScreeningRatings>
  );
  const [notes, setNotes] = useState(workspace.attempt.notes ?? "");
  const [rescreenDate, setRescreenDate] = useState(
    dateInputValue(workspace.attempt.rescreenEligibleAt)
  );
  const [pending, startTransition] = useTransition();

  const calculated = useMemo(
    () => calculatePreScreening(track, workspace.enterprise.annualRevenue, ratings),
    [ratings, track, workspace.enterprise.annualRevenue]
  );
  const completed = 12 - calculated.missing.length;

  const categories = useMemo(() => {
    const groups = new Map<string, typeof PRE_SCREENING_CRITERIA>();
    for (const criterion of PRE_SCREENING_CRITERIA) {
      const list = groups.get(criterion.category) ?? [];
      list.push(criterion);
      groups.set(criterion.category, list);
    }
    return Array.from(groups.entries());
  }, []);

  const defaultOpenCategories = useMemo(() => {
    if (readonly) return categories.map(([category]) => category);
    const open = categories
      .filter(([, criteria]) =>
        criteria.some((criterion) => calculated.missing.includes(criterion.id))
      )
      .map(([category]) => category);
    return open.length > 0 ? open : [categories[0]?.[0]].filter(Boolean) as string[];
  }, [categories, calculated.missing, readonly]);

  function save() {
    startTransition(async () => {
      const result = await savePreScreeningDraft(workspace.attempt.id, {
        ratings,
        notes,
        rescreenEligibleAt: rescreenDate || null,
      });
      if (result.success) toast.success("Draft saved");
      else toast.error(result.error);
    });
  }

  function submit() {
    startTransition(async () => {
      const result = await submitPreScreening(workspace.attempt.id, {
        ratings,
        notes,
        rescreenEligibleAt: rescreenDate || null,
      });
      if (!result.success || !result.data) {
        toast.error(result.error ?? "Submission failed");
        return;
      }
      toast.success(
        `Submitted: ${formatOutcome(result.data.outcome)} (${result.data.totalScore}/100)`
      );
      router.refresh();
    });
  }

  function resend() {
    startTransition(async () => {
      const result = await resendPreScreeningInvitation(workspace.attempt.id);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(
          result.data?.emailStatus === "sent" ? "Invitation sent" : "Email delivery failed"
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="-ml-2 gap-1.5" onClick={() => router.push("/finance-screening")}>
          <ArrowLeft className="size-4" />
          Back to queue
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{workspace.enterprise.businessName}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {workspace.enterprise.applicantName} · Application #{workspace.enterprise.applicationId}
              {" · "}
              {track === "acceleration" ? "Accelerator" : "Foundation"} track
            </p>
          </div>
          <div className="text-right">
            <Badge variant={readonly ? "default" : "secondary"}>
              {readonly && workspace.attempt.outcome
                ? formatOutcome(workspace.attempt.outcome)
                : "Draft"}
            </Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              Reviewer: {workspace.reviewerName}
            </p>
          </div>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Verified revenue",
            value: `KES ${workspace.enterprise.annualRevenue.toLocaleString("en-KE")}`,
          },
          {
            label: "Due diligence score",
            value: `${workspace.enterprise.ddScore}%`,
          },
          {
            label: "Screening attempt",
            value: `#${workspace.attempt.id}`,
          },
          {
            label: "Criteria completed",
            value: `${completed}/12`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border bg-card px-3 py-2.5">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {!readonly && calculated.hardStopReasons.length > 0 && (
        <Alert variant="destructive">
          <Warning className="size-4" />
          <AlertTitle>Mandatory stop triggered</AlertTitle>
          <AlertDescription>{calculated.hardStopReasons.join("; ")}</AlertDescription>
        </Alert>
      )}

      {readonly && workspace.attempt.hardStopReasons.length > 0 && (
        <Alert variant="destructive">
          <Warning className="size-4" />
          <AlertTitle>Stop reasons</AlertTitle>
          <AlertDescription>{workspace.attempt.hardStopReasons.join("; ")}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <Accordion
            type="multiple"
            defaultValue={defaultOpenCategories}
            className="rounded-xl border bg-card px-4"
          >
            {categories.map(([category, criteria]) => {
              const categoryComplete = criteria.every(
                (criterion) => !calculated.missing.includes(criterion.id)
              );
              const categoryMax = PRE_SCREENING_CATEGORY_MAX[category as keyof typeof PRE_SCREENING_CATEGORY_MAX];

              return (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center gap-2 text-left">
                      {categoryComplete ? (
                        <CheckCircle className="size-4 shrink-0 text-emerald-600" weight="fill" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{category}</span>
                      <Badge variant="outline" className="ml-auto mr-2 tabular-nums">
                        {calculated.categoryScores[category] ?? 0}/{categoryMax}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-8 pb-2">
                    {criteria.map((criterion) => {
                      const options = criterion.options[track];
                      const selected = ratings[criterion.id];
                      const isComplete = !calculated.missing.includes(criterion.id);

                      return (
                        <section
                          key={criterion.id}
                          id={`criterion-${criterion.id}`}
                          className="scroll-mt-24 border-t pt-6 first:border-t-0 first:pt-0"
                        >
                          <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Criterion {criterion.number}
                              </p>
                              <h3 className="mt-1 text-base font-semibold">{criterion.title}</h3>
                            </div>
                            <Badge variant={isComplete ? "secondary" : "outline"}>
                              /{criterion.maxScore}
                            </Badge>
                          </div>

                          <div className="mb-4 grid gap-3 text-sm md:grid-cols-3">
                            <div>
                              <p className="font-medium">Question</p>
                              <p className="mt-1 text-muted-foreground">{criterion.question}</p>
                            </div>
                            <div>
                              <p className="font-medium">Evidence / observation</p>
                              <p className="mt-1 text-muted-foreground">{criterion.evidence}</p>
                            </div>
                            <div>
                              <p className="font-medium">Why it matters</p>
                              <p className="mt-1 text-muted-foreground">{criterion.rationale}</p>
                            </div>
                          </div>

                          {criterion.derived ? (
                            <div className="rounded-md border bg-slate-50 p-3 text-sm">
                              <span className="font-medium">
                                Automatically scored from verified revenue:{" "}
                              </span>
                              {
                                options.find(
                                  (option) => option.id === calculated.ratings.revenue
                                )?.label
                              }
                              <Badge className="ml-2" variant="secondary">
                                {calculated.scores.revenue}/{criterion.maxScore}
                              </Badge>
                            </div>
                          ) : (
                            <RadioGroup
                              value={selected}
                              disabled={readonly}
                              onValueChange={(value) =>
                                setRatings((current) => ({ ...current, [criterion.id]: value }))
                              }
                              className="grid gap-2"
                            >
                              {options.map((option) => (
                                <Label
                                  key={option.id}
                                  htmlFor={`${criterion.id}-${option.id}`}
                                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
                                    selected === option.id
                                      ? "border-emerald-600 bg-emerald-50"
                                      : ""
                                  }`}
                                >
                                  <RadioGroupItem
                                    id={`${criterion.id}-${option.id}`}
                                    value={option.id}
                                    className="mt-0.5"
                                  />
                                  <span className="flex-1 text-sm">{option.label}</span>
                                  <Badge variant={option.hardStop ? "destructive" : "outline"}>
                                    {option.hardStop ? "Fail · stop" : `${option.score} pts`}
                                  </Badge>
                                </Label>
                              ))}
                            </RadioGroup>
                          )}
                        </section>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessment notes</CardTitle>
              <CardDescription>Internal notes are never shown to the applicant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={notes}
                disabled={readonly}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
              />
              {!readonly && calculated.outcome === "conditional" && (
                <div className="max-w-sm space-y-2">
                  <Label htmlFor="rescreen-date">Eligible re-screening date</Label>
                  <Input
                    id="rescreen-date"
                    type="date"
                    min={addMonths(3)}
                    max={addMonths(6)}
                    value={rescreenDate}
                    onChange={(event) => setRescreenDate(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Schedule between 3 and 6 months after technical assistance.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <ScoreSidebar
            calculated={calculated}
            completed={completed}
            readonly={readonly}
            workspace={workspace}
            pending={pending}
            onSave={save}
            onSubmit={submit}
            onResend={resend}
          />
        </aside>
      </div>
    </div>
  );
}
