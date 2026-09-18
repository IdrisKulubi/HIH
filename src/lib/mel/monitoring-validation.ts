import { z } from "zod";
import { jobBreakdownIssues, EMPTY_JOB_BREAKDOWN, type JobBreakdown } from "./monitoring-calculations";
import {
  FINANCE_TYPES,
  financeTypeLabel,
  MONITORING_QUESTIONS,
  type MonitoringFinanceType,
} from "./monitoring-question-catalog";
import { isMelEvidenceOptionalForSubmission } from "./programme-calendar";

const optionalBoolean = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value === "true" || value === true),
  z.boolean().nullable()
);
const optionalMoney = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
  z.number().finite().nonnegative().nullable()
);
const optionalCount = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
  z.number().int().nonnegative().nullable()
);
const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().max(5000).nullable()
);

export const WASTE_STREAMS = ["organic", "plastic", "paper", "glass", "e_waste", "other"] as const;
export const EVIDENCE_REQUIRED_WHEN_TRUE = Object.entries(MONITORING_QUESTIONS)
  .filter(([, question]) => question.evidenceRequired && question.field)
  .map(([code]) => code);

const jobSchema = z.object({
  total: optionalCount,
  male: optionalCount,
  female: optionalCount,
  youth: optionalCount,
  plwd: optionalCount,
  refugee: optionalCount,
});

const financeEntrySchema = z.object({
  financeType: z.enum(FINANCE_TYPES),
  amount: optionalMoney,
  otherDescription: optionalText,
});

export const melMonitoringDraftSchema = z.object({
  visitDate: z.preprocess(
    (value) => (typeof value === "string" && value ? value : null),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
  ),
  businessPlanImproved: optionalBoolean,
  revenue: optionalMoney,
  costs: optionalMoney,
  financialChangeExplanation: optionalText,
  directQualityJobs: jobSchema,
  directNonQualityJobs: jobSchema,
  indirectJobs: jobSchema,
  marketResearchCompleted: optionalBoolean,
  marketIntelligenceAccessed: optionalBoolean,
  newMarketSegments: optionalCount,
  technologyAdopted: optionalBoolean,
  technologyDetails: optionalText,
  newProductsDeveloped: optionalBoolean,
  newProductsDetails: optionalText,
  linkedToFinanceProvider: optionalBoolean,
  financeEntries: z.array(financeEntrySchema),
  financialPlanCompleted: optionalBoolean,
  activeInsurance: optionalBoolean,
  investorReadinessCompleted: optionalBoolean,
  lifeCycleAssessmentCompleted: optionalBoolean,
  ecoCertificationActive: optionalBoolean,
  esgReportCompleted: optionalBoolean,
  socialSafeguardingGuidelines: optionalBoolean,
  waste: z.record(z.enum(WASTE_STREAMS), optionalMoney),
  strategicPartnerships: optionalBoolean,
  strategicPartnershipCount: optionalCount,
  strategicPartnershipDetails: optionalText,
  forumParticipation: optionalBoolean,
  publicPrivatePartnership: optionalBoolean,
  publicPrivatePartnershipDetails: optionalText,
  mainChallenges: optionalText,
  positiveProgrammeImpacts: optionalText,
  negativeProgrammeImpacts: optionalText,
  additionalSupportNeeded: optionalText,
  collectorComment: optionalText,
  reusedEvidenceIds: z.record(z.string(), z.number().int().positive()),
});

export type MelMonitoringDraft = z.infer<typeof melMonitoringDraftSchema>;

export type JobRowInput = MelMonitoringDraft["directQualityJobs"];

export function normalizeJobRow(row: JobRowInput, includeRefugee: boolean): JobBreakdown | null {
  if (row.total === null) return null;
  if (row.total === 0) {
    return { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 };
  }
  if (row.male === null || row.female === null || row.youth === null || row.plwd === null) {
    return null;
  }
  if (includeRefugee && row.refugee === null) return null;
  return {
    total: row.total,
    male: row.male,
    female: row.female,
    youth: row.youth,
    plwd: row.plwd,
    refugee: includeRefugee ? (row.refugee ?? 0) : 0,
  };
}

