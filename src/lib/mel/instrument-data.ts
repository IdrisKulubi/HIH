import { asc, eq, inArray } from "drizzle-orm";
import db from "@/db/drizzle";
import { melIndicatorDefinitions, melInstrumentQuestions, melInstrumentSections } from "@/db/schema";
import type { InstrumentSectionDefinition } from "./instrument-engine";

export async function loadInstrumentDefinition(versionId: number): Promise<InstrumentSectionDefinition[]> {
  const sections = await db.select().from(melInstrumentSections).where(eq(melInstrumentSections.versionId, versionId)).orderBy(asc(melInstrumentSections.sortOrder));
  const sectionIds = sections.map((section) => section.id);
  if (sectionIds.length === 0) return [];
  const questions = await db.select().from(melInstrumentQuestions).where(inArray(melInstrumentQuestions.sectionId, sectionIds)).orderBy(asc(melInstrumentQuestions.sortOrder));
  const indicatorIds = questions.map((question) => question.indicatorId).filter((id): id is number => id !== null);
  const indicators = indicatorIds.length ? await db.select({ id: melIndicatorDefinitions.id, code: melIndicatorDefinitions.code, unit: melIndicatorDefinitions.unit }).from(melIndicatorDefinitions).where(inArray(melIndicatorDefinitions.id, indicatorIds)) : [];
  return sections.map((section) => ({
    code: section.code,
    title: section.title,
    questions: questions.filter((question) => question.sectionId === section.id).map((question) => ({
      code: question.code,
      label: question.label,
      responseType: question.responseType,
      isRequired: question.isRequired,
      options: question.options,
      visibilityRule: question.visibilityRule,
      validationRules: question.validationRules,
      indicator: question.indicatorId ? indicators.find((indicator) => indicator.id === question.indicatorId) ?? null : null,
      evidenceRequired: question.evidenceRequired,
    })),
  }));
}
