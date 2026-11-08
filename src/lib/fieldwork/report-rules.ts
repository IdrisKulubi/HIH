import { z } from "zod";
import { hasRole } from "./plan-rules";

export const REPORT_MIN_WORDS = { activitiesConducted: 150, findingsAndGaps: 200, recommendations: 150 } as const;
export const REPORT_SHORT_MIN_CHARS = 10;
export const REPORT_MAX_CHARS = 20_000;

export const REPORT_FIELDS = [
  { key: "activitiesConducted", label: "Activities conducted", minWords: REPORT_MIN_WORDS.activitiesConducted },
  { key: "findingsAndGaps", label: "Findings and gaps", minWords: REPORT_MIN_WORDS.findingsAndGaps },
  { key: "enterpriseChallenges", label: "Challenges faced by the enterprise", minWords: 0 },
  { key: "solutionsOffered", label: "Solutions offered", minWords: 0 },
  { key: "recommendations", label: "Recommendations", minWords: REPORT_MIN_WORDS.recommendations },
  { key: "actionPoints", label: "Action points", minWords: 0 },
  { key: "timeline", label: "Timeline", minWords: 0 },
] as const;
export type ReportFieldKey = (typeof REPORT_FIELDS)[number]["key"];
export type ReportFields = Record<ReportFieldKey, string>;

export const countWords = (value: string | null | undefined) => (value ?? "").trim().split(/\s+/).filter(Boolean).length;

const fieldText = z.string().max(REPORT_MAX_CHARS, "Too long.");
export const reportDraftSchema = z.object({
  visitId: z.number().int().positive(),
  ...Object.fromEntries(REPORT_FIELDS.map((f) => [f.key, fieldText.optional()])),
} as Record<"visitId", z.ZodNumber> & Record<ReportFieldKey, z.ZodOptional<z.ZodString>>);

/** Returns a message per failing field; empty object means the report may be submitted. */
export function validateReportForSubmit(fields: Partial<Record<ReportFieldKey, string | null>>) {
  const errors: Partial<Record<ReportFieldKey, string>> = {};
  for (const field of REPORT_FIELDS) {
    const value = (fields[field.key] ?? "").trim();
    if (field.minWords) {
      const words = countWords(value);
      if (words < field.minWords) errors[field.key] = `${field.label} needs at least ${field.minWords} words (you have ${words}).`;
    } else if (value.length < REPORT_SHORT_MIN_CHARS) {
      errors[field.key] = `${field.label} is required.`;
    }
  }
  return errors;
}

type ReportRouting = { planCreatedById: string; assignedRedoId: string | null; status: string };

export function canReviewReport(user: { id: string; role?: string | null }, report: ReportRouting) {
  if (report.status !== "submitted" || user.id === report.planCreatedById) return false;
  if (user.role === "admin") return true;
  return user.role === "redo" && report.assignedRedoId === user.id;
}

export function canEditReport(user: { id: string; role?: string | null }, report: ReportRouting) {
  return ["draft", "returned"].includes(report.status) && report.planCreatedById === user.id && hasRole(user.role, ["bds_edo", "admin"]);
}
