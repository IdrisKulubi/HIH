"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  applications,
  businesses,
  capacityDevelopmentPlans,
  cdpActivities,
  cdpActivityProgressReviews,
  cdpBusinessSupportSessions,
  cdpFocusSummary,
  cnaDiagnostics,
  type CapacityDevelopmentPlan,
  type CdpActivity,
  type CdpActivityProgressReview,
  type CdpBusinessSupportSession,
  type CdpFocusSummaryRow,
} from "@/db/schema";
import { suggestedFocusSummariesFromLegacyCna } from "@/lib/cdp/legacy-cna-bridge";
import { CDP_FOCUS_CODES, cdpFocusCodeSchema, cdpFocusSummaryInputSchema } from "@/lib/cdp/focus-areas";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { stringify } from "csv-stringify/sync";
import { z } from "zod";
import { ActionResponse, errorResponse, successResponse } from "./types";

const ADMIN_ROLES = ["admin", "oversight"] as const;

function isPhase2Admin(role?: string | null) {
  return !!role && ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

function revalidateCdpPaths(businessId: number, planId?: number) {
  revalidatePath("/admin/cdp");
  revalidatePath(`/admin/cdp/${businessId}`);
  if (planId != null) {
    revalidatePath(`/admin/cdp/${businessId}?planId=${planId}`);
  }
  revalidatePath("/cna");
}

function parseOptionalDate(s: string | null | undefined): string | null {
  if (s == null || String(s).trim() === "") return null;
  const d = z.string().date().safeParse(String(s).trim());
  return d.success ? d.data : null;
}

const createPlanSchema = z.object({
  businessId: z.number().int().positive(),
  diagnosticDate: z.string().date(),
  cdpReviewDate: z.string().date().optional().nullable(),
  leadStaffId: z.string().optional().nullable(),
  notes: z.string().max(16000).optional().nullable(),
  linkedCnaDiagnosticId: z.number().int().positive().optional().nullable(),
});

export type CdpPlanListItem = Pick<
  CapacityDevelopmentPlan,
  "id" | "businessId" | "status" | "diagnosticDate" | "cdpReviewDate" | "updatedAt"
>;

export type CdpPlanFull = CapacityDevelopmentPlan & {
  focusSummaries: CdpFocusSummaryRow[];
  activities: (CdpActivity & { progressReviews: CdpActivityProgressReview[] })[];
  supportSessions: CdpBusinessSupportSession[];
};

export async function listCdpPlansForBusiness(
  businessId: number
): Promise<ActionResponse<CdpPlanListItem[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const rows = await db.query.capacityDevelopmentPlans.findMany({
      where: eq(capacityDevelopmentPlans.businessId, businessId),
      orderBy: [desc(capacityDevelopmentPlans.updatedAt)],
      columns: {
        id: true,
        businessId: true,
        status: true,
        diagnosticDate: true,
        cdpReviewDate: true,
        updatedAt: true,
      },
    });
    return successResponse(rows);
  } catch (e) {
    console.error("listCdpPlansForBusiness", e);
    return errorResponse("Failed to load CDP plans");
  }
}

export async function getCdpPlanFull(planId: number): Promise<ActionResponse<CdpPlanFull>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const row = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, planId),
      with: {
        focusSummaries: {
          orderBy: [asc(cdpFocusSummary.focusCode)],
        },
        activities: {
          orderBy: [asc(cdpActivities.sortOrder), asc(cdpActivities.id)],
          with: { progressReviews: { orderBy: [asc(cdpActivityProgressReviews.reviewPeriod)] } },
        },
        supportSessions: { orderBy: [asc(cdpBusinessSupportSessions.sessionNumber)] },
      },
    });
    if (!row) return errorResponse("Plan not found");
    return successResponse(row as CdpPlanFull);
  } catch (e) {
    console.error("getCdpPlanFull", e);
    return errorResponse("Failed to load CDP plan");
  }
}

