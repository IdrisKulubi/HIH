"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import db from "@/db/drizzle";
import {
  applicants,
  applications,
  businesses,
  melAuditEvents,
  melEnterpriseAchievements,
  melEnterpriseFinancialBaselines,
  melEnterpriseAssignments,
  melIndicatorDefinitions,
  melMonitoringEvidence,
  melMonitoringEvidenceReferences,
  melMonitoringFinanceEntries,
  melMonitoringJobs,
  melMonitoringResponses,
  melMonitoringSubmissions,
  melMonitoringWaste,
  melProgrammeSettings,
  melReportingPeriods,
  userProfiles,
} from "@/db/schema";
import { errorResponse, successResponse, type ActionResponse } from "./types";
import { calculateProfitLoss } from "@/lib/mel/monitoring-calculations";
import { calculateFinancialComparison, type FinancialComparison } from "@/lib/mel/financial-baselines";
import type { ApprovalPrioritySummary } from "@/lib/mel/approval-priorities";
import {
  buildReportApprovalSummary,
  loadApprovalReviewerNote,
} from "@/lib/mel/notifications/dispatch-report-approved";
import { requireMelCollector, type MelMonitoringActor } from "@/lib/mel/monitoring-access";
import { isCollectorEditableStatus } from "@/lib/mel/review-workflow";
import { requireMelRolloutFeature } from "@/lib/mel/operations";
import {
  monitoringSubmissionIssues,
  normalizeMonitoringDraft,
  parseMonitoringFormData,
  WASTE_STREAMS,
} from "@/lib/mel/monitoring-validation";
import {
  MONITORING_QUESTIONS,
  ONE_TIME_QUESTION_BY_INDICATOR,
  type MonitoringQuestionCode,
} from "@/lib/mel/monitoring-question-catalog";

const INSTRUMENT_CODE = "quarterly_enterprise_monitoring";
export type MelMonitoringWorkspaceRow = {
  businessId: number;
  businessName: string;
  applicantName: string;
  email: string;
  track: string | null;
  sector: string;
  county: string | null;
  assignedCollectorIds: string[];
  submissions: Array<{
    id: number;
    reportingPeriodId: number;
    status: string;
    sourceMode: string;
    updatedAt: Date;
  }>;
};

export type MelMonitoringWorkspace = {
  actor: MelMonitoringActor;
  periods: Array<typeof melReportingPeriods.$inferSelect>;
  rows: MelMonitoringWorkspaceRow[];
  collectors: Array<{ id: string; name: string; role: string }>;
};

export type MelMonitoringDetail = {
  actor: MelMonitoringActor;
  submission: typeof melMonitoringSubmissions.$inferSelect;
  response: typeof melMonitoringResponses.$inferSelect | null;
  financeEntries: Array<typeof melMonitoringFinanceEntries.$inferSelect>;
  jobs: Array<typeof melMonitoringJobs.$inferSelect>;
  waste: Array<typeof melMonitoringWaste.$inferSelect>;
  evidence: Array<typeof melMonitoringEvidence.$inferSelect>;
  evidenceReferences: Array<{
    id: number;
    questionCode: string;
    sourceEvidence: typeof melMonitoringEvidence.$inferSelect;
    sourceSubmission: typeof melMonitoringSubmissions.$inferSelect;
    sourcePeriod: typeof melReportingPeriods.$inferSelect;
  }>;
  reusableEvidence: Array<{
    questionCode: string;
    evidenceId: number;
    fileName: string;
    fileUrl: string;
    sourceSubmissionId: number;
    sourcePeriodLabel: string;
    approvedAt: Date | null;
  }>;
  period: typeof melReportingPeriods.$inferSelect;
  profile: {
    businessName: string;
    enterpriseId: number;
    applicantName: string;
    applicantGender: string;
    applicantDob: Date;
    sector: string;
    track: string | null;
    county: string | null;
    city: string;
  };
  approvedOneTimeCodes: string[];
  cumulativeJobs: {
    direct: { total: number; male: number; female: number; youth: number; plwd: number; refugee: number };
    indirect: { total: number; male: number; female: number; youth: number; plwd: number; refugee: number };
  };
  includeRefugee: boolean;
  financialBaseline: typeof melEnterpriseFinancialBaselines.$inferSelect | null;
  priorApprovedFinancials: { label: string; revenue: number; costs: number; profit: number } | null;
  financialVarianceThresholdPercent: number;
  approvalSummary: ApprovalPrioritySummary | null;
};

function actionError(error: unknown, fallback: string): ActionResponse<never> {
  if (error instanceof z.ZodError) return errorResponse(error.issues[0]?.message ?? fallback);
  if (error instanceof Error) return errorResponse(error.message);
  return errorResponse(fallback);
}

