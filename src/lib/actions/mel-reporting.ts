"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import db from "@/db/drizzle";
import {
  businesses,
  melAuditEvents,
  melEnterpriseFinancialBaselines,
  melIndicatorDefinitions,
  melIndicatorResults,
  melLearningActions,
  melMonitoringSubmissions,
  melProgrammeResults,
  melReportingPeriods,
} from "@/db/schema";
import { requireMelManager, requireMelViewer } from "@/lib/mel/access";
import { MEL_CALCULATION_VERSION } from "@/lib/mel/indicator-engine";
import { requireMelRolloutFeature } from "@/lib/mel/operations";
import { buildMelReportingDataset, dashboardResultSegmentKey, type MelDashboardFilters, type MelReportingDataset } from "@/lib/mel/reporting-data";
import { errorResponse, successResponse, type ActionResponse } from "./types";

const programmeResultSchema = z.object({
  indicatorId: z.coerce.number().int().positive(),
  reportingPeriodId: z.coerce.number().int().positive(),
  segmentKey: z.string().trim().min(1).max(100).default("overall"),
  value: z.string().trim().optional(),
  valueText: z.string().trim().max(1000).optional(),
  numerator: z.string().trim().optional(),
  denominator: z.string().trim().optional(),
  notes: z.string().trim().max(3000).optional(),
  evidenceUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
}).superRefine((value, context) => {
  const hasValue = value.value !== undefined && value.value !== "";
  const hasText = Boolean(value.valueText);
  const hasRatio = value.numerator !== undefined && value.numerator !== ""
    && value.denominator !== undefined && value.denominator !== "";
  if (!hasValue && !hasText && !hasRatio) {
    context.addIssue({ code: "custom", message: "Enter a value, text result, or numerator and denominator." });
  }
  for (const key of ["value", "numerator", "denominator"] as const) {
    const raw = value[key];
    if (raw && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
      context.addIssue({ code: "custom", path: [key], message: `${key} must be a non-negative number.` });
    }
  }
});

function failure(error: unknown, fallback: string): ActionResponse<never> {
  if (error instanceof z.ZodError) return errorResponse(error.issues[0]?.message ?? fallback);
  if (error instanceof Error) return errorResponse(error.message);
  return errorResponse(fallback);
}

const optionalNumber = (value: string | undefined) => value ? String(Number(value)) : null;

export async function getMelReportingDashboard(
  filters: MelDashboardFilters = {}
): Promise<ActionResponse<MelReportingDataset>> {
  try {
    await requireMelViewer();
    await requireMelRolloutFeature("reporting");
    return successResponse(await buildMelReportingDataset(filters));
  } catch (error) {
    console.error("getMelReportingDashboard", error);
    return failure(error, "Unable to load MEL reporting dashboard.");
  }
}

export async function recalculateMelIndicatorsAction(
  filters: MelDashboardFilters
): Promise<ActionResponse<{ calculated: number }>> {
  try {
    const actor = await requireMelManager();
    const dataset = await buildMelReportingDataset(filters);
    const now = new Date();
    const segmentKey = dashboardResultSegmentKey(filters);
    await db.transaction(async (tx) => {
      for (const row of dataset.ittRows) {
        const calculation = row.calculation;
        await tx.insert(melIndicatorResults).values({
          indicatorId: row.indicatorId,
          reportingPeriodId: dataset.selectedPeriod.id,
          programmeYear: dataset.selectedPeriod.programmeYear,
          segmentKey,
          actual: calculation.actual === null ? null : String(calculation.actual),
          numerator: calculation.numerator === null ? null : String(calculation.numerator),
          denominator: calculation.denominator === null ? null : String(calculation.denominator),
          target: calculation.target === null ? null : String(calculation.target),
          achievementPercentage: calculation.achievementPercentage === null ? null : String(calculation.achievementPercentage),
          trafficLight: calculation.trafficLight,
          calculationVersion: MEL_CALCULATION_VERSION,
          indicatorVersion: row.indicatorVersion,
          calculationRule: calculation.calculationRule,
          sourceCount: calculation.sourceCount,
          lineage: {
            submissionIds: calculation.sourceSubmissionIds,
            programmeResultIds: calculation.sourceProgrammeResultIds,
            systemRecordIds: calculation.sourceSystemIds,
            achievementIds: calculation.sourceAchievementIds,
            denominatorBasis: calculation.denominatorBasis,
            filters: dataset.filters,
          },
          exclusions: calculation.exclusions,
          calculationHash: row.calculationHash,
          calculatedById: actor.id,
          calculatedAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: [
            melIndicatorResults.indicatorId,
            melIndicatorResults.reportingPeriodId,
            melIndicatorResults.programmeYear,
            melIndicatorResults.segmentKey,
          ],
          set: {
            actual: calculation.actual === null ? null : String(calculation.actual),
            numerator: calculation.numerator === null ? null : String(calculation.numerator),
            denominator: calculation.denominator === null ? null : String(calculation.denominator),
            target: calculation.target === null ? null : String(calculation.target),
            achievementPercentage: calculation.achievementPercentage === null ? null : String(calculation.achievementPercentage),
            trafficLight: calculation.trafficLight,
            calculationVersion: MEL_CALCULATION_VERSION,
            indicatorVersion: row.indicatorVersion,
            calculationRule: calculation.calculationRule,
            sourceCount: calculation.sourceCount,
            lineage: {
              submissionIds: calculation.sourceSubmissionIds,
              programmeResultIds: calculation.sourceProgrammeResultIds,
              systemRecordIds: calculation.sourceSystemIds,
              achievementIds: calculation.sourceAchievementIds,
              denominatorBasis: calculation.denominatorBasis,
              filters: dataset.filters,
            },
            exclusions: calculation.exclusions,
            calculationHash: row.calculationHash,
            calculatedById: actor.id,
            calculatedAt: now,
            updatedAt: now,
          },
        });
      }
      await tx.insert(melAuditEvents).values({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "mel_indicator_result_batch",
        entityId: String(dataset.selectedPeriod.id),
        action: "recalculate",
        reason: `Recalculated ${dataset.ittRows.length} active indicators`,
        after: { filters: dataset.filters, calculationVersion: MEL_CALCULATION_VERSION },
        correlationId: randomUUID(),
      });
    });
    revalidatePath("/admin/mel/reporting");
    return successResponse({ calculated: dataset.ittRows.length }, "ITT results recalculated.");
  } catch (error) {
    console.error("recalculateMelIndicatorsAction", error);
    return failure(error, "Unable to recalculate ITT results.");
  }
}