export async function createCdpPlan(
  input: z.infer<typeof createPlanSchema>
): Promise<ActionResponse<{ id: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const parsed = createPlanSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid plan data");

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, parsed.data.businessId),
    });
    if (!business) return errorResponse("Business not found");

    const result = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(capacityDevelopmentPlans)
        .values({
          businessId: parsed.data.businessId,
          diagnosticDate: parsed.data.diagnosticDate,
          cdpReviewDate: parseOptionalDate(parsed.data.cdpReviewDate ?? null),
          leadStaffId: parsed.data.leadStaffId?.trim() || null,
          notes: parsed.data.notes?.trim() || null,
          linkedCnaDiagnosticId: parsed.data.linkedCnaDiagnosticId ?? null,
          createdById: session.user!.id,
          status: "draft",
        })
        .returning({ id: capacityDevelopmentPlans.id });

      const planId = inserted.id;
      await tx.insert(cdpFocusSummary).values(
        CDP_FOCUS_CODES.map((focusCode) => ({
          planId,
          focusCode,
          score0to10: 0,
        }))
      );

      return planId;
    });

    revalidateCdpPaths(parsed.data.businessId, result);
    return successResponse({ id: result });
  } catch (e) {
    console.error("createCdpPlan", e);
    return errorResponse("Failed to create CDP plan");
  }
}

const updatePlanSchema = z.object({
  planId: z.number().int().positive(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  diagnosticDate: z.string().date().optional(),
  cdpReviewDate: z.string().optional().nullable(),
  leadStaffId: z.string().optional().nullable(),
  notes: z.string().max(16000).optional().nullable(),
  linkedCnaDiagnosticId: z.number().int().positive().optional().nullable(),
});

export async function updateCdpPlan(
  input: z.infer<typeof updatePlanSchema>
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const parsed = updatePlanSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid update");

    const existing = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, parsed.data.planId),
      columns: { id: true, businessId: true },
    });
    if (!existing) return errorResponse("Plan not found");

    const patch: Partial<typeof capacityDevelopmentPlans.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.status != null) patch.status = parsed.data.status;
    if (parsed.data.diagnosticDate != null) patch.diagnosticDate = parsed.data.diagnosticDate;
    if (parsed.data.cdpReviewDate !== undefined) {
      patch.cdpReviewDate = parseOptionalDate(parsed.data.cdpReviewDate);
    }
    if (parsed.data.leadStaffId !== undefined) {
      patch.leadStaffId = parsed.data.leadStaffId?.trim() || null;
    }
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes?.trim() || null;
    if (parsed.data.linkedCnaDiagnosticId !== undefined) {
      patch.linkedCnaDiagnosticId = parsed.data.linkedCnaDiagnosticId ?? null;
    }

    await db
      .update(capacityDevelopmentPlans)
      .set(patch)
      .where(eq(capacityDevelopmentPlans.id, parsed.data.planId));

    revalidateCdpPaths(existing.businessId, parsed.data.planId);
    return successResponse({ businessId: existing.businessId });
  } catch (e) {
    console.error("updateCdpPlan", e);
    return errorResponse("Failed to update plan");
  }
}

const bulkSummarySchema = z.object({
  planId: z.number().int().positive(),
  rows: z
    .array(cdpFocusSummaryInputSchema)
    .length(12)
    .refine(
      (rows) => new Set(rows.map((r) => r.focusCode)).size === 12,
      "Each focus code A–L must appear exactly once."
    ),
});

export async function importCdpSummariesFromLatestCna(
  planId: number
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const plan = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, planId),
      columns: { id: true, businessId: true },
    });
    if (!plan) return errorResponse("Plan not found");

    const latest = await db.query.cnaDiagnostics.findFirst({
      where: eq(cnaDiagnostics.businessId, plan.businessId),
      orderBy: [desc(cnaDiagnostics.conductedAt)],
    });
    if (!latest) {
      return errorResponse("No legacy CNA diagnostic found for this business. Record one under CNA first.");
    }

    const suggested = suggestedFocusSummariesFromLegacyCna({
      financialManagementScore: latest.financialManagementScore,
      marketReachScore: latest.marketReachScore,
      operationsScore: latest.operationsScore,
      complianceScore: latest.complianceScore,
    });

    for (const row of suggested) {
      await db
        .update(cdpFocusSummary)
        .set({
          score0to10: row.score0to10,
          keyGaps: row.keyGaps?.trim() || null,
          recommendedIntervention: row.recommendedIntervention?.trim() || null,
          responsibleStaff: row.responsibleStaff?.trim() || null,
          targetDate: parseOptionalDate(row.targetDate ?? null),
          updatedAt: new Date(),
        })
        .where(and(eq(cdpFocusSummary.planId, planId), eq(cdpFocusSummary.focusCode, row.focusCode)));
    }

    await db
      .update(capacityDevelopmentPlans)
      .set({
        linkedCnaDiagnosticId: latest.id,
        updatedAt: new Date(),
      })
      .where(eq(capacityDevelopmentPlans.id, planId));

    revalidateCdpPaths(plan.businessId, planId);
    return successResponse({ businessId: plan.businessId });
  } catch (e) {
    console.error("importCdpSummariesFromLatestCna", e);
    return errorResponse("Failed to import from latest CNA");
  }
}