function jobRowFromBreakdown(breakdown: JobBreakdown): JobRowInput {
  return {
    total: breakdown.total,
    male: breakdown.male,
    female: breakdown.female,
    youth: breakdown.youth,
    plwd: breakdown.plwd,
    refugee: breakdown.refugee,
  };
}

export function normalizeMonitoringDraft(
  input: MelMonitoringDraft,
  wasteEligible: boolean,
  includeRefugee = false
): MelMonitoringDraft {
  const directQualityJobs = normalizeJobRow(input.directQualityJobs, includeRefugee);
  const directNonQualityJobs =
    normalizeJobRow(input.directNonQualityJobs, includeRefugee) ??
    (input.directNonQualityJobs.total === null ? EMPTY_JOB_BREAKDOWN : null);
  const indirectJobs =
    normalizeJobRow(input.indirectJobs, includeRefugee) ??
    (input.indirectJobs.total === null ? EMPTY_JOB_BREAKDOWN : null);
  return {
    ...input,
    directQualityJobs: directQualityJobs ? jobRowFromBreakdown(directQualityJobs) : input.directQualityJobs,
    directNonQualityJobs: directNonQualityJobs
      ? jobRowFromBreakdown(directNonQualityJobs)
      : input.directNonQualityJobs,
    indirectJobs: indirectJobs ? jobRowFromBreakdown(indirectJobs) : input.indirectJobs,
    technologyDetails: input.technologyAdopted ? input.technologyDetails : null,
    newProductsDetails: input.newProductsDeveloped ? input.newProductsDetails : null,
    financeEntries: input.linkedToFinanceProvider ? input.financeEntries : [],
    strategicPartnershipCount: input.strategicPartnerships ? input.strategicPartnershipCount : null,
    strategicPartnershipDetails: input.strategicPartnerships ? input.strategicPartnershipDetails : null,
    publicPrivatePartnershipDetails: input.publicPrivatePartnership ? input.publicPrivatePartnershipDetails : null,
    waste: Object.fromEntries(
      WASTE_STREAMS.map((stream) => [stream, wasteEligible ? input.waste[stream] : null])
    ) as MelMonitoringDraft["waste"],
  };
}

