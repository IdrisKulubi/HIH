"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray } from "drizzle-orm";
import * as XLSX from "xlsx";
import db from "@/db/drizzle";
import {
  businesses,
  melAuditEvents,
  melEnterpriseFinancialBaselines,
  melFinancialBaselineBatches,
} from "@/db/schema";
import { requireMelManager, requireMelViewer } from "@/lib/mel/access";
import { KNOWN_BASELINE_ID_CORRECTIONS, normalizeEnterpriseName } from "@/lib/mel/financial-baselines";
import { errorResponse, successResponse, type ActionResponse } from "./types";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const REQUIRED_HEADERS = ["businessid", "businessname", "monthlytotalrevenue", "monthlytotalcosts", "annualtotalrevenue", "annualtotalcosts", "annualprofitloss"];

function failure(error: unknown, fallback: string): ActionResponse<never> {
  return errorResponse(error instanceof Error ? error.message : fallback);
}

function cellNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function headerKey(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sourceId(value: unknown): number | null {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

export async function getMelFinancialBaselineWorkspace() {
  try {
    const actor = await requireMelViewer();
    const batches = await db.select().from(melFinancialBaselineBatches).orderBy(desc(melFinancialBaselineBatches.createdAt)).limit(20);
    const latest = batches[0] ?? null;
    const records = latest
      ? await db
          .select({ record: melEnterpriseFinancialBaselines, matchedBusinessName: businesses.name })
          .from(melEnterpriseFinancialBaselines)
          .leftJoin(businesses, eq(businesses.id, melEnterpriseFinancialBaselines.businessId))
          .where(eq(melEnterpriseFinancialBaselines.batchId, latest.id))
          .orderBy(melEnterpriseFinancialBaselines.sourceRow)
      : [];
    return successResponse({ canManage: actor.canManage, batches, latest, records });
  } catch (error) {
    return failure(error, "Unable to load enterprise financial baselines.");
  }
}

export async function uploadMelFinancialBaselineAction(
  _previous: ActionResponse<{ batchId: number }> | null,
  formData: FormData
): Promise<ActionResponse<{ batchId: number }>> {
  try {
    const actor = await requireMelManager();
    const file = formData.get("file");
    const effectiveDate = String(formData.get("effectiveDate") ?? "2026-05-31");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Choose an Excel .xlsx baseline workbook.");
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) throw new Error("The workbook must be between 1 byte and 10 MB.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) throw new Error("Provide a valid baseline effective date.");

    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const duplicate = await db.query.melFinancialBaselineBatches.findFirst({ where: eq(melFinancialBaselineBatches.sourceChecksum, checksum) });
    if (duplicate) throw new Error(`This exact workbook was already uploaded as batch ${duplicate.id}.`);

    const workbook = XLSX.read(bytes, { type: "buffer", cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error("The workbook does not contain a readable worksheet.");
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
    if (rows.length < 2) throw new Error("The workbook does not contain baseline records.");
    const headers = rows[0].map(headerKey);
    const positions = new Map(headers.map((header, index) => [header, index]));
    const missing = REQUIRED_HEADERS.filter((header) => !positions.has(header));
    if (missing.length) throw new Error(`Missing required workbook columns: ${missing.join(", ")}.`);

    const businessRows = await db.select({ id: businesses.id, name: businesses.name }).from(businesses);
    const byId = new Map(businessRows.map((business) => [business.id, business]));
    const byName = new Map<string, typeof businessRows>();
    for (const business of businessRows) {
      const key = normalizeEnterpriseName(business.name);
      byName.set(key, [...(byName.get(key) ?? []), business]);
    }

    const normalized = rows.slice(1).map((row, offset) => {
      const value = (key: string) => row[positions.get(key)!];
      const rawId = String(value("businessid") ?? "").trim();
      const name = String(value("businessname") ?? "").trim();
      if (!name && !rawId && row.every((cell) => cell === null || cell === "")) return null;
      const nameKey = normalizeEnterpriseName(name);
      const correctedId = KNOWN_BASELINE_ID_CORRECTIONS[nameKey];
      const exactNameCandidates = byName.get(nameKey) ?? [];
      const parsedId = sourceId(rawId);
      const businessId = correctedId ?? parsedId ?? (exactNameCandidates.length === 1 ? exactNameCandidates[0].id : null);
      const matched = businessId ? byId.get(businessId) : null;
      const monthlyRevenue = cellNumber(value("monthlytotalrevenue"));
      const monthlyCosts = cellNumber(value("monthlytotalcosts"));
      const annualRevenue = cellNumber(value("annualtotalrevenue"));
      const annualCosts = cellNumber(value("annualtotalcosts"));
      const annualProfit = cellNumber(value("annualprofitloss"));
      const errors: string[] = [];
      const warnings: string[] = [];
      if (!matched) errors.push("Business ID could not be matched to an enterprise.");
      if (!name) errors.push("Business name is required.");
      if (monthlyRevenue === null || monthlyRevenue < 0) errors.push("Monthly revenue must be a non-negative number.");
      if (monthlyCosts === null || monthlyCosts < 0) errors.push("Monthly costs must be a non-negative number.");
      if (annualRevenue === null || annualCosts === null || annualProfit === null) errors.push("All annual validation values must be numeric.");
      if (monthlyRevenue !== null && annualRevenue !== null && Math.abs(annualRevenue - monthlyRevenue * 12) > 0.01) errors.push("Annual revenue does not equal monthly revenue × 12.");
      if (monthlyCosts !== null && annualCosts !== null && Math.abs(annualCosts - monthlyCosts * 12) > 0.01) errors.push("Annual costs do not equal monthly costs × 12.");
      if (annualRevenue !== null && annualCosts !== null && annualProfit !== null && Math.abs(annualProfit - (annualRevenue - annualCosts)) > 0.01) errors.push("Annual profit/loss does not equal annual revenue minus annual costs.");
      if (matched && normalizeEnterpriseName(matched.name) !== nameKey) warnings.push(`Workbook name differs from system name: ${matched.name}.`);
      if (correctedId) warnings.push(`Business ID normalized to ${correctedId} using the verified enterprise-name correction.`);
      return {
        sourceRow: offset + 2,
        sourceBusinessId: rawId,
        sourceBusinessName: name,
        businessId: matched?.id ?? null,
        effectiveDate,
        monthlyRevenue,
        monthlyCosts,
        monthlyProfit: monthlyRevenue === null || monthlyCosts === null ? null : monthlyRevenue - monthlyCosts,
        annualRevenue,
        annualCosts,
        annualProfit,
        rawRow: Object.fromEntries(headers.map((header, index) => [header, row[index]])),
        validationErrors: errors,
        validationWarnings: warnings,
        status: errors.length ? "quarantined" as const : "validated" as const,
      };
    }).filter((row): row is NonNullable<typeof row> => row !== null);

    const counts = new Map<number, number>();
    for (const row of normalized) if (row.businessId) counts.set(row.businessId, (counts.get(row.businessId) ?? 0) + 1);
    for (const row of normalized) {
      if (row.businessId && (counts.get(row.businessId) ?? 0) > 1) {
        row.validationErrors.push(`Enterprise ${row.businessId} occurs more than once in this batch.`);
        row.status = "quarantined";
      }
    }
    const validRecords = normalized.filter((row) => row.status === "validated").length;
    const quarantinedRecords = normalized.length - validRecords;

    const batchId = await db.transaction(async (tx) => {
      const [batch] = await tx.insert(melFinancialBaselineBatches).values({
        sourceName: file.name, sourceChecksum: checksum, effectiveDate,
        status: quarantinedRecords ? "needs_review" : "validated",
        totalRecords: normalized.length, validRecords, quarantinedRecords, uploadedById: actor.id,
      }).returning({ id: melFinancialBaselineBatches.id });
      if (!batch) throw new Error("Failed to create the baseline import batch.");
      if (normalized.length) await tx.insert(melEnterpriseFinancialBaselines).values(normalized.map((row) => ({ ...row, batchId: batch.id, monthlyRevenue: row.monthlyRevenue === null ? null : String(row.monthlyRevenue), monthlyCosts: row.monthlyCosts === null ? null : String(row.monthlyCosts), monthlyProfit: row.monthlyProfit === null ? null : String(row.monthlyProfit), annualRevenue: row.annualRevenue === null ? null : String(row.annualRevenue), annualCosts: row.annualCosts === null ? null : String(row.annualCosts), annualProfit: row.annualProfit === null ? null : String(row.annualProfit) })));
      await tx.insert(melAuditEvents).values({ actorId: actor.id, actorRole: actor.role, entityType: "mel_financial_baseline_batch", entityId: String(batch.id), action: "uploaded", after: { effectiveDate, totalRecords: normalized.length, validRecords, quarantinedRecords }, correlationId: randomUUID() });
      return batch.id;
    });
    revalidatePath("/admin/mel/imports/baselines");
    return successResponse({ batchId }, quarantinedRecords ? "Workbook staged with rows requiring review." : "Workbook validated and is ready to activate.");
  } catch (error) {
    return failure(error, "Unable to upload the baseline workbook.");
  }
}

export async function resolveMelFinancialBaselineRecordAction(recordId: number, businessId: number) {
  try {
    const actor = await requireMelManager();
    const [record, business] = await Promise.all([
      db.query.melEnterpriseFinancialBaselines.findFirst({ where: eq(melEnterpriseFinancialBaselines.id, recordId) }),
      db.query.businesses.findFirst({ where: eq(businesses.id, businessId), columns: { id: true, name: true } }),
    ]);
    if (!record || !business) throw new Error("The baseline row or enterprise was not found.");
    const valueErrors = record.validationErrors.filter((error) => !error.startsWith("Business ID") && !error.startsWith("Enterprise "));
    await db.update(melEnterpriseFinancialBaselines).set({ businessId, validationErrors: valueErrors, validationWarnings: [...record.validationWarnings, `Manually matched to ${business.name} (${business.id}).`], status: valueErrors.length ? "quarantined" : "validated", resolvedById: actor.id, resolvedAt: new Date(), updatedAt: new Date() }).where(eq(melEnterpriseFinancialBaselines.id, recordId));
    const batchRecords = await db.query.melEnterpriseFinancialBaselines.findMany({ where: eq(melEnterpriseFinancialBaselines.batchId, record.batchId) });
    const refreshed = batchRecords.map((item) => item.id === recordId ? { ...item, status: valueErrors.length ? "quarantined" : "validated" } : item);
    const valid = refreshed.filter((item) => item.status === "validated").length;
    await db.update(melFinancialBaselineBatches).set({ validRecords: valid, quarantinedRecords: refreshed.length - valid, status: valid === refreshed.length ? "validated" : "needs_review" }).where(eq(melFinancialBaselineBatches.id, record.batchId));
    revalidatePath("/admin/mel/imports/baselines");
    return successResponse({ recordId }, "Baseline row match updated.");
  } catch (error) { return failure(error, "Unable to resolve the baseline row."); }
}

export async function activateMelFinancialBaselineBatchAction(batchId: number) {
  try {
    const actor = await requireMelManager();
    const batch = await db.query.melFinancialBaselineBatches.findFirst({ where: eq(melFinancialBaselineBatches.id, batchId) });
    if (!batch || batch.status !== "validated") throw new Error("Only a fully validated batch can be activated.");
    const records = await db.query.melEnterpriseFinancialBaselines.findMany({ where: eq(melEnterpriseFinancialBaselines.batchId, batchId) });
    if (!records.length || records.some((record) => record.status !== "validated" || !record.businessId)) throw new Error("Every row must be validated and matched before activation.");
    const businessIds = records.map((record) => record.businessId!);
    if (new Set(businessIds).size !== businessIds.length) throw new Error("A baseline batch cannot contain duplicate enterprises.");
    await db.transaction(async (tx) => {
      await tx.update(melEnterpriseFinancialBaselines).set({ status: "superseded", updatedAt: new Date() }).where(and(inArray(melEnterpriseFinancialBaselines.businessId, businessIds), eq(melEnterpriseFinancialBaselines.status, "active")));
      await tx.update(melEnterpriseFinancialBaselines).set({ status: "active", updatedAt: new Date() }).where(eq(melEnterpriseFinancialBaselines.batchId, batchId));
      await tx.update(melFinancialBaselineBatches).set({ status: "active", activatedById: actor.id, activatedAt: new Date() }).where(eq(melFinancialBaselineBatches.id, batchId));
      await tx.insert(melAuditEvents).values({ actorId: actor.id, actorRole: actor.role, entityType: "mel_financial_baseline_batch", entityId: String(batchId), action: "activated", after: { effectiveDate: batch.effectiveDate, enterpriseCount: records.length }, correlationId: randomUUID() });
    });
    revalidatePath("/admin/mel/imports/baselines");
    revalidatePath("/admin/mel/reporting");
    return successResponse({ batchId }, `${records.length} enterprise baselines activated.`);
  } catch (error) { return failure(error, "Unable to activate the baseline batch."); }
}
