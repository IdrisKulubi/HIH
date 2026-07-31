import { eq } from "drizzle-orm";
import db, { pool } from "../db/drizzle";
import {
  melIndicatorBaselines,
  melIndicatorDefinitions,
  melIndicatorTargets,
  melProgrammeSettings,
  melReportingPeriods,
} from "../db/schema";
import { MEL_ITT_SEED, validateMelIttSeed } from "../src/lib/mel/itt-seed";

const reportingPeriods = [
  {
    code: "2026-JUN-AUG",
    label: "June to August 2026",
    programmeYear: 1,
    sequence: 1,
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    collectionOpenDate: "2026-06-01",
    collectionCloseDate: "2026-09-15",
    status: "closed" as const,
    allowCatchUp: true,
  },
  {
    code: "2026-SEP-NOV",
    label: "September to November 2026",
    programmeYear: 1,
    sequence: 2,
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    collectionOpenDate: "2026-09-01",
    collectionCloseDate: "2026-12-15",
    status: "planned" as const,
    allowCatchUp: true,
  },
  {
    code: "2026-27-DEC-FEB",
    label: "December 2026 to February 2027",
    programmeYear: 1,
    sequence: 3,
    startDate: "2026-12-01",
    endDate: "2027-02-28",
    collectionOpenDate: "2026-12-01",
    collectionCloseDate: "2027-03-15",
    status: "planned" as const,
    allowCatchUp: true,
  },
  {
    code: "2027-MAR-MAY",
    label: "March to May 2027",
    programmeYear: 1,
    sequence: 4,
    startDate: "2027-03-01",
    endDate: "2027-05-31",
    collectionOpenDate: "2027-03-01",
    collectionCloseDate: "2027-06-15",
    status: "planned" as const,
    allowCatchUp: true,
  },
];

async function seed() {
  const issues = validateMelIttSeed();
  if (issues.length > 0) {
    throw new Error(`Invalid MEL ITT seed:\n${issues.join("\n")}`);
  }

  await db.transaction(async (tx) => {
    await tx.insert(melProgrammeSettings).values({ id: 1 }).onConflictDoNothing();
    await tx.insert(melReportingPeriods).values(reportingPeriods).onConflictDoNothing();

    for (const indicator of MEL_ITT_SEED) {
      await tx
        .insert(melIndicatorDefinitions)
        .values({
          code: indicator.code,
          resultCode: indicator.resultCode,
          resultLevel: indicator.resultLevel,
          resultStatement: indicator.resultStatement,
          name: indicator.name,
          definition: indicator.definition ?? null,
          unit: indicator.unit,
          sourceType: indicator.sourceType,
          frequency: indicator.frequency,
          aggregation: indicator.aggregation,
          numeratorDefinition: indicator.numeratorDefinition ?? null,
          denominatorDefinition: indicator.denominatorDefinition ?? null,
          disaggregationDimensions: indicator.disaggregationDimensions,
          evidenceRequired: indicator.evidenceRequired,
          isOneTime: indicator.isOneTime,
          sortOrder: indicator.sortOrder,
          unresolvedNotes: indicator.unresolvedNotes ?? null,
        })
        .onConflictDoNothing();

      const stored = await tx.query.melIndicatorDefinitions.findFirst({
        where: eq(melIndicatorDefinitions.code, indicator.code),
        columns: { id: true },
      });
      if (!stored) throw new Error(`Failed to store MEL indicator ${indicator.code}`);

      const baselineRows = (indicator.baselines ?? []).map((baseline) => ({
        indicatorId: stored.id,
        segmentKey: baseline.segmentKey,
        value: baseline.value === undefined ? null : String(baseline.value),
        valueText: baseline.valueText ?? null,
        notes: baseline.notes ?? null,
      }));
      if (baselineRows.length > 0) {
        await tx.insert(melIndicatorBaselines).values(baselineRows).onConflictDoNothing();
      }

      const targetRows = (indicator.targets ?? []).map((target) => ({
        indicatorId: stored.id,
        programmeYear: target.programmeYear,
        reportingPeriodId: null,
        segmentKey: target.segmentKey ?? "overall",
        value: target.value === undefined ? null : String(target.value),
        valueText: target.valueText ?? null,
        notes: target.notes ?? null,
      }));
      if (targetRows.length > 0) {
        await tx.insert(melIndicatorTargets).values(targetRows).onConflictDoNothing();
      }
    }
  });

  const count = await db.select({ id: melIndicatorDefinitions.id }).from(melIndicatorDefinitions);
  console.log(`MEL Phase 1 seed complete: ${count.length} indicator definitions available.`);
}

seed()
  .catch((error) => {
    console.error("MEL Phase 1 seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
