import type { CnaQuestion, CnaQuestionResponse } from "@/db/schema";
import { CDP_FOCUS_AREAS, type CdpFocusCode } from "./focus-areas";
import {
  formatIntervention,
  getDefaultInterventionForFocus,
  getRecommendedInterventionsForFocus,
} from "./intervention-catalog";

export type CnaGapSourceRow = CnaQuestionResponse & { question: CnaQuestion };

export function ratingToGapPriority(rating: "poor" | "fair" | "great") {
  if (rating === "poor") return "high" as const;
  if (rating === "fair") return "medium" as const;
  return null;
}

export function buildGapRecommendation(focusCode: CdpFocusCode) {
  const entries = getRecommendedInterventionsForFocus(focusCode);
  if (!entries.length) return null;
  return entries.map(formatIntervention).join("\n");
}

export function buildGapItemInsert(row: CnaGapSourceRow, planId: number, assessmentId: number) {
  const priority = ratingToGapPriority(row.ratingLabel);
  if (!priority) return null;
  const focusCode = row.question.sectionCode as CdpFocusCode;
  const defaultIntervention = getDefaultInterventionForFocus(focusCode);

  return {
    planId,
    assessmentId,
    questionResponseId: row.id,
    focusCode,
    focusName: CDP_FOCUS_AREAS[focusCode]?.label ?? row.question.sectionName,
    questionText: row.question.questionText,
    reviewerRole: row.question.assignedRole,
    ratingLabel: row.ratingLabel,
    priority,
    reviewerComment: row.comment,
    recommendedIntervention: buildGapRecommendation(focusCode),
    selectedInterventionKey: defaultIntervention?.key ?? null,
  };
}