export async function saveCdpFocusSummaries(
  input: z.infer<typeof bulkSummarySchema>
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const parsed = bulkSummarySchema.safeParse(input);
    if (!parsed.success) return errorResponse("Provide all 12 focus areas (A–L).");

    const plan = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, parsed.data.planId),
      columns: { id: true, businessId: true },
    });
    if (!plan) return errorResponse("Plan not found");

    for (const row of parsed.data.rows) {
      await db
        .update(cdpFocusSummary)
        .set({
          score0to10: row.score0to10,
          keyGaps: row.keyGaps?.trim() || null,
          recommendedIntervention: row.recommendedIntervention?.trim() || null,
          responsibleStaff: row.responsibleStaff?.trim() || null,
          targetDate: parseOptionalDate(row.targetDate ?? null),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(cdpFocusSummary.planId, parsed.data.planId),
            eq(cdpFocusSummary.focusCode, row.focusCode)
          )
        );
    }

    revalidateCdpPaths(plan.businessId, parsed.data.planId);
    return successResponse({ businessId: plan.businessId });
  } catch (e) {
    console.error("saveCdpFocusSummaries", e);
    return errorResponse("Failed to save diagnostic summary");
  }
}

const activityCreateSchema = z.object({
  planId: z.number().int().positive(),
  focusCode: cdpFocusCodeSchema,
  gapChallenge: z.string().max(8000).optional().nullable(),
  intervention: z.string().max(8000).default(""),
  supportType: z.string().max(500).optional().nullable(),
  deliveryMethod: z.string().max(500).optional().nullable(),
  responsibleStaff: z.string().max(500).optional().nullable(),
  targetDate: z.string().optional().nullable(),
});

export async function createCdpActivity(
  input: z.infer<typeof activityCreateSchema>
): Promise<ActionResponse<{ id: number; businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = activityCreateSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid activity");

    const plan = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, parsed.data.planId),
      columns: { businessId: true },
    });
    if (!plan) return errorResponse("Plan not found");

    const [maxRow] = await db
      .select({ m: cdpActivities.sortOrder })
      .from(cdpActivities)
      .where(eq(cdpActivities.planId, parsed.data.planId))
      .orderBy(desc(cdpActivities.sortOrder))
      .limit(1);
    const nextOrder = (maxRow?.m ?? 0) + 1;

    const [row] = await db
      .insert(cdpActivities)
      .values({
        planId: parsed.data.planId,
        focusCode: parsed.data.focusCode,
        sortOrder: nextOrder,
        gapChallenge: parsed.data.gapChallenge?.trim() || null,
        intervention: parsed.data.intervention?.trim() ?? "",
        supportType: parsed.data.supportType?.trim() || null,
        deliveryMethod: parsed.data.deliveryMethod?.trim() || null,
        responsibleStaff: parsed.data.responsibleStaff?.trim() || null,
        targetDate: parseOptionalDate(parsed.data.targetDate ?? null),
      })
      .returning({ id: cdpActivities.id });

    revalidateCdpPaths(plan.businessId, parsed.data.planId);
    return successResponse({ id: row.id, businessId: plan.businessId });
  } catch (e) {
    console.error("createCdpActivity", e);
    return errorResponse("Failed to create activity");
  }
}

const activityUpdateSchema = activityCreateSchema
  .omit({ planId: true })
  .extend({ activityId: z.number().int().positive() });

