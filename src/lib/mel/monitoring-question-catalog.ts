export const MONITORING_SECTIONS = {
  "0": "Data Collector and Visit",
  A: "Demographic Information",
  B: "Enterprise Capacity",
  C: "Profitability",
  D: "Jobs",
  E: "Market Access and Innovation",
  F: "Financial Linkages",
  G: "Green Growth and Sustainability",
  H: "Partnerships and Policy Engagement",
  I: "Feedback, Accountability and Support Needs",
  J: "Evidence Summary",
} as const;

export const FINANCE_TYPES = ["loan", "matching_grant", "repayable_grant", "other"] as const;
export type MonitoringFinanceType = (typeof FINANCE_TYPES)[number];

export const FINANCE_TYPE_LABELS: Record<MonitoringFinanceType, string> = {
  loan: "Loan",
  matching_grant: "BIRE matching grant",
  repayable_grant: "Repayable Grant",
  other: "Other",
};

export function financeTypeLabel(type: string): string {
  return type in FINANCE_TYPE_LABELS
    ? FINANCE_TYPE_LABELS[type as MonitoringFinanceType]
    : type.replaceAll("_", " ");
}

export const MONITORING_QUESTIONS = {
  business_plan_improved: {
    section: "B",
    field: "businessPlanImproved",
    label: "Has the enterprise’s business plan been reviewed/improved in the past 3 months?",
    evidenceRequired: true,
    oneTime: true,
    indicatorCode: "OP1.2-IMPROVED-BUSINESS-PLANS",
  },
  profitability: {
    section: "C",
    field: null,
    label: "Supporting evidence for quarterly revenue, costs, profit/loss, or the material-change explanation",
    evidenceRequired: false,
    oneTime: false,
    indicatorCode: "LT1-PROFITABILITY-INCREASE",
  },
  jobs: {
    section: "D",
    field: null,
    label: "Evidence for jobs created in the past 3 months",
    evidenceRequired: true,
    oneTime: false,
    indicatorCode: null,
  },
  market_research_completed: {
    section: "E",
    field: "marketResearchCompleted",
    label: "Has the enterprise conducted a market research survey in the last 3 months?",
    evidenceRequired: true,
    oneTime: true,
    indicatorCode: "OP2.2-MARKET-RESEARCH",
  },
  technology_adopted: {
    section: "E",
    field: "technologyAdopted",
    label: "Has the enterprise adopted any new technology or innovation (e.g., equipment, digital tools, production methods) in the past 3 months?",
    evidenceRequired: true,
    oneTime: true,
    indicatorCode: "OP1.2-TECHNOLOGY-ADOPTION",
  },
  new_products_developed: {
    section: "E",
    field: "newProductsDeveloped",
    label: "Has the enterprise developed any new products or services in the past 3 months?",
    evidenceRequired: true,
    oneTime: false,
    indicatorCode: null,
  },
  linked_to_finance_provider: {
    section: "F",
    field: "linkedToFinanceProvider",
    label: "Has the enterprise been linked to a financial service provider (bank, SACCO, MFI, investor) in the past 3 months?",
    evidenceRequired: true,
    oneTime: true,
    indicatorCode: "OP2.1-FINANCIAL-LINKAGES",
  },
  financial_plan_completed: {
    section: "F",
    field: "financialPlanCompleted",
    label: "Has the enterprise developed or updated a financial plan that includes budgets or cash flow projections?",
    evidenceRequired: true,
    oneTime: true,
    indicatorCode: "OP2.1-FINANCIAL-PLANS",
  },
  active_insurance: {
    section: "F",
    field: "activeInsurance",
    label: "Has the enterprise obtained or renewed an active insurance policy in the past 3 months?",
    evidenceRequired: true,
    oneTime: false,
    indicatorCode: null,
  },
  investor_readiness_completed: {
    section: "F",
    field: "investorReadinessCompleted",
    label: "Has the enterprise completed investor-readiness support or training in the past 3 months?",
    evidenceRequired: true,
    oneTime: true,
    indicatorCode: "OP2.1-INVESTOR-READINESS",
  },
  life_cycle_assessment_completed: {
    section: "G",
    field: "lifeCycleAssessmentCompleted",
    label: "Has the enterprise completed a Product Life Cycle Assessment (LCA) in the last 3 months?",
    evidenceRequired: true,
    oneTime: true,
    indicatorCode: "OP3.1-LIFE-CYCLE-ASSESSMENTS",
  },
  eco_certification_active: {
    section: "G",
    field: "ecoCertificationActive",
    label: "Has the enterprise acquired a valid Eco-Certification/Compliance certificate in the past 3 months?",
    evidenceRequired: true,
    oneTime: true,
    indicatorCode: "OP3.1-ECO-CERTIFICATION",
  },
  esg_report_completed: {
    section: "G",
    field: "esgReportCompleted",
    label: "Has the enterprise developed or updated an ESG (Economic, Social, and Governance) sustainability report in the past 3 months?",
    evidenceRequired: true,
    oneTime: true,
    indicatorCode: "OP3.1-ESG-REPORTS",
  },
  social_safeguarding_guidelines: {
    section: "G",
    field: "socialSafeguardingGuidelines",
    label: "Has the enterprise developed a written Social Safeguarding Guideline or Policy (e.g., gender equality, safety, inclusion) in the last 3 months?",
    evidenceRequired: true,
    oneTime: true,
    indicatorCode: "OP3.2-SOCIAL-SAFEGUARDS",
  },
  waste: {
    section: "G",
    field: null,
    label: "Evidence for waste collected and recycled",
    evidenceRequired: true,
    oneTime: false,
    indicatorCode: null,
  },
  strategic_partnerships: {
    section: "H",
    field: "strategicPartnerships",
    label: "Has the enterprise established any new strategic partnerships with a public or private organization in the past 3 months?",
    evidenceRequired: true,
    oneTime: false,
    indicatorCode: null,
  },
  forum_participation: {
    section: "H",
    field: "forumParticipation",
    label: "In the past 3 months, has the enterprise participated in any advocacy or stakeholder engagement forum facilitated by the project?",
    evidenceRequired: true,
    oneTime: false,
    indicatorCode: null,
  },
  public_private_partnership: {
    section: "H",
    field: "publicPrivatePartnership",
    label: "In the past 3 months, has the enterprise contributed to or benefited from any Public-Private Partnership (PPP) facilitated by the project?",
    evidenceRequired: true,
    oneTime: false,
    indicatorCode: null,
  },
} as const;

