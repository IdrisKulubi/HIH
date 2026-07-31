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
  melEnterpriseAssignments,
  melIndicatorDefinitions,
  melMonitoringEvidence,
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
import { requireMelCollector, type MelMonitoringActor } from "@/lib/mel/monitoring-access";
import {
  monitoringSubmissionIssues,
  parseMonitoringFormData,
  WASTE_STREAMS,
} from "@/lib/mel/monitoring-validation";

const INSTRUMENT_CODE = "quarterly_enterprise_monitoring";
const ONE_TIME_QUESTION_BY_INDICATOR: Record<string, string> = {
  "OP1.2-IMPROVED-BUSINESS-PLANS": "business_plan_improved",
  "OP2.1-FINANCIAL-PLANS": "financial_plan_completed",
  "OP2.1-INVESTOR-READINESS": "investor_readiness_completed",
  "OP3.1-LIFE-CYCLE-ASSESSMENTS": "life_cycle_assessment_completed",
  "OP3.1-ESG-REPORTS": "esg_report_completed",
  "OP3.2-SOCIAL-SAFEGUARDS": "social_safeguarding_guidelines",
};

export type MelMonitoringWorkspaceRow = {
  businessId: number;
  businessName: string;
  applicantName: string;
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
  jobs: Array<typeof melMonitoringJobs.$inferSelect>;
  waste: Array<typeof melMonitoringWaste.$inferSelect>;
  evidence: Array<typeof melMonitoringEvidence.$inferSelect>;
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
    const [submission, period, profile, settings] = await Promise.all([
      db.query.melMonitoringSubmissions.findFirst({
        where: and(
          eq(melMonitoringSubmissions.businessId, businessId),
          eq(melMonitoringSubmissions.reportingPeriodId, periodId),
          eq(melMonitoringSubmissions.instrumentCode, INSTRUMENT_CODE)
        ),
        with: { response: true, jobs: true, waste: true, evidence: true },
      }),
      db.query.melReportingPeriods.findFirst({ where: eq(melReportingPeriods.id, periodId) }),
      loadProfile(businessId),
      db.query.melProgrammeSettings.findFirst({ where: eq(melProgrammeSettings.id, 1) }),
    ]);
    if (!submission || !period) return errorResponse("Monitoring report not found");
    if (!actor.canAccessAllEnterprises && submission.collectorId !== actor.id) {
      return errorResponse("This report belongs to another collector");
    }

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

    return successResponse({
      actor,
      submission,
      response: submission.response ?? null,
      jobs: submission.jobs,
      waste: submission.waste,
      evidence: submission.evidence.filter((item) => item.status === "active"),
      period,
      profile,
      approvedOneTimeCodes: approvedAchievements
        .map(({ code }) => ONE_TIME_QUESTION_BY_INDICATOR[code])
        .filter((code): code is string => Boolean(code)),
      cumulativeJobs: {
        direct: cumulativeRows.find((row) => row.jobType === "direct") ?? emptyJobs,
        indirect: cumulativeRows.find((row) => row.jobType === "indirect") ?? emptyJobs,
      },
      includeRefugee: settings?.includeRefugeeDisaggregation ?? false,
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
    const actor = await requireMelCollector();
    const submissionId = z.coerce.number().int().positive().parse(formData.get("submissionId"));
    const intent = z.enum(["save", "submit"]).parse(formData.get("intent"));
    const input = parseMonitoringFormData(formData);
    const submission = await db.query.melMonitoringSubmissions.findFirst({
      where: eq(melMonitoringSubmissions.id, submissionId),
    });
    if (!submission) return errorResponse("Monitoring report not found");
    await assertBusinessAccess(actor, submission.businessId);
    if (!actor.canAccessAllEnterprises && submission.collectorId !== actor.id) {
      return errorResponse("This report belongs to another collector");
    }
    if (["submitted", "resubmitted"].includes(submission.status)) {
      return errorResponse("A submitted report cannot be edited until it is returned");
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
    const settings = await db.query.melProgrammeSettings.findFirst({
      where: eq(melProgrammeSettings.id, 1),
    });
    const approvedCodes = new Set(
      approvedAchievements
        .map(({ code }) => ONE_TIME_QUESTION_BY_INDICATOR[code])
        .filter((code): code is string => Boolean(code))
    );

    if (intent === "submit") {
      const issues = monitoringSubmissionIssues(
        input,
        new Set(evidence.map((item) => item.questionCode)),
        approvedCodes,
        settings?.includeRefugeeDisaggregation ?? false
      );
      if (issues.length > 0) return errorResponse(issues.join(" • "));
    }

    const profitLoss =
      input.revenue === null || input.costs === null ? null : calculateProfitLoss(input.revenue, input.costs);
    const nextStatus =
      intent === "submit" ? (submission.status === "returned" ? "resubmitted" : "submitted") : submission.status;

    await db.transaction(async (tx) => {
      await tx
        .update(melMonitoringSubmissions)
        .set({
          visitDate: input.visitDate,
          status: nextStatus,
          submissionVersion: intent === "submit" ? submission.submissionVersion + 1 : submission.submissionVersion,
          resubmissionCount:
            intent === "submit" && submission.status === "returned"
              ? submission.resubmissionCount + 1
              : submission.resubmissionCount,
          submittedAt: intent === "submit" ? new Date() : submission.submittedAt,
          lastSavedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(melMonitoringSubmissions.id, submissionId));

      await tx
        .insert(melMonitoringResponses)
        .values({
          submissionId,
          ...responseValues(input, profitLoss),
        })
        .onConflictDoUpdate({
          target: melMonitoringResponses.submissionId,
          set: { ...responseValues(input, profitLoss), updatedAt: new Date() },
        });

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
      for (const stream of WASTE_STREAMS) {
        await tx
          .insert(melMonitoringWaste)
          .values({ submissionId, wasteStream: stream, kilograms: String(input.waste[stream] ?? 0) })
          .onConflictDoUpdate({
            target: [melMonitoringWaste.submissionId, melMonitoringWaste.wasteStream],
            set: { kilograms: String(input.waste[stream] ?? 0), updatedAt: new Date() },
          });
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
  profitLoss: number | null
): Omit<typeof melMonitoringResponses.$inferInsert, "submissionId"> {
  return {
    businessPlanImproved: input.businessPlanImproved,
    revenue: input.revenue === null ? null : String(input.revenue),
    costs: input.costs === null ? null : String(input.costs),
    profitLoss: profitLoss === null ? null : String(profitLoss),
    financialChangeExplanation: input.financialChangeExplanation,
    marketResearchCompleted: input.marketResearchCompleted,
    marketIntelligenceAccessed: input.marketIntelligenceAccessed,
    newMarketSegments: input.newMarketSegments,
    technologyAdopted: input.technologyAdopted,
    technologyDetails: input.technologyDetails,
    newProductsDeveloped: input.newProductsDeveloped,
    newProductsDetails: input.newProductsDetails,
    linkedToFinanceProvider: input.linkedToFinanceProvider,
    financeType: input.financeType,
    financeTypeOther: input.financeTypeOther,
    financeValue: input.financeValue === null ? null : String(input.financeValue),
    financialPlanCompleted: input.financialPlanCompleted,
    activeInsurance: input.activeInsurance,
    investorReadinessCompleted: input.investorReadinessCompleted,
    lifeCycleAssessmentCompleted: input.lifeCycleAssessmentCompleted,
    ecoCertificationActive: input.ecoCertificationActive,
    esgReportCompleted: input.esgReportCompleted,
    socialSafeguardingGuidelines: input.socialSafeguardingGuidelines,
    circularGrowthReported: input.circularGrowthReported,
    circularGrowthValue: input.circularGrowthValue === null ? null : String(input.circularGrowthValue),
    strategicPartnerships: input.strategicPartnerships,
    strategicPartnershipDetails: input.strategicPartnershipDetails,
    forumParticipation: input.forumParticipation,
    forumDetails: input.forumDetails,
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
    }).parse(input);
    const submission = await db.query.melMonitoringSubmissions.findFirst({
      where: eq(melMonitoringSubmissions.id, parsed.submissionId),
    });
    if (!submission) return errorResponse("Monitoring report not found");
    await assertBusinessAccess(actor, submission.businessId);
    if (["submitted", "resubmitted"].includes(submission.status)) return errorResponse("Submitted evidence is locked");

    const [created] = await db
      .insert(melMonitoringEvidence)
      .values({ ...parsed, uploaderId: actor.id })
      .returning({ id: melMonitoringEvidence.id });
    if (!created) throw new Error("Failed to attach evidence");
    revalidatePath(`/admin/mel/monitoring/${submission.businessId}/${submission.reportingPeriodId}`);
    return successResponse(created, "Evidence attached");
  } catch (error) {
    return actionError(error, "Failed to attach evidence");
  }
}

export async function removeMelMonitoringEvidenceAction(evidenceId: number): Promise<ActionResponse<{ removed: true }>> {
  try {
    const actor = await requireMelCollector();
    const evidence = await db.query.melMonitoringEvidence.findFirst({
      where: eq(melMonitoringEvidence.id, evidenceId),
      with: { submission: true },
    });
    if (!evidence) return errorResponse("Evidence not found");
    await assertBusinessAccess(actor, evidence.submission.businessId);
    if (["submitted", "resubmitted"].includes(evidence.submission.status)) return errorResponse("Submitted evidence is locked");
    await db
      .update(melMonitoringEvidence)
      .set({ status: "removed", removedAt: new Date() })
      .where(eq(melMonitoringEvidence.id, evidenceId));
    revalidatePath(`/admin/mel/monitoring/${evidence.submission.businessId}/${evidence.submission.reportingPeriodId}`);
    return successResponse({ removed: true }, "Evidence removed");
  } catch (error) {
    return actionError(error, "Failed to remove evidence");
  }
}
