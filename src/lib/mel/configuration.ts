import { z } from "zod";

export const melProgrammeSettingsInputSchema = z
  .object({
    programmeName: z.string().trim().min(3).max(255),
    timezone: z.string().trim().min(3).max(100),
    redThreshold: z.coerce.number().min(0).max(100),
    greenThreshold: z.coerce.number().min(0).max(100),
    financiallyResilientDefinition: z.string().trim().max(3000).nullable(),
    includeRefugeeDisaggregation: z.boolean(),
  })
  .refine((value) => value.redThreshold < value.greenThreshold, {
    message: "The red threshold must be lower than the green threshold",
    path: ["greenThreshold"],
  });

export const melIndicatorInputSchema = z
  .object({
    indicatorId: z.coerce.number().int().positive(),
    name: z.string().trim().min(3).max(1000),
    definition: z.string().trim().max(5000).nullable(),
    frequency: z.string().trim().min(3).max(40),
    unit: z.enum(["count", "kes", "percentage", "kilograms", "status", "score"]),
    sourceType: z.enum([
      "system",
      "quarterly_enterprise_form",
      "programme_mel_entry",
      "integration",
      "derived",
    ]),
    aggregation: z.enum(["sum", "median", "count", "distinct_count", "ratio", "latest_value"]),
    numeratorDefinition: z.string().trim().max(3000).nullable(),
    denominatorDefinition: z.string().trim().max(3000).nullable(),
    evidenceRequired: z.boolean(),
    isOneTime: z.boolean(),
    isActive: z.boolean(),
    unresolvedNotes: z.string().trim().max(3000).nullable(),
  })
  .superRefine((value, context) => {
    if (value.aggregation === "ratio" && (!value.numeratorDefinition || !value.denominatorDefinition)) {
      context.addIssue({
        code: "custom",
        path: ["numeratorDefinition"],
        message: "Ratio indicators require numerator and denominator definitions",
      });
    }
  });

export const melIndicatorTargetInputSchema = z
  .object({
    indicatorId: z.coerce.number().int().positive(),
    programmeYear: z.coerce.number().int().min(0).max(20),
    reportingPeriodId: z.coerce.number().int().positive().nullable(),
    segmentKey: z.string().trim().min(2).max(100),
    value: z.coerce.number().finite().nullable(),
    valueText: z.string().trim().max(1000).nullable(),
    notes: z.string().trim().max(3000).nullable(),
  })
  .refine((value) => value.value !== null || Boolean(value.valueText), {
    message: "Enter a numeric or text target",
    path: ["value"],
  });

export function emptyToNull(value: FormDataEntryValue | null): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}
