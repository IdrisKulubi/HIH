"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, gte, isNull, lte, ne } from "drizzle-orm";
import { z } from "zod";
import db from "@/db/drizzle";
import {
  melAuditEvents,
  melIndicatorBaselines,
  melIndicatorDefinitions,
  melIndicatorTargets,
  melProgrammeSettings,
  melReportingPeriods,
} from "@/db/schema";
import { errorResponse, successResponse, type ActionResponse } from "@/lib/actions/types";
import { emptyToNull, melIndicatorInputSchema, melIndicatorTargetInputSchema, melProgrammeSettingsInputSchema } from "@/lib/mel/configuration";
import { requireMelManager, requireMelViewer } from "@/lib/mel/access";
import {
  buildReportingPeriodCode,
  canTransitionMelPeriod,
  melPeriodStatusSchema,
  parseReportingPeriodFormData,
} from "@/lib/mel/reporting-periods";

export type MelAdminOverview = {
  canManage: boolean;
  settings: typeof melProgrammeSettings.$inferSelect | null;
  periods: Array<typeof melReportingPeriods.$inferSelect>;
  indicators: Array<
    typeof melIndicatorDefinitions.$inferSelect & {
      baselines: Array<typeof melIndicatorBaselines.$inferSelect>;
      targets: Array<typeof melIndicatorTargets.$inferSelect>;
    }
  >;
  unresolvedIndicatorCount: number;
};

export type MelIndicatorDetail = {
  canManage: boolean;
  indicator: typeof melIndicatorDefinitions.$inferSelect;
  baselines: Array<typeof melIndicatorBaselines.$inferSelect>;
  targets: Array<typeof melIndicatorTargets.$inferSelect>;
  periods: Array<typeof melReportingPeriods.$inferSelect>;
};

function mutationError(error: unknown, fallback: string): ActionResponse<never> {
  if (error instanceof z.ZodError) {
    return errorResponse(error.issues[0]?.message ?? fallback);
  }
  if (error instanceof Error) return errorResponse(error.message);
  return errorResponse(fallback);
}

export async function getMelAdminOverview(): Promise<ActionResponse<MelAdminOverview>> {
  try {
    const actor = await requireMelViewer();
    const [settings, periods, indicators] = await Promise.all([
      db.query.melProgrammeSettings.findFirst({ where: eq(melProgrammeSettings.id, 1) }),
      db.query.melReportingPeriods.findMany({
        orderBy: [asc(melReportingPeriods.startDate)],
      }),
      db.query.melIndicatorDefinitions.findMany({
        with: {
          baselines: true,
          targets: true,
        },
        orderBy: [asc(melIndicatorDefinitions.sortOrder), asc(melIndicatorDefinitions.code)],
      }),
    ]);

    return successResponse({
      canManage: actor.canManage,
      settings: settings ?? null,
      periods,
      indicators,
      unresolvedIndicatorCount: indicators.filter((indicator) => Boolean(indicator.unresolvedNotes)).length,
    });
  } catch (error) {
    console.error("getMelAdminOverview", error);
    return mutationError(error, "Failed to load MEL administration");
  }
}

export async function getMelIndicatorDetail(indicatorId: number): Promise<ActionResponse<MelIndicatorDetail>> {
  try {
    const actor = await requireMelViewer();
    const [indicator, periods] = await Promise.all([
      db.query.melIndicatorDefinitions.findFirst({
        where: eq(melIndicatorDefinitions.id, indicatorId),
        with: {
          baselines: true,
          targets: true,
        },
      }),
      db.query.melReportingPeriods.findMany({
        orderBy: [asc(melReportingPeriods.startDate)],
      }),
    ]);

    if (!indicator) return errorResponse("Indicator not found");
    return successResponse({
      canManage: actor.canManage,
      indicator,
      baselines: indicator.baselines,
      targets: indicator.targets,
      periods,
    });
  } catch (error) {
    console.error("getMelIndicatorDetail", error);
    return mutationError(error, "Failed to load indicator");
  }
}

