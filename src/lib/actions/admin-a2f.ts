"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  a2fMatchingGrantApplications,
  a2fPipeline,
  a2fPreScreeningAttempts,
  a2fPreScreeningOverrides,
  a2fScoring,
  a2fScoringOverrides,
  applicants,
  applications,
  businesses,
  dueDiligenceRecords,
  investmentAppraisals,
  userProfiles,
} from "@/db/schema";
import type { MatchingGrantScores } from "@/lib/a2f-constants";
import {
  isPreScreeningOutcome,
  resolveEffectivePreScreeningOutcome,
  validatePreScreeningOutcomeOverride,
  type PreScreeningOutcome,
} from "@/lib/a2f-pre-screening-outcome";
import { qualifiedDdApplicationsWhere } from "@/lib/due-diligence-qualification";
import { sendA2fScreeningPassEmail } from "@/lib/email";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { errorResponse, successResponse, type ActionResponse } from "./types";

export interface AdminA2fPreScreeningRow {
  applicationId: number;
  businessName: string;
  applicantName: string;
  track: string | null;
  ddScore: number;
  attemptId: number | null;
  status: "not_screened" | "draft" | "submitted";
  reviewerName: string | null;
  originalScore: number | null;
  originalOutcome: PreScreeningOutcome | null;
  effectiveOutcome: PreScreeningOutcome | null;
  assessedAt: string | null;
  hardStopReasons: string[];
}

export interface AdminA2fPipelineRow {
  a2fId: number;
  applicationId: number;
  businessName: string;
  track: string | null;
  financeApplicationStatus: string;
  stage: string;
  preIcScore: number | null;
  scores: MatchingGrantScores | null;
  officerName: string | null;
  nextAction: string;
}

export interface AdminA2fOverrideHistoryRow {
  id: string;
  kind: "pre_screening" | "pre_ic";
  businessName: string;
  before: string;
  after: string;
  reason: string;
  adminName: string;
  createdAt: string;
}

export interface AdminA2fDashboardData {
  overview: {
    notScreened: number;
    beingScored: number;
    completed: number;
    passed: number;
    conditional: number;
    stopped: number;
    pipelineCases: number;
    preIcScored: number;
    pendingCommittee: number;
  };
  preScreening: AdminA2fPreScreeningRow[];
  pipeline: AdminA2fPipelineRow[];
  overrides: AdminA2fOverrideHistoryRow[];
}

async function requireAdmin() {
  const session = await auth();
  return session?.user?.id && session.user.role === "admin" ? session.user : null;
}

function stageNextAction(stage: string, financeStatus: string) {
  if (financeStatus === "not_started") return "Await finance application";
  if (financeStatus === "draft") return "Applicant to complete application";
  const labels: Record<string, string> = {
    a2f_pipeline: "Start initial due diligence",
    due_diligence_initial: "Complete initial due diligence",
    pre_ic_scoring: "Complete Pre-IC scoring",
    ic_appraisal_review: "Committee review",
    offer_issued: "Prepare contracting",
    contracting: "Complete contracting",
    disbursement_active: "Monitor disbursement",
    post_ta_monitoring: "Post-TA monitoring",
  };
  return labels[stage] ?? "Review case";
}

export async function getAdminA2fDashboardData(): Promise<
  ActionResponse<AdminA2fDashboardData>