export async function updateCdpActivity(
  input: z.infer<typeof activityUpdateSchema>
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = activityUpdateSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid activity");

    const existing = await db.query.cdpActivities.findFirst({
      where: eq(cdpActivities.id, parsed.data.activityId),
      with: { plan: { columns: { businessId: true, id: true } } },
    });
    if (!existing?.plan) return errorResponse("Activity not found");

    await db
      .update(cdpActivities)
      .set({
        focusCode: parsed.data.focusCode,
        gapChallenge: parsed.data.gapChallenge?.trim() || null,
        intervention: parsed.data.intervention?.trim() ?? "",
        supportType: parsed.data.supportType?.trim() || null,
        deliveryMethod: parsed.data.deliveryMethod?.trim() || null,
        responsibleStaff: parsed.data.responsibleStaff?.trim() || null,
        targetDate: parseOptionalDate(parsed.data.targetDate ?? null),
        updatedAt: new Date(),
      })
      .where(eq(cdpActivities.id, parsed.data.activityId));

    revalidateCdpPaths(existing.plan.businessId, existing.plan.id);
    return successResponse({ businessId: existing.plan.businessId });
  } catch (e) {
    console.error("updateCdpActivity", e);
    return errorResponse("Failed to update activity");
  }
}

export async function deleteCdpActivity(activityId: number): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const existing = await db.query.cdpActivities.findFirst({
      where: eq(cdpActivities.id, activityId),
      with: { plan: { columns: { businessId: true, id: true } } },
    });
    if (!existing?.plan) return errorResponse("Activity not found");

    await db.delete(cdpActivities).where(eq(cdpActivities.id, activityId));
    revalidateCdpPaths(existing.plan.businessId, existing.plan.id);
    return successResponse({ businessId: existing.plan.businessId });
  } catch (e) {
    console.error("deleteCdpActivity", e);
    return errorResponse("Failed to delete activity");
  }
}

const sessionCreateSchema = z.object({
  planId: z.number().int().positive(),
  sessionNumber: z.number().int().min(1).max(999),
  sessionDate: z.string().min(1),
  focusCodes: z.array(cdpFocusCodeSchema).default([]),
  agenda: z.string().max(8000).optional().nullable(),
  supportType: z.string().max(500).optional().nullable(),
  durationHours: z.number().min(0).max(24).optional().nullable(),
  keyActionsAgreed: z.string().max(8000).optional().nullable(),
  challengesRaised: z.string().max(8000).optional().nullable(),
  nextSteps: z.string().max(8000).optional().nullable(),
  followUpDate: z.string().optional().nullable(),
});

export async function createCdpSupportSession(
  input: z.infer<typeof sessionCreateSchema>
): Promise<ActionResponse<{ id: number; businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = sessionCreateSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid session");

    const plan = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, parsed.data.planId),
      columns: { businessId: true },
    });
    if (!plan) return errorResponse("Plan not found");

    const sessionDate = new Date(parsed.data.sessionDate);
    if (Number.isNaN(sessionDate.getTime())) return errorResponse("Invalid session date");

    const [row] = await db
      .insert(cdpBusinessSupportSessions)
      .values({
        planId: parsed.data.planId,
        sessionNumber: parsed.data.sessionNumber,
        sessionDate,
        focusCodes: parsed.data.focusCodes,
        agenda: parsed.data.agenda?.trim() || null,
        supportType: parsed.data.supportType?.trim() || null,
        durationHours:
          parsed.data.durationHours != null ? String(parsed.data.durationHours) : null,
        keyActionsAgreed: parsed.data.keyActionsAgreed?.trim() || null,
        challengesRaised: parsed.data.challengesRaised?.trim() || null,
        nextSteps: parsed.data.nextSteps?.trim() || null,
        followUpDate: parseOptionalDate(parsed.data.followUpDate ?? null),
        conductedById: session.user!.id,
      })
      .returning({ id: cdpBusinessSupportSessions.id });

    revalidateCdpPaths(plan.businessId, parsed.data.planId);
    return successResponse({ id: row.id, businessId: plan.businessId });
  } catch (e) {
    console.error("createCdpSupportSession", e);
    return errorResponse("Failed to create session (check session # is unique for this plan).");
  }
}

const sessionUpdateSchema = sessionCreateSchema.extend({
  sessionId: z.number().int().positive(),
});

