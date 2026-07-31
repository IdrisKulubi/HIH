"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";
import db from "@/db/drizzle";
import { melAuditEvents, melIndicatorDefinitions, melInstrumentQuestions, melInstrumentSections, melInstrumentVersions, melInstruments, melReportingPeriods } from "@/db/schema";
import { requireMelManager, requireMelViewer } from "@/lib/mel/access";
import { loadInstrumentDefinition } from "@/lib/mel/instrument-data";
import { validateInstrumentForPublishing } from "@/lib/mel/instrument-engine";
import { errorResponse, successResponse, type ActionResponse } from "./types";

const instrumentSchema = z.object({ code: z.string().trim().regex(/^[A-Z0-9_-]{3,80}$/), name: z.string().trim().min(3).max(255), description: z.string().trim().max(3000).optional(), type: z.enum(["baseline", "quarterly_monitoring", "midline", "endline", "special_study"]) });
const sectionSchema = z.object({ versionId: z.number().int().positive(), code: z.string().trim().regex(/^[a-z0-9_]{2,80}$/), title: z.string().trim().min(2).max(255), description: z.string().trim().max(2000).optional(), sortOrder: z.number().int().min(0) });
const questionSchema = z.object({
  sectionId: z.number().int().positive(), code: z.string().trim().regex(/^[a-z0-9_]{2,100}$/), label: z.string().trim().min(3).max(1000),
  responseType: z.enum(["short_text", "long_text", "integer", "decimal", "currency", "percentage", "date", "boolean", "single_select", "multi_select", "file"]), isRequired: z.boolean(), helpText: z.string().trim().max(2000).optional(),
  options: z.array(z.object({ value: z.string().min(1).max(100), label: z.string().min(1).max(180) })).max(100),
  visibilityRule: z.object({ questionCode: z.string().min(1), operator: z.enum(["equals", "not_equals", "contains", "is_answered"]), value: z.union([z.string(), z.number(), z.boolean()]).optional() }).nullable(),
  validationRules: z.object({ min: z.number().optional(), max: z.number().optional(), minLength: z.number().int().min(0).optional(), maxLength: z.number().int().min(1).optional(), pattern: z.string().max(500).optional() }),
  indicatorId: z.number().int().positive().nullable(), evidenceRequired: z.boolean(), sortOrder: z.number().int().min(0),
});

function failure(error: unknown, fallback: string): ActionResponse<never> { if (error instanceof z.ZodError) return errorResponse(error.issues[0]?.message ?? fallback); if (error instanceof Error) return errorResponse(error.message); return errorResponse(fallback); }

export async function getMelInstrumentWorkspace() {
  try {
    const actor = await requireMelViewer();
    const [instruments, versions, sections, questions, indicators, periods] = await Promise.all([
      db.select().from(melInstruments).orderBy(asc(melInstruments.name)), db.select().from(melInstrumentVersions).orderBy(asc(melInstrumentVersions.instrumentId), asc(melInstrumentVersions.version)), db.select().from(melInstrumentSections).orderBy(asc(melInstrumentSections.sortOrder)), db.select().from(melInstrumentQuestions).orderBy(asc(melInstrumentQuestions.sortOrder)), db.select({ id: melIndicatorDefinitions.id, code: melIndicatorDefinitions.code, name: melIndicatorDefinitions.name, unit: melIndicatorDefinitions.unit }).from(melIndicatorDefinitions).where(eq(melIndicatorDefinitions.isActive, true)).orderBy(asc(melIndicatorDefinitions.sortOrder)), db.select().from(melReportingPeriods).orderBy(asc(melReportingPeriods.startDate)),
    ]);
    return successResponse({ canManage: actor.canManage, instruments: instruments.map((instrument) => ({ ...instrument, versions: versions.filter((version) => version.instrumentId === instrument.id).map((version) => ({ ...version, sections: sections.filter((section) => section.versionId === version.id).map((section) => ({ ...section, questions: questions.filter((question) => question.sectionId === section.id) })) })) })), indicators, periods });
  } catch (error) { return failure(error, "Unable to load configurable instruments."); }
}

