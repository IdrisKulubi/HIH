import { z } from "zod";
import { jobBreakdownIssues, type JobBreakdown } from "./monitoring-calculations";

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
export const EVIDENCE_REQUIRED_WHEN_TRUE = [
  "business_plan_improved",
  "market_research_completed",
  "technology_adopted",
  "new_products_developed",
  "linked_to_finance_provider",
  "financial_plan_completed",
  "active_insurance",
  "life_cycle_assessment_completed",
  "eco_certification_active",
  "esg_report_completed",
  "social_safeguarding_guidelines",
  "circular_growth_reported",
  "strategic_partnerships",
  "forum_participation",
  "public_private_partnership",
] as const;

const jobSchema = z.object({
  total: optionalCount,
  male: optionalCount,
  female: optionalCount,
  youth: optionalCount,
  plwd: optionalCount,
  refugee: optionalCount,
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
  directJobs: jobSchema,
  indirectJobs: jobSchema,
  marketResearchCompleted: optionalBoolean,
  marketIntelligenceAccessed: optionalBoolean,
  newMarketSegments: optionalCount,
  technologyAdopted: optionalBoolean,
  technologyDetails: optionalText,
  newProductsDeveloped: optionalBoolean,
  newProductsDetails: optionalText,
  linkedToFinanceProvider: optionalBoolean,
  financeType: optionalText,
  financeTypeOther: optionalText,
  financeValue: optionalMoney,
  financialPlanCompleted: optionalBoolean,
  activeInsurance: optionalBoolean,
  investorReadinessCompleted: optionalBoolean,
  lifeCycleAssessmentCompleted: optionalBoolean,
  ecoCertificationActive: optionalBoolean,
  esgReportCompleted: optionalBoolean,
  socialSafeguardingGuidelines: optionalBoolean,
  circularGrowthReported: optionalBoolean,
  circularGrowthValue: optionalMoney,
  waste: z.record(z.enum(WASTE_STREAMS), optionalMoney),
  strategicPartnerships: optionalBoolean,
  strategicPartnershipDetails: optionalText,
  forumParticipation: optionalBoolean,
  forumDetails: optionalText,
  publicPrivatePartnership: optionalBoolean,
  publicPrivatePartnershipDetails: optionalText,
  mainChallenges: optionalText,
  negativeProgrammeImpacts: optionalText,
  additionalSupportNeeded: optionalText,
  collectorComment: optionalText,
});

export type MelMonitoringDraft = z.infer<typeof melMonitoringDraftSchema>;

export function monitoringSubmissionIssues(
  input: MelMonitoringDraft,
  evidenceQuestionCodes: ReadonlySet<string>,
  approvedOneTimeCodes: ReadonlySet<string>,
  includeRefugee: boolean
): string[] {
  const issues: string[] = [];
  if (!input.visitDate) issues.push("Visit date is required");

  const requiredBooleanFields: Array<[keyof MelMonitoringDraft, string, string?]> = [
    ["businessPlanImproved", "Business plan status", "business_plan_improved"],
    ["marketResearchCompleted", "Market research status"],
    ["marketIntelligenceAccessed", "Market intelligence status"],
    ["technologyAdopted", "Technology adoption status"],
    ["newProductsDeveloped", "New products or services status"],
    ["linkedToFinanceProvider", "Financial linkage status"],
    ["financialPlanCompleted", "Financial plan status", "financial_plan_completed"],
    ["activeInsurance", "Insurance status"],
    ["investorReadinessCompleted", "Investor-readiness status", "investor_readiness_completed"],
    ["lifeCycleAssessmentCompleted", "Life-cycle assessment status", "life_cycle_assessment_completed"],
    ["ecoCertificationActive", "Eco-certification status"],
    ["esgReportCompleted", "ESG report status", "esg_report_completed"],
    ["socialSafeguardingGuidelines", "Social safeguarding status", "social_safeguarding_guidelines"],
    ["circularGrowthReported", "Circular growth status"],
    ["strategicPartnerships", "Strategic partnership status"],
    ["forumParticipation", "Forum participation status"],
    ["publicPrivatePartnership", "Public-private partnership status"],
  ];
  for (const [field, label, oneTimeCode] of requiredBooleanFields) {
    if (oneTimeCode && approvedOneTimeCodes.has(oneTimeCode)) continue;
    if (input[field] === null) issues.push(`${label} is required`);
  }

  if (input.revenue === null) issues.push("Revenue is required");
  if (input.costs === null) issues.push("Costs are required");
  if (input.newMarketSegments === null) issues.push("New market segments is required");
  if (input.technologyAdopted && !input.technologyDetails) issues.push("Technology details are required when adoption is Yes");
  if (input.newProductsDeveloped && !input.newProductsDetails) issues.push("Product or service details are required when development is Yes");
  if (input.linkedToFinanceProvider && (!input.financeType || input.financeValue === null)) {
    issues.push("Finance type and value are required when linked to a provider");
  }
  if (input.financeType === "other" && !input.financeTypeOther) issues.push("Describe the other finance type");
  if (input.circularGrowthReported && input.circularGrowthValue === null) issues.push("Circular growth value is required when reported");
  if (input.strategicPartnerships && !input.strategicPartnershipDetails) issues.push("Partnership details are required");
  if (input.forumParticipation && !input.forumDetails) issues.push("Forum details are required");
  if (input.publicPrivatePartnership && !input.publicPrivatePartnershipDetails) issues.push("Public-private partnership details are required");

  for (const [label, row] of [["Direct jobs", input.directJobs], ["Indirect jobs", input.indirectJobs]] as const) {
    if (Object.values(row).some((value) => value === null)) {
      issues.push(`${label} breakdown is required`);
    } else {
      const complete = row as JobBreakdown;
      if (!includeRefugee) complete.refugee = 0;
      issues.push(...jobBreakdownIssues(label, complete));
    }
  }

  for (const code of EVIDENCE_REQUIRED_WHEN_TRUE) {
    const camelKey = code.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()) as keyof MelMonitoringDraft;
    if (input[camelKey] === true && !evidenceQuestionCodes.has(code)) {
      issues.push(`Evidence is required for ${code.replaceAll("_", " ")}`);
    }
  }
  if ((input.directJobs.total ?? 0) + (input.indirectJobs.total ?? 0) > 0 && !evidenceQuestionCodes.has("jobs")) {
    issues.push("Evidence is required for jobs created");
  }
  if (Object.values(input.waste).some((value) => (value ?? 0) > 0) && !evidenceQuestionCodes.has("waste")) {
    issues.push("Evidence is required for waste collected and recycled");
  }
  if (!input.mainChallenges) issues.push("Main challenges are required");
  if (!input.additionalSupportNeeded) issues.push("Additional support needs are required");
  if (!input.collectorComment) issues.push("Collector comment is required");

  return [...new Set(issues)];
}

