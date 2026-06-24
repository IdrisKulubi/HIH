"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  a2fPreScreeningAttempts,
  a2fPreScreeningOverrides,
  applicants,
  applications,
  businesses,
  dueDiligenceRecords,
  userProfiles,
} from "@/db/schema";
import {
  calculatePreScreening,
  isTrackRevenueValid,
  type PreScreeningRatings,
  type PreScreeningTrack,
} from "@/lib/a2f-pre-screening";
import { getEffectiveScreeningForApplication } from "@/lib/server/a2f-effective-screening";
import { isPreScreeningOutcome, resolveEffectivePreScreeningOutcome } from "@/lib/a2f-pre-screening-outcome";
import { isRescreenDateReached } from "@/lib/a2f-pre-screening-rescreen";
import { a2fScreeningCandidateWhere } from "@/lib/a2f-screening-cohort";
import { ensureA2fPipelineEntryForApplication } from "@/lib/server/a2f-pipeline-sync";
import {
  formatRevenueTrackMismatchError,
  syncApplicationTrackForRevenue,
} from "@/lib/server/a2f-track-sync";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { errorResponse, successResponse, type ActionResponse } from "./types";

const SCREENING_ROLES = ["admin", "bds_edo", "redo"] as const;
const REVIEWER_ROLES = ["bds_edo", "redo"] as const;
function isScreeningRole(role?: string | null) {
  return SCREENING_ROLES.includes(role as (typeof SCREENING_ROLES)[number]);
}
function isReviewerRole(role?: string | null) {
  return REVIEWER_ROLES.includes(role as (typeof REVIEWER_ROLES)[number]);
}

function normalizeTrack(track: string | null): PreScreeningTrack | null {
  if (track === "foundation") return "foundation";
  if (track === "acceleration") return "acceleration";
  return null;
}

async function resolveScreeningTrack(
  applicationId: number,
  currentTrack: PreScreeningTrack,
  annualRevenue: number
): Promise<{ ok: true; track: PreScreeningTrack } | { ok: false; error: string }> {
  if (isTrackRevenueValid(currentTrack, annualRevenue)) {
    return { ok: true, track: currentTrack };
  }

  const synced = await syncApplicationTrackForRevenue(applicationId, annualRevenue);
  if (synced && isTrackRevenueValid(synced.track, annualRevenue)) {
    return { ok: true, track: synced.track };
  }

  return { ok: false, error: formatRevenueTrackMismatchError(annualRevenue) };
}

async function requireScreeningUser() {
  const session = await auth();
  if (!session?.user?.id || !isScreeningRole(session.user.role)) return null;
  return session.user;
}

const screeningCandidateWhere = a2fScreeningCandidateWhere;

async function getScreeningApplication(applicationId: number) {
  const [row] = await db
    .select({
      applicationId: applications.id,
      track: applications.track,
      businessName: businesses.name,
      annualRevenue: businesses.revenueLastYear,
      applicantFirstName: applicants.firstName,
      applicantLastName: applicants.lastName,
      applicantEmail: applicants.email,
      ddScore: dueDiligenceRecords.phase1Score,
      ddStatus: dueDiligenceRecords.ddStatus,
    })
    .from(applications)
    .innerJoin(businesses, eq(businesses.id, applications.businessId))
    .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
    .innerJoin(
      dueDiligenceRecords,
      eq(dueDiligenceRecords.applicationId, applications.id)
    )
    .where(
      and(eq(applications.id, applicationId), screeningCandidateWhere)
    )
    .limit(1);
  return row ?? null;
}

export interface PreScreeningQueueItem {
  applicationId: number;
  businessName: string;
  applicantName: string;
  county: string | null;
  track: string | null;
  annualRevenue: number;
  ddScore: number | null;
  latestAttemptId: number | null;
  latestStatus: string | null;
  latestOutcome: string | null;
  latestScore: number | null;
  assignedReviewerId: string | null;
  assignedReviewerName: string | null;
  isMine: boolean;
  rescreenEligibleAt: string | null;
  invitationStatus: string | null;
  canOpen: boolean;
  canClaim: boolean;
}