export async function createMelInstrumentAction(input: unknown) {
  try {
    const actor = await requireMelManager(); const value = instrumentSchema.parse(input);
    const result = await db.transaction(async (tx) => {
      const [instrument] = await tx.insert(melInstruments).values({ ...value, description: value.description || null, createdById: actor.id }).returning({ id: melInstruments.id });
      const [version] = await tx.insert(melInstrumentVersions).values({ instrumentId: instrument.id, version: 1 }).returning({ id: melInstrumentVersions.id });
      await tx.insert(melAuditEvents).values({ actorId: actor.id, actorRole: actor.role, entityType: "mel_instrument", entityId: String(instrument.id), action: "created", after: { ...value, version: 1 }, correlationId: randomUUID() });
      return { instrumentId: instrument.id, versionId: version.id };
    });
    revalidatePath("/admin/mel/instruments"); return successResponse(result, "Instrument draft created.");
  } catch (error) { return failure(error, "Unable to create instrument."); }
}

async function requireDraftVersion(versionId: number) {
  const version = await db.query.melInstrumentVersions.findFirst({ where: eq(melInstrumentVersions.id, versionId) });
  if (!version) throw new Error("Instrument version was not found.");
  if (version.status !== "draft") throw new Error("Published and retired versions are immutable. Create a new version to make changes.");
  return version;
}

export async function addMelInstrumentSectionAction(input: unknown) {
  try { const actor = await requireMelManager(); const value = sectionSchema.parse(input); await requireDraftVersion(value.versionId); const [section] = await db.insert(melInstrumentSections).values({ ...value, description: value.description || null }).returning({ id: melInstrumentSections.id }); await db.insert(melAuditEvents).values({ actorId: actor.id, actorRole: actor.role, entityType: "mel_instrument_version", entityId: String(value.versionId), action: "section_added", after: value, correlationId: randomUUID() }); revalidatePath("/admin/mel/instruments"); return successResponse(section, "Section added."); } catch (error) { return failure(error, "Unable to add section."); }
}

export async function addMelInstrumentQuestionAction(input: unknown) {
  try { const actor = await requireMelManager(); const value = questionSchema.parse(input); const section = await db.query.melInstrumentSections.findFirst({ where: eq(melInstrumentSections.id, value.sectionId) }); if (!section) throw new Error("Section was not found."); await requireDraftVersion(section.versionId); const [question] = await db.insert(melInstrumentQuestions).values({ ...value, helpText: value.helpText || null }).returning({ id: melInstrumentQuestions.id }); await db.insert(melAuditEvents).values({ actorId: actor.id, actorRole: actor.role, entityType: "mel_instrument_version", entityId: String(section.versionId), action: "question_added", after: { code: value.code, responseType: value.responseType }, correlationId: randomUUID() }); revalidatePath("/admin/mel/instruments"); return successResponse(question, "Question added."); } catch (error) { return failure(error, "Unable to add question."); }
}

export async function publishMelInstrumentVersionAction(versionId: number, effectiveFromPeriodId: number | null) {
  try {
    const actor = await requireMelManager(); const version = await requireDraftVersion(versionId); const definition = await loadInstrumentDefinition(versionId); const issues = validateInstrumentForPublishing(definition); if (issues.length) return errorResponse(issues.join(" "));
    await db.transaction(async (tx) => {
      await tx.update(melInstrumentVersions).set({ status: "published", effectiveFromPeriodId, publishedById: actor.id, publishedAt: new Date(), updatedAt: new Date() }).where(eq(melInstrumentVersions.id, versionId));
      await tx.update(melInstruments).set({ status: "published", updatedAt: new Date() }).where(eq(melInstruments.id, version.instrumentId));
      await tx.insert(melAuditEvents).values({ actorId: actor.id, actorRole: actor.role, entityType: "mel_instrument_version", entityId: String(versionId), action: "published", after: { version: version.version, effectiveFromPeriodId, validationIssues: 0 }, correlationId: randomUUID() });
    });
    revalidatePath("/admin/mel/instruments"); return successResponse({ versionId }, "Instrument version published and locked.");
  } catch (error) { return failure(error, "Unable to publish instrument."); }
}