export function parseMonitoringFormData(formData: FormData): MelMonitoringDraft {
  const get = (name: string) => formData.get(name);
  const jobs = (prefix: string) => ({
    total: get(`${prefix}Total`),
    male: get(`${prefix}Male`),
    female: get(`${prefix}Female`),
    youth: get(`${prefix}Youth`),
    plwd: get(`${prefix}Plwd`),
    refugee: get(`${prefix}Refugee`),
  });

  return melMonitoringDraftSchema.parse({
    visitDate: get("visitDate"),
    businessPlanImproved: get("businessPlanImproved"),
    revenue: get("revenue"),
    costs: get("costs"),
    financialChangeExplanation: get("financialChangeExplanation"),
    directJobs: jobs("direct"),
    indirectJobs: jobs("indirect"),
    marketResearchCompleted: get("marketResearchCompleted"),
    marketIntelligenceAccessed: get("marketIntelligenceAccessed"),
    newMarketSegments: get("newMarketSegments"),
    technologyAdopted: get("technologyAdopted"),
    technologyDetails: get("technologyDetails"),
    newProductsDeveloped: get("newProductsDeveloped"),
    newProductsDetails: get("newProductsDetails"),
    linkedToFinanceProvider: get("linkedToFinanceProvider"),
    financeType: get("financeType"),
    financeTypeOther: get("financeTypeOther"),
    financeValue: get("financeValue"),
    financialPlanCompleted: get("financialPlanCompleted"),
    activeInsurance: get("activeInsurance"),
    investorReadinessCompleted: get("investorReadinessCompleted"),
    lifeCycleAssessmentCompleted: get("lifeCycleAssessmentCompleted"),
    ecoCertificationActive: get("ecoCertificationActive"),
    esgReportCompleted: get("esgReportCompleted"),
    socialSafeguardingGuidelines: get("socialSafeguardingGuidelines"),
    circularGrowthReported: get("circularGrowthReported"),
    circularGrowthValue: get("circularGrowthValue"),
    waste: Object.fromEntries(WASTE_STREAMS.map((stream) => [stream, get(`waste_${stream}`)])),
    strategicPartnerships: get("strategicPartnerships"),
    strategicPartnershipDetails: get("strategicPartnershipDetails"),
    forumParticipation: get("forumParticipation"),
    forumDetails: get("forumDetails"),
    publicPrivatePartnership: get("publicPrivatePartnership"),
    publicPrivatePartnershipDetails: get("publicPrivatePartnershipDetails"),
    mainChallenges: get("mainChallenges"),
    negativeProgrammeImpacts: get("negativeProgrammeImpacts"),
    additionalSupportNeeded: get("additionalSupportNeeded"),
    collectorComment: get("collectorComment"),
  });
}
