"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import db from "@/db/drizzle";
import {
  melAuditEvents,
  melDqaIssues,
  melEnterpriseAchievements,
  melEvidenceReviews,
  melIndicatorDefinitions,
  melLearningActions,
  melMonitoringEvidence,
  melMonitoringEvidenceReferences,
  melMonitoringFinanceEntries,
  melMonitoringJobs,
  melMonitoringResponses,
  melMonitoringSubmissions,
  melMonitoringVersions,
  melMonitoringWaste,
  melNotificationOutbox,
  melReportingPeriods,
  melReviewDecisions,
  userProfiles,
} from "@/db/schema";
import { errorResponse, successResponse, type ActionResponse } from "./types";
import { runDqa, type DqaFinding, type DqaInput } from "@/lib/mel/dqa-engine";
import { requireMelReviewer, type MelReviewer } from "@/lib/mel/review-access";
import {
  expectedReviewStage,
  resolveReviewTransition,
  type MelReviewDecision,
  type MelWorkflowStatus,
} from "@/lib/mel/review-workflow";
import {
  buildApprovalPrioritySummaryText,
  extractApprovalPriorities,
} from "@/lib/mel/approval-priorities";
import {
  ONE_TIME_QUESTION_BY_INDICATOR,
  type MonitoringQuestionCode,
} from "@/lib/mel/monitoring-question-catalog";
import { dispatchMelReportApprovedEmail } from "@/lib/mel/notifications/dispatch-report-approved";

export type MelReviewQueueRow = {
  submissionId: number;
  businessId: number;
  businessName: string;
  periodId: number;
  periodLabel: string;
  periodCode: string;
  county: string;
  sector: string;
  track: string;
  collectorId: string;
  collectorRole: string;
  status: MelWorkflowStatus;
  sourceMode: string;
  submittedAt: Date | null;
  version: number;
  dqaOpenCount: number;
  dqaErrorCount: number;
  evidenceCount: number;
  verifiedEvidenceCount: number;
  stage: "redo" | "mel";
  assignedRedoId: string | null;
};

export type MelReviewQueue = {
  reviewer: MelReviewer;
  rows: MelReviewQueueRow[];
  periods: Array<{ id: number; label: string }>;
  redoReviewers: Array<{ id: string; name: string }>;
};

export type MelReviewDetail = {
  reviewer: MelReviewer;
  submission: typeof melMonitoringSubmissions.$inferSelect;
  period: typeof melReportingPeriods.$inferSelect;
  businessName: string;
  response: typeof melMonitoringResponses.$inferSelect | null;
  financeEntries: Array<typeof melMonitoringFinanceEntries.$inferSelect>;
  jobs: Array<typeof melMonitoringJobs.$inferSelect>;
  waste: Array<typeof melMonitoringWaste.$inferSelect>;
  evidence: Array<
    typeof melMonitoringEvidence.$inferSelect & {
      reviews: Array<typeof melEvidenceReviews.$inferSelect>;
    }
  >;
  evidenceReferences: Array<{
    id: number;
    questionCode: string;
    sourceEvidence: typeof melMonitoringEvidence.$inferSelect & {
      reviews: Array<typeof melEvidenceReviews.$inferSelect>;
    };
    sourceSubmission: typeof melMonitoringSubmissions.$inferSelect;
    sourcePeriod: typeof melReportingPeriods.$inferSelect;
  }>;
  dqaIssues: Array<typeof melDqaIssues.$inferSelect>;
  decisions: Array<typeof melReviewDecisions.$inferSelect>;
  versions: Array<typeof melMonitoringVersions.$inferSelect>;
  priorApproved: {
    periodLabel: string;
    revenue: string | null;
    profitLoss: string | null;
    directJobs: number;
    indirectJobs: number;
  } | null;
  redoReviewers: Array<{ id: string; name: string }>;
};

function actionError(error: unknown, fallback: string): ActionResponse<never> {
  if (error instanceof z.ZodError) return errorResponse(error.issues[0]?.message ?? fallback);
  if (error instanceof Error) return errorResponse(error.message);
  return errorResponse(fallback);
}

function numberOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isQueueStatus(status: string): status is MelWorkflowStatus {
  return ["submitted", "resubmitted", "redo_review", "mel_review"].includes(status);
}

function reviewerCanHandle(
  reviewer: MelReviewer,
  status: MelWorkflowStatus,
  collectorRole: string,
  assignedRedoId: string | null
) {
  const stage = expectedReviewStage(status, collectorRole);
  if (stage === "redo" && reviewer.canReviewRedo) {
    return reviewer.role === "admin" || !assignedRedoId || assignedRedoId === reviewer.id;
  }
  return stage === "mel" && reviewer.canReviewMel;
}