export async function getPreScreeningQueue(): Promise<
  ActionResponse<PreScreeningQueueItem[]>
> {
  try {
    const user = await requireScreeningUser();
    if (!user) return errorResponse("Unauthorized");

    const candidates = await db
      .select({
        applicationId: applications.id,
        businessName: businesses.name,
        county: businesses.county,
        track: applications.track,
        annualRevenue: businesses.revenueLastYear,
        applicantFirstName: applicants.firstName,
        applicantLastName: applicants.lastName,
        ddScore: dueDiligenceRecords.phase1Score,
        ddStatus: dueDiligenceRecords.ddStatus,
      })
      .from(applications)
      .innerJoin(businesses, eq(businesses.id, applications.businessId))
      .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
      .innerJoin(
        dueDiligenceRecords,
        eq(dueDiligenceRecords.applicationId, applications.id)
      )
      .where(screeningCandidateWhere)
      .orderBy(desc(dueDiligenceRecords.validatorActionAt));

    const applicationIds = candidates.map((item) => item.applicationId);
    const attempts = applicationIds.length
      ? await db
          .select()
          .from(a2fPreScreeningAttempts)
          .where(inArray(a2fPreScreeningAttempts.applicationId, applicationIds))
          .orderBy(desc(a2fPreScreeningAttempts.createdAt))
      : [];

    const latestByApplication = new Map<number, (typeof attempts)[number]>();
    for (const attempt of attempts) {
      if (!latestByApplication.has(attempt.applicationId)) {
        latestByApplication.set(attempt.applicationId, attempt);
      }
    }
    const attemptIds = attempts.map((item) => item.id);
    const overrides = attemptIds.length
      ? await db
          .select()
          .from(a2fPreScreeningOverrides)
          .where(inArray(a2fPreScreeningOverrides.attemptId, attemptIds))
          .orderBy(desc(a2fPreScreeningOverrides.createdAt))
      : [];
    const latestOverrideByAttempt = new Map<number, (typeof overrides)[number]>();
    for (const override of overrides) {
      if (!latestOverrideByAttempt.has(override.attemptId)) {
        latestOverrideByAttempt.set(override.attemptId, override);
      }
    }

    const reviewerIds = [
      ...new Set(attempts.map((item) => item.assignedReviewerId)),
    ];
    const reviewers = reviewerIds.length
      ? await db
          .select({
            userId: userProfiles.userId,
            name: sql<string>`CONCAT(${userProfiles.firstName}, ' ', ${userProfiles.lastName})`,
          })
          .from(userProfiles)
          .where(inArray(userProfiles.userId, reviewerIds))
      : [];
    const reviewerNames = new Map(reviewers.map((item) => [item.userId, item.name]));

    return successResponse(
      candidates.map((candidate) => {
        const latest = latestByApplication.get(candidate.applicationId);
        const effectiveOutcome =
          latest?.status === "submitted"
            ? resolveEffectivePreScreeningOutcome(
                latest.outcome,
                latestOverrideByAttempt.get(latest.id)?.newOutcome
              )
            : null;
        const canClaim = isReviewerRole(user.role);
        return {
          applicationId: candidate.applicationId,
          businessName: candidate.businessName,
          applicantName:
            `${candidate.applicantFirstName} ${candidate.applicantLastName}`.trim(),
          county: candidate.county,
          track: candidate.track,
          annualRevenue: Number(candidate.annualRevenue),
          ddScore: candidate.ddScore ?? null,
          latestAttemptId: latest?.id ?? null,
          latestStatus: latest?.status ?? null,
          latestOutcome: effectiveOutcome,
          latestScore: latest?.status === "submitted" ? latest.totalScore : null,
          assignedReviewerId:
            latest?.status === "draft" ? latest.assignedReviewerId : null,
          assignedReviewerName:
            latest?.status === "draft"
              ? reviewerNames.get(latest.assignedReviewerId) ?? "Assigned reviewer"
              : null,
          isMine:
            latest?.status === "draft" && latest.assignedReviewerId === user.id,
          rescreenEligibleAt: latest?.rescreenEligibleAt
            ? latest.rescreenEligibleAt.toISOString()
            : null,
          invitationStatus: latest?.invitationStatus ?? null,
          canOpen: latest
            ? latest.status === "submitted" ||
              (canClaim && latest.assignedReviewerId === user.id) ||
              user.role === "admin"
            : canClaim,
          canClaim,
        };
      })
    );
  } catch (error) {
    console.error("Failed to load A2F pre-screening queue:", error);
    return errorResponse("Failed to load screening queue");
  }
}