async function hasActiveAssignment(businessId: number, collectorId: string): Promise<boolean> {
  const assignment = await db.query.melEnterpriseAssignments.findFirst({
    where: and(
      eq(melEnterpriseAssignments.businessId, businessId),
      eq(melEnterpriseAssignments.collectorId, collectorId),
      eq(melEnterpriseAssignments.isActive, true)
    ),
    columns: { id: true },
  });
  return Boolean(assignment);
}

async function assertBusinessAccess(actor: MelMonitoringActor, businessId: number) {
  if (actor.canAccessAllEnterprises) return;
  if (!(await hasActiveAssignment(businessId, actor.id))) {
    throw new Error("This enterprise is not assigned to you");
  }
}

async function loadProfile(businessId: number) {
  const [profile] = await db
    .select({
      businessName: businesses.name,
      enterpriseId: businesses.id,
      applicantName: sql<string>`${applicants.firstName} || ' ' || ${applicants.lastName}`,
      applicantGender: applicants.gender,
      applicantDob: applicants.dob,
      sector: businesses.sector,
      track: applications.track,
      county: businesses.county,
      city: businesses.city,
    })
    .from(businesses)
    .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
    .innerJoin(applications, eq(applications.businessId, businesses.id))
    .where(eq(businesses.id, businessId))
    .limit(1);
  if (!profile) throw new Error("Enterprise not found");
  return profile;
}

export async function getMelMonitoringWorkspace(): Promise<ActionResponse<MelMonitoringWorkspace>> {
  try {
    const actor = await requireMelCollector();
    const [periods, baseRows, assignments, submissions, collectorRows] = await Promise.all([
      db.query.melReportingPeriods.findMany({
        where: ne(melReportingPeriods.status, "archived"),
        orderBy: [asc(melReportingPeriods.startDate)],
      }),
      db
        .select({
          businessId: businesses.id,
          businessName: businesses.name,
          applicantName: sql<string>`${applicants.firstName} || ' ' || ${applicants.lastName}`,
          email: applicants.email,
          track: applications.track,
          sector: businesses.sector,
          county: businesses.county,
        })
        .from(businesses)
        .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
        .innerJoin(applications, eq(applications.businessId, businesses.id))
        .where(ne(applications.status, "rejected"))
        .orderBy(asc(businesses.name)),
      db.query.melEnterpriseAssignments.findMany({
        where: eq(melEnterpriseAssignments.isActive, true),
      }),
      db.query.melMonitoringSubmissions.findMany({
        orderBy: [desc(melMonitoringSubmissions.updatedAt)],
      }),
      actor.canAccessAllEnterprises
        ? db
            .select({
              id: userProfiles.userId,
              name: sql<string>`${userProfiles.firstName} || ' ' || ${userProfiles.lastName}`,
              role: userProfiles.role,
            })
            .from(userProfiles)
            .where(inArray(userProfiles.role, ["bds_edo", "redo"]))
            .orderBy(asc(userProfiles.firstName))
        : Promise.resolve([]),
    ]);

    const visible = actor.canAccessAllEnterprises
      ? baseRows
      : baseRows.filter((row) =>
          assignments.some((assignment) => assignment.businessId === row.businessId && assignment.collectorId === actor.id)
        );

    return successResponse({
      actor,
      periods,
      collectors: collectorRows.map((collector) => ({
        id: collector.id,
        name: collector.name,
        role: collector.role,
      })),
      rows: visible.map((row) => ({
        ...row,
        assignedCollectorIds: assignments
          .filter((assignment) => assignment.businessId === row.businessId)
          .map((assignment) => assignment.collectorId),
        submissions: submissions
          .filter((submission) => submission.businessId === row.businessId)
          .map((submission) => ({
            id: submission.id,
            reportingPeriodId: submission.reportingPeriodId,
            status: submission.status,
            sourceMode: submission.sourceMode,
            updatedAt: submission.updatedAt,
          })),
      })),
    });
  } catch (error) {
    console.error("getMelMonitoringWorkspace", error);
    return actionError(error, "Failed to load enterprise monitoring");
  }
}

export async function assignMelEnterpriseAction(
  _previous: ActionResponse<{ assigned: true }> | null,
  formData: FormData
): Promise<ActionResponse<{ assigned: true }>> {
  try {
    const actor = await requireMelCollector();
    if (!actor.canAccessAllEnterprises) return errorResponse("Only REDO or admin can assign enterprises");
    const businessId = z.coerce.number().int().positive().parse(formData.get("businessId"));
    const collectorId = z.string().min(1).parse(formData.get("collectorId"));

    const profile = await db.query.userProfiles.findFirst({
      where: and(eq(userProfiles.userId, collectorId), inArray(userProfiles.role, ["bds_edo", "redo"])),
    });
    if (!profile) return errorResponse("Select an eligible EDO or REDO");

    await db.transaction(async (tx) => {
      await tx
        .insert(melEnterpriseAssignments)
        .values({ businessId, collectorId, assignedById: actor.id })
        .onConflictDoNothing();
      await tx.insert(melAuditEvents).values({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "mel_enterprise_assignment",
        entityId: `${businessId}:${collectorId}`,
        action: "assigned",
        after: { businessId, collectorId },
        correlationId: randomUUID(),
      });
    });
    revalidatePath("/admin/mel/monitoring");
    return successResponse({ assigned: true }, "Enterprise assigned");
  } catch (error) {
    return actionError(error, "Failed to assign enterprise");
  }
}