export async function getMelReviewQueue(): Promise<ActionResponse<MelReviewQueue>> {
  try {
    const reviewer = await requireMelReviewer();
    const [submissions, redoReviewers] = await Promise.all([
      db.query.melMonitoringSubmissions.findMany({
        where: inArray(melMonitoringSubmissions.status, ["submitted", "resubmitted", "redo_review", "mel_review"]),
        with: {
          business: true,
          reportingPeriod: true,
          evidence: { with: { reviews: true } },
          evidenceReferences: { with: { sourceEvidence: { with: { reviews: true } } } },
          dqaIssues: true,
        },
        orderBy: [asc(melMonitoringSubmissions.submittedAt)],
      }),
      db
        .select({
          id: userProfiles.userId,
          name: sql<string>`${userProfiles.firstName} || ' ' || ${userProfiles.lastName}`,
        })
        .from(userProfiles)
        .where(eq(userProfiles.role, "redo"))
        .orderBy(asc(userProfiles.firstName)),
    ]);

    const rows = submissions
      .filter((submission) => isQueueStatus(submission.status))
      .filter((submission) =>
        reviewerCanHandle(
          reviewer,
          submission.status,
          submission.collectorRole,
          submission.assignedRedoId
        )
      )
      .filter((submission) => submission.collectorId !== reviewer.id)
      .map<MelReviewQueueRow>((submission) => {
        const snapshot = submission.profileSnapshot;
        const stage = expectedReviewStage(submission.status, submission.collectorRole);
        if (!stage) throw new Error("Invalid review queue status");
        return {
          submissionId: submission.id,
          businessId: submission.businessId,
          businessName:
            typeof snapshot.businessName === "string" ? snapshot.businessName : submission.business.name,
          periodId: submission.reportingPeriodId,
          periodLabel: submission.reportingPeriod.label,
          periodCode: submission.reportingPeriod.code,
          county: typeof snapshot.county === "string" ? snapshot.county : "Not recorded",
          sector: typeof snapshot.sector === "string" ? snapshot.sector : "Not recorded",
          track: typeof snapshot.track === "string" ? snapshot.track : "Not recorded",
          collectorId: submission.collectorId,
          collectorRole: submission.collectorRole,
          status: submission.status,
          sourceMode: submission.sourceMode,
          submittedAt: submission.submittedAt,
          version: submission.submissionVersion,
          dqaOpenCount: submission.dqaIssues.filter((issue) => issue.status === "open").length,
          dqaErrorCount: submission.dqaIssues.filter(
            (issue) => issue.status === "open" && issue.severity === "error"
          ).length,
          evidenceCount: submission.evidence.length + submission.evidenceReferences.length,
          verifiedEvidenceCount:
            submission.evidence.filter((item) => item.reviews.some((review) => review.status === "verified")).length +
            submission.evidenceReferences.filter((item) =>
              item.sourceEvidence.reviews.some((review) => review.status === "verified")
            ).length,
          stage,
          assignedRedoId: submission.assignedRedoId,
        };
      });

    return successResponse({
      reviewer,
      rows,
      periods: [...new Map(rows.map((row) => [row.periodId, { id: row.periodId, label: row.periodLabel }])).values()],
      redoReviewers,
    });
  } catch (error) {
    console.error("getMelReviewQueue", error);
    return actionError(error, "Failed to load MEL review queue");
  }
}