export async function createNextMelInstrumentVersionAction(instrumentId: number) {
  try {
    const actor = await requireMelManager(); const versions = await db.select().from(melInstrumentVersions).where(eq(melInstrumentVersions.instrumentId, instrumentId)).orderBy(asc(melInstrumentVersions.version)); const source = versions.at(-1); if (!source) throw new Error("Instrument has no source version."); const sections = await db.select().from(melInstrumentSections).where(eq(melInstrumentSections.versionId, source.id)); const sectionIds = sections.map((section) => section.id); const questions = sectionIds.length ? await db.select().from(melInstrumentQuestions).where(inArray(melInstrumentQuestions.sectionId, sectionIds)) : [];
    const newVersionId = await db.transaction(async (tx) => {
      const [created] = await tx.insert(melInstrumentVersions).values({ instrumentId, version: source.version + 1 }).returning({ id: melInstrumentVersions.id });
      for (const section of sections) { const [copy] = await tx.insert(melInstrumentSections).values({ versionId: created.id, code: section.code, title: section.title, description: section.description, sortOrder: section.sortOrder }).returning({ id: melInstrumentSections.id }); const sectionQuestions = questions.filter((question) => question.sectionId === section.id); if (sectionQuestions.length) await tx.insert(melInstrumentQuestions).values(sectionQuestions.map((question) => ({ sectionId: copy.id, code: question.code, label: question.label, responseType: question.responseType, isRequired: question.isRequired, helpText: question.helpText, options: question.options, visibilityRule: question.visibilityRule, validationRules: question.validationRules, indicatorId: question.indicatorId, evidenceRequired: question.evidenceRequired, sortOrder: question.sortOrder }))); }
      await tx.insert(melAuditEvents).values({ actorId: actor.id, actorRole: actor.role, entityType: "mel_instrument", entityId: String(instrumentId), action: "version_created", after: { version: source.version + 1, sourceVersion: source.version }, correlationId: randomUUID() }); return created.id;
    });
    revalidatePath("/admin/mel/instruments"); return successResponse({ versionId: newVersionId }, "New editable version created.");
  } catch (error) { return failure(error, "Unable to create a new instrument version."); }
}

export async function retireMelInstrumentVersionAction(versionId: number, reason: string) {
  try { const actor = await requireMelManager(); if (reason.trim().length < 10) throw new Error("Provide a retirement reason of at least 10 characters."); const version = await db.query.melInstrumentVersions.findFirst({ where: eq(melInstrumentVersions.id, versionId) }); if (!version || version.status !== "published") throw new Error("Only a published version can be retired."); await db.transaction(async (tx) => { await tx.update(melInstrumentVersions).set({ status: "retired", retiredAt: new Date(), updatedAt: new Date() }).where(eq(melInstrumentVersions.id, versionId)); const [{ count }] = await tx.select({ count: max(melInstrumentVersions.version) }).from(melInstrumentVersions).where(and(eq(melInstrumentVersions.instrumentId, version.instrumentId), eq(melInstrumentVersions.status, "published"))); if (!count) await tx.update(melInstruments).set({ status: "retired", updatedAt: new Date() }).where(eq(melInstruments.id, version.instrumentId)); await tx.insert(melAuditEvents).values({ actorId: actor.id, actorRole: actor.role, entityType: "mel_instrument_version", entityId: String(versionId), action: "retired", reason, correlationId: randomUUID() }); }); revalidatePath("/admin/mel/instruments"); return successResponse({ versionId }, "Instrument version retired."); } catch (error) { return failure(error, "Unable to retire instrument version."); }
}
