export type PreScreeningOutcome = "pass" | "conditional" | "stop";

export function isPreScreeningOutcome(value: unknown): value is PreScreeningOutcome {
  return value === "pass" || value === "conditional" || value === "stop";
}

export function resolveEffectivePreScreeningOutcome(
  originalOutcome: string | null | undefined,
  latestOverrideOutcome?: string | null
): PreScreeningOutcome | null {
  if (isPreScreeningOutcome(latestOverrideOutcome)) return latestOverrideOutcome;
  return isPreScreeningOutcome(originalOutcome) ? originalOutcome : null;
}

export function validatePreScreeningOutcomeOverride(input: {
  currentOutcome: PreScreeningOutcome;
  newOutcome: PreScreeningOutcome;
  hardStopReasons: string[];
  matchingGrantDraftExists: boolean;
}): string | null {
  if (input.currentOutcome === input.newOutcome) {
    return "Choose an outcome different from the current effective outcome";
  }
  if (input.hardStopReasons.length > 0 && input.newOutcome !== "stop") {
    return "An assessment with a mandatory hard stop cannot be promoted";
  }
  if (
    input.currentOutcome === "pass" &&
    input.newOutcome !== "pass" &&
    input.matchingGrantDraftExists
  ) {
    return "A Pass cannot be downgraded after a Matching Grant application draft exists";
  }
  return null;
}
