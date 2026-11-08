export const MEL_INDICATOR_GROUPS = [
  "impact",
  "long_term_outcomes",
  "enterprise_capacity",
  "finance_markets",
  "green_growth",
  "policy_environment",
] as const;

export type MelIndicatorGroup = typeof MEL_INDICATOR_GROUPS[number];

export function indicatorGroup(code: string): MelIndicatorGroup {
  if (code.startsWith("IM-")) return "impact";
  if (code.startsWith("LT")) return "long_term_outcomes";
  if (code.startsWith("OP1")) return "enterprise_capacity";
  if (code.startsWith("OP2")) return "finance_markets";
  if (code.startsWith("OP3")) return "green_growth";
  return "policy_environment";
}