export async function createMelReportingPeriodAction(
  _previous: ActionResponse<{ id: number }> | null,
  formData: FormData
): Promise<ActionResponse<{ id: number }>> {
  try {
    const actor = await requireMelManager();
    const input = parseReportingPeriodFormData(formData);
    const code = buildReportingPeriodCode(input);

    const id = await db.transaction(async (tx) => {
      const overlapping = await tx.query.melReportingPeriods.findFirst({
        where: and(
          lte(melReportingPeriods.startDate, input.endDate),
          gte(melReportingPeriods.endDate, input.startDate),
          ne(melReportingPeriods.status, "archived")
        ),
        columns: { id: true, label: true },
      });
      if (overlapping) {
        throw new Error(`This period overlaps ${overlapping.label}`);
      }

      const [created] = await tx
        .insert(melReportingPeriods)
        .values({
          ...input,
          code,
          status: "planned",
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: melReportingPeriods.id });
      if (!created) throw new Error("Failed to create reporting period");

      await tx.insert(melAuditEvents).values({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "mel_reporting_period",
        entityId: String(created.id),
        action: "created",
        after: { ...input, code, status: "planned" },
        correlationId: randomUUID(),
      });
      return created.id;
    });

    revalidatePath("/admin/mel");
    return successResponse({ id }, "Reporting period created");
  } catch (error) {
    console.error("createMelReportingPeriodAction", error);
    return mutationError(error, "Failed to create reporting period");
  }
}

export async function updateMelReportingPeriodStatusAction(
  _previous: ActionResponse<{ status: string }> | null,
  formData: FormData
): Promise<ActionResponse<{ status: string }>> {
  try {
    const actor = await requireMelManager();
    const periodId = z.coerce.number().int().positive().parse(formData.get("periodId"));
    const nextStatus = melPeriodStatusSchema.parse(formData.get("status"));
    const reason = emptyToNull(formData.get("reason"));

    const current = await db.query.melReportingPeriods.findFirst({
      where: eq(melReportingPeriods.id, periodId),
    });
    if (!current) return errorResponse("Reporting period not found");
    if (!canTransitionMelPeriod(current.status, nextStatus)) {
      return errorResponse(`Cannot move a ${current.status} period to ${nextStatus}`);
    }
    if (nextStatus === "archived" && !reason) {
      return errorResponse("A reason is required when archiving a period");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(melReportingPeriods)
        .set({ status: nextStatus, updatedById: actor.id, updatedAt: new Date() })
        .where(eq(melReportingPeriods.id, periodId));
      await tx.insert(melAuditEvents).values({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "mel_reporting_period",
        entityId: String(periodId),
        action: "status_changed",
        reason,
        before: { status: current.status },
        after: { status: nextStatus },
        correlationId: randomUUID(),
      });
    });

    revalidatePath("/admin/mel");
    return successResponse({ status: nextStatus }, `Period marked ${nextStatus}`);
  } catch (error) {
    console.error("updateMelReportingPeriodStatusAction", error);
    return mutationError(error, "Failed to update reporting period");
  }
}

export async function updateMelProgrammeSettingsAction(
  _previous: ActionResponse<{ updated: true }> | null,
  formData: FormData
): Promise<ActionResponse<{ updated: true }>> {
  try {
    const actor = await requireMelManager();
    const input = melProgrammeSettingsInputSchema.parse({
      programmeName: formData.get("programmeName"),
      timezone: formData.get("timezone"),
      redThreshold: formData.get("redThreshold"),
      greenThreshold: formData.get("greenThreshold"),
      financiallyResilientDefinition: emptyToNull(formData.get("financiallyResilientDefinition")),
      includeRefugeeDisaggregation: formData.get("includeRefugeeDisaggregation") === "on",
    });
    const current = await db.query.melProgrammeSettings.findFirst({
      where: eq(melProgrammeSettings.id, 1),
    });

    await db.transaction(async (tx) => {
      await tx
        .insert(melProgrammeSettings)
        .values({
          id: 1,
          ...input,
          redThreshold: String(input.redThreshold),
          greenThreshold: String(input.greenThreshold),
          updatedById: actor.id,
        })
        .onConflictDoUpdate({
          target: melProgrammeSettings.id,
          set: {
            ...input,
            redThreshold: String(input.redThreshold),
            greenThreshold: String(input.greenThreshold),
            updatedById: actor.id,
            updatedAt: new Date(),
          },
        });
      await tx.insert(melAuditEvents).values({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "mel_programme_settings",
        entityId: "1",
        action: current ? "updated" : "created",
        before: current
          ? {
              programmeName: current.programmeName,
              timezone: current.timezone,
              redThreshold: current.redThreshold,
              greenThreshold: current.greenThreshold,
              financiallyResilientDefinition: current.financiallyResilientDefinition,
              includeRefugeeDisaggregation: current.includeRefugeeDisaggregation,
            }
          : null,
        after: input,
        correlationId: randomUUID(),
      });
    });

    revalidatePath("/admin/mel");
    return successResponse({ updated: true }, "MEL settings updated");
  } catch (error) {
    console.error("updateMelProgrammeSettingsAction", error);
    return mutationError(error, "Failed to update MEL settings");
  }
}

