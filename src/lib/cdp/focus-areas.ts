import { z } from "zod";

/** BIRE CDP diagnostic focus codes (A–L). */
export const CDP_FOCUS_CODES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

export type CdpFocusCode = (typeof CDP_FOCUS_CODES)[number];

export const cdpFocusCodeSchema = z.enum(CDP_FOCUS_CODES);

export const CDP_FOCUS_AREAS: Record<
  CdpFocusCode,
  { label: string; sortOrder: number }
> = {
  A: { label: "Product assessment", sortOrder: 1 },
  B: { label: "Business model", sortOrder: 2 },
  C: { label: "Market + customer assessment", sortOrder: 3 },
  D: { label: "Finance management assessment", sortOrder: 4 },
  E: { label: "Business technical capacity", sortOrder: 5 },
  F: { label: "Systems, processes & digital capacity", sortOrder: 6 },
  G: { label: "Distribution channel assessment", sortOrder: 7 },
  H: { label: "Growth & scalability assessment", sortOrder: 8 },
  I: { label: "Access to finance – investment readiness", sortOrder: 9 },
  J: { label: "Risk assessment", sortOrder: 10 },
  K: { label: "Climate & ESG assessment", sortOrder: 11 },
  L: { label: "Impact assessment", sortOrder: 12 },
};

export type CdpPriorityLevel = "high" | "medium" | "low";

/**
 * BIRE template: HIGH 0–4, MEDIUM 5–7, LOW 8–10.
 */
export function priorityFromScore0to10(score: number | null | undefined): CdpPriorityLevel {
  if (score == null || Number.isNaN(score)) return "medium";
  if (score <= 4) return "high";
  if (score <= 7) return "medium";
  return "low";
}

export function priorityLabel(p: CdpPriorityLevel): string {
  switch (p) {
    case "high":
      return "High — address first (score 0–4)";
    case "medium":
      return "Medium — address next (score 5–7)";
    case "low":
      return "Low — maintain or amplify (score 8–10)";
  }
}

export const score0to10Schema = z.number().int().min(0).max(10);

/** BIRE template: area scores are restricted to 0, 5, or 10. */
export const score0to5to10Schema = z.union([z.literal(0), z.literal(5), z.literal(10)]);

export const cdpFocusSummaryInputSchema = z.object({
  focusCode: cdpFocusCodeSchema,
  score0to10: score0to5to10Schema,
  keyGaps: z.string().max(8000).optional().nullable(),
  recommendedIntervention: z.string().max(8000).optional().nullable(),
  responsibleStaff: z.string().max(500).optional().nullable(),
  targetDate: z.string().optional().nullable(), // ISO date yyyy-mm-dd
});

export type CdpFocusSummaryInput = z.infer<typeof cdpFocusSummaryInputSchema>;