export function monitoringSubmissionIssues(
  input: MelMonitoringDraft,
  evidenceQuestionCodes: ReadonlySet<string>,
  approvedOneTimeCodes: ReadonlySet<string>,
  includeRefugee: boolean,
  wasteEligible: boolean,
  financialExplanationRequired = false,
  reportingPeriod?: { code: string; programmeYear?: number; sequence?: number } | string,
  submissionStatus?: string
): string[] {
  const issues: string[] = [];
  const periodRef =
    typeof reportingPeriod === "string" ? { code: reportingPeriod } : reportingPeriod;
  const evidenceOptional = periodRef
    ? isMelEvidenceOptionalForSubmission(periodRef, submissionStatus ?? "")
    : submissionStatus === "draft";
  if (!input.visitDate) issues.push("Visit date is required");

  const requiredBooleanFields: Array<[keyof MelMonitoringDraft, string, string?]> = [
    ["businessPlanImproved", "Business plan status", "business_plan_improved"],
    ["marketResearchCompleted", "Market research status", "market_research_completed"],
    ["marketIntelligenceAccessed", "Market intelligence status"],
    ["technologyAdopted", "Technology adoption status", "technology_adopted"],
    ["newProductsDeveloped", "New products or services status"],
    ["linkedToFinanceProvider", "Financial linkage status", "linked_to_finance_provider"],
    ["financialPlanCompleted", "Financial plan status", "financial_plan_completed"],
    ["activeInsurance", "Insurance status"],
    ["investorReadinessCompleted", "Investor-readiness status", "investor_readiness_completed"],
    ["lifeCycleAssessmentCompleted", "Life-cycle assessment status", "life_cycle_assessment_completed"],
    ["ecoCertificationActive", "Eco-certification status", "eco_certification_active"],
    ["esgReportCompleted", "ESG report status", "esg_report_completed"],
    ["socialSafeguardingGuidelines", "Social safeguarding status", "social_safeguarding_guidelines"],
    ["strategicPartnerships", "Strategic partnership status"],
    ["forumParticipation", "Forum participation status"],
    ["publicPrivatePartnership", "Public-private partnership status"],
  ];
  for (const [field, label, oneTimeCode] of requiredBooleanFields) {
    if (oneTimeCode && approvedOneTimeCodes.has(oneTimeCode)) continue;
    if (input[field] === null) issues.push(`${label} is required`);
  }

  if (input.revenue === null) issues.push("Total revenue for the past 3 months is required");
  if (input.costs === null) issues.push("Total costs for the past 3 months are required");
  if (financialExplanationRequired && (!input.financialChangeExplanation || input.financialChangeExplanation.length < 10)) issues.push("Explain the material loss or unusually large financial change using at least 10 characters");
  if (input.newMarketSegments === null) issues.push("New market segments is required");
  if (input.technologyAdopted && !input.technologyDetails) issues.push("Technology or innovation details are required when Yes");
  if (input.newProductsDeveloped && !input.newProductsDetails) issues.push("Product or service details are required when Yes");

  if (input.linkedToFinanceProvider) {
    if (input.financeEntries.length === 0) issues.push("Select at least one finance type");
    const types = input.financeEntries.map((entry) => entry.financeType);
    if (new Set(types).size !== types.length) issues.push("Each finance type can be selected only once");
    for (const entry of input.financeEntries) {
      if (entry.amount === null) issues.push(`Enter the amount for ${financeTypeLabel(entry.financeType)}`);
      if (entry.financeType === "other" && !entry.otherDescription) issues.push("Describe the other finance type");
      if (entry.financeType !== "other" && entry.otherDescription) issues.push("Other finance description is only valid for Other");
    }
  }

  if (input.strategicPartnerships) {
    if (input.strategicPartnershipCount === null || input.strategicPartnershipCount < 1) {
      issues.push("Strategic partnership count must be at least 1 when Yes");
    }
    if (!input.strategicPartnershipDetails) issues.push("Strategic partner names are required when Yes");
  }
  if (input.publicPrivatePartnership && !input.publicPrivatePartnershipDetails) {
    issues.push("Public-private partnership details are required when Yes");
  }

  for (const [label, row, optional] of [
    ["Direct jobs (quality)", input.directQualityJobs, false],
    ["Direct jobs (non-quality)", input.directNonQualityJobs, true],
    ["Indirect jobs", input.indirectJobs, true],
  ] as const) {
    if (optional && row.total === null) continue;
    const normalized = normalizeJobRow(row, includeRefugee);
    if (!normalized) {
      issues.push(`${label} breakdown is required`);
      continue;
    }
    issues.push(...jobBreakdownIssues(label, normalized));
  }

  if (!evidenceOptional) {
    for (const code of EVIDENCE_REQUIRED_WHEN_TRUE) {
      const question = MONITORING_QUESTIONS[code as keyof typeof MONITORING_QUESTIONS];
      if (!question.field || approvedOneTimeCodes.has(code)) continue;
      const field = question.field as keyof MelMonitoringDraft;
      if (input[field] === true && !evidenceQuestionCodes.has(code)) {
        issues.push(`Evidence is required for ${code.replaceAll("_", " ")}`);
      }
      if (input[field] === false && evidenceQuestionCodes.has(code)) {
        issues.push(`Remove the stale evidence for ${code.replaceAll("_", " ")} before submitting No`);
      }
    }
    const directJobsTotal = (input.directQualityJobs.total ?? 0) + (input.directNonQualityJobs.total ?? 0);
    if (
      MONITORING_QUESTIONS.jobs.evidenceRequired &&
      directJobsTotal + (input.indirectJobs.total ?? 0) > 0 &&
      !evidenceQuestionCodes.has("jobs")
    ) {
      issues.push("Evidence is required for jobs created");
    }
    if (wasteEligible) {
      for (const stream of WASTE_STREAMS) {
        if (input.waste[stream] === null) issues.push(`${stream.replaceAll("_", " ")} waste value is required`);
      }
      if (Object.values(input.waste).some((value) => (value ?? 0) > 0) && !evidenceQuestionCodes.has("waste")) {
        issues.push("Evidence is required for waste collected and recycled");
      }
    }
  } else if (wasteEligible) {
    for (const stream of WASTE_STREAMS) {
      if (input.waste[stream] === null) issues.push(`${stream.replaceAll("_", " ")} waste value is required`);
    }
  }
  if (!input.positiveProgrammeImpacts) {
    issues.push("Positive programme impacts are required");
  }
  if (!input.mainChallenges) issues.push("Main challenges are required");
  if (!input.negativeProgrammeImpacts) issues.push("Programme impacts are required; enter None if none were observed");
  if (!input.additionalSupportNeeded) issues.push("Additional support needs are required");
  if (!input.collectorComment) issues.push("Collector comment is required");
  return [...new Set(issues)];
}