export async function getMelProgrammeResultWorkspace() {
  try {
    const actor = await requireMelViewer();
    const [indicators, periods, results] = await Promise.all([
      db.query.melIndicatorDefinitions.findMany({
        where: and(eq(melIndicatorDefinitions.isActive, true), eq(melIndicatorDefinitions.sourceType, "programme_mel_entry")),
        orderBy: [asc(melIndicatorDefinitions.sortOrder)],
      }),
      db.query.melReportingPeriods.findMany({ orderBy: [asc(melReportingPeriods.startDate)] }),
      db.query.melProgrammeResults.findMany({
        with: { indicator: true, reportingPeriod: true },
        orderBy: [asc(melProgrammeResults.reportingPeriodId), asc(melProgrammeResults.indicatorId)],
      }),
    ]);
    return successResponse({ canManage: actor.canManage, indicators, periods, results });
  } catch (error) {
    return failure(error, "Unable to load programme result entries.");
  }
}

export async function saveMelProgrammeResultAction(formData: FormData): Promise<ActionResponse<{ id: number }>> {
  try {
    const actor = await requireMelManager();
    const input = programmeResultSchema.parse(Object.fromEntries(formData.entries()));
    const indicator = await db.query.melIndicatorDefinitions.findFirst({
      where: eq(melIndicatorDefinitions.id, input.indicatorId),
    });
    if (!indicator || indicator.sourceType !== "programme_mel_entry" || !indicator.isActive) {
      throw new Error("Select an active programme-entry indicator.");
    }
    const [saved] = await db.insert(melProgrammeResults).values({
      indicatorId: input.indicatorId,
      reportingPeriodId: input.reportingPeriodId,
      segmentKey: input.segmentKey,
      value: optionalNumber(input.value),
      valueText: input.valueText || null,
      numerator: optionalNumber(input.numerator),
      denominator: optionalNumber(input.denominator),
      notes: input.notes || null,
      evidenceUrl: input.evidenceUrl || null,
      status: "draft",
      enteredById: actor.id,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [melProgrammeResults.indicatorId, melProgrammeResults.reportingPeriodId, melProgrammeResults.segmentKey],
      set: {
        value: optionalNumber(input.value),
        valueText: input.valueText || null,
        numerator: optionalNumber(input.numerator),
        denominator: optionalNumber(input.denominator),
        notes: input.notes || null,
        evidenceUrl: input.evidenceUrl || null,
        status: "draft",
        enteredById: actor.id,
        approvedById: null,
        approvedAt: null,
        updatedAt: new Date(),
      },
    }).returning({ id: melProgrammeResults.id });
    revalidatePath("/admin/mel/programme-results");
    return successResponse({ id: saved.id }, "Programme result saved as draft.");
  } catch (error) {
    return failure(error, "Unable to save programme result.");
  }
}