export async function updateCdpSupportSession(
  input: z.infer<typeof sessionUpdateSchema>
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = sessionUpdateSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid session");

    const existing = await db.query.cdpBusinessSupportSessions.findFirst({
      where: eq(cdpBusinessSupportSessions.id, parsed.data.sessionId),
      with: { plan: { columns: { businessId: true, id: true } } },
    });
    if (!existing?.plan || existing.planId !== parsed.data.planId) {
      return errorResponse("Session not found");
    }

    const sessionDate = new Date(parsed.data.sessionDate);
    if (Number.isNaN(sessionDate.getTime())) return errorResponse("Invalid session date");

    await db
      .update(cdpBusinessSupportSessions)
      .set({
        sessionNumber: parsed.data.sessionNumber,
        sessionDate,
        focusCodes: parsed.data.focusCodes,
        agenda: parsed.data.agenda?.trim() || null,
        supportType: parsed.data.supportType?.trim() || null,
        durationHours:
          parsed.data.durationHours != null ? String(parsed.data.durationHours) : null,
        keyActionsAgreed: parsed.data.keyActionsAgreed?.trim() || null,
        challengesRaised: parsed.data.challengesRaised?.trim() || null,
        nextSteps: parsed.data.nextSteps?.trim() || null,
        followUpDate: parseOptionalDate(parsed.data.followUpDate ?? null),
        updatedAt: new Date(),
      })
      .where(eq(cdpBusinessSupportSessions.id, parsed.data.sessionId));

    revalidateCdpPaths(existing.plan.businessId, existing.plan.id);
    return successResponse({ businessId: existing.plan.businessId });
  } catch (e) {
    console.error("updateCdpSupportSession", e);
    return errorResponse("Failed to update session");
  }
}

export async function deleteCdpSupportSession(
  sessionId: number
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const existing = await db.query.cdpBusinessSupportSessions.findFirst({
      where: eq(cdpBusinessSupportSessions.id, sessionId),
      with: { plan: { columns: { businessId: true, id: true } } },
    });
    if (!existing?.plan) return errorResponse("Session not found");

    await db.delete(cdpBusinessSupportSessions).where(eq(cdpBusinessSupportSessions.id, sessionId));
    revalidateCdpPaths(existing.plan.businessId, existing.plan.id);
    return successResponse({ businessId: existing.plan.businessId });
  } catch (e) {
    console.error("deleteCdpSupportSession", e);
    return errorResponse("Failed to delete session");
  }
}

const progressSchema = z.object({
  activityId: z.number().int().positive(),
  reviewPeriod: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  status: z.enum(["not_started", "in_progress", "done", "blocked"]),
  outcomeAchieved: z.boolean().optional().nullable(),
  staffNotes: z.string().max(8000).optional().nullable(),
});

export async function upsertCdpActivityProgress(
  input: z.infer<typeof progressSchema>
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = progressSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid progress update");

    const act = await db.query.cdpActivities.findFirst({
      where: eq(cdpActivities.id, parsed.data.activityId),
      with: { plan: { columns: { businessId: true, id: true } } },
    });
    if (!act?.plan) return errorResponse("Activity not found");

    await db
      .insert(cdpActivityProgressReviews)
      .values({
        activityId: parsed.data.activityId,
        reviewPeriod: parsed.data.reviewPeriod,
        status: parsed.data.status,
        outcomeAchieved: parsed.data.outcomeAchieved ?? null,
        staffNotes: parsed.data.staffNotes?.trim() || null,
        reviewedAt: new Date(),
        reviewedById: session.user!.id,
      })
      .onConflictDoUpdate({
        target: [cdpActivityProgressReviews.activityId, cdpActivityProgressReviews.reviewPeriod],
        set: {
          status: parsed.data.status,
          outcomeAchieved: parsed.data.outcomeAchieved ?? null,
          staffNotes: parsed.data.staffNotes?.trim() || null,
          reviewedAt: new Date(),
          reviewedById: session.user!.id,
          updatedAt: new Date(),
        },
      });

    revalidateCdpPaths(act.plan.businessId, act.plan.id);
    return successResponse({ businessId: act.plan.businessId });
  } catch (e) {
    console.error("upsertCdpActivityProgress", e);
    return errorResponse("Failed to save progress");
  }
}

