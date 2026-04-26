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
  cdpEndlineResponses,
  cdpFocusSummary,
  cdpKeyResults,
  cdpObjectives,
  cdpSessionActionItems,
  cdpWeeklyMilestones,
  cnaDiagnostics,
  cnaScores,
  kycProfiles,
  type CapacityDevelopmentPlan,
  type CdpActivity,
  type CdpActivityProgressReview,
  type CdpBusinessSupportSession,
  type CdpEndlineResponse,
  type CdpFocusSummaryRow,
  type CdpKeyResult,
  type CdpObjective,
  type CdpSessionActionItem,
  type CdpWeeklyMilestone,
} from "@/db/schema";
import {
  suggestedFocusSummariesFromFullCnaScores,
  suggestedFocusSummariesFromLegacyCna,
} from "@/lib/cdp/legacy-cna-bridge";
import { CDP_FOCUS_CODES, cdpFocusCodeSchema, cdpFocusSummaryInputSchema } from "@/lib/cdp/focus-areas";
import {
  assertCdpActivationReadiness,
  computeCdpPipelineCompleteness,
  type PipelineCompleteness,
} from "@/lib/cdp/pipeline";
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

export type CdpObjectiveWithKrs = CdpObjective & { keyResults: CdpKeyResult[] };

export type CdpPlanFull = CapacityDevelopmentPlan & {
  focusSummaries: CdpFocusSummaryRow[];
  activities: (CdpActivity & { progressReviews: CdpActivityProgressReview[] })[];
  supportSessions: (CdpBusinessSupportSession & { actionItems: CdpSessionActionItem[] })[];
  objectives: CdpObjectiveWithKrs[];
  weeklyMilestones: CdpWeeklyMilestone[];
  endlineResponse: CdpEndlineResponse | null;
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
        supportSessions: {
          orderBy: [asc(cdpBusinessSupportSessions.sessionNumber)],
          with: {
            actionItems: { orderBy: [asc(cdpSessionActionItems.sortOrder), asc(cdpSessionActionItems.id)] },
          },
        },
        objectives: {
          orderBy: [asc(cdpObjectives.sortOrder), asc(cdpObjectives.id)],
          with: {
            keyResults: { orderBy: [asc(cdpKeyResults.sortOrder), asc(cdpKeyResults.id)] },
          },
        },
        weeklyMilestones: {
          orderBy: [asc(cdpWeeklyMilestones.weekIndex), asc(cdpWeeklyMilestones.id)],
        },
        endlineResponse: true,
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
      columns: { id: true, businessId: true, status: true },
    });
    if (!existing) return errorResponse("Plan not found");

    if (parsed.data.status === "active" && existing.status !== "active") {
      const full = await db.query.capacityDevelopmentPlans.findFirst({
        where: eq(capacityDevelopmentPlans.id, parsed.data.planId),
        with: {
          focusSummaries: true,
          activities: true,
          objectives: { with: { keyResults: true } },
        },
      });
      if (!full) return errorResponse("Plan not found");
      const objectivesForKrs = full.objectives.map((o) => ({
        id: o.id,
        title: o.title,
        keyResults: o.keyResults.map((k) => ({ weightPercent: k.weightPercent })),
      }));
      const gate = assertCdpActivationReadiness({
        focusSummaries: full.focusSummaries,
        activities: full.activities,
        objectivesForKrs,
      });
      if (gate) return errorResponse(gate);
    }

    const patch: Partial<typeof capacityDevelopmentPlans.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.status != null) {
      patch.status = parsed.data.status;
      if (parsed.data.status === "active" && existing.status !== "active") {
        patch.cdpApprovedAt = new Date();
      }
    }
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