export async function getOrCreatePreScreeningDraft(
  applicationId: number
): Promise<ActionResponse<{ attemptId: number }>> {
  try {
    const user = await requireScreeningUser();
    if (!user) return errorResponse("Unauthorized");
    if (!isReviewerRole(user.role)) {
      return errorResponse("Only EDO/REDO reviewers can claim screening cases");
    }

    const application = await getScreeningApplication(applicationId);
    if (!application) {
      return errorResponse(
        "The enterprise must be a DD-qualified Foundation or Accelerator application before screening."
      );
    }
    const track = normalizeTrack(application.track);
    if (!track) return errorResponse("A Foundation or Accelerator track is required");

    const existingDraft = await db.query.a2fPreScreeningAttempts.findFirst({
      where: and(
        eq(a2fPreScreeningAttempts.applicationId, applicationId),
        eq(a2fPreScreeningAttempts.status, "draft")
      ),
    });
    if (existingDraft) {
      if (existingDraft.assignedReviewerId !== user.id) {
        return errorResponse("This enterprise is assigned to another reviewer");
      }
      return successResponse({ attemptId: existingDraft.id });
    }

    const latestSubmitted = await db.query.a2fPreScreeningAttempts.findFirst({
      where: and(
        eq(a2fPreScreeningAttempts.applicationId, applicationId),
        eq(a2fPreScreeningAttempts.status, "submitted")
      ),
      orderBy: [desc(a2fPreScreeningAttempts.assessedAt)],
    });
    const effectiveSubmitted = latestSubmitted
      ? await getEffectiveScreeningForApplication(applicationId)
      : null;
    if (effectiveSubmitted?.outcome === "pass") {
      return errorResponse("This enterprise has already passed screening");
    }
    if (effectiveSubmitted?.outcome === "stop") {
      return errorResponse("This enterprise has a final Stop outcome");
    }
    if (
      effectiveSubmitted?.outcome === "conditional" &&
      latestSubmitted?.rescreenEligibleAt &&
      !isRescreenDateReached(latestSubmitted.rescreenEligibleAt)
    ) {
      return errorResponse(
        `Re-screening is available on ${latestSubmitted.rescreenEligibleAt.toLocaleDateString("en-KE")}`
      );
    }

    const annualRevenue = Number(application.annualRevenue);
    const resolvedTrack = await resolveScreeningTrack(applicationId, track, annualRevenue);
    if (!resolvedTrack.ok) return errorResponse(resolvedTrack.error);
    const effectiveTrack = resolvedTrack.track;

    const calculated = calculatePreScreening(effectiveTrack, annualRevenue, {});
    const [draft] = await db
      .insert(a2fPreScreeningAttempts)
      .values({
        applicationId,
        track: effectiveTrack,
        assignedReviewerId: user.id,
        ratings: { revenue: calculated.ratings.revenue },
        scores: { revenue: calculated.scores.revenue },
        categoryScores: {
          "Financial Readiness & Co-Investment":
            calculated.scores.revenue ?? 0,
        },
      })
      .returning({ id: a2fPreScreeningAttempts.id });

    revalidatePath("/finance-screening");
    return successResponse({ attemptId: draft.id });
  } catch (error) {
    console.error("Failed to create A2F pre-screening draft:", error);
    return errorResponse("Failed to claim this enterprise for screening");
  }
}

