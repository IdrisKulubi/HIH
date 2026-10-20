export type InstrumentResponseType = "short_text" | "long_text" | "integer" | "decimal" | "currency" | "percentage" | "date" | "boolean" | "single_select" | "multi_select" | "file";
export type VisibilityRule = { questionCode: string; operator: "equals" | "not_equals" | "contains" | "is_answered"; value?: string | number | boolean };
export type InstrumentQuestionDefinition = {
  code: string;
  label: string;
  responseType: InstrumentResponseType;
  isRequired: boolean;
  options: Array<{ value: string; label: string }>;
  visibilityRule: VisibilityRule | null;
  validationRules: { min?: number; max?: number; minLength?: number; maxLength?: number; pattern?: string };
  indicator?: { code: string; unit: string } | null;
  evidenceRequired: boolean;
};
export type InstrumentSectionDefinition = { code: string; title: string; questions: InstrumentQuestionDefinition[] };

const NUMERIC_TYPES: InstrumentResponseType[] = ["integer", "decimal", "currency", "percentage"];

export function validateInstrumentForPublishing(sections: InstrumentSectionDefinition[]): string[] {
  const issues: string[] = [];
  if (sections.length === 0) return ["Add at least one section before publishing."];
  const questions = sections.flatMap((section) => section.questions);
  const codes = new Set<string>();
  for (const section of sections) {
    if (!section.code.trim() || !section.title.trim()) issues.push("Every section requires a code and title.");
    if (section.questions.length === 0) issues.push(`Section ${section.code || "without a code"} has no questions.`);
  }
  for (const question of questions) {
    if (codes.has(question.code)) issues.push(`Question code ${question.code} is duplicated.`);
    codes.add(question.code);
    if (!question.responseType) issues.push(`Question ${question.code} has no response type.`);
    if (["single_select", "multi_select"].includes(question.responseType) && question.options.length === 0) issues.push(`Question ${question.code} requires at least one option.`);
    if (question.visibilityRule && !questions.some((candidate) => candidate.code === question.visibilityRule?.questionCode)) issues.push(`Question ${question.code} references missing visibility question ${question.visibilityRule.questionCode}.`);
    if (question.visibilityRule?.questionCode === question.code) issues.push(`Question ${question.code} cannot depend on itself.`);
    if (question.indicator && !responseTypeMatchesUnit(question.responseType, question.indicator.unit)) issues.push(`Question ${question.code} is incompatible with ${question.indicator.code} (${question.indicator.unit}).`);
    if (question.evidenceRequired && question.responseType === "file") issues.push(`Question ${question.code} should not require separate evidence when its response is already a file.`);
    if (question.validationRules.min !== undefined && question.validationRules.max !== undefined && question.validationRules.min > question.validationRules.max) issues.push(`Question ${question.code} has a minimum greater than its maximum.`);
    if (question.validationRules.pattern) {
      try { new RegExp(question.validationRules.pattern); } catch { issues.push(`Question ${question.code} has an invalid validation pattern.`); }
    }
  }
  issues.push(...detectVisibilityCycles(questions));
  return [...new Set(issues)];
}

export function responseTypeMatchesUnit(type: InstrumentResponseType, unit: string): boolean {
  if (unit === "kes") return type === "currency" || type === "decimal";
  if (unit === "percentage") return type === "percentage" || type === "decimal";
  if (["count", "kilograms", "score"].includes(unit)) return NUMERIC_TYPES.includes(type);
  if (unit === "status") return ["boolean", "single_select", "short_text"].includes(type);
  return true;
}

export function detectVisibilityCycles(questions: InstrumentQuestionDefinition[]): string[] {
  const dependency = new Map(questions.filter((question) => question.visibilityRule).map((question) => [question.code, question.visibilityRule!.questionCode]));
  const issues: string[] = [];
  for (const start of dependency.keys()) {
    const path: string[] = [];
    const seen = new Set<string>();
    let current: string | undefined = start;
    while (current && dependency.has(current)) {
      if (seen.has(current)) {
        const cycleAt = path.indexOf(current);
        issues.push(`Circular visibility logic: ${[...path.slice(cycleAt), current].join(" → ")}.`);
        break;
      }
      seen.add(current);
      path.push(current);
      current = dependency.get(current);
    }
  }
  return [...new Set(issues)];
}

export function isQuestionVisible(rule: VisibilityRule | null, responses: Record<string, unknown>): boolean {
  if (!rule) return true;
  const actual = responses[rule.questionCode];
  if (rule.operator === "is_answered") return actual !== null && actual !== undefined && actual !== "";
  if (rule.operator === "equals") return actual === rule.value;
  if (rule.operator === "not_equals") return actual !== rule.value;
  return Array.isArray(actual) ? actual.includes(rule.value) : String(actual ?? "").includes(String(rule.value ?? ""));
}

export function validateInstrumentResponses(sections: InstrumentSectionDefinition[], responses: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const question of sections.flatMap((section) => section.questions)) {
    if (!isQuestionVisible(question.visibilityRule, responses)) continue;
    const value = responses[question.code];
    const empty = value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
    if (question.isRequired && empty) { errors[question.code] = "This question is required."; continue; }
    if (empty) continue;
    if (NUMERIC_TYPES.includes(question.responseType)) {
      const number = Number(value);
      if (!Number.isFinite(number)) errors[question.code] = "Enter a valid number.";
      else if (question.validationRules.min !== undefined && number < question.validationRules.min) errors[question.code] = `Enter ${question.validationRules.min} or more.`;
      else if (question.validationRules.max !== undefined && number > question.validationRules.max) errors[question.code] = `Enter ${question.validationRules.max} or less.`;
    }
    if (typeof value === "string") {
      if (question.validationRules.minLength !== undefined && value.length < question.validationRules.minLength) errors[question.code] = `Enter at least ${question.validationRules.minLength} characters.`;
      if (question.validationRules.maxLength !== undefined && value.length > question.validationRules.maxLength) errors[question.code] = `Enter no more than ${question.validationRules.maxLength} characters.`;
      if (question.validationRules.pattern && !new RegExp(question.validationRules.pattern).test(value)) errors[question.code] = "Use the required format.";
    }
  }
  return errors;
}