export function parseMonitoringFormData(formData: FormData): MelMonitoringDraft {
  const get = (name: string) => formData.get(name);
  const jobs = (prefix: string) => ({
    total: get(`${prefix}Total`), male: get(`${prefix}Male`), female: get(`${prefix}Female`),
    youth: get(`${prefix}Youth`), plwd: get(`${prefix}Plwd`), refugee: get(`${prefix}Refugee`),
  });
  const selectedFinanceTypes = formData.getAll("financeTypes").filter(
    (value): value is MonitoringFinanceType => typeof value === "string" && FINANCE_TYPES.includes(value as MonitoringFinanceType)
  );
  const reusedEvidenceIds = Object.fromEntries(
    Object.keys(MONITORING_QUESTIONS).flatMap((code) => {
      const raw = get(`reusedEvidence_${code}`);
      const id = typeof raw === "string" && raw ? Number(raw) : null;
      return id && Number.isInteger(id) && id > 0 ? [[code, id]] : [];
    })
  );

  return melMonitoringDraftSchema.parse({
    visitDate: get("visitDate"), businessPlanImproved: get("businessPlanImproved"),
    revenue: get("revenue"), costs: get("costs"), financialChangeExplanation: get("financialChangeExplanation"),
    directQualityJobs: jobs("directQuality"), directNonQualityJobs: jobs("directNonQuality"), indirectJobs: jobs("indirect"),
    marketResearchCompleted: get("marketResearchCompleted"), marketIntelligenceAccessed: get("marketIntelligenceAccessed"),
    newMarketSegments: get("newMarketSegments"), technologyAdopted: get("technologyAdopted"),
    technologyDetails: get("technologyDetails"), newProductsDeveloped: get("newProductsDeveloped"),
    newProductsDetails: get("newProductsDetails"), linkedToFinanceProvider: get("linkedToFinanceProvider"),
    financeEntries: selectedFinanceTypes.map((financeType) => ({
      financeType, amount: get(`financeAmount_${financeType}`),
      otherDescription: financeType === "other" ? get("financeOtherDescription") : null,
    })),
    financialPlanCompleted: get("financialPlanCompleted"), activeInsurance: get("activeInsurance"),
    investorReadinessCompleted: get("investorReadinessCompleted"),
    lifeCycleAssessmentCompleted: get("lifeCycleAssessmentCompleted"), ecoCertificationActive: get("ecoCertificationActive"),
    esgReportCompleted: get("esgReportCompleted"), socialSafeguardingGuidelines: get("socialSafeguardingGuidelines"),
    waste: Object.fromEntries(WASTE_STREAMS.map((stream) => [stream, get(`waste_${stream}`)])),
    strategicPartnerships: get("strategicPartnerships"), strategicPartnershipCount: get("strategicPartnershipCount"),
    strategicPartnershipDetails: get("strategicPartnershipDetails"), forumParticipation: get("forumParticipation"),
    publicPrivatePartnership: get("publicPrivatePartnership"), publicPrivatePartnershipDetails: get("publicPrivatePartnershipDetails"),
    mainChallenges: get("mainChallenges"), positiveProgrammeImpacts: get("positiveProgrammeImpacts"),
    negativeProgrammeImpacts: get("negativeProgrammeImpacts"),
    additionalSupportNeeded: get("additionalSupportNeeded"), collectorComment: get("collectorComment"), reusedEvidenceIds,
  });
}