export async function getMelReviewDetail(submissionId: number): Promise<ActionResponse<MelReviewDetail>> {
  try {
    const reviewer = await requireMelReviewer();
    const submission = await db.query.melMonitoringSubmissions.findFirst({
      where: eq(melMonitoringSubmissions.id, submissionId),
      with: {
        business: true,
        reportingPeriod: true,
        response: true,
        financeEntries: true,
        jobs: true,
        waste: true,
        evidence: { with: { reviews: true } },
        dqaIssues: { orderBy: [asc(melDqaIssues.category), asc(melDqaIssues.ruleCode)] },
        reviewDecisions: { orderBy: [desc(melReviewDecisions.createdAt)] },
        versions: { orderBy: [desc(melMonitoringVersions.version)] },
      },
    });
    if (!submission) return errorResponse("Monitoring report not found");

    const stage = expectedReviewStage(submission.status, submission.collectorRole);
    const canView =
      reviewer.canAdminister ||
      ["approved", "voided"].includes(submission.status) ||
      (stage === "redo" && reviewer.canReviewRedo) ||
      (stage === "mel" && reviewer.canReviewMel);
    if (!canView) return errorResponse("This report is outside your review stage");
    if (submission.collectorId === reviewer.id && !reviewer.canAdminister) {
      return errorResponse("You cannot review your own report");
    }

    // Flat load — deep nested evidenceReferences→sourceEvidence→submission→period
    // hits a PostgreSQL LATERAL alias bug in Drizzle's relational query builder.
    const evidenceReferenceRows = await db.query.melMonitoringEvidenceReferences.findMany({
      where: eq(melMonitoringEvidenceReferences.submissionId, submission.id),
      with: { sourceEvidence: { with: { reviews: true } } },
    });
    const sourceSubmissionIds = [
      ...new Set(evidenceReferenceRows.map((row) => row.sourceEvidence.submissionId)),
    ];
    const sourceSubmissions = sourceSubmissionIds.length
      ? await db.query.melMonitoringSubmissions.findMany({
          where: inArray(melMonitoringSubmissions.id, sourceSubmissionIds),
          with: { reportingPeriod: true },
        })
      : [];
    const sourceSubmissionById = new Map(sourceSubmissions.map((item) => [item.id, item]));
    const evidenceReferences = evidenceReferenceRows.flatMap((reference) => {
      const sourceSubmission = sourceSubmissionById.get(reference.sourceEvidence.submissionId);
      if (!sourceSubmission) return [];
      return [
        {
          id: reference.id,
          questionCode: reference.questionCode,
          sourceEvidence: reference.sourceEvidence,
          sourceSubmission,
          sourcePeriod: sourceSubmission.reportingPeriod,
        },
      ];
    });

    const [prior, redoReviewers] = await Promise.all([
      loadPriorApproved(submission.businessId, submission.reportingPeriod.startDate),
      db
        .select({
          id: userProfiles.userId,
          name: sql<string>`${userProfiles.firstName} || ' ' || ${userProfiles.lastName}`,
        })
        .from(userProfiles)
        .where(eq(userProfiles.role, "redo"))
        .orderBy(asc(userProfiles.firstName)),
    ]);
    return successResponse({
      reviewer,
      submission,
      period: submission.reportingPeriod,
      businessName:
        typeof submission.profileSnapshot.businessName === "string"
          ? submission.profileSnapshot.businessName
          : submission.business.name,
      response: submission.response ?? null,
      financeEntries: submission.financeEntries,
      jobs: submission.jobs,
      waste: submission.waste,
      evidence: submission.evidence.filter((item) => item.status === "active"),
      evidenceReferences,
      dqaIssues: submission.dqaIssues,
      decisions: submission.reviewDecisions,
      versions: submission.versions,
      priorApproved: prior
        ? {
            periodLabel: prior.periodLabel,
            revenue: prior.response?.revenue ?? null,
            profitLoss: prior.response?.profitLoss ?? null,
            directJobs: prior.jobs.find((job) => job.jobType === "direct")?.quarterlyTotal ?? 0,
            indirectJobs: prior.jobs.find((job) => job.jobType === "indirect")?.quarterlyTotal ?? 0,
          }
        : null,
      redoReviewers,
    });
  } catch (error) {
    console.error("getMelReviewDetail", error);
    return actionError(error, "Failed to load MEL review detail");
  }
}

async function loadPriorApproved(businessId: number, beforeStartDate: string) {
  const [prior] = await db
    .select({
      id: melMonitoringSubmissions.id,
      periodLabel: melReportingPeriods.label,
    })
    .from(melMonitoringSubmissions)
    .innerJoin(melReportingPeriods, eq(melReportingPeriods.id, melMonitoringSubmissions.reportingPeriodId))
    .where(
      and(
        eq(melMonitoringSubmissions.businessId, businessId),
        eq(melMonitoringSubmissions.status, "approved"),
        sql`${melReportingPeriods.startDate} < ${beforeStartDate}`
      )
    )
    .orderBy(desc(melReportingPeriods.startDate))
    .limit(1);
  if (!prior) return null;
  const [response, jobs] = await Promise.all([
    db.query.melMonitoringResponses.findFirst({
      where: eq(melMonitoringResponses.submissionId, prior.id),
    }),
    db.query.melMonitoringJobs.findMany({
      where: eq(melMonitoringJobs.submissionId, prior.id),
    }),
  ]);
  return { ...prior, response: response ?? null, jobs };
}