export async function updateMelIndicatorAction(
  _previous: ActionResponse<{ id: number }> | null,
  formData: FormData
): Promise<ActionResponse<{ id: number }>> {
  try {
    const actor = await requireMelManager();
    const input = melIndicatorInputSchema.parse({
      indicatorId: formData.get("indicatorId"),
      name: formData.get("name"),
      definition: emptyToNull(formData.get("definition")),
      frequency: formData.get("frequency"),
      unit: formData.get("unit"),
      sourceType: formData.get("sourceType"),
      aggregation: formData.get("aggregation"),
      numeratorDefinition: emptyToNull(formData.get("numeratorDefinition")),
      denominatorDefinition: emptyToNull(formData.get("denominatorDefinition")),
      evidenceRequired: formData.get("evidenceRequired") === "on",
      isOneTime: formData.get("isOneTime") === "on",
      isActive: formData.get("isActive") === "on",
      unresolvedNotes: emptyToNull(formData.get("unresolvedNotes")),
    });
    const current = await db.query.melIndicatorDefinitions.findFirst({
      where: eq(melIndicatorDefinitions.id, input.indicatorId),
    });
    if (!current) return errorResponse("Indicator not found");

    const nextVersion = current.version + 1;
    await db.transaction(async (tx) => {
      await tx
        .update(melIndicatorDefinitions)
        .set({
          name: input.name,
          definition: input.definition,
          frequency: input.frequency,
          unit: input.unit,
          sourceType: input.sourceType,
          aggregation: input.aggregation,
          numeratorDefinition: input.numeratorDefinition,
          denominatorDefinition: input.denominatorDefinition,
          evidenceRequired: input.evidenceRequired,
          isOneTime: input.isOneTime,
          isActive: input.isActive,
          unresolvedNotes: input.unresolvedNotes,
          version: nextVersion,
          updatedById: actor.id,
          updatedAt: new Date(),
        })
        .where(eq(melIndicatorDefinitions.id, input.indicatorId));
      await tx.insert(melAuditEvents).values({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "mel_indicator_definition",
        entityId: String(input.indicatorId),
        action: "version_updated",
        before: {
          version: current.version,
          name: current.name,
          unit: current.unit,
          sourceType: current.sourceType,
          aggregation: current.aggregation,
          isActive: current.isActive,
        },
        after: { ...input, version: nextVersion },
        correlationId: randomUUID(),
      });
    });

    revalidatePath("/admin/mel");
    revalidatePath(`/admin/mel/indicators/${input.indicatorId}`);
    return successResponse({ id: input.indicatorId }, `Indicator saved as version ${nextVersion}`);
  } catch (error) {
    console.error("updateMelIndicatorAction", error);
    return mutationError(error, "Failed to update indicator");
  }
}

