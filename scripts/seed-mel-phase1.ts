import { cwd } from "node:process";
import { loadEnvConfig } from "@next/env";
import { and, eq, sql } from "drizzle-orm";
import { MEL_ITT_SEED, validateMelIttSeed } from "../src/lib/mel/itt-seed";
import {
  MEL_OP11_YEAR1_ACTUALS,
  MEL_PROGRAMME_REPORTING_PERIODS,
  MEL_Y1_FIRST_MONITORING_SEQUENCE,
} from "../src/lib/mel/programme-calendar";

loadEnvConfig(cwd());

async function seed() {
  if (!process.env.POSTGRES_URL) {
    throw new Error("POSTGRES_URL is not set. Add it to .env.local (or .env) and retry.");
  }

  const [
    { default: db, pool },
    {
      melIndicatorBaselines,
      melIndicatorDefinitions,
      melIndicatorTargets,
      melProgrammeSettings,
      melProgrammeResults,
      melReportingPeriods,
    },
  ] = await Promise.all([import("../db/drizzle"), import("../db/schema")]);

  try {
    const issues = validateMelIttSeed();
    if (issues.length > 0) {
      throw new Error(`Invalid MEL ITT seed:\n${issues.join("\n")}`);
    }

    await db.transaction(async (tx) => {
      await tx.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "mel_reporting_periods_programme_sequence_unique"
          ON "mel_reporting_periods" ("programme_year", "sequence")
      `);
      await tx.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "mel_indicator_baselines_indicator_segment_unique"
          ON "mel_indicator_baselines" ("indicator_id", "segment_key")
      `);
      await tx.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "mel_programme_results_indicator_period_segment_unique"
          ON "mel_programme_results" ("indicator_id", "reporting_period_id", "segment_key")
      `);

      await tx
        .insert(melProgrammeSettings)
        .values({
          id: 1,
          monthlyFinancialBaselines: {
            foundation: { revenue: 200000, costs: 124221, profit: 50000 },
            acceleration: { revenue: 692600, costs: 490500, profit: 150000 },
          },
        })
        .onConflictDoUpdate({
          target: melProgrammeSettings.id,
          set: {
            monthlyFinancialBaselines: {
              foundation: { revenue: 200000, costs: 124221, profit: 50000 },
              acceleration: { revenue: 692600, costs: 490500, profit: 150000 },
            },
            updatedAt: new Date(),
          },
        });

      for (const period of MEL_PROGRAMME_REPORTING_PERIODS) {
        const existing = await tx.query.melReportingPeriods.findFirst({
          where: and(
            eq(melReportingPeriods.programmeYear, period.programmeYear),
            eq(melReportingPeriods.sequence, period.sequence)
          ),
          columns: { id: true },
        });
        if (existing) {
          await tx
            .update(melReportingPeriods)
            .set({
              code: period.code,
              label: period.label,
              startDate: period.startDate,
              endDate: period.endDate,
              collectionOpenDate: period.collectionOpenDate,
              collectionCloseDate: period.collectionCloseDate,
              status: period.status,
              allowCatchUp: period.allowCatchUp,
              updatedAt: new Date(),
            })
            .where(eq(melReportingPeriods.id, existing.id));
        } else {
          await tx.insert(melReportingPeriods).values(period);
        }
      }

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
          for (const baseline of baselineRows) {
            await tx
              .insert(melIndicatorBaselines)
              .values(baseline)
              .onConflictDoUpdate({
                target: [melIndicatorBaselines.indicatorId, melIndicatorBaselines.segmentKey],
                set: {
                  value: baseline.value,
                  valueText: baseline.valueText,
                  notes: baseline.notes,
                  updatedAt: new Date(),
                },
              });
          }
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
        for (const target of targetRows) {
          const existingTarget = await tx.query.melIndicatorTargets.findFirst({
            where: and(
              eq(melIndicatorTargets.indicatorId, target.indicatorId),
              eq(melIndicatorTargets.programmeYear, target.programmeYear),
              eq(melIndicatorTargets.segmentKey, target.segmentKey),
              sql`${melIndicatorTargets.reportingPeriodId} is null`
            ),
            columns: { id: true },
          });
          if (existingTarget) {
            await tx
              .update(melIndicatorTargets)
              .set({
                value: target.value,
                valueText: target.valueText,
                notes: target.notes,
                updatedAt: new Date(),
              })
              .where(eq(melIndicatorTargets.id, existingTarget.id));
          } else {
            await tx.insert(melIndicatorTargets).values(target);
          }
        }
      }

      await tx
        .update(melIndicatorDefinitions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(melIndicatorDefinitions.code, "OP1.1-JOBS-CREATED"));

      const y1Anchor = await tx.query.melReportingPeriods.findFirst({
        where: and(
          eq(melReportingPeriods.programmeYear, 1),
          eq(melReportingPeriods.sequence, MEL_Y1_FIRST_MONITORING_SEQUENCE)
        ),
        columns: { id: true },
      });
      if (y1Anchor) {
        for (const [code, value] of Object.entries(MEL_OP11_YEAR1_ACTUALS)) {
          const indicator = await tx.query.melIndicatorDefinitions.findFirst({
            where: eq(melIndicatorDefinitions.code, code),
            columns: { id: true },
          });
          if (!indicator) continue;
          const existingResult = await tx.query.melProgrammeResults.findFirst({
            where: and(
              eq(melProgrammeResults.indicatorId, indicator.id),
              eq(melProgrammeResults.reportingPeriodId, y1Anchor.id),
              eq(melProgrammeResults.segmentKey, "overall")
            ),
            columns: { id: true },
          });
          if (existingResult) {
            await tx
              .update(melProgrammeResults)
              .set({
                value: String(value),
                notes: "Official shared-ITT Year 1 actual",
                status: "approved",
                approvedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(melProgrammeResults.id, existingResult.id));
          } else {
            await tx.insert(melProgrammeResults).values({
              indicatorId: indicator.id,
              reportingPeriodId: y1Anchor.id,
              segmentKey: "overall",
              value: String(value),
              notes: "Official shared-ITT Year 1 actual",
              status: "approved",
              approvedAt: new Date(),
            });
          }
        }
      }
    });

    const count = await db
      .select({ id: melIndicatorDefinitions.id })
      .from(melIndicatorDefinitions)
      .where(eq(melIndicatorDefinitions.isActive, true));
    console.log(`MEL Phase 1 seed complete: ${count.length} active indicator definitions available.`);
    console.log(`Reporting periods aligned to Oct 15 programme years (${MEL_PROGRAMME_REPORTING_PERIODS.length} quarters).`);
    console.log("OP1.1 Year 1 official actuals: mobilized 240, CNA 235, CDP 235 (vs Y1 target 250).");
  } finally {
    await pool.end().catch(() => undefined);
  }
}

seed().catch((error) => {
  console.error("MEL Phase 1 seed failed", error);
  process.exitCode = 1;
});