async function buildDqaInput(submissionId: number): Promise<{
  submission: typeof melMonitoringSubmissions.$inferSelect;
  input: DqaInput;
  findings: DqaFinding[];
}> {
  const submission = await db.query.melMonitoringSubmissions.findFirst({
    where: eq(melMonitoringSubmissions.id, submissionId),
    with: {
      reportingPeriod: true,
      response: true,
      financeEntries: true,
      jobs: true,
      evidence: true,
      evidenceReferences: { with: { sourceEvidence: { with: { reviews: true } } } },
    },
  });
  if (!submission) throw new Error("Monitoring report not found");
  const prior = await loadPriorApproved(submission.businessId, submission.reportingPeriod.startDate);
  const activeEvidence = submission.evidence.filter((item) => item.status === "active");
  const referencedEvidence = submission.evidenceReferences.map((reference) => reference.sourceEvidence);
  const duplicateRows =
    activeEvidence.length === 0
      ? []
      : await db
          .select({ fileKey: melMonitoringEvidence.fileKey })
          .from(melMonitoringEvidence)
          .where(
            and(
              inArray(melMonitoringEvidence.fileKey, activeEvidence.map((item) => item.fileKey)),
              ne(melMonitoringEvidence.submissionId, submissionId),
              eq(melMonitoringEvidence.status, "active")
            )
          );
  const response = submission.response;
  const job = (type: "direct" | "indirect") => {
    const row = submission.jobs.find((item) => item.jobType === type);
    if (!row || [row.quarterlyTotal, row.male, row.female, row.youth, row.plwd, row.refugee].some((value) => value === null)) {
      return null;
    }
    return {
      total: row.quarterlyTotal!,
      male: row.male!,
      female: row.female!,
      youth: row.youth!,
      plwd: row.plwd!,
      refugee: row.refugee!,
    };
  };
  const input: DqaInput = {
    profileSnapshot: submission.profileSnapshot,
    visitDate: submission.visitDate,
    periodStartDate: submission.reportingPeriod.startDate,
    periodEndDate: submission.reportingPeriod.endDate,
    collectionCloseDate: submission.reportingPeriod.collectionCloseDate,
    sourceMode: submission.sourceMode,
    submittedAt: submission.submittedAt,
    revenue: numberOrNull(response?.revenue),
    costs: numberOrNull(response?.costs),
    storedProfitLoss: numberOrNull(response?.profitLoss),
    directJobs: job("direct"),
    indirectJobs: job("indirect"),
    financeLinked: response?.linkedToFinanceProvider ?? null,
    financeType: submission.financeEntries.length
      ? submission.financeEntries.map((entry) => entry.financeType).join(",")
      : response?.financeType ?? null,
    financeValue: submission.financeEntries.length
      ? submission.financeEntries.reduce((sum, entry) => sum + (numberOrNull(entry.amount) ?? 0), 0)
      : numberOrNull(response?.financeValue),
    evidence: [...activeEvidence, ...referencedEvidence].map((item) => ({
      id: item.id,
      questionCode: item.questionCode,
      fileKey: item.fileKey,
    })),
    priorApproved: prior
      ? {
          revenue: numberOrNull(prior.response?.revenue),
          profitLoss: numberOrNull(prior.response?.profitLoss),
          directJobsTotal: prior.jobs.find((row) => row.jobType === "direct")?.quarterlyTotal ?? 0,
          indirectJobsTotal: prior.jobs.find((row) => row.jobType === "indirect")?.quarterlyTotal ?? 0,
        }
      : null,
    duplicateEvidenceKeys: new Set(duplicateRows.map((row) => row.fileKey)),
    financialComparison: response?.financialComparisonSnapshot as DqaInput["financialComparison"],
  };
  return { submission, input, findings: runDqa(input) };
}

async function persistDqaFindings(submissionId: number, actorId: string) {
  const { submission, findings } = await buildDqaInput(submissionId);
  await db.transaction(async (tx) => {
    for (const finding of findings) {
      await tx
        .insert(melDqaIssues)
        .values({
          submissionId,
          submissionVersion: submission.submissionVersion,
          ...finding,
          observedValue: finding.observedValue ?? null,
          comparisonValue: finding.comparisonValue ?? null,
        })
        .onConflictDoNothing();
    }
    await tx.insert(melAuditEvents).values({
      actorId,
      actorRole: "system_dqa",
      entityType: "mel_monitoring_submission",
      entityId: String(submissionId),
      action: "dqa_run",
      after: { version: submission.submissionVersion, findingCount: findings.length },
      correlationId: randomUUID(),
    });
  });
  return findings;
}

export async function runMelDqaAction(submissionId: number): Promise<ActionResponse<{ count: number }>> {
  try {
    const reviewer = await requireMelReviewer();
    const findings = await persistDqaFindings(submissionId, reviewer.id);
    revalidateReviewPaths(submissionId);
    return successResponse({ count: findings.length }, `DQA completed with ${findings.length} finding(s)`);
  } catch (error) {
    return actionError(error, "Failed to run DQA");
  }
}

