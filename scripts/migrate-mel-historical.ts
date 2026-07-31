import { inArray } from "drizzle-orm";
import db from "../db/drizzle";
import { businessPerformanceMetrics, melImportBatches, melImportRecords, melReportingPeriods } from "../db/schema";
import { importIdempotencyKey, sourceChecksum } from "../src/lib/mel/import-engine";

async function main() {
  const apply = process.argv.includes("--apply");
  const metrics = await db.select().from(businessPerformanceMetrics);
  const periods = await db.select().from(melReportingPeriods);
  const existingKeys = metrics.length ? await db.select({ key: melImportRecords.idempotencyKey }).from(melImportRecords).where(inArray(melImportRecords.idempotencyKey, metrics.map((metric) => importIdempotencyKey("legacy", 0, String(metric.id))))) : [];
  const existing = new Set(existingKeys.map((item) => item.key));
  const prepared = metrics.filter((metric) => !existing.has(importIdempotencyKey("legacy", 0, String(metric.id)))).map((metric) => {
    const period = periods.find((candidate) => candidate.code.toLowerCase() === metric.reportingPeriod.trim().toLowerCase() || candidate.label.toLowerCase() === metric.reportingPeriod.trim().toLowerCase());
    const errors = period ? [] : [`No reporting period matches ${metric.reportingPeriod}.`];
    return { metric, period, errors, normalized: { revenue: metric.revenueGenerated ? Number(metric.revenueGenerated) : null, direct_jobs_total: metric.newJobsCreated ?? 0, new_market_segments: metric.newMarketsEntered ?? 0, market_expansion_index: metric.marketExpansionIndex ? Number(metric.marketExpansionIndex) : null, _source: "business_performance_metrics", _sourceRecordId: metric.id, _migrationConfidence: period ? "medium" : "low" } };
  });
  const summary = { sourceRows: metrics.length, alreadyImported: existing.size, ready: prepared.filter((item) => item.errors.length === 0).length, quarantined: prepared.filter((item) => item.errors.length > 0).length, mode: apply ? "apply" : "dry-run" };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply || prepared.length === 0) { if (!apply) console.log("Dry run only. Re-run with --apply after reviewing period mappings and totals."); return; }
  await db.transaction(async (tx) => {
    const [batch] = await tx.insert(melImportBatches).values({ sourceName: "business_performance_metrics historical migration", sourceChecksum: sourceChecksum(prepared.map((item) => item.metric.id)), status: summary.quarantined ? "completed_with_errors" : "completed", totalRecords: prepared.length, validRecords: summary.ready, quarantinedRecords: summary.quarantined, startedAt: new Date(), completedAt: new Date() }).returning({ id: melImportBatches.id });
    await tx.insert(melImportRecords).values(prepared.map(({ metric, period, errors, normalized }) => ({ batchId: batch.id, externalSubmissionId: String(metric.id), idempotencyKey: importIdempotencyKey("legacy", 0, String(metric.id)), status: errors.length ? "quarantined" as const : "validated" as const, businessId: metric.businessId, reportingPeriodId: period?.id ?? null, rawPayload: { sourceRecordId: metric.id, reportingPeriod: metric.reportingPeriod }, normalizedPayload: normalized, validationErrors: errors, attempts: 1 })));
  });
  console.log("Historical migration batch created. Validated records still require promotion and MEL review.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