export async function getPreScreeningWorkspace(attemptId: number) {
  try {
    const user = await requireScreeningUser();
    if (!user) return errorResponse("Unauthorized");

    const attempt = await db.query.a2fPreScreeningAttempts.findFirst({
      where: eq(a2fPreScreeningAttempts.id, attemptId),
    });
    if (!attempt) return errorResponse("Screening attempt not found");
    if (
      attempt.status === "draft" &&
      attempt.assignedReviewerId !== user.id &&
      user.role !== "admin"
    ) {
      return errorResponse("This screening is assigned to another reviewer");
    }

    const application = await getScreeningApplication(attempt.applicationId);
    if (!application) return errorResponse("Enterprise is no longer eligible for screening");
    const reviewer = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, attempt.assignedReviewerId),
    });
    const effective = attempt.status === "submitted"
      ? await getEffectiveScreeningForApplication(attempt.applicationId)
      : null;
    const effectiveOutcome =
      effective?.outcome ??
      (attempt.status === "submitted" && isPreScreeningOutcome(attempt.outcome)
        ? attempt.outcome
        : null);
    const canRescreen =
      attempt.status === "submitted" &&
      effectiveOutcome === "conditional" &&
      isReviewerRole(user.role) &&
      isRescreenDateReached(attempt.rescreenEligibleAt);

    return successResponse({
      attempt: {
        ...attempt,
        effectiveOutcome,
        rescreenEligibleAt: attempt.rescreenEligibleAt?.toISOString() ?? null,
        assessedAt: attempt.assessedAt?.toISOString() ?? null,
        createdAt: attempt.createdAt.toISOString(),
        updatedAt: attempt.updatedAt.toISOString(),
      },
      enterprise: {
        applicationId: application.applicationId,
        businessName: application.businessName,
        applicantName:
          `${application.applicantFirstName} ${application.applicantLastName}`.trim(),
        track: application.track,
        annualRevenue: Number(application.annualRevenue),
        ddScore: application.ddScore ?? 0,
      },
      reviewerName: reviewer
        ? `${reviewer.firstName} ${reviewer.lastName}`.trim()
        : user.email ?? "Assigned reviewer",
      canEdit:
        attempt.status === "draft" &&
        attempt.assignedReviewerId === user.id &&
        isReviewerRole(user.role),
      canRescreen,
    });
  } catch (error) {
    console.error("Failed to load screening workspace:", error);
    return errorResponse("Failed to load screening workspace");
  }
}

interface SaveScreeningInput {
  ratings: Partial<PreScreeningRatings>;
  notes?: string;
  rescreenEligibleAt?: string | null;
}

async function loadEditableAttempt(attemptId: number, userId: string) {
  const attempt = await db.query.a2fPreScreeningAttempts.findFirst({
    where: and(
      eq(a2fPreScreeningAttempts.id, attemptId),
      eq(a2fPreScreeningAttempts.status, "draft")
    ),
  });
  if (!attempt || attempt.assignedReviewerId !== userId) return null;
  return attempt;
}