export async function setCdpDiagnosticLocked(
  planId: number,
  locked: boolean
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const plan = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, planId),
      columns: { businessId: true },
    });
    if (!plan) return errorResponse("Plan not found");
    await db
      .update(capacityDevelopmentPlans)
      .set({
        diagnosticLockedAt: locked ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(capacityDevelopmentPlans.id, planId));
    revalidateCdpPaths(plan.businessId, planId);
    return successResponse({ businessId: plan.businessId });
  } catch (e) {
    console.error("setCdpDiagnosticLocked", e);
    return errorResponse("Failed to update diagnostic lock");
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
      with: {
        cnaScores: { orderBy: [asc(cnaScores.focusCode)] },
      },
    });
    if (!latest) {
      return errorResponse("No CNA diagnostic found for this business. Record one under CNA first.");
    }

    const hasFull = latest.cnaScores.length >= 12;
    const hasLegacy =
      latest.financialManagementScore != null &&
      latest.marketReachScore != null &&
      latest.operationsScore != null &&
      latest.complianceScore != null;

    let suggested;
    if (hasFull) {
      suggested = suggestedFocusSummariesFromFullCnaScores(latest.cnaScores);
    } else if (hasLegacy) {
      suggested = suggestedFocusSummariesFromLegacyCna({
        financialManagementScore: latest.financialManagementScore!,
        marketReachScore: latest.marketReachScore!,
        operationsScore: latest.operationsScore!,
        complianceScore: latest.complianceScore!,
      });
    } else {
      return errorResponse(
        "Latest CNA has no A–L scores and no legacy four-dimension scores. Complete a CNA first."
      );
    }

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
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Provide all 12 focus areas (A–L) with valid scores.";
      return errorResponse(msg);
    }

    const plan = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, parsed.data.planId),
      columns: { id: true, businessId: true, diagnosticLockedAt: true },
    });
    if (!plan) return errorResponse("Plan not found");
    if (plan.diagnosticLockedAt) {
      return errorResponse("Diagnostic is locked. Ask a lead to unlock before editing A–L scores.");
    }

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
  bootcampWeek: z.number().int().min(1).max(13).optional().nullable(),
  evidenceUrls: z.array(z.string().max(500)).max(20).optional().nullable(),
  /** Logged as structured follow-ups (recommended when key actions are agreed). */
  initialActionDescriptions: z.array(z.string().max(2000)).max(30).optional().nullable(),
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

    const n = parsed.data.sessionNumber;
    if (n > 1) {
      const prev = await db.query.cdpBusinessSupportSessions.findFirst({
        where: and(
          eq(cdpBusinessSupportSessions.planId, parsed.data.planId),
          eq(cdpBusinessSupportSessions.sessionNumber, n - 1)
        ),
        with: {
          actionItems: true,
        },
      });
      if (prev) {
        const items = prev.actionItems ?? [];
        if (items.length > 0) {
          const blocked = items.filter((i) => i.status === "open" || i.status === "blocked");
          if (blocked.length > 0) {
            return errorResponse(
              `Session ${n - 1} still has open action items. Mark them done or waived before logging session ${n}.`
            );
          }
        } else if (prev.keyActionsAgreed && String(prev.keyActionsAgreed).trim().length > 0) {
          return errorResponse(
            `Session ${n - 1} has "key actions agreed" text but no structured action items. Add action items to that session and close them before logging session ${n}.`
          );
        }
      }
    }

    const evidenceUrls = (parsed.data.evidenceUrls ?? []).map((u) => u.trim()).filter(Boolean);

    const newId = await db.transaction(async (tx) => {
      const [row] = await tx
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
          bootcampWeek: parsed.data.bootcampWeek ?? null,
          evidenceUrls,
          conductedById: session.user!.id,
        })
        .returning({ id: cdpBusinessSupportSessions.id });

      const descriptions = parsed.data.initialActionDescriptions?.filter((d) => d.trim()) ?? [];
      if (descriptions.length > 0) {
        await tx.insert(cdpSessionActionItems).values(
          descriptions.map((description, idx) => ({
            sessionId: row.id,
            description: description.trim(),
            sortOrder: idx,
          }))
        );
      }

      return row.id;
    });

    revalidateCdpPaths(plan.businessId, parsed.data.planId);
    return successResponse({ id: newId, businessId: plan.businessId });
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

    const evidenceUrls = (parsed.data.evidenceUrls ?? []).map((u) => u.trim()).filter(Boolean);

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
        bootcampWeek: parsed.data.bootcampWeek ?? null,
        evidenceUrls,
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

