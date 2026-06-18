import db from "@/db/drizzle";
import {
  a2fPipeline,
  a2fPreScreeningAttempts,
  a2fPreScreeningOverrides,
  applications,
  businesses,
  dueDiligenceRecords,
} from "@/db/schema";
import { a2fScreeningCandidateWhere } from "@/lib/a2f-screening-cohort";
import { resolveEffectivePreScreeningOutcome } from "@/lib/a2f-pre-screening-outcome";
import { and, desc, eq, inArray } from "drizzle-orm";

export async function ensureA2fPipelineEntryForApplication(
  applicationId: number,
  options?: { notes?: string; officerId?: string | null }
): Promise<number> {
  const existing = await db.query.a2fPipeline.findFirst({
    where: eq(a2fPipeline.applicationId, applicationId),
  });

  if (existing) {
    if (existing.screeningRequired) {
      await db
        .update(a2fPipeline)
        .set({ screeningRequired: false, updatedAt: new Date() })
        .where(eq(a2fPipeline.id, existing.id));
    }
    return existing.id;
  }

  const [business] = await db
    .select({ annualRevenue: businesses.revenueLastYear })
    .from(applications)
    .innerJoin(businesses, eq(businesses.id, applications.businessId))
    .where(eq(applications.id, applicationId))
    .limit(1);

  const [created] = await db
    .insert(a2fPipeline)
    .values({
      applicationId,
      instrumentType: "matching_grant",
      requestedAmount: String(Number(business?.annualRevenue ?? 0) || 1),
      screeningRequired: false,
      status: "a2f_pipeline",
      a2fOfficerId: options?.officerId ?? null,
      notes: options?.notes ?? "Created after A2F pre-screening pass",
    })
    .returning({ id: a2fPipeline.id });

  return created.id;
}

/** Create or unblock pipeline rows for DD-qualified enterprises with an effective Pass screening. */
export async function syncPassedScreeningPipelineEntries(): Promise<void> {
  const candidates = await db
    .select({ applicationId: applications.id })
    .from(applications)
    .innerJoin(
      dueDiligenceRecords,
      eq(dueDiligenceRecords.applicationId, applications.id)
    )
    .where(a2fScreeningCandidateWhere);

  const applicationIds = candidates.map((row) => row.applicationId);
  if (!applicationIds.length) return;

  const attempts = await db
    .select()
    .from(a2fPreScreeningAttempts)
    .where(
      and(
        inArray(a2fPreScreeningAttempts.applicationId, applicationIds),
        eq(a2fPreScreeningAttempts.status, "submitted")
      )
    )
    .orderBy(desc(a2fPreScreeningAttempts.assessedAt));

  const latestSubmittedByApplication = new Map<number, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    if (!latestSubmittedByApplication.has(attempt.applicationId)) {
      latestSubmittedByApplication.set(attempt.applicationId, attempt);
    }
  }

  const attemptIds = [...latestSubmittedByApplication.values()].map((row) => row.id);
  const overrides = attemptIds.length
    ? await db
        .select()
        .from(a2fPreScreeningOverrides)
        .where(inArray(a2fPreScreeningOverrides.attemptId, attemptIds))
        .orderBy(desc(a2fPreScreeningOverrides.createdAt))
    : [];

  const latestOverrideByAttempt = new Map<number, (typeof overrides)[number]>();
  for (const row of overrides) {
    if (!latestOverrideByAttempt.has(row.attemptId)) {
      latestOverrideByAttempt.set(row.attemptId, row);
    }
  }

  for (const attempt of latestSubmittedByApplication.values()) {
    const effectiveOutcome = resolveEffectivePreScreeningOutcome(
      attempt.outcome,
      latestOverrideByAttempt.get(attempt.id)?.newOutcome
    );
    if (effectiveOutcome !== "pass") continue;

    await ensureA2fPipelineEntryForApplication(attempt.applicationId);
  }
}