export async function startMelMonitoringAction(
  _previous: ActionResponse<{ businessId: number; periodId: number }> | null,
  formData: FormData
): Promise<ActionResponse<{ businessId: number; periodId: number }>> {
  try {
    await requireMelRolloutFeature("collection");
    const actor = await requireMelCollector();
    const businessId = z.coerce.number().int().positive().parse(formData.get("businessId"));
    const periodId = z.coerce.number().int().positive().parse(formData.get("periodId"));
    await assertBusinessAccess(actor, businessId);

    const period = await db.query.melReportingPeriods.findFirst({
      where: eq(melReportingPeriods.id, periodId),
    });
    if (!period || period.status === "planned" || period.status === "archived") {
      return errorResponse("This reporting period is not available for collection");
    }
    if (period.status === "closed" && !period.allowCatchUp) {
      return errorResponse("Catch-up submission is disabled for this period");
    }

    const profile = await loadProfile(businessId);
    const [stored] = await db
      .insert(melMonitoringSubmissions)
      .values({
        businessId,
        reportingPeriodId: periodId,
        collectorId: actor.id,
        collectorRole: actor.role,
        sourceMode: period.status === "open" ? "current" : "catch_up",
        profileSnapshot: {
          ...profile,
          applicantDob: profile.applicantDob.toISOString().slice(0, 10),
          capturedAt: new Date().toISOString(),
        },
      })
      .onConflictDoNothing()
      .returning({ id: melMonitoringSubmissions.id });

    const existing =
      stored ??
      (await db.query.melMonitoringSubmissions.findFirst({
        where: and(
          eq(melMonitoringSubmissions.businessId, businessId),
          eq(melMonitoringSubmissions.reportingPeriodId, periodId),
          eq(melMonitoringSubmissions.instrumentCode, INSTRUMENT_CODE)
        ),
        columns: { id: true },
      }));
    if (!existing) throw new Error("Failed to start or resume the report");

    revalidatePath("/admin/mel/monitoring");
    return successResponse({ businessId, periodId }, stored ? "Draft started" : "Existing report resumed");
  } catch (error) {
    return actionError(error, "Failed to start monitoring report");
  }
}