const objectiveCreateSchema = z.object({
  planId: z.number().int().positive(),
  title: z.string().min(1).max(2000),
});

export async function createCdpObjective(
  input: z.infer<typeof objectiveCreateSchema>
): Promise<ActionResponse<{ id: number; businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = objectiveCreateSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid objective");

    const plan = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, parsed.data.planId),
      columns: { businessId: true },
    });
    if (!plan) return errorResponse("Plan not found");

    const [maxRow] = await db
      .select({ m: cdpObjectives.sortOrder })
      .from(cdpObjectives)
      .where(eq(cdpObjectives.planId, parsed.data.planId))
      .orderBy(desc(cdpObjectives.sortOrder))
      .limit(1);
    const nextOrder = (maxRow?.m ?? 0) + 1;

    const [row] = await db
      .insert(cdpObjectives)
      .values({
        planId: parsed.data.planId,
        title: parsed.data.title.trim(),
        sortOrder: nextOrder,
      })
      .returning({ id: cdpObjectives.id });

    revalidateCdpPaths(plan.businessId, parsed.data.planId);
    return successResponse({ id: row.id, businessId: plan.businessId });
  } catch (e) {
    console.error("createCdpObjective", e);
    return errorResponse("Failed to create objective");
  }
}

export async function deleteCdpObjective(
  objectiveId: number
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const existing = await db.query.cdpObjectives.findFirst({
      where: eq(cdpObjectives.id, objectiveId),
      with: { plan: { columns: { businessId: true, id: true } } },
    });
    if (!existing?.plan) return errorResponse("Objective not found");
    await db.delete(cdpObjectives).where(eq(cdpObjectives.id, objectiveId));
    revalidateCdpPaths(existing.plan.businessId, existing.plan.id);
    return successResponse({ businessId: existing.plan.businessId });
  } catch (e) {
    console.error("deleteCdpObjective", e);
    return errorResponse("Failed to delete objective");
  }
}

const keyResultUpsertSchema = z.object({
  objectiveId: z.number().int().positive(),
  title: z.string().min(1).max(2000),
  targetOutcome: z.string().max(8000).optional().nullable(),
  achievedOutcome: z.string().max(8000).optional().nullable(),
  weightPercent: z.number().min(0).max(100),
  dueDate: z.string().optional().nullable(),
});

const keyResultUpdateSchema = keyResultUpsertSchema.extend({
  keyResultId: z.number().int().positive(),
});

export async function createCdpKeyResult(
  input: z.infer<typeof keyResultUpsertSchema>
): Promise<ActionResponse<{ id: number; businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = keyResultUpsertSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid key result");

    const obj = await db.query.cdpObjectives.findFirst({
      where: eq(cdpObjectives.id, parsed.data.objectiveId),
      with: { plan: { columns: { businessId: true, id: true } } },
    });
    if (!obj?.plan) return errorResponse("Objective not found");

    const [maxRow] = await db
      .select({ m: cdpKeyResults.sortOrder })
      .from(cdpKeyResults)
      .where(eq(cdpKeyResults.objectiveId, parsed.data.objectiveId))
      .orderBy(desc(cdpKeyResults.sortOrder))
      .limit(1);
    const nextOrder = (maxRow?.m ?? 0) + 1;

    const [row] = await db
      .insert(cdpKeyResults)
      .values({
        objectiveId: parsed.data.objectiveId,
        title: parsed.data.title.trim(),
        targetOutcome: parsed.data.targetOutcome?.trim() || null,
        achievedOutcome: parsed.data.achievedOutcome?.trim() || null,
        weightPercent: String(parsed.data.weightPercent),
        dueDate: parseOptionalDate(parsed.data.dueDate ?? null),
        sortOrder: nextOrder,
      })
      .returning({ id: cdpKeyResults.id });

    revalidateCdpPaths(obj.plan.businessId, obj.plan.id);
    return successResponse({ id: row.id, businessId: obj.plan.businessId });
  } catch (e) {
    console.error("createCdpKeyResult", e);
    return errorResponse("Failed to create key result");
  }
}

