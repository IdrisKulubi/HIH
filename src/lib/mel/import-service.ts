import { eq } from "drizzle-orm";
import db from "@/db/drizzle";
import { businesses, melImportBatches, melImportMappings, melImportRecords, melIntegrationConnections, melReportingPeriods } from "@/db/schema";
import { importIdempotencyKey, resolveImportPayload, sourceChecksum } from "./import-engine";
import { enforceMelRateLimit, recordMelOperationalEvent, requireMelRolloutFeature } from "./operations";

export async function ingestMelIntegrationPayload(connectionId: number, payload: Record<string, unknown>, sourceName = "webhook") {
  const correlationId = crypto.randomUUID();
  await enforceMelRateLimit(`mel-import:${connectionId}`, 120, 60);
  await requireMelRolloutFeature("imports");
  const [connection, mapping] = await Promise.all([
    db.query.melIntegrationConnections.findFirst({ where: eq(melIntegrationConnections.id, connectionId) }),
    db.query.melImportMappings.findFirst({ where: eq(melImportMappings.connectionId, connectionId), orderBy: (table, { desc }) => [desc(table.version)] }),
  ]);
  if (!connection?.isActive) throw new Error("Integration connection is inactive or unavailable.");
  if (!mapping?.isActive) throw new Error("No active import mapping is configured.");
  const resolution = resolveImportPayload(payload, mapping);
  const [business, period] = await Promise.all([
    resolution.enterpriseId ? db.query.businesses.findFirst({ where: eq(businesses.id, resolution.enterpriseId) }) : null,
    resolution.reportingPeriodCode ? db.query.melReportingPeriods.findFirst({ where: eq(melReportingPeriods.code, resolution.reportingPeriodCode) }) : null,
  ]);
  if (resolution.enterpriseId && !business) resolution.errors.push(`Enterprise ${resolution.enterpriseId} does not exist.`);
  if (resolution.reportingPeriodCode && !period) resolution.errors.push(`Reporting period ${resolution.reportingPeriodCode} does not exist.`);
  const externalId = resolution.externalSubmissionId ?? `invalid-${correlationId}`;
  const idempotencyKey = importIdempotencyKey(connection.provider, connection.id, externalId);
  const duplicate = await db.query.melImportRecords.findFirst({ where: eq(melImportRecords.idempotencyKey, idempotencyKey) });
  if (duplicate) return { recordId: duplicate.id, status: "duplicate" as const, errors: ["This external submission has already been received."], correlationId };
  const allowedRawFields = new Set([mapping.enterpriseIdField, mapping.reportingPeriodField, mapping.externalSubmissionIdField, ...Object.keys(mapping.fieldMap)]);
  const minimizedPayload = Object.fromEntries(Object.entries(payload).filter(([key]) => allowedRawFields.has(key)));
  const [batch] = await db.insert(melImportBatches).values({ connectionId, mappingId: mapping.id, sourceName, sourceChecksum: sourceChecksum(minimizedPayload), status: resolution.errors.length ? "completed_with_errors" : "completed", totalRecords: 1, validRecords: resolution.errors.length ? 0 : 1, quarantinedRecords: resolution.errors.length ? 1 : 0, startedAt: new Date(), completedAt: new Date() }).returning({ id: melImportBatches.id });
  const [record] = await db.insert(melImportRecords).values({ batchId: batch.id, connectionId, externalSubmissionId: externalId, idempotencyKey, status: resolution.errors.length ? "quarantined" : "validated", businessId: business?.id ?? null, reportingPeriodId: period?.id ?? null, rawPayload: minimizedPayload, normalizedPayload: resolution.normalized, validationErrors: resolution.errors, attempts: 1 }).returning({ id: melImportRecords.id, status: melImportRecords.status });
  await recordMelOperationalEvent({ severity: resolution.errors.length ? "warning" : "info", eventType: resolution.errors.length ? "import_quarantined" : "import_validated", message: resolution.errors.length ? "An imported MEL record requires review." : "An imported MEL record passed mapping validation.", correlationId, metadata: { connectionId, batchId: batch.id, recordId: record.id, errorCount: resolution.errors.length } });
  return { recordId: record.id, status: record.status, errors: resolution.errors, correlationId };
}