export async function getMelMonitoringDetail(
  businessId: number,
  periodId: number
): Promise<ActionResponse<MelMonitoringDetail>> {
  try {
    const actor = await requireMelCollector();
    await assertBusinessAccess(actor, businessId);
    const [submission, period, profile, settings, financialBaseline] = await Promise.all([
      db.query.melMonitoringSubmissions.findFirst({
        where: and(
          eq(melMonitoringSubmissions.businessId, businessId),
          eq(melMonitoringSubmissions.reportingPeriodId, periodId),
          eq(melMonitoringSubmissions.instrumentCode, INSTRUMENT_CODE)
        ),
        with: {
          response: true,
          financeEntries: true,
          jobs: true,
          waste: true,
          evidence: true,
        },
      }),
      db.query.melReportingPeriods.findFirst({ where: eq(melReportingPeriods.id, periodId) }),
      loadProfile(businessId),
      db.query.melProgrammeSettings.findFirst({ where: eq(melProgrammeSettings.id, 1) }),
      db.query.melEnterpriseFinancialBaselines.findFirst({ where: and(eq(melEnterpriseFinancialBaselines.businessId, businessId), eq(melEnterpriseFinancialBaselines.status, "active")) }),
    ]);
    if (!submission || !period) return errorResponse("Monitoring report not found");
    if (!actor.canAccessAllEnterprises && submission.collectorId !== actor.id) {
      return errorResponse("This report belongs to another collector");
    }

    // Load evidence references in flat queries — deep nested `with` joins hit a
    // PostgreSQL LATERAL alias bug in Drizzle's relational query builder.
    const evidenceReferenceRows = await db.query.melMonitoringEvidenceReferences.findMany({
      where: eq(melMonitoringEvidenceReferences.submissionId, submission.id),
      with: { sourceEvidence: true },
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
    const snapshot = submission.profileSnapshot;
    const stableProfile = {
      businessName: typeof snapshot.businessName === "string" ? snapshot.businessName : profile.businessName,
      enterpriseId: typeof snapshot.enterpriseId === "number" ? snapshot.enterpriseId : profile.enterpriseId,
      applicantName: typeof snapshot.applicantName === "string" ? snapshot.applicantName : profile.applicantName,
      applicantGender: typeof snapshot.applicantGender === "string" ? snapshot.applicantGender : profile.applicantGender,
      applicantDob:
        typeof snapshot.applicantDob === "string" && !Number.isNaN(Date.parse(snapshot.applicantDob))
          ? new Date(`${snapshot.applicantDob}T00:00:00Z`)
          : profile.applicantDob,
      sector: typeof snapshot.sector === "string" ? snapshot.sector : profile.sector,
      track: typeof snapshot.track === "string" ? snapshot.track : profile.track,
      county: typeof snapshot.county === "string" ? snapshot.county : profile.county,
      city: typeof snapshot.city === "string" ? snapshot.city : profile.city,
    };

    const approvedAchievements = await db
      .select({ code: melIndicatorDefinitions.code })
      .from(melEnterpriseAchievements)
      .innerJoin(melIndicatorDefinitions, eq(melIndicatorDefinitions.id, melEnterpriseAchievements.indicatorId))
      .where(
        and(
          eq(melEnterpriseAchievements.businessId, businessId),
          eq(melEnterpriseAchievements.status, "approved")
        )
      );

    const cumulativeRows = await db
      .select({
        jobType: melMonitoringJobs.jobType,
        total: sql<number>`coalesce(sum(${melMonitoringJobs.quarterlyTotal}), 0)::int`,
        male: sql<number>`coalesce(sum(${melMonitoringJobs.male}), 0)::int`,
        female: sql<number>`coalesce(sum(${melMonitoringJobs.female}), 0)::int`,
        youth: sql<number>`coalesce(sum(${melMonitoringJobs.youth}), 0)::int`,
        plwd: sql<number>`coalesce(sum(${melMonitoringJobs.plwd}), 0)::int`,
        refugee: sql<number>`coalesce(sum(${melMonitoringJobs.refugee}), 0)::int`,
      })
      .from(melMonitoringJobs)
      .innerJoin(melMonitoringSubmissions, eq(melMonitoringSubmissions.id, melMonitoringJobs.submissionId))
      .where(
        and(
          eq(melMonitoringSubmissions.businessId, businessId),
          inArray(melMonitoringSubmissions.status, ["submitted", "resubmitted"])
        )
      )
      .groupBy(melMonitoringJobs.jobType);
    const emptyJobs = { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 };

    const priorApprovedSubmissions = await db.query.melMonitoringSubmissions.findMany({
      where: and(
        eq(melMonitoringSubmissions.businessId, businessId),
        eq(melMonitoringSubmissions.status, "approved")
      ),
      with: { reportingPeriod: true, response: true },
    });
    const eligiblePriorSubmissions = priorApprovedSubmissions.filter(
      (item) => item.id !== submission.id && item.reportingPeriod.endDate < period.endDate
    ).sort((left, right) => right.reportingPeriod.endDate.localeCompare(left.reportingPeriod.endDate));
    const priorFinancialSubmission = eligiblePriorSubmissions.find((item) => item.response?.revenue !== null && item.response?.costs !== null && item.response?.profitLoss !== null);
    const priorEvidence = eligiblePriorSubmissions.length
      ? await db.query.melMonitoringEvidence.findMany({
          where: and(
            inArray(melMonitoringEvidence.submissionId, eligiblePriorSubmissions.map((item) => item.id)),
            eq(melMonitoringEvidence.status, "active")
          ),
          with: { reviews: true },
        })
      : [];
    const priorSubmissionById = new Map(eligiblePriorSubmissions.map((item) => [item.id, item]));
    const reusableEvidence = priorEvidence
      .filter(
        (item) =>
          item.reviews.some((review) => review.status === "verified") &&
          MONITORING_QUESTIONS[item.questionCode as MonitoringQuestionCode]?.oneTime
      )
      .map((item) => {
        const source = priorSubmissionById.get(item.submissionId)!;
        return {
          questionCode: item.questionCode,
          evidenceId: item.id,
          fileName: item.fileName,
          fileUrl: item.fileUrl,
          sourceSubmissionId: source.id,
          sourcePeriodLabel: source.reportingPeriod.label,
          approvedAt: source.approvedAt,
        };
      });

    const approvalSummary =
      submission.status === "approved"
        ? await buildReportApprovalSummary({
            submissionId: submission.id,
            submissionVersion: submission.submissionVersion,
            businessId,
            reportingPeriodId: periodId,
            collectorId: submission.collectorId,
            approvedAt: submission.approvedAt ?? new Date(),
            reviewerNote: await loadApprovalReviewerNote(submission.id),
            response: (submission.response ?? null) as Record<string, unknown> | null,
          })
        : null;

    return successResponse({
      actor,
      submission,
      response: submission.response ?? null,
      financeEntries: submission.financeEntries,
      jobs: submission.jobs,
      waste: submission.waste,
      evidence: submission.evidence.filter((item) => item.status === "active"),
      evidenceReferences,
      reusableEvidence,
      period,
      profile: stableProfile,
      approvedOneTimeCodes: approvedAchievements
        .map(({ code }) => ONE_TIME_QUESTION_BY_INDICATOR[code])
        .filter((code): code is MonitoringQuestionCode => Boolean(code)),
      cumulativeJobs: {
        direct: cumulativeRows.find((row) => row.jobType === "direct") ?? emptyJobs,
        indirect: cumulativeRows.find((row) => row.jobType === "indirect") ?? emptyJobs,
      },
      includeRefugee: settings?.includeRefugeeDisaggregation ?? false,
      financialBaseline: financialBaseline ?? null,
      priorApprovedFinancials: priorFinancialSubmission?.response ? {
        label: priorFinancialSubmission.reportingPeriod.label,
        revenue: Number(priorFinancialSubmission.response.revenue),
        costs: Number(priorFinancialSubmission.response.costs),
        profit: Number(priorFinancialSubmission.response.profitLoss),
      } : null,
      financialVarianceThresholdPercent: Number(settings?.financialVarianceThresholdPercent ?? 100),
      approvalSummary,
    });
  } catch (error) {
    console.error("getMelMonitoringDetail", error);
    return actionError(error, "Failed to load monitoring report");
  }
}

export async function saveMelMonitoringAction(
  _previous: ActionResponse<{ submitted: boolean }> | null,
  formData: FormData
): Promise<ActionResponse<{ submitted: boolean }>> {
  try {
    await requireMelRolloutFeature("collection");
    const actor = await requireMelCollector();
    const submissionId = z.coerce.number().int().positive().parse(formData.get("submissionId"));
    const intent = z.enum(["save", "submit"]).parse(formData.get("intent"));
    let input = parseMonitoringFormData(formData);
    const submission = await db.query.melMonitoringSubmissions.findFirst({
      where: eq(melMonitoringSubmissions.id, submissionId),
    });
    if (!submission) return errorResponse("Monitoring report not found");
    await assertBusinessAccess(actor, submission.businessId);
    if (!actor.canAccessAllEnterprises && submission.collectorId !== actor.id) {
      return errorResponse("This report belongs to another collector");
    }
    if (!isCollectorEditableStatus(submission.status)) {
      return errorResponse("A submitted report cannot be edited until it is returned");
    }

    const period = await db.query.melReportingPeriods.findFirst({
      where: eq(melReportingPeriods.id, submission.reportingPeriodId),
    });
    if (!period) return errorResponse("Reporting period not found");
    const snapshotSector = submission.profileSnapshot.sector;
    const sector = typeof snapshotSector === "string" ? snapshotSector : (await loadProfile(submission.businessId)).sector;
    const wasteEligible = sector === "waste_management";
    input = normalizeMonitoringDraft(input, wasteEligible);

    const requestedReferences = Object.entries(input.reusedEvidenceIds);
    const requestedEvidenceIds = requestedReferences.map(([, evidenceId]) => evidenceId);
    const reusableSourceEvidence = requestedEvidenceIds.length
      ? await db.query.melMonitoringEvidence.findMany({
          where: inArray(melMonitoringEvidence.id, requestedEvidenceIds),
          with: {
            reviews: true,
            submission: { with: { reportingPeriod: true } },
          },
        })
      : [];
    for (const [questionCode, evidenceId] of requestedReferences) {
      const source = reusableSourceEvidence.find((item) => item.id === evidenceId);
      const question = MONITORING_QUESTIONS[questionCode as MonitoringQuestionCode];
      if (
        !source || !question?.oneTime || source.questionCode !== questionCode || source.status !== "active" ||
        source.submission.businessId !== submission.businessId || source.submission.status !== "approved" ||
        source.submission.reportingPeriod.endDate >= period.endDate ||
        !source.reviews.some((review) => review.status === "verified")
      ) {
        return errorResponse(`Approved prior evidence is required for ${questionCode.replaceAll("_", " ")}`);
      }
      if (question.field) {
        (input as unknown as Record<string, unknown>)[question.field] = true;
      }
    }

    const evidence = await db.query.melMonitoringEvidence.findMany({
      where: and(
        eq(melMonitoringEvidence.submissionId, submissionId),
        eq(melMonitoringEvidence.status, "active")
      ),
    });
    const approvedAchievements = await db
      .select({ code: melIndicatorDefinitions.code })
      .from(melEnterpriseAchievements)
      .innerJoin(melIndicatorDefinitions, eq(melIndicatorDefinitions.id, melEnterpriseAchievements.indicatorId))
      .where(
        and(
          eq(melEnterpriseAchievements.businessId, submission.businessId),
          eq(melEnterpriseAchievements.status, "approved")
        )
      );
    const [settings, financialBaseline, priorApprovedSubmissions] = await Promise.all([
      db.query.melProgrammeSettings.findFirst({ where: eq(melProgrammeSettings.id, 1) }),
      db.query.melEnterpriseFinancialBaselines.findFirst({ where: and(eq(melEnterpriseFinancialBaselines.businessId, submission.businessId), eq(melEnterpriseFinancialBaselines.status, "active")) }),
      db.query.melMonitoringSubmissions.findMany({ where: and(eq(melMonitoringSubmissions.businessId, submission.businessId), eq(melMonitoringSubmissions.status, "approved")), with: { reportingPeriod: true, response: true } }),
    ]);
    const oneTimeIndicators = await db
      .select({ id: melIndicatorDefinitions.id, code: melIndicatorDefinitions.code })
      .from(melIndicatorDefinitions)
      .where(inArray(melIndicatorDefinitions.code, Object.keys(ONE_TIME_QUESTION_BY_INDICATOR)));
    const approvedCodes = new Set(
      approvedAchievements
        .map(({ code }) => ONE_TIME_QUESTION_BY_INDICATOR[code])
        .filter((code): code is MonitoringQuestionCode => Boolean(code))
    );

    const profitLoss = input.revenue === null || input.costs === null ? null : calculateProfitLoss(input.revenue, input.costs);
    const priorFinancial = priorApprovedSubmissions
      .filter((item) => item.id !== submission.id && item.reportingPeriod.endDate < period.endDate && item.response?.revenue !== null && item.response?.costs !== null)
      .sort((left, right) => right.reportingPeriod.endDate.localeCompare(left.reportingPeriod.endDate))[0];
    const baselineSnapshot = financialBaseline ? {
      id: financialBaseline.id, effectiveDate: financialBaseline.effectiveDate,
      revenue: Number(financialBaseline.monthlyRevenue), costs: Number(financialBaseline.monthlyCosts), profit: Number(financialBaseline.monthlyProfit),
    } : null;
    const financialComparison = input.revenue === null || input.costs === null ? null : calculateFinancialComparison({
      quarterly: { revenue: input.revenue, costs: input.costs, profit: profitLoss ?? undefined },
      baseline: baselineSnapshot ? { label: `Baseline at ${baselineSnapshot.effectiveDate}`, ...baselineSnapshot } : null,
      priorApprovedQuarter: priorFinancial?.response ? { label: priorFinancial.reportingPeriod.label, revenue: Number(priorFinancial.response.revenue), costs: Number(priorFinancial.response.costs), profit: Number(priorFinancial.response.profitLoss) } : null,
      thresholdPercent: Number(settings?.financialVarianceThresholdPercent ?? 100),
    });
    if (!financialComparison?.explanationRequired) input = { ...input, financialChangeExplanation: null };

    if (intent === "submit") {
      const issues = monitoringSubmissionIssues(
        input,
        new Set([...evidence.map((item) => item.questionCode), ...requestedReferences.map(([code]) => code)]),
        approvedCodes,
        settings?.includeRefugeeDisaggregation ?? false,
        wasteEligible,
        financialComparison?.explanationRequired ?? false
      );
      if (issues.length > 0) return errorResponse(issues.join(" • "));
    }

    const isCorrection = ["returned", "returned_by_redo", "returned_by_mel", "reopened"].includes(
      submission.status
    );
    const nextStatus = intent === "submit" ? "submitted" : submission.status;

    await db.transaction(async (tx) => {
      await tx
        .update(melMonitoringSubmissions)
        .set({
          visitDate: input.visitDate,
          status: nextStatus,
          submissionVersion: intent === "submit" ? submission.submissionVersion + 1 : submission.submissionVersion,
          resubmissionCount:
            intent === "submit" && isCorrection
              ? submission.resubmissionCount + 1
              : submission.resubmissionCount,
          submittedAt: intent === "submit" ? new Date() : submission.submittedAt,
          approvedAt: intent === "submit" && submission.status === "reopened" ? null : submission.approvedAt,
          approvedById: intent === "submit" && submission.status === "reopened" ? null : submission.approvedById,
          lastSavedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(melMonitoringSubmissions.id, submissionId));

      await tx
        .insert(melMonitoringResponses)
        .values({
          submissionId,
          ...responseValues(input, profitLoss, baselineSnapshot, financialComparison),
        })
        .onConflictDoUpdate({
          target: melMonitoringResponses.submissionId,
          set: { ...responseValues(input, profitLoss, baselineSnapshot, financialComparison), updatedAt: new Date() },
        });

      await tx.delete(melMonitoringFinanceEntries).where(eq(melMonitoringFinanceEntries.submissionId, submissionId));
      if (input.financeEntries.length > 0) {
        await tx.insert(melMonitoringFinanceEntries).values(
          input.financeEntries.map((entry) => ({
            submissionId,
            financeType: entry.financeType,
            otherDescription: entry.financeType === "other" ? entry.otherDescription : null,
            amount: String(entry.amount ?? 0),
          }))
        );
      }

      await tx.delete(melMonitoringEvidenceReferences).where(eq(melMonitoringEvidenceReferences.submissionId, submissionId));
      if (requestedReferences.length > 0) {
        await tx.insert(melMonitoringEvidenceReferences).values(
          requestedReferences.map(([questionCode, sourceEvidenceId]) => ({
            submissionId,
            questionCode,
            sourceEvidenceId,
            createdById: actor.id,
          }))
        );
      }

      for (const [jobType, row] of [["direct", input.directJobs], ["indirect", input.indirectJobs]] as const) {
        await tx
          .insert(melMonitoringJobs)
          .values({
            submissionId,
            jobType,
            quarterlyTotal: row.total,
            male: row.male,
            female: row.female,
            youth: row.youth,
            plwd: row.plwd,
            refugee: settings?.includeRefugeeDisaggregation ? row.refugee : 0,
          })
          .onConflictDoUpdate({
            target: [melMonitoringJobs.submissionId, melMonitoringJobs.jobType],
            set: {
              quarterlyTotal: row.total,
              male: row.male,
              female: row.female,
              youth: row.youth,
              plwd: row.plwd,
              refugee: settings?.includeRefugeeDisaggregation ? row.refugee : 0,
              updatedAt: new Date(),
            },
          });
      }
      if (wasteEligible) {
        for (const stream of WASTE_STREAMS) {
          await tx
            .insert(melMonitoringWaste)
            .values({ submissionId, wasteStream: stream, kilograms: String(input.waste[stream] ?? 0) })
            .onConflictDoUpdate({
              target: [melMonitoringWaste.submissionId, melMonitoringWaste.wasteStream],
              set: { kilograms: String(input.waste[stream] ?? 0), updatedAt: new Date() },
            });
        }
      } else {
        await tx.delete(melMonitoringWaste).where(eq(melMonitoringWaste.submissionId, submissionId));
      }
      await tx.insert(melAuditEvents).values({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "mel_monitoring_submission",
        entityId: String(submissionId),
        action: intent === "submit" ? "submitted" : "draft_saved",
        before: { status: submission.status, version: submission.submissionVersion },
        after: { status: nextStatus, profitLoss },
        correlationId: randomUUID(),
      });
      if (intent === "submit") {
        for (const indicator of oneTimeIndicators) {
          const questionCode = ONE_TIME_QUESTION_BY_INDICATOR[indicator.code];
          const field = questionCode.replace(/_([a-z])/g, (_, letter: string) =>
            letter.toUpperCase()
          ) as keyof typeof input;
          if (input[field] !== true || approvedCodes.has(questionCode)) continue;
          const supportingEvidence = evidence.find((item) => item.questionCode === questionCode);
          const referencedEvidence = reusableSourceEvidence.find(
            (item) => item.id === input.reusedEvidenceIds[questionCode]
          );
          await tx
            .insert(melEnterpriseAchievements)
            .values({
              businessId: submission.businessId,
              indicatorId: indicator.id,
              firstSubmissionId: submissionId,
              evidenceId: supportingEvidence?.id ?? referencedEvidence?.id,
              status: "pending",
            })
            .onConflictDoNothing();
        }
      }
    });

    revalidatePath("/admin/mel/monitoring");
    revalidatePath(`/admin/mel/monitoring/${submission.businessId}/${submission.reportingPeriodId}`);
    return successResponse(
      { submitted: intent === "submit" },
      intent === "submit" ? "Report submitted for REDO review" : "Draft saved"
    );
  } catch (error) {
    console.error("saveMelMonitoringAction", error);
    return actionError(error, "Failed to save monitoring report");
  }
}

function responseValues(
  input: ReturnType<typeof parseMonitoringFormData>,
  profitLoss: number | null,
  baselineSnapshot: Record<string, unknown> | null,
  financialComparison: FinancialComparison | null
): Omit<typeof melMonitoringResponses.$inferInsert, "submissionId"> {
  return {
    businessPlanImproved: input.businessPlanImproved,
    revenue: input.revenue === null ? null : String(input.revenue),
    costs: input.costs === null ? null : String(input.costs),
    profitLoss: profitLoss === null ? null : String(profitLoss),
    financialChangeExplanation: input.financialChangeExplanation,
    financialBaselineSnapshot: baselineSnapshot,
    financialComparisonSnapshot: financialComparison,
    marketResearchCompleted: input.marketResearchCompleted,
    marketIntelligenceAccessed: input.marketIntelligenceAccessed,
    newMarketSegments: input.newMarketSegments,
    technologyAdopted: input.technologyAdopted,
    technologyDetails: input.technologyDetails,
    newProductsDeveloped: input.newProductsDeveloped,
    newProductsDetails: input.newProductsDetails,
    linkedToFinanceProvider: input.linkedToFinanceProvider,
    financeType: null,
    financeTypeOther: null,
    financeValue: input.linkedToFinanceProvider
      ? String(input.financeEntries.reduce((sum, entry) => sum + (entry.amount ?? 0), 0))
      : null,
    financialPlanCompleted: input.financialPlanCompleted,
    activeInsurance: input.activeInsurance,
    investorReadinessCompleted: input.investorReadinessCompleted,
    lifeCycleAssessmentCompleted: input.lifeCycleAssessmentCompleted,
    ecoCertificationActive: input.ecoCertificationActive,
    esgReportCompleted: input.esgReportCompleted,
    socialSafeguardingGuidelines: input.socialSafeguardingGuidelines,
    strategicPartnerships: input.strategicPartnerships,
    strategicPartnershipCount: input.strategicPartnershipCount,
    strategicPartnershipDetails: input.strategicPartnershipDetails,
    forumParticipation: input.forumParticipation,
    publicPrivatePartnership: input.publicPrivatePartnership,
    publicPrivatePartnershipDetails: input.publicPrivatePartnershipDetails,
    mainChallenges: input.mainChallenges,
    negativeProgrammeImpacts: input.negativeProgrammeImpacts,
    additionalSupportNeeded: input.additionalSupportNeeded,
    collectorComment: input.collectorComment,
  };
}

export async function attachMelMonitoringEvidenceAction(input: {
  submissionId: number;
  questionCode: string;
  fileKey: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  replacesEvidenceId?: number;
}): Promise<ActionResponse<{ id: number }>> {
  try {
    const actor = await requireMelCollector();
    const parsed = z.object({
      submissionId: z.number().int().positive(),
      questionCode: z.string().trim().min(2).max(100),
      fileKey: z.string().trim().min(1).max(255),
      fileUrl: z.string().url(),
      fileName: z.string().trim().min(1).max(255),
      fileType: z.string().trim().min(1).max(150),
      fileSize: z.number().int().nonnegative().optional(),
      replacesEvidenceId: z.number().int().positive().optional(),
    }).parse(input);
    const submission = await db.query.melMonitoringSubmissions.findFirst({
      where: eq(melMonitoringSubmissions.id, parsed.submissionId),
    });
    if (!submission) return errorResponse("Monitoring report not found");
    await assertBusinessAccess(actor, submission.businessId);
    if (!isCollectorEditableStatus(submission.status)) return errorResponse("Submitted evidence is locked");

    const created = await db.transaction(async (tx) => {
      if (parsed.replacesEvidenceId) {
        const replaced = await tx.query.melMonitoringEvidence.findFirst({
          where: and(
            eq(melMonitoringEvidence.id, parsed.replacesEvidenceId),
            eq(melMonitoringEvidence.submissionId, parsed.submissionId),
            eq(melMonitoringEvidence.status, "active")
          ),
        });
        if (!replaced) throw new Error("The evidence being replaced is no longer active");
        await tx
          .update(melMonitoringEvidence)
          .set({ status: "removed", removedAt: new Date() })
          .where(eq(melMonitoringEvidence.id, replaced.id));
      }
      const [inserted] = await tx
        .insert(melMonitoringEvidence)
        .values({ ...parsed, uploaderId: actor.id })
        .returning({ id: melMonitoringEvidence.id });
      return inserted;
    });
    if (!created) throw new Error("Failed to attach evidence");
    revalidatePath(`/admin/mel/monitoring/${submission.businessId}/${submission.reportingPeriodId}`);
    return successResponse(created, "Evidence attached");
  } catch (error) {
    return actionError(error, "Failed to attach evidence");
  }
}

export async function removeMelMonitoringEvidenceAction(input: {
  evidenceId: number;
  reason: string;
}): Promise<ActionResponse<{ removed: true }>> {
  try {
    const actor = await requireMelCollector();
    const parsed = z.object({
      evidenceId: z.number().int().positive(),
      reason: z.string().trim().min(5).max(1000),
    }).parse(input);
    const evidence = await db.query.melMonitoringEvidence.findFirst({
      where: eq(melMonitoringEvidence.id, parsed.evidenceId),
      with: { submission: true },
    });
    if (!evidence) return errorResponse("Evidence not found");
    await assertBusinessAccess(actor, evidence.submission.businessId);
    if (!isCollectorEditableStatus(evidence.submission.status)) return errorResponse("Submitted evidence is locked");
    await db.transaction(async (tx) => {
      await tx
        .update(melMonitoringEvidence)
        .set({ status: "removed", removedAt: new Date() })
        .where(eq(melMonitoringEvidence.id, parsed.evidenceId));
      await tx.insert(melAuditEvents).values({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "mel_monitoring_evidence",
        entityId: String(parsed.evidenceId),
        action: "removed",
        reason: parsed.reason,
        before: { status: evidence.status, fileKey: evidence.fileKey },
        after: { status: "removed" },
        correlationId: randomUUID(),
      });
    });
    revalidatePath(`/admin/mel/monitoring/${evidence.submission.businessId}/${evidence.submission.reportingPeriodId}`);
    return successResponse({ removed: true }, "Evidence removed");
  } catch (error) {
    return actionError(error, "Failed to remove evidence");
  }
}