export async function upsertMelIndicatorBaselineAction(
  _previous: ActionResponse<{ id: number }> | null,
  formData: FormData
): Promise<ActionResponse<{ id: number }>> {
  try {
    const actor = await requireMelManager();
    const indicatorId = z.coerce.number().int().positive().parse(formData.get("indicatorId"));
    const segmentKey = z.string().trim().min(2).max(100).parse(formData.get("segmentKey"));
    const rawValue = emptyToNull(formData.get("value"));
    const valueText = emptyToNull(formData.get("valueText"));
    const value = rawValue === null ? null : z.coerce.number().finite().parse(rawValue);
    const periodLabel = emptyToNull(formData.get("periodLabel"));
    const notes = emptyToNull(formData.get("notes"));
    if (value === null && !valueText) return errorResponse("Enter a numeric or text baseline");

    const current = await db.query.melIndicatorBaselines.findFirst({
      where: and(
        eq(melIndicatorBaselines.indicatorId, indicatorId),
        eq(melIndicatorBaselines.segmentKey, segmentKey)
      ),
    });

    const [stored] = await db
      .insert(melIndicatorBaselines)
      .values({
        indicatorId,
        segmentKey,
        value: value === null ? null : String(value),
        valueText,
        periodLabel,
        notes,
      })
      .onConflictDoUpdate({
        target: [melIndicatorBaselines.indicatorId, melIndicatorBaselines.segmentKey],
        set: {
          value: value === null ? null : String(value),
          valueText,
          periodLabel,
          notes,
          updatedAt: new Date(),
        },
      })
      .returning({ id: melIndicatorBaselines.id });
    if (!stored) throw new Error("Failed to save baseline");

    await db.insert(melAuditEvents).values({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "mel_indicator_baseline",
      entityId: String(stored.id),
      action: current ? "updated" : "created",
      before: current
        ? { value: current.value, valueText: current.valueText, periodLabel: current.periodLabel }
        : null,
      after: { indicatorId, segmentKey, value, valueText, periodLabel, notes },
      correlationId: randomUUID(),
    });

    revalidatePath("/admin/mel");
    revalidatePath(`/admin/mel/indicators/${indicatorId}`);
    return successResponse({ id: stored.id }, "Baseline saved");
  } catch (error) {
    console.error("upsertMelIndicatorBaselineAction", error);
    return mutationError(error, "Failed to save baseline");
  }
}

export async function addMelIndicatorTargetAction(
  _previous: ActionResponse<{ id: number }> | null,
  formData: FormData
): Promise<ActionResponse<{ id: number }>> {
  try {
    const actor = await requireMelManager();
    const rawValue = emptyToNull(formData.get("value"));
    const rawPeriod = emptyToNull(formData.get("reportingPeriodId"));
    const input = melIndicatorTargetInputSchema.parse({
      indicatorId: formData.get("indicatorId"),
      programmeYear: formData.get("programmeYear"),
      reportingPeriodId: rawPeriod,
      segmentKey: formData.get("segmentKey"),
      value: rawValue,
      valueText: emptyToNull(formData.get("valueText")),
      notes: emptyToNull(formData.get("notes")),
    });

    const existing = await db.query.melIndicatorTargets.findFirst({
      where: and(
        eq(melIndicatorTargets.indicatorId, input.indicatorId),
        eq(melIndicatorTargets.programmeYear, input.programmeYear),
        input.reportingPeriodId === null
          ? isNull(melIndicatorTargets.reportingPeriodId)
          : eq(melIndicatorTargets.reportingPeriodId, input.reportingPeriodId),
        eq(melIndicatorTargets.segmentKey, input.segmentKey)
      ),
    });
    if (existing) return errorResponse("A target already exists for this year, period, and segment");

    const [created] = await db
      .insert(melIndicatorTargets)
      .values({
        indicatorId: input.indicatorId,
        programmeYear: input.programmeYear,
        reportingPeriodId: input.reportingPeriodId,
        segmentKey: input.segmentKey,
        value: input.value === null ? null : String(input.value),
        valueText: input.valueText,
        notes: input.notes,
        approvedById: actor.id,
      })
      .returning({ id: melIndicatorTargets.id });
    if (!created) throw new Error("Failed to save target");

    await db.insert(melAuditEvents).values({
      actorId: actor.id,
      actorRole: actor.role,
      entityType: "mel_indicator_target",
      entityId: String(created.id),
      action: "created",
      after: input,
      correlationId: randomUUID(),
    });

    revalidatePath("/admin/mel");
    revalidatePath(`/admin/mel/indicators/${input.indicatorId}`);
    return successResponse({ id: created.id }, "Target added");
  } catch (error) {
    console.error("addMelIndicatorTargetAction", error);
    return mutationError(error, "Failed to add target");
  }
}

export async function listMelAuditEvents(limit = 25) {
  try {
    await requireMelViewer();
    const events = await db.query.melAuditEvents.findMany({
      limit: Math.min(Math.max(limit, 1), 100),
      orderBy: [desc(melAuditEvents.createdAt)],
    });
    return successResponse(events);
  } catch (error) {
    console.error("listMelAuditEvents", error);
    return mutationError(error, "Failed to load MEL audit events");
  }
}