export async function getEnterpriseCdpReadonly(): Promise<ActionResponse<CdpPlanFull | null>> {
  try {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");

    const role = session.user.role ?? "applicant";
    if (isPhase2Admin(role)) {
      return errorResponse("Use the admin CDP console for staff accounts.");
    }

    const app = await db.query.applications.findFirst({
      where: eq(applications.userId, session.user.id),
      columns: { businessId: true },
    });
    if (!app) return successResponse(null);

    const plan = await db.query.capacityDevelopmentPlans.findFirst({
      where: and(
        eq(capacityDevelopmentPlans.businessId, app.businessId),
        eq(capacityDevelopmentPlans.status, "active")
      ),
      orderBy: [desc(capacityDevelopmentPlans.updatedAt)],
      with: {
        focusSummaries: { orderBy: [asc(cdpFocusSummary.focusCode)] },
        activities: {
          orderBy: [asc(cdpActivities.sortOrder), asc(cdpActivities.id)],
          with: { progressReviews: { orderBy: [asc(cdpActivityProgressReviews.reviewPeriod)] } },
        },
        supportSessions: { orderBy: [asc(cdpBusinessSupportSessions.sessionNumber)] },
      },
    });

    return successResponse((plan as CdpPlanFull | null) ?? null);
  } catch (e) {
    console.error("getEnterpriseCdpReadonly", e);
    return errorResponse("Failed to load CDP");
  }
}

export async function buildCdpCsvExport(planId: number): Promise<ActionResponse<string>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }

    const full = await getCdpPlanFull(planId);
    if (!full.success || !full.data) return errorResponse(full.error ?? "Plan not found");

    const p = full.data;
    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, p.businessId),
      with: { applicant: true },
    });
    const bizName = business?.name ?? "";
    const owner = business?.applicant
      ? `${business.applicant.firstName} ${business.applicant.lastName}`.trim()
      : "";

    const blocks: string[] = [];
    blocks.push(`# CDP export — ${bizName} — plan ${planId}`);
    blocks.push(`# Owner: ${owner}`);
    blocks.push("");

    blocks.push("## DIAGNOSTIC_SUMMARY");
    blocks.push(
      stringify(
        p.focusSummaries.map((s) => ({
          focusCode: s.focusCode,
          score0to10: s.score0to10,
          keyGaps: s.keyGaps ?? "",
          recommendedIntervention: s.recommendedIntervention ?? "",
          responsibleStaff: s.responsibleStaff ?? "",
          targetDate: s.targetDate ?? "",
        })),
        { header: true }
      )
    );
    blocks.push("");

    blocks.push("## DETAILED_ACTIVITY_PLAN");
    blocks.push(
      stringify(
        p.activities.map((a) => ({
          focusCode: a.focusCode,
          sortOrder: a.sortOrder,
          gapChallenge: a.gapChallenge ?? "",
          intervention: a.intervention,
          supportType: a.supportType ?? "",
          deliveryMethod: a.deliveryMethod ?? "",
          responsibleStaff: a.responsibleStaff ?? "",
          targetDate: a.targetDate ?? "",
        })),
        { header: true }
      )
    );
    blocks.push("");

    blocks.push("## BUSINESS_SUPPORT_SESSIONS");
    blocks.push(
      stringify(
        p.supportSessions.map((s) => ({
          sessionNumber: s.sessionNumber,
          sessionDate: s.sessionDate ? new Date(s.sessionDate).toISOString() : "",
          focusCodes: (s.focusCodes ?? []).join(";"),
          agenda: s.agenda ?? "",
          supportType: s.supportType ?? "",
          durationHours: s.durationHours ?? "",
          keyActionsAgreed: s.keyActionsAgreed ?? "",
          challengesRaised: s.challengesRaised ?? "",
          nextSteps: s.nextSteps ?? "",
          followUpDate: s.followUpDate ?? "",
        })),
        { header: true }
      )
    );
    blocks.push("");

    const progressFlat: {
      activityId: number;
      focusCode: string;
      intervention: string;
      reviewPeriod: string;
      status: string;
      outcomeAchieved: string;
      staffNotes: string;
    }[] = [];
    for (const a of p.activities) {
      for (const pr of a.progressReviews) {
        progressFlat.push({
          activityId: a.id,
          focusCode: a.focusCode,
          intervention: a.intervention,
          reviewPeriod: pr.reviewPeriod,
          status: pr.status,
          outcomeAchieved:
            pr.outcomeAchieved === null || pr.outcomeAchieved === undefined
              ? ""
              : pr.outcomeAchieved
                ? "yes"
                : "no",
          staffNotes: pr.staffNotes ?? "",
        });
      }
    }
    blocks.push("## PROGRESS_TRACKER");
    blocks.push(stringify(progressFlat, { header: true }));

    return successResponse(blocks.join("\n"));
  } catch (e) {
    console.error("buildCdpCsvExport", e);
    return errorResponse("Failed to build CSV");
  }
}