> {
  try {
    if (!(await requireAdmin())) return errorResponse("Unauthorized");

    const candidates = await db
      .select({
        applicationId: applications.id,
        businessName: businesses.name,
        applicantFirstName: applicants.firstName,
        applicantLastName: applicants.lastName,
        track: applications.track,
        ddScore: dueDiligenceRecords.phase1Score,
      })
      .from(applications)
      .innerJoin(businesses, eq(businesses.id, applications.businessId))
      .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
      .innerJoin(dueDiligenceRecords, eq(dueDiligenceRecords.applicationId, applications.id))
      .where(qualifiedDdApplicationsWhere)
      .orderBy(desc(dueDiligenceRecords.validatorActionAt));

    const applicationIds = candidates.map((row) => row.applicationId);
    const attempts = applicationIds.length
      ? await db
          .select()
          .from(a2fPreScreeningAttempts)
          .where(inArray(a2fPreScreeningAttempts.applicationId, applicationIds))
          .orderBy(desc(a2fPreScreeningAttempts.createdAt))
      : [];
    const attemptIds = attempts.map((row) => row.id);
    const preOverrides = attemptIds.length
      ? await db
          .select()
          .from(a2fPreScreeningOverrides)
          .where(inArray(a2fPreScreeningOverrides.attemptId, attemptIds))
          .orderBy(desc(a2fPreScreeningOverrides.createdAt))
      : [];

    const activeDraftByApplication = new Map<number, (typeof attempts)[number]>();
    const submittedByApplication = new Map<number, (typeof attempts)[number]>();
    for (const attempt of attempts) {
      if (attempt.status === "draft" && !activeDraftByApplication.has(attempt.applicationId)) {
        activeDraftByApplication.set(attempt.applicationId, attempt);
      }
      if (
        attempt.status === "submitted" &&
        !submittedByApplication.has(attempt.applicationId)
      ) {
        submittedByApplication.set(attempt.applicationId, attempt);
      }
    }
    const latestOverrideByAttempt = new Map<number, (typeof preOverrides)[number]>();
    for (const row of preOverrides) {
      if (!latestOverrideByAttempt.has(row.attemptId)) {
        latestOverrideByAttempt.set(row.attemptId, row);
      }
    }

    const userIds = [
      ...new Set([
        ...attempts.map((row) => row.assignedReviewerId),
        ...preOverrides.map((row) => row.createdById),
      ]),
    ];
    const profiles = userIds.length
      ? await db
          .select({
            userId: userProfiles.userId,
            name: sql<string>`TRIM(CONCAT(${userProfiles.firstName}, ' ', ${userProfiles.lastName}))`,
          })
          .from(userProfiles)
          .where(inArray(userProfiles.userId, userIds))
      : [];
    const names = new Map(profiles.map((row) => [row.userId, row.name]));

    const preScreening = candidates.map<AdminA2fPreScreeningRow>((candidate) => {
      const draft = activeDraftByApplication.get(candidate.applicationId);
      const submitted = submittedByApplication.get(candidate.applicationId);
      const displayAttempt = draft ?? submitted;
      const latestOverride = submitted
        ? latestOverrideByAttempt.get(submitted.id)
        : undefined;
      return {
        applicationId: candidate.applicationId,
        businessName: candidate.businessName,
        applicantName:
          `${candidate.applicantFirstName} ${candidate.applicantLastName}`.trim(),
        track: candidate.track,
        ddScore: candidate.ddScore ?? 0,
        attemptId: displayAttempt?.id ?? null,
        status: draft ? "draft" : submitted ? "submitted" : "not_screened",
        reviewerName: displayAttempt
          ? names.get(displayAttempt.assignedReviewerId) ?? "Assigned reviewer"
          : null,
        originalScore: submitted?.totalScore ?? null,
        originalOutcome: isPreScreeningOutcome(submitted?.outcome)
          ? submitted.outcome
          : null,
        effectiveOutcome: resolveEffectivePreScreeningOutcome(
          submitted?.outcome,
          latestOverride?.newOutcome
        ),
        assessedAt: submitted?.assessedAt?.toISOString() ?? null,
        hardStopReasons: submitted?.hardStopReasons ?? [],
      };
    });

    const effectivePassApplicationIds = preScreening
      .filter((row) => row.effectiveOutcome === "pass")
      .map((row) => row.applicationId);
    const pipelines = effectivePassApplicationIds.length
      ? await db
          .select()
          .from(a2fPipeline)
          .where(inArray(a2fPipeline.applicationId, effectivePassApplicationIds))
          .orderBy(desc(a2fPipeline.updatedAt))
      : [];
    const pipelineIds = pipelines.map((row) => row.id);
    const matchingApplications = pipelineIds.length
      ? await db
          .select()
          .from(a2fMatchingGrantApplications)
          .where(inArray(a2fMatchingGrantApplications.a2fId, pipelineIds))
      : [];
    const scoring = pipelineIds.length
      ? await db
          .select()
          .from(a2fScoring)
          .where(inArray(a2fScoring.a2fId, pipelineIds))
          .orderBy(desc(a2fScoring.updatedAt))
      : [];
    const appraisals = pipelineIds.length
      ? await db
          .select()
          .from(investmentAppraisals)
          .where(inArray(investmentAppraisals.a2fId, pipelineIds))
      : [];

    const officerIds = [
      ...new Set(pipelines.map((row) => row.a2fOfficerId).filter((id): id is string => Boolean(id))),
    ];
    const officerProfiles = officerIds.length
      ? await db
          .select({
            userId: userProfiles.userId,
            name: sql<string>`TRIM(CONCAT(${userProfiles.firstName}, ' ', ${userProfiles.lastName}))`,
          })
          .from(userProfiles)
          .where(inArray(userProfiles.userId, officerIds))
      : [];
    const officerNames = new Map(officerProfiles.map((row) => [row.userId, row.name]));
    const matchingByPipeline = new Map(matchingApplications.map((row) => [row.a2fId, row]));
    const scoringByPipeline = new Map<number, (typeof scoring)[number]>();
    for (const row of scoring) {
      if (!scoringByPipeline.has(row.a2fId)) scoringByPipeline.set(row.a2fId, row);
    }
    const candidateByApplication = new Map(
      candidates.map((row) => [row.applicationId, row])
    );

    const pipeline = pipelines.map<AdminA2fPipelineRow>((row) => {
      const candidate = candidateByApplication.get(row.applicationId);
      const financeApplication = matchingByPipeline.get(row.id);
      const score = scoringByPipeline.get(row.id);
      const financeApplicationStatus = financeApplication?.status ?? "not_started";
      return {
        a2fId: row.id,
        applicationId: row.applicationId,
        businessName: candidate?.businessName ?? `Application #${row.applicationId}`,
        track: candidate?.track ?? null,
        financeApplicationStatus,
        stage: row.status,
        preIcScore: score?.totalScore ?? null,
        scores: (score?.scores as MatchingGrantScores | undefined) ?? null,
        officerName: row.a2fOfficerId
          ? officerNames.get(row.a2fOfficerId) ?? "Assigned officer"
          : null,
        nextAction: stageNextAction(row.status, financeApplicationStatus),
      };
    });

    const scoringOverrideRows = await db
      .select()
      .from(a2fScoringOverrides)
      .orderBy(desc(a2fScoringOverrides.createdAt));
    const scoringOverrideAdminIds = [
      ...new Set(scoringOverrideRows.map((row) => row.createdById)),
    ];
    const missingAdminIds = scoringOverrideAdminIds.filter((id) => !names.has(id));
    if (missingAdminIds.length) {
      const extraProfiles = await db
        .select({
          userId: userProfiles.userId,
          name: sql<string>`TRIM(CONCAT(${userProfiles.firstName}, ' ', ${userProfiles.lastName}))`,
        })
        .from(userProfiles)
        .where(inArray(userProfiles.userId, missingAdminIds));
      for (const profile of extraProfiles) names.set(profile.userId, profile.name);
    }
    const auditPipelineIds = [
      ...new Set(scoringOverrideRows.map((row) => row.a2fId)),
    ];
    const auditPipelines = auditPipelineIds.length
      ? await db
          .select()
          .from(a2fPipeline)
          .where(inArray(a2fPipeline.id, auditPipelineIds))
      : [];
    const pipelineById = new Map(
      [...pipelines, ...auditPipelines].map((row) => [row.id, row])
    );
    const overrides: AdminA2fOverrideHistoryRow[] = [
      ...preOverrides.map((row) => {
        const attempt = attempts.find((item) => item.id === row.attemptId);
        const candidate = attempt
          ? candidateByApplication.get(attempt.applicationId)
          : undefined;
        return {
          id: `pre-${row.id}`,
          kind: "pre_screening" as const,
          businessName: candidate?.businessName ?? "Unknown enterprise",
          before: row.previousOutcome,
          after: row.newOutcome,
          reason: row.reason,
          adminName: names.get(row.createdById) ?? "Administrator",
          createdAt: row.createdAt.toISOString(),
        };
      }),
      ...scoringOverrideRows.map((row) => {
        const pipelineRow = pipelineById.get(row.a2fId);
        const candidate = pipelineRow
          ? candidateByApplication.get(pipelineRow.applicationId)
          : undefined;
        return {
          id: `score-${row.id}`,
          kind: "pre_ic" as const,
          businessName: candidate?.businessName ?? "Unknown enterprise",
          before: `${row.previousTotal} points`,
          after: `${row.newTotal} points`,
          reason: row.reason,
          adminName: names.get(row.createdById) ?? "Administrator",
          createdAt: row.createdAt.toISOString(),
        };
      }),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return successResponse({
      overview: {
        notScreened: preScreening.filter((row) => row.status === "not_screened").length,
        beingScored: preScreening.filter((row) => row.status === "draft").length,
        completed: preScreening.filter((row) => row.originalOutcome !== null).length,
        passed: preScreening.filter((row) => row.effectiveOutcome === "pass").length,
        conditional: preScreening.filter((row) => row.effectiveOutcome === "conditional").length,
        stopped: preScreening.filter((row) => row.effectiveOutcome === "stop").length,
        pipelineCases: pipeline.length,
        preIcScored: pipeline.filter((row) => row.preIcScore !== null).length,
        pendingCommittee: new Set(
          appraisals
            .filter((row) => !row.icDecision && pipelineIds.includes(row.a2fId))
            .map((row) => row.a2fId)
        ).size,
      },
      preScreening,
      pipeline,
      overrides,
    });
  } catch (error) {
    console.error("Failed to load admin A2F dashboard:", error);
    return errorResponse("Failed to load the A2F administration dashboard");
  }
}

async function sendInvitation(attemptId: number, applicationId: number) {
  const [application] = await db
    .select({
      applicantEmail: applicants.email,
      applicantFirstName: applicants.firstName,
      applicantLastName: applicants.lastName,
      businessName: businesses.name,
    })
    .from(applications)
    .innerJoin(businesses, eq(businesses.id, applications.businessId))
    .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!application) return "failed";
  const result = await sendA2fScreeningPassEmail({
    userEmail: application.applicantEmail,
    applicantName:
      `${application.applicantFirstName} ${application.applicantLastName}`.trim(),
    businessName: application.businessName,
    applicationUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://bire-platform.org"}/access-to-finance`,
  });
  await db
    .update(a2fPreScreeningAttempts)
    .set({
      invitationStatus: result.success ? "sent" : "failed",
      invitationSentAt: result.success ? new Date() : null,
      invitationError: result.success ? null : result.error ?? "Email delivery failed",
      invitationAttempts: sql`${a2fPreScreeningAttempts.invitationAttempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(a2fPreScreeningAttempts.id, attemptId));
  return result.success ? "sent" : "failed";
}

export async function overridePreScreeningOutcome(
  attemptId: number,
  newOutcome: PreScreeningOutcome,
  reason: string
): Promise<ActionResponse<{ effectiveOutcome: PreScreeningOutcome; emailStatus?: string }>> {
  try {
    const admin = await requireAdmin();
    if (!admin) return errorResponse("Unauthorized");
    if (!isPreScreeningOutcome(newOutcome)) return errorResponse("Invalid outcome");
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 5) {
      return errorResponse("Enter a clear reason for this override");
    }

    const attempt = await db.query.a2fPreScreeningAttempts.findFirst({
      where: and(
        eq(a2fPreScreeningAttempts.id, attemptId),
        eq(a2fPreScreeningAttempts.status, "submitted")
      ),
    });
    if (!attempt || !isPreScreeningOutcome(attempt.outcome)) {
      return errorResponse("Only submitted assessments can be overridden");
    }
    const latestOverride = await db.query.a2fPreScreeningOverrides.findFirst({
      where: eq(a2fPreScreeningOverrides.attemptId, attemptId),
      orderBy: [desc(a2fPreScreeningOverrides.createdAt)],
    });
    const currentOutcome = resolveEffectivePreScreeningOutcome(
      attempt.outcome,
      latestOverride?.newOutcome
    );
    if (!currentOutcome) return errorResponse("Assessment outcome is invalid");

    const pipeline = await db.query.a2fPipeline.findFirst({
      where: eq(a2fPipeline.applicationId, attempt.applicationId),
    });
    const matchingGrantDraft = pipeline
      ? await db.query.a2fMatchingGrantApplications.findFirst({
          where: eq(a2fMatchingGrantApplications.a2fId, pipeline.id),
        })
      : null;
    const transitionError = validatePreScreeningOutcomeOverride({
      currentOutcome,
      newOutcome,
      hardStopReasons: attempt.hardStopReasons,
      matchingGrantDraftExists: Boolean(matchingGrantDraft),
    });
    if (transitionError) return errorResponse(transitionError);

    await db.insert(a2fPreScreeningOverrides).values({
      attemptId,
      previousOutcome: currentOutcome,
      newOutcome,
      reason: trimmedReason,
      createdById: admin.id,
    });

    let emailStatus: string | undefined;
    if (newOutcome === "pass") {
      if (pipeline) {
        await db
          .update(a2fPipeline)
          .set({ screeningRequired: false, updatedAt: new Date() })
          .where(eq(a2fPipeline.id, pipeline.id));
      } else {
        const [business] = await db
          .select({ annualRevenue: businesses.revenueLastYear })
          .from(applications)
          .innerJoin(businesses, eq(businesses.id, applications.businessId))
          .where(eq(applications.id, attempt.applicationId))
          .limit(1);
        await db.insert(a2fPipeline).values({
          applicationId: attempt.applicationId,
          instrumentType: "matching_grant",
          requestedAmount: String(Number(business?.annualRevenue ?? 0) || 1),
          screeningRequired: false,
          status: "a2f_pipeline",
          notes: "Created after an audited admin pre-screening outcome override",
        });
      }
      if (attempt.invitationStatus !== "sent") {
        emailStatus = await sendInvitation(attempt.id, attempt.applicationId);
      }
    } else if (currentOutcome === "pass" && pipeline) {
      await db
        .update(a2fPipeline)
        .set({ screeningRequired: true, updatedAt: new Date() })
        .where(eq(a2fPipeline.id, pipeline.id));
    }

    revalidatePath("/admin/a2f");
    revalidatePath("/finance-screening");
    revalidatePath(`/finance-screening/${attemptId}`);
    revalidatePath("/a2f");
    revalidatePath("/access-to-finance");
    revalidatePath("/profile");
    return successResponse({ effectiveOutcome: newOutcome, emailStatus });
  } catch (error) {
    console.error("Failed to override pre-screening outcome:", error);
    return errorResponse("Failed to apply the outcome override");
  }
}