export async function changeMelProgrammeResultStatusAction(
  resultId: number,
  decision: "approve" | "reopen" | "void",
  reason: string
): Promise<ActionResponse<{ id: number }>> {
  try {
    const actor = await requireMelManager();
    if (decision !== "approve" && reason.trim().length < 10) throw new Error("Provide a reason of at least 10 characters.");
    const current = await db.query.melProgrammeResults.findFirst({ where: eq(melProgrammeResults.id, resultId) });
    if (!current) throw new Error("Programme result was not found.");
    const status = decision === "approve" ? "approved" : decision === "reopen" ? "reopened" : "voided";
    await db.transaction(async (tx) => {
      await tx.update(melProgrammeResults).set({
        status,
        approvedById: status === "approved" ? actor.id : null,
        approvedAt: status === "approved" ? new Date() : null,
        reopenedAt: status === "reopened" ? new Date() : null,
        updatedAt: new Date(),
      }).where(eq(melProgrammeResults.id, resultId));
      await tx.insert(melAuditEvents).values({
        actorId: actor.id,
        actorRole: actor.role,
        entityType: "mel_programme_result",
        entityId: String(resultId),
        action: decision,
        reason: reason.trim() || null,
        before: { status: current.status },
        after: { status },
        correlationId: randomUUID(),
      });
    });
    revalidatePath("/admin/mel/programme-results");
    revalidatePath("/admin/mel/reporting");
    return successResponse({ id: resultId }, `Programme result ${status}.`);
  } catch (error) {
    return failure(error, "Unable to update programme result.");
  }
}

export type MelMapPoint = {
  businessId: number;
  businessName: string;
  county: string | null;
  sector: string;
  track: string | null;
  latitude: number;
  longitude: number;
  clusterKey: string;
};

export async function getMelGisData(): Promise<ActionResponse<{ points: MelMapPoint[]; invalid: Array<{ businessId: number; applicationId: number | null; businessName: string; reason: string }> }>> {
  try {
    await requireMelViewer();
    const enterpriseRows = await db.query.businesses.findMany({
      with: { application: true, kycProfile: true },
    });
    const points: MelMapPoint[] = [];
    const invalid: Array<{ businessId: number; applicationId: number | null; businessName: string; reason: string }> = [];
    for (const business of enterpriseRows) {
      const profile = business.kycProfile;
      if (!profile || profile.status !== "verified") {
        invalid.push({ businessId: business.id, applicationId: business.application?.id ?? null, businessName: business.name, reason: "KYC location is missing or not verified" });
        continue;
      }
      const parsed = parseCoordinates(profile.gpsCoordinates);
      if (!parsed) {
        invalid.push({ businessId: business.id, applicationId: business.application?.id ?? null, businessName: business.name, reason: "Missing or invalid coordinates" });
        continue;
      }
      if (parsed.latitude < -5 || parsed.latitude > 5.5 || parsed.longitude < 33.5 || parsed.longitude > 42.5) {
        invalid.push({ businessId: business.id, applicationId: business.application?.id ?? null, businessName: business.name, reason: "Coordinates fall outside the Kenya validation boundary" });
        continue;
      }
      const latitude = Number(parsed.latitude.toFixed(3));
      const longitude = Number(parsed.longitude.toFixed(3));
      points.push({
        businessId: business.id,
        businessName: business.name,
        county: business.county,
        sector: business.sector,
        track: business.application?.track ?? null,
        latitude,
        longitude,
        clusterKey: `${(Math.round(latitude * 4) / 4).toFixed(2)},${(Math.round(longitude * 4) / 4).toFixed(2)}`,
      });
    }
    return successResponse({ points, invalid });
  } catch (error) {
    return failure(error, "Unable to load protected GIS data.");
  }
}

export async function getMelEnterpriseDashboard(businessId: number) {
  try {
    const actor = await requireMelViewer();
    const [business, financialBaseline] = await Promise.all([db.query.businesses.findFirst({
      where: eq(businesses.id, businessId),
      with: {
        applicant: true,
        application: true,
        kycProfile: true,
        melMonitoringSubmissions: {
          with: { reportingPeriod: true, response: true, jobs: true, evidence: true },
          orderBy: [asc(melMonitoringSubmissions.reportingPeriodId)],
        },
        melLearningActions: { orderBy: [asc(melLearningActions.dueDate)] },
      },
    }), db.query.melEnterpriseFinancialBaselines.findFirst({ where: and(eq(melEnterpriseFinancialBaselines.businessId, businessId), eq(melEnterpriseFinancialBaselines.status, "active")) })]);
    if (!business) throw new Error("Enterprise was not found.");
    return successResponse({ ...business, financialBaseline: financialBaseline ?? null, canManage: actor.canManage });
  } catch (error) {
    return failure(error, "Unable to load enterprise MEL dashboard.");
  }
}

function parseCoordinates(value: string | null): { latitude: number; longitude: number } | null {
  if (!value) return null;
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;
  const latitude = Number(matches[0]);
  const longitude = Number(matches[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}