export async function savePreScreeningDraft(
  attemptId: number,
  input: SaveScreeningInput
): Promise<ActionResponse<{ totalScore: number; outcome: string; missing: string[] }>> {
  try {
    const user = await requireScreeningUser();
    if (!user) return errorResponse("Unauthorized");
    if (!isReviewerRole(user.role)) return errorResponse("Only EDO/REDO reviewers can edit drafts");
    const attempt = await loadEditableAttempt(attemptId, user.id);
    if (!attempt) return errorResponse("Editable screening draft not found");
    const application = await getScreeningApplication(attempt.applicationId);
    if (!application) return errorResponse("Enterprise is no longer eligible for screening");

    const calculated = calculatePreScreening(
      attempt.track as PreScreeningTrack,
      Number(application.annualRevenue),
      input.ratings
    );
    await db
      .update(a2fPreScreeningAttempts)
      .set({
        ratings: calculated.ratings,
        scores: calculated.scores,
        categoryScores: calculated.categoryScores,
        hardStopReasons: calculated.hardStopReasons,
        totalScore: calculated.totalScore,
        notes: input.notes?.trim() || null,
        rescreenEligibleAt: input.rescreenEligibleAt
          ? new Date(`${input.rescreenEligibleAt}T00:00:00`)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(a2fPreScreeningAttempts.id, attemptId));

    return successResponse({
      totalScore: calculated.totalScore,
      outcome: calculated.outcome,
      missing: calculated.missing,
    });
  } catch (error) {
    console.error("Failed to save screening draft:", error);
    return errorResponse("Failed to save screening draft");
  }
}

function validateConditionalDate(value?: string | null) {
  if (!value) return "A re-screening date is required for a Conditional outcome";
  const selected = new Date(`${value}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return "Invalid re-screening date";
  const now = new Date();
  const min = new Date(now);
  min.setMonth(min.getMonth() + 3);
  min.setHours(0, 0, 0, 0);
  const max = new Date(now);
  max.setMonth(max.getMonth() + 6);
  max.setHours(23, 59, 59, 999);
  if (selected < min || selected > max) {
    return "Conditional re-screening must be scheduled between 3 and 6 months from today";
  }
  return null;
}

export async function submitPreScreening(
  attemptId: number,
  input: SaveScreeningInput
): Promise<ActionResponse<{ outcome: string; totalScore: number; emailStatus: string }>> {
  try {
    const user = await requireScreeningUser();
    if (!user) return errorResponse("Unauthorized");
    if (!isReviewerRole(user.role)) return errorResponse("Only EDO/REDO reviewers can submit assessments");
    const attempt = await loadEditableAttempt(attemptId, user.id);
    if (!attempt) return errorResponse("Editable screening draft not found");
    const application = await getScreeningApplication(attempt.applicationId);
    if (!application) {
      return errorResponse(
        "The enterprise is no longer eligible for screening"
      );
    }

    const track = attempt.track as PreScreeningTrack;
    const annualRevenue = Number(application.annualRevenue);
    const resolvedTrack = await resolveScreeningTrack(
      attempt.applicationId,
      track,
      annualRevenue
    );
    if (!resolvedTrack.ok) return errorResponse(resolvedTrack.error);
    const effectiveTrack = resolvedTrack.track;

    const calculated = calculatePreScreening(effectiveTrack, annualRevenue, input.ratings);
    if (calculated.missing.length) {
      return errorResponse("Complete every screening criterion before submitting");
    }
    if (calculated.outcome === "conditional") {
      const dateError = validateConditionalDate(input.rescreenEligibleAt);
      if (dateError) return errorResponse(dateError);
    }

    const invitationStatus =
      calculated.outcome === "pass" ? "pending" : "not_applicable";
    const submittedAt = new Date();
    const updated = await db
      .update(a2fPreScreeningAttempts)
      .set({
        status: "submitted",
        track: effectiveTrack,
        ratings: calculated.ratings,
        scores: calculated.scores,
        categoryScores: calculated.categoryScores,
        hardStopReasons: calculated.hardStopReasons,
        totalScore: calculated.totalScore,
        outcome: calculated.outcome,
        notes: input.notes?.trim() || null,
        assessedAt: submittedAt,
        rescreenEligibleAt:
          calculated.outcome === "conditional" && input.rescreenEligibleAt
            ? new Date(`${input.rescreenEligibleAt}T00:00:00`)
            : null,
        invitationStatus,
        updatedAt: submittedAt,
      })
      .where(
        and(
          eq(a2fPreScreeningAttempts.id, attemptId),
          eq(a2fPreScreeningAttempts.status, "draft")
        )
      )
      .returning({ id: a2fPreScreeningAttempts.id });
    if (!updated.length) return errorResponse("This screening was already submitted");

    if (calculated.outcome === "pass") {
      await ensureA2fPipelineEntryForApplication(attempt.applicationId, {
        notes: "Created when EDO/REDO submitted a Pass screening",
      });
    }

    revalidatePath("/finance-screening");
    revalidatePath(`/finance-screening/${attemptId}`);
    revalidatePath("/admin/a2f");
    revalidatePath("/a2f");
    revalidatePath("/access-to-finance");
    revalidatePath("/profile");
    return successResponse({
      outcome: calculated.outcome,
      totalScore: calculated.totalScore,
      emailStatus: invitationStatus,
    });
  } catch (error) {
    console.error("Failed to submit screening:", error);
    return errorResponse("Failed to submit screening");
  }
}

export async function resendPreScreeningInvitation(
  attemptId: number
): Promise<ActionResponse<{ emailStatus: string }>> {
  void attemptId;
  return errorResponse("A2F invites are sent by admin after due diligence is approved.");
}