export async function updateCdpKeyResult(
  input: z.infer<typeof keyResultUpdateSchema>
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = keyResultUpdateSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid key result");

    const kr = await db.query.cdpKeyResults.findFirst({
      where: eq(cdpKeyResults.id, parsed.data.keyResultId),
      with: {
        objective: { with: { plan: { columns: { businessId: true, id: true } } } },
      },
    });
    if (!kr?.objective?.plan || kr.objectiveId !== parsed.data.objectiveId) {
      return errorResponse("Key result not found");
    }

    await db
      .update(cdpKeyResults)
      .set({
        title: parsed.data.title.trim(),
        targetOutcome: parsed.data.targetOutcome?.trim() || null,
        achievedOutcome: parsed.data.achievedOutcome?.trim() || null,
        weightPercent: String(parsed.data.weightPercent),
        dueDate: parseOptionalDate(parsed.data.dueDate ?? null),
        updatedAt: new Date(),
      })
      .where(eq(cdpKeyResults.id, parsed.data.keyResultId));

    revalidateCdpPaths(kr.objective.plan.businessId, kr.objective.plan.id);
    return successResponse({ businessId: kr.objective.plan.businessId });
  } catch (e) {
    console.error("updateCdpKeyResult", e);
    return errorResponse("Failed to update key result");
  }
}

export async function deleteCdpKeyResult(
  keyResultId: number
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const kr = await db.query.cdpKeyResults.findFirst({
      where: eq(cdpKeyResults.id, keyResultId),
      with: {
        objective: { with: { plan: { columns: { businessId: true, id: true } } } },
      },
    });
    if (!kr?.objective?.plan) return errorResponse("Key result not found");
    await db.delete(cdpKeyResults).where(eq(cdpKeyResults.id, keyResultId));
    revalidateCdpPaths(kr.objective.plan.businessId, kr.objective.plan.id);
    return successResponse({ businessId: kr.objective.plan.businessId });
  } catch (e) {
    console.error("deleteCdpKeyResult", e);
    return errorResponse("Failed to delete key result");
  }
}

const milestoneCreateSchema = z.object({
  planId: z.number().int().positive(),
  weekIndex: z.number().int().min(1).max(104).optional().nullable(),
  weekLabel: z.string().max(120).optional().nullable(),
  actionText: z.string().min(1).max(8000),
  dueDate: z.string().optional().nullable(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  keyResultId: z.number().int().positive().optional().nullable(),
});

const milestoneUpdateSchema = milestoneCreateSchema
  .omit({ planId: true })
  .extend({ milestoneId: z.number().int().positive() });

export async function createCdpWeeklyMilestone(
  input: z.infer<typeof milestoneCreateSchema>
): Promise<ActionResponse<{ id: number; businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = milestoneCreateSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid milestone");

    const plan = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, parsed.data.planId),
      columns: { businessId: true },
    });
    if (!plan) return errorResponse("Plan not found");

    const [row] = await db
      .insert(cdpWeeklyMilestones)
      .values({
        planId: parsed.data.planId,
        weekIndex: parsed.data.weekIndex ?? null,
        weekLabel: parsed.data.weekLabel?.trim() || null,
        actionText: parsed.data.actionText.trim(),
        dueDate: parseOptionalDate(parsed.data.dueDate ?? null),
        progressPercent: parsed.data.progressPercent ?? 0,
        keyResultId: parsed.data.keyResultId ?? null,
      })
      .returning({ id: cdpWeeklyMilestones.id });

    revalidateCdpPaths(plan.businessId, parsed.data.planId);
    return successResponse({ id: row.id, businessId: plan.businessId });
  } catch (e) {
    console.error("createCdpWeeklyMilestone", e);
    return errorResponse("Failed to create milestone");
  }
}