export type MonitoringQuestionCode = keyof typeof MONITORING_QUESTIONS;

export const ONE_TIME_QUESTION_BY_INDICATOR = Object.fromEntries(
  Object.entries(MONITORING_QUESTIONS)
    .filter(([, question]) => question.oneTime && question.indicatorCode)
    .map(([code, question]) => [question.indicatorCode, code])
) as Record<string, MonitoringQuestionCode>;

/** One-time questions hidden because they were approved or satisfied in a prior quarter. */
export function hiddenOneTimeQuestionCodes(
  approvedIndicatorCodes: ReadonlyArray<string>,
  priorVerifiedEvidenceQuestionCodes: ReadonlyArray<string>
): MonitoringQuestionCode[] {
  const codes = new Set<MonitoringQuestionCode>();
  for (const indicatorCode of approvedIndicatorCodes) {
    const questionCode = ONE_TIME_QUESTION_BY_INDICATOR[indicatorCode];
    if (questionCode) codes.add(questionCode);
  }
  for (const questionCode of priorVerifiedEvidenceQuestionCodes) {
    if (
      questionCode in MONITORING_QUESTIONS &&
      MONITORING_QUESTIONS[questionCode as MonitoringQuestionCode].oneTime
    ) {
      codes.add(questionCode as MonitoringQuestionCode);
    }
  }
  return [...codes];
}

export function ageCategoryAt(dob: Date | string, reportingPeriodEnd: Date | string): string {
  const birth = new Date(typeof dob === "string" ? `${dob.slice(0, 10)}T00:00:00Z` : dob);
  const end = new Date(typeof reportingPeriodEnd === "string" ? `${reportingPeriodEnd.slice(0, 10)}T00:00:00Z` : reportingPeriodEnd);
  let age = end.getUTCFullYear() - birth.getUTCFullYear();
  if (
    end.getUTCMonth() < birth.getUTCMonth() ||
    (end.getUTCMonth() === birth.getUTCMonth() && end.getUTCDate() < birth.getUTCDate())
  ) age -= 1;
  if (age < 18) return `Under 18 (${age})`;
  if (age <= 35) return `18–35 (${age})`;
  if (age <= 50) return `36–50 (${age})`;
  return `51 and above (${age})`;
}