export async function acceptMelDqaIssueAction(
  _previous: ActionResponse<{ accepted: true }> | null,
  formData: FormData
): Promise<ActionResponse<{ accepted: true }>> {
  try {
    const reviewer = await requireMelReviewer();
    const issueId = z.coerce.number().int().positive().parse(formData.get("issueId"));
    const reason = z.string().trim().min(10).max(3000).parse(formData.get("reason"));
    const issue = await db.query.melDqaIssues.findFirst({ where: eq(melDqaIssues.id, issueId) });
    if (!issue) return errorResponse("DQA issue not found");
    if (issue.severity !== "warning") return errorResponse("Consistency errors cannot be accepted as exceptions");
    await db.transaction(async (tx) => {
      await tx
        .update(melDqaIssues)
        .set({
          status: "accepted",
          resolutionReason: reason,
          resolvedById: reviewer.id,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(melDqaIssues.id, issueId));
      await tx.insert(melAuditEvents).values({
        actorId: reviewer.id,
        actorRole: reviewer.role,
        entityType: "mel_dqa_issue",
        entityId: String(issueId),
        action: "exception_accepted",
        reason,
        correlationId: randomUUID(),
      });
    });
    revalidateReviewPaths(issue.submissionId);
    return successResponse({ accepted: true }, "DQA exception accepted");
  } catch (error) {
    return actionError(error, "Failed to accept DQA issue");
  }
}

export async function reviewMelEvidenceAction(input: {
  evidenceId: number;
  status: "verified" | "rejected";
  notes?: string;
}): Promise<ActionResponse<{ reviewed: true }>> {
  try {
    const reviewer = await requireMelReviewer();
    const parsed = z.object({
      evidenceId: z.number().int().positive(),
      status: z.enum(["verified", "rejected"]),
      notes: z.string().trim().max(3000).optional(),
    }).parse(input);
    if (parsed.status === "rejected" && !parsed.notes) return errorResponse("Explain why the evidence is rejected");
    const evidence = await db.query.melMonitoringEvidence.findFirst({
      where: eq(melMonitoringEvidence.id, parsed.evidenceId),
    });
    if (!evidence) return errorResponse("Evidence not found");
    await db
      .insert(melEvidenceReviews)
      .values({ ...parsed, reviewerId: reviewer.id })
      .onConflictDoUpdate({
        target: [melEvidenceReviews.evidenceId, melEvidenceReviews.reviewerId],
        set: { status: parsed.status, notes: parsed.notes, reviewedAt: new Date() },
      });
    revalidateReviewPaths(evidence.submissionId);
    revalidatePath("/admin/mel/evidence");
    return successResponse({ reviewed: true }, `Evidence ${parsed.status}`);
  } catch (error) {
    return actionError(error, "Failed to review evidence");
  }
}

export async function decideMelReviewAction(
  _previous: ActionResponse<{ status: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ status: string }>> {
  try {
    const reviewer = await requireMelReviewer();
    const submissionId = z.coerce.number().int().positive().parse(formData.get("submissionId"));
    const decision = z.enum(["approve", "return", "reopen", "void"]).parse(formData.get("decision"));
    const reasonRaw = String(formData.get("reason") ?? "").trim();
    const affectedQuestions = String(formData.get("affectedQuestions") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (["return", "reopen", "void"].includes(decision) && reasonRaw.length < 10) {
      return errorResponse("A clear reason of at least 10 characters is required");
    }
    if (decision === "return" && affectedQuestions.length === 0) {
      return errorResponse("Select at least one affected section or question");
    }

    const submission = await db.query.melMonitoringSubmissions.findFirst({
      where: eq(melMonitoringSubmissions.id, submissionId),
      with: {
        response: true,
        financeEntries: true,
        jobs: true,
        waste: true,
        evidence: { with: { reviews: true } },
        evidenceReferences: { with: { sourceEvidence: { with: { reviews: true } } } },
      },
    });
    if (!submission) return errorResponse("Monitoring report not found");
    const transition = resolveReviewTransition({
      status: submission.status,
      collectorRole: submission.collectorRole,
      actorRole: reviewer.role,
      actorId: reviewer.id,
      collectorId: submission.collectorId,
      decision: decision as MelReviewDecision,
    });

    if (decision === "approve") {
      await persistDqaFindings(submissionId, reviewer.id);
      const openIssues = await db.query.melDqaIssues.findMany({
        where: and(
          eq(melDqaIssues.submissionId, submissionId),
          eq(melDqaIssues.submissionVersion, submission.submissionVersion),
          eq(melDqaIssues.status, "open")
        ),
      });
      if (openIssues.some((issue) => issue.severity === "error")) {
        return errorResponse("Resolve the blocking DQA errors before advancing this report");
      }
      if (transition.nextStatus === "approved" && openIssues.some((issue) => issue.severity === "warning")) {
        return errorResponse("Accept or resolve every DQA warning before final approval");
      }
      if (transition.nextStatus === "approved") {
        const activeEvidence = submission.evidence.filter((item) => item.status === "active");
        if (activeEvidence.some((item) => item.reviews.some((review) => review.status === "rejected"))) {
          return errorResponse("Rejected evidence must be corrected before final approval");
        }
        if (activeEvidence.some((item) => !item.reviews.some((review) => review.status === "verified"))) {
          return errorResponse("Verify all active evidence before final approval");
        }
        if (submission.evidenceReferences.some((reference) =>
          !reference.sourceEvidence.reviews.some((review) => review.status === "verified")
        )) {
          return errorResponse("Every reused evidence reference must retain verified prior proof");
        }
      }
    }

    let approvedNotificationBody =
      reasonRaw || `Report status changed to ${transition.nextStatus.replaceAll("_", " ")}`;

    await db.transaction(async (tx) => {
      await tx
        .insert(melMonitoringVersions)
        .values({
          submissionId,
          version: submission.submissionVersion,
          status: submission.status,
          responseSnapshot: submission.response,
          financeSnapshot: submission.financeEntries,
          jobsSnapshot: submission.jobs,
          wasteSnapshot: submission.waste,
          evidenceSnapshot: submission.evidence,
          evidenceReferenceSnapshot: submission.evidenceReferences,
          capturedById: reviewer.id,
        })
        .onConflictDoNothing();
      await tx
        .update(melMonitoringSubmissions)
        .set({
          status: transition.nextStatus,
          approvedAt: transition.nextStatus === "approved" ? new Date() : submission.approvedAt,
          approvedById: transition.nextStatus === "approved" ? reviewer.id : submission.approvedById,
          reopenedAt: transition.nextStatus === "reopened" ? new Date() : submission.reopenedAt,
          updatedAt: new Date(),
        })
        .where(eq(melMonitoringSubmissions.id, submissionId));
      await tx.insert(melReviewDecisions).values({
        submissionId,
        stage: transition.stage,
        action: transition.action,
        reviewerId: reviewer.id,
        reviewerRole: reviewer.role,
        fromStatus: submission.status,
        toStatus: transition.nextStatus,
        reason: reasonRaw || null,
        affectedQuestions,
      });
      if (transition.nextStatus === "approved") {
        await tx
          .update(melEnterpriseAchievements)
          .set({
            status: "approved",
            approvedPeriodId: submission.reportingPeriodId,
            approvedById: reviewer.id,
            approvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(melEnterpriseAchievements.firstSubmissionId, submissionId),
              eq(melEnterpriseAchievements.status, "pending")
            )
          );
      }
      if (transition.nextStatus === "reopened") {
        await tx
          .update(melEnterpriseAchievements)
          .set({
            status: "pending",
            approvedPeriodId: null,
            approvedById: null,
            approvedAt: null,
            reopenedAt: new Date(),
            reopenedById: reviewer.id,
            reopenedReason: reasonRaw,
            updatedAt: new Date(),
          })
          .where(eq(melEnterpriseAchievements.firstSubmissionId, submissionId));
      }
      await tx.insert(melAuditEvents).values({
        actorId: reviewer.id,
        actorRole: reviewer.role,
        entityType: "mel_monitoring_submission",
        entityId: String(submissionId),
        action: transition.action,
        reason: reasonRaw || null,
        before: { status: submission.status, version: submission.submissionVersion },
        after: { status: transition.nextStatus, affectedQuestions },
        correlationId: randomUUID(),
      });
      if (transition.nextStatus === "approved" && transition.action === "approved") {
        const [approvedAchievements, openLearningActions] = await Promise.all([
          tx
            .select({ code: melIndicatorDefinitions.code })
            .from(melEnterpriseAchievements)
            .innerJoin(
              melIndicatorDefinitions,
              eq(melIndicatorDefinitions.id, melEnterpriseAchievements.indicatorId)
            )
            .where(
              and(
                eq(melEnterpriseAchievements.businessId, submission.businessId),
                eq(melEnterpriseAchievements.status, "approved")
              )
            ),
          tx.query.melLearningActions.findMany({
            where: and(
              eq(melLearningActions.submissionId, submissionId),
              inArray(melLearningActions.status, ["open", "in_progress"])
            ),
            columns: { finding: true, agreedAction: true },
          }),
        ]);
        const skipQuestionCodes = approvedAchievements
          .map(({ code }) => ONE_TIME_QUESTION_BY_INDICATOR[code])
          .filter((code): code is MonitoringQuestionCode => Boolean(code));
        const approvalSummary = extractApprovalPriorities({
          response: (submission.response ?? null) as Record<string, unknown> | null,
          skipQuestionCodes,
          reviewerNote: reasonRaw,
          learningActions: openLearningActions,
        });
        approvedNotificationBody = buildApprovalPrioritySummaryText(approvalSummary);
      }

      await tx
        .insert(melNotificationOutbox)
        .values({
          eventKey: `mel-review:${submissionId}:${submission.submissionVersion}:${transition.action}`,
          recipientId: ["returned", "approved", "reopened"].includes(transition.action)
            ? submission.collectorId
            : null,
          eventType: `report_${transition.action}`,
          title: reviewNotificationTitle(transition.action),
          body:
            transition.nextStatus === "approved" && transition.action === "approved"
              ? approvedNotificationBody
              : reasonRaw || `Report status changed to ${transition.nextStatus.replaceAll("_", " ")}`,
          href: `/admin/mel/monitoring/${submission.businessId}/${submission.reportingPeriodId}`,
        })
        .onConflictDoNothing();
    });

    if (transition.nextStatus === "approved" && transition.action === "approved") {
      await dispatchMelReportApprovedEmail({
        submissionId,
        submissionVersion: submission.submissionVersion,
        businessId: submission.businessId,
        reportingPeriodId: submission.reportingPeriodId,
        collectorId: submission.collectorId,
        approvedAt: new Date(),
        reviewerNote: reasonRaw || undefined,
        response: (submission.response ?? null) as Record<string, unknown> | null,
      });
    }

    revalidateReviewPaths(submissionId);
    revalidatePath(`/admin/mel/monitoring/${submission.businessId}/${submission.reportingPeriodId}`);
    return successResponse({ status: transition.nextStatus }, `Report marked ${transition.nextStatus.replaceAll("_", " ")}`);
  } catch (error) {
    console.error("decideMelReviewAction", error);
    return actionError(error, "Failed to update report review");
  }
}

export async function reassignMelRedoReviewerAction(
  _previous: ActionResponse<{ assigned: true }> | null,
  formData: FormData
): Promise<ActionResponse<{ assigned: true }>> {
  try {
    const reviewer = await requireMelReviewer();
    if (reviewer.role !== "admin") return errorResponse("Only an administrator can reassign a REDO reviewer");
    const submissionId = z.coerce.number().int().positive().parse(formData.get("submissionId"));
    const assignedRedoId = z.string().trim().min(1).parse(formData.get("assignedRedoId"));
    const reason = z.string().trim().min(10).max(3000).parse(formData.get("reassignmentReason"));
    const [submission, redoProfile] = await Promise.all([
      db.query.melMonitoringSubmissions.findFirst({
        where: eq(melMonitoringSubmissions.id, submissionId),
      }),
      db.query.userProfiles.findFirst({
        where: and(eq(userProfiles.userId, assignedRedoId), eq(userProfiles.role, "redo")),
      }),
    ]);
    if (!submission) return errorResponse("Monitoring report not found");
    if (!redoProfile) return errorResponse("Select an eligible REDO reviewer");
    if (expectedReviewStage(submission.status, submission.collectorRole) !== "redo") {
      return errorResponse("This report is not at the REDO review stage");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(melMonitoringSubmissions)
        .set({ assignedRedoId, status: "redo_review", updatedAt: new Date() })
        .where(eq(melMonitoringSubmissions.id, submissionId));
      await tx.insert(melReviewDecisions).values({
        submissionId,
        stage: "administrative",
        action: "reassigned",
        reviewerId: reviewer.id,
        reviewerRole: reviewer.role,
        fromStatus: submission.status,
        toStatus: "redo_review",
        reason,
        affectedQuestions: [],
      });
      await tx.insert(melAuditEvents).values({
        actorId: reviewer.id,
        actorRole: reviewer.role,
        entityType: "mel_monitoring_submission",
        entityId: String(submissionId),
        action: "reviewer_reassigned",
        reason,
        before: { assignedRedoId: submission.assignedRedoId },
        after: { assignedRedoId },
        correlationId: randomUUID(),
      });
      await tx
        .insert(melNotificationOutbox)
        .values({
          eventKey: `mel-review:${submissionId}:${submission.submissionVersion}:reassigned:${assignedRedoId}`,
          recipientId: assignedRedoId,
          eventType: "report_reassigned",
          title: "Monitoring report assigned for REDO review",
          body: reason,
          href: `/admin/mel/review/${submissionId}`,
        })
        .onConflictDoNothing();
    });
    revalidateReviewPaths(submissionId);
    return successResponse({ assigned: true }, "REDO reviewer reassigned");
  } catch (error) {
    return actionError(error, "Failed to reassign reviewer");
  }
}

function reviewNotificationTitle(action: string) {
  if (action === "returned") return "Monitoring report returned";
  if (action === "approved") return "Monitoring report approved";
  if (action === "reopened") return "Monitoring report reopened";
  if (action === "advanced") return "Monitoring report advanced for MEL review";
  return "Monitoring report status updated";
}

export async function getMelEvidenceRepository(): Promise<ActionResponse<Array<{
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
}>>> {
  try {
    await requireMelReviewer();
    const rows = await db.query.melMonitoringEvidence.findMany({
      where: eq(melMonitoringEvidence.status, "active"),
      with: {
        submission: { with: { business: true, reportingPeriod: true } },
        reviews: true,
      },
      orderBy: [desc(melMonitoringEvidence.createdAt)],
    });
    return successResponse(rows.map((row) => ({
      id: row.id,
      submissionId: row.submissionId,
      businessName:
        typeof row.submission.profileSnapshot.businessName === "string"
          ? row.submission.profileSnapshot.businessName
          : row.submission.business.name,
      periodLabel: row.submission.reportingPeriod.label,
      questionCode: row.questionCode,
      fileName: row.fileName,
      fileUrl: row.fileUrl,
      fileType: row.fileType,
      status: row.status,
      reviewStatus: row.reviews.some((review) => review.status === "verified")
        ? "verified"
        : row.reviews.some((review) => review.status === "rejected")
          ? "rejected"
          : "pending",
      uploaderId: row.uploaderId,
      createdAt: row.createdAt,
    })));
  } catch (error) {
    return actionError(error, "Failed to load evidence repository");
  }
}

export async function getMelLearningActions() {
  try {
    await requireMelReviewer();
    const [actions, owners] = await Promise.all([
      db.query.melLearningActions.findMany({
        with: { business: true, responsibleUser: true },
        orderBy: [asc(melLearningActions.status), asc(melLearningActions.dueDate)],
      }),
      db
        .select({
          id: userProfiles.userId,
          name: sql<string>`${userProfiles.firstName} || ' ' || ${userProfiles.lastName}`,
          role: userProfiles.role,
        })
        .from(userProfiles)
        .where(inArray(userProfiles.role, ["bds_edo", "redo", "mel", "admin"]))
        .orderBy(asc(userProfiles.firstName)),
    ]);
    return successResponse({ actions, owners });
  } catch (error) {
    return actionError(error, "Failed to load learning actions");
  }
}

export async function createMelLearningAction(
  _previous: ActionResponse<{ id: number }> | null,
  formData: FormData
): Promise<ActionResponse<{ id: number }>> {
  try {
    const reviewer = await requireMelReviewer();
    const input = z.object({
      businessId: z.coerce.number().int().positive().nullable(),
      submissionId: z.coerce.number().int().positive().nullable(),
      dqaIssueId: z.coerce.number().int().positive().nullable(),
      finding: z.string().trim().min(5).max(5000),
      agreedAction: z.string().trim().min(5).max(5000),
      responsibleUserId: z.string().trim().min(1).nullable(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    }).parse({
      businessId: nullableFormValue(formData.get("businessId")),
      submissionId: nullableFormValue(formData.get("submissionId")),
      dqaIssueId: nullableFormValue(formData.get("dqaIssueId")),
      finding: formData.get("finding"),
      agreedAction: formData.get("agreedAction"),
      responsibleUserId: nullableFormValue(formData.get("responsibleUserId")),
      dueDate: nullableFormValue(formData.get("dueDate")),
    });
    const [created] = await db
      .insert(melLearningActions)
      .values({ ...input, createdById: reviewer.id })
      .returning({ id: melLearningActions.id });
    if (!created) throw new Error("Failed to create learning action");
    revalidatePath("/admin/mel/learning");
    return successResponse(created, "Learning action created");
  } catch (error) {
    return actionError(error, "Failed to create learning action");
  }
}

export async function updateMelLearningAction(
  _previous: ActionResponse<{ updated: true }> | null,
  formData: FormData
): Promise<ActionResponse<{ updated: true }>> {
  try {
    const reviewer = await requireMelReviewer();
    const id = z.coerce.number().int().positive().parse(formData.get("id"));
    const status = z.enum(["open", "in_progress", "completed", "cancelled"]).parse(formData.get("status"));
    const followUpNotes = String(formData.get("followUpNotes") ?? "").trim() || null;
    await db
      .update(melLearningActions)
      .set({
        status,
        followUpNotes,
        closedAt: ["completed", "cancelled"].includes(status) ? new Date() : null,
        closedById: ["completed", "cancelled"].includes(status) ? reviewer.id : null,
        updatedAt: new Date(),
      })
      .where(eq(melLearningActions.id, id));
    revalidatePath("/admin/mel/learning");
    return successResponse({ updated: true }, "Learning action updated");
  } catch (error) {
    return actionError(error, "Failed to update learning action");
  }
}

function nullableFormValue(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function revalidateReviewPaths(submissionId: number) {
  revalidatePath("/admin/mel/review");
  revalidatePath(`/admin/mel/review/${submissionId}`);
}