export async function updateCdpWeeklyMilestone(
  input: z.infer<typeof milestoneUpdateSchema>
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = milestoneUpdateSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid milestone");

    const row = await db.query.cdpWeeklyMilestones.findFirst({
      where: eq(cdpWeeklyMilestones.id, parsed.data.milestoneId),
      with: { plan: { columns: { businessId: true, id: true } } },
    });
    if (!row?.plan) return errorResponse("Milestone not found");

    await db
      .update(cdpWeeklyMilestones)
      .set({
        weekIndex: parsed.data.weekIndex ?? null,
        weekLabel: parsed.data.weekLabel?.trim() || null,
        actionText: parsed.data.actionText.trim(),
        dueDate: parseOptionalDate(parsed.data.dueDate ?? null),
        progressPercent: parsed.data.progressPercent ?? 0,
        keyResultId: parsed.data.keyResultId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(cdpWeeklyMilestones.id, parsed.data.milestoneId));

    revalidateCdpPaths(row.plan.businessId, row.plan.id);
    return successResponse({ businessId: row.plan.businessId });
  } catch (e) {
    console.error("updateCdpWeeklyMilestone", e);
    return errorResponse("Failed to update milestone");
  }
}

export async function deleteCdpWeeklyMilestone(
  milestoneId: number
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const row = await db.query.cdpWeeklyMilestones.findFirst({
      where: eq(cdpWeeklyMilestones.id, milestoneId),
      with: { plan: { columns: { businessId: true, id: true } } },
    });
    if (!row?.plan) return errorResponse("Milestone not found");
    await db.delete(cdpWeeklyMilestones).where(eq(cdpWeeklyMilestones.id, milestoneId));
    revalidateCdpPaths(row.plan.businessId, row.plan.id);
    return successResponse({ businessId: row.plan.businessId });
  } catch (e) {
    console.error("deleteCdpWeeklyMilestone", e);
    return errorResponse("Failed to delete milestone");
  }
}

const sessionActionItemUpdateSchema = z.object({
  actionItemId: z.number().int().positive(),
  status: z.enum(["open", "done", "waived", "blocked"]),
  statusNotes: z.string().max(8000).optional().nullable(),
});

export async function updateCdpSessionActionItem(
  input: z.infer<typeof sessionActionItemUpdateSchema>
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = sessionActionItemUpdateSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid action item");

    const item = await db.query.cdpSessionActionItems.findFirst({
      where: eq(cdpSessionActionItems.id, parsed.data.actionItemId),
      with: {
        session: { with: { plan: { columns: { businessId: true, id: true } } } },
      },
    });
    if (!item?.session?.plan) return errorResponse("Action item not found");

    await db
      .update(cdpSessionActionItems)
      .set({
        status: parsed.data.status,
        statusNotes: parsed.data.statusNotes?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(cdpSessionActionItems.id, parsed.data.actionItemId));

    revalidateCdpPaths(item.session.plan.businessId, item.session.plan.id);
    return successResponse({ businessId: item.session.plan.businessId });
  } catch (e) {
    console.error("updateCdpSessionActionItem", e);
    return errorResponse("Failed to update action item");
  }
}

const addSessionActionItemSchema = z.object({
  sessionId: z.number().int().positive(),
  description: z.string().min(1).max(2000),
});

export async function addCdpSessionActionItem(
  input: z.infer<typeof addSessionActionItemSchema>
): Promise<ActionResponse<{ id: number; businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = addSessionActionItemSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid action item");

    const sess = await db.query.cdpBusinessSupportSessions.findFirst({
      where: eq(cdpBusinessSupportSessions.id, parsed.data.sessionId),
      with: { plan: { columns: { businessId: true, id: true } } },
    });
    if (!sess?.plan) return errorResponse("Session not found");

    const [maxRow] = await db
      .select({ m: cdpSessionActionItems.sortOrder })
      .from(cdpSessionActionItems)
      .where(eq(cdpSessionActionItems.sessionId, parsed.data.sessionId))
      .orderBy(desc(cdpSessionActionItems.sortOrder))
      .limit(1);
    const nextOrder = (maxRow?.m ?? 0) + 1;

    const [row] = await db
      .insert(cdpSessionActionItems)
      .values({
        sessionId: parsed.data.sessionId,
        description: parsed.data.description.trim(),
        sortOrder: nextOrder,
      })
      .returning({ id: cdpSessionActionItems.id });

    revalidateCdpPaths(sess.plan.businessId, sess.plan.id);
    return successResponse({ id: row.id, businessId: sess.plan.businessId });
  } catch (e) {
    console.error("addCdpSessionActionItem", e);
    return errorResponse("Failed to add action item");
  }
}

