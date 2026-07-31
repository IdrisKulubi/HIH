import { z } from "zod";

export const melPeriodStatusSchema = z.enum(["planned", "open", "closed", "archived"]);
export type MelPeriodStatus = z.infer<typeof melPeriodStatusSchema>;

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Use a valid date");

export const melReportingPeriodInputSchema = z
  .object({
    label: z.string().trim().min(3, "Label is required").max(120),
    programmeYear: z.coerce.number().int().min(1).max(20),
    sequence: z.coerce.number().int().min(1).max(100),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
    collectionOpenDate: isoDateSchema,
    collectionCloseDate: isoDateSchema,
    allowCatchUp: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.startDate > value.endDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must be on or after the start date",
      });
    }
    if (value.collectionOpenDate > value.collectionCloseDate) {
      context.addIssue({
        code: "custom",
        path: ["collectionCloseDate"],
        message: "Collection close date must be on or after the open date",
      });
    }
  });

export type MelReportingPeriodInput = z.infer<typeof melReportingPeriodInputSchema>;

export type DateRange = {
  startDate: string;
  endDate: string;
};

export function dateRangesOverlap(left: DateRange, right: DateRange): boolean {
  return left.startDate <= right.endDate && right.startDate <= left.endDate;
}

function compactMonth(date: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`))
    .toUpperCase();
}

export function buildReportingPeriodCode(input: Pick<MelReportingPeriodInput, "startDate" | "endDate">): string {
  const startYear = input.startDate.slice(0, 4);
  const endYear = input.endDate.slice(0, 4);
  const yearPart = startYear === endYear ? startYear : `${startYear}-${endYear.slice(2)}`;
  return `${yearPart}-${compactMonth(input.startDate)}-${compactMonth(input.endDate)}`;
}

export const MEL_STATUS_TRANSITIONS: Record<MelPeriodStatus, readonly MelPeriodStatus[]> = {
  planned: ["open", "archived"],
  open: ["closed"],
  closed: ["open", "archived"],
  archived: [],
};

export function canTransitionMelPeriod(from: MelPeriodStatus, to: MelPeriodStatus): boolean {
  return MEL_STATUS_TRANSITIONS[from].includes(to);
}

export function parseReportingPeriodFormData(formData: FormData): MelReportingPeriodInput {
  return melReportingPeriodInputSchema.parse({
    label: formData.get("label"),
    programmeYear: formData.get("programmeYear"),
    sequence: formData.get("sequence"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    collectionOpenDate: formData.get("collectionOpenDate"),
    collectionCloseDate: formData.get("collectionCloseDate"),
    allowCatchUp: formData.get("allowCatchUp") === "on",
  });
}