const endlineSubmitSchema = z.object({
  planId: z.number().int().positive(),
  responses: z.record(z.string(), z.unknown()),
});

function buildImpactDeltas(
  baseline: { revenue: string | null; employees: number | null } | null,
  responses: Record<string, unknown>
): Record<string, unknown> {
  const endRev = responses.endlineRevenue;
  const endEmp = responses.endlineEmployeeCount;
  const endRevNum = typeof endRev === "number" ? endRev : typeof endRev === "string" ? parseFloat(endRev) : null;
  const endEmpNum =
    typeof endEmp === "number" ? endEmp : typeof endEmp === "string" ? parseInt(endEmp, 10) : null;

  const out: Record<string, unknown> = {};
  if (baseline?.revenue != null && endRevNum != null && Number.isFinite(endRevNum)) {
    const base = parseFloat(baseline.revenue);
    if (Number.isFinite(base)) {
      out.baselineRevenue = base;
      out.endlineRevenue = endRevNum;
      out.revenueDelta = endRevNum - base;
    }
  }
  if (baseline?.employees != null && endEmpNum != null && Number.isFinite(endEmpNum)) {
    out.baselineEmployeeCount = baseline.employees;
    out.endlineEmployeeCount = endEmpNum;
    out.employeeDelta = endEmpNum - baseline.employees;
  }
  return out;
}

export async function submitCdpEndline(
  input: z.infer<typeof endlineSubmitSchema>
): Promise<ActionResponse<{ businessId: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const parsed = endlineSubmitSchema.safeParse(input);
    if (!parsed.success) return errorResponse("Invalid endline payload");

    const plan = await db.query.capacityDevelopmentPlans.findFirst({
      where: eq(capacityDevelopmentPlans.id, parsed.data.planId),
      columns: { businessId: true },
    });
    if (!plan) return errorResponse("Plan not found");

    const kyc = await db.query.kycProfiles.findFirst({
      where: eq(kycProfiles.businessId, plan.businessId),
      columns: {
        baselineRevenue: true,
        baselineEmployeeCount: true,
      },
    });

    const impactDeltas = buildImpactDeltas(
      kyc
        ? {
            revenue: kyc.baselineRevenue,
            employees: kyc.baselineEmployeeCount,
          }
        : null,
      parsed.data.responses
    );

    await db
      .insert(cdpEndlineResponses)
      .values({
        planId: parsed.data.planId,
        responses: parsed.data.responses,
        impactDeltas: Object.keys(impactDeltas).length ? impactDeltas : null,
        submittedById: session.user!.id,
      })
      .onConflictDoUpdate({
        target: cdpEndlineResponses.planId,
        set: {
          responses: parsed.data.responses,
          impactDeltas: Object.keys(impactDeltas).length ? impactDeltas : null,
          submittedAt: new Date(),
          submittedById: session.user!.id,
          updatedAt: new Date(),
        },
      });

    revalidateCdpPaths(plan.businessId, parsed.data.planId);
    return successResponse({ businessId: plan.businessId });
  } catch (e) {
    console.error("submitCdpEndline", e);
    return errorResponse("Failed to save endline");
  }
}

export async function getCdpPipelineCompletenessForPlan(
  planId: number
): Promise<ActionResponse<PipelineCompleteness>> {
  try {
    const session = await auth();
    if (!session?.user?.id || !isPhase2Admin(session.user.role ?? null)) {
      return errorResponse("Unauthorized");
    }
    const full = await getCdpPlanFull(planId);
    if (!full.success || !full.data) return errorResponse(full.error ?? "Plan not found");
    const p = full.data;
    const objectivesForKrs = p.objectives.map((o) => ({
      id: o.id,
      title: o.title,
      keyResults: o.keyResults.map((k) => ({ weightPercent: k.weightPercent })),
    }));
    const result = computeCdpPipelineCompleteness({
      status: p.status,
      focusSummaries: p.focusSummaries,
      activities: p.activities,
      supportSessions: p.supportSessions.map((s) => ({
        sessionNumber: s.sessionNumber,
        bootcampWeek: s.bootcampWeek ?? null,
      })),
      objectivesForKrs,
      hasEndline: p.endlineResponse != null,
    });
    return successResponse(result);
  } catch (e) {
    console.error("getCdpPipelineCompletenessForPlan", e);
    return errorResponse("Failed to compute pipeline status");
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
        supportSessions: {
          orderBy: [asc(cdpBusinessSupportSessions.sessionNumber)],
          with: {
            actionItems: { orderBy: [asc(cdpSessionActionItems.sortOrder), asc(cdpSessionActionItems.id)] },
          },
        },
        objectives: {
          orderBy: [asc(cdpObjectives.sortOrder), asc(cdpObjectives.id)],
          with: {
            keyResults: { orderBy: [asc(cdpKeyResults.sortOrder), asc(cdpKeyResults.id)] },
          },
        },
        weeklyMilestones: {
          orderBy: [asc(cdpWeeklyMilestones.weekIndex), asc(cdpWeeklyMilestones.id)],
        },
        endlineResponse: true,
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
          bootcampWeek: s.bootcampWeek ?? "",
          focusCodes: (s.focusCodes ?? []).join(";"),
          agenda: s.agenda ?? "",
          supportType: s.supportType ?? "",
          durationHours: s.durationHours ?? "",
          keyActionsAgreed: s.keyActionsAgreed ?? "",
          challengesRaised: s.challengesRaised ?? "",
          nextSteps: s.nextSteps ?? "",
          followUpDate: s.followUpDate ?? "",
          evidenceUrls: (s.evidenceUrls ?? []).join(";"),
        })),
        { header: true }
      )
    );
    blocks.push("");

    const okrRows: {
      objectiveId: number;
      objectiveTitle: string;
      keyResultId: number;
      keyResultTitle: string;
      weightPercent: string;
      targetOutcome: string;
      achievedOutcome: string;
      dueDate: string;
    }[] = [];
    for (const o of p.objectives ?? []) {
      for (const kr of o.keyResults ?? []) {
        okrRows.push({
          objectiveId: o.id,
          objectiveTitle: o.title,
          keyResultId: kr.id,
          keyResultTitle: kr.title,
          weightPercent: String(kr.weightPercent ?? ""),
          targetOutcome: kr.targetOutcome ?? "",
          achievedOutcome: kr.achievedOutcome ?? "",
          dueDate: kr.dueDate ?? "",
        });
      }
    }
    blocks.push("## OKRS");
    blocks.push(stringify(okrRows, { header: true }));
    blocks.push("");

    blocks.push("## WEEKLY_MILESTONES");
    blocks.push(
      stringify(
        (p.weeklyMilestones ?? []).map((m) => ({
          id: m.id,
          weekIndex: m.weekIndex ?? "",
          weekLabel: m.weekLabel ?? "",
          actionText: m.actionText,
          dueDate: m.dueDate ?? "",
          progressPercent: m.progressPercent,
          keyResultId: m.keyResultId ?? "",
        })),
        { header: true }
      )
    );
    blocks.push("");

    const actionRows: {
      sessionNumber: number;
      actionItemId: number;
      description: string;
      status: string;
      statusNotes: string;
    }[] = [];
    for (const s of p.supportSessions ?? []) {
      for (const ai of s.actionItems ?? []) {
        actionRows.push({
          sessionNumber: s.sessionNumber,
          actionItemId: ai.id,
          description: ai.description,
          status: ai.status,
          statusNotes: ai.statusNotes ?? "",
        });
      }
    }
    blocks.push("## SESSION_ACTION_ITEMS");
    blocks.push(stringify(actionRows, { header: true }));
    blocks.push("");

    blocks.push("## ENDLINE");
    blocks.push(
      p.endlineResponse
        ? stringify(
            [
              {
                submittedAt: p.endlineResponse.submittedAt
                  ? new Date(p.endlineResponse.submittedAt).toISOString()
                  : "",
                responsesJson: JSON.stringify(p.endlineResponse.responses ?? {}),
                impactDeltasJson: JSON.stringify(p.endlineResponse.impactDeltas ?? {}),
              },
            ],
            { header: true }
          )
        : "(no endline submitted)"
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
