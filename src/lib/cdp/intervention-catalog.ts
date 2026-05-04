import type { CdpFocusCode } from "./focus-areas";

export type CdpInterventionCatalogEntry = {
  key: string;
  week: number | null;
  trainingSection: string;
  focusArea: string;
  learnerJourneyStage: string;
  keyActivities: string;
  topics: string;
  outputDocuments: string;
};

export const CDP_INTERVENTION_CATALOG: CdpInterventionCatalogEntry[] = [
  {
    key: "week-2-business-modelling",
    week: 2,
    trainingSection: "Business Modelling",
    focusArea: "Designing value proposition & customer segments",
    learnerJourneyStage: "Ideation & Planning",
    keyActivities: "Business Model Canvas, customer needs, revenue streams",
    topics: "Value proposition design, customer segments, revenue models, channels",
    outputDocuments: "Business Model Canvas",
  },
  {
    key: "week-3-business-planning",
    week: 3,
    trainingSection: "Business Planning",
    focusArea: "Market research and financial projections",
    learnerJourneyStage: "Planning & Validation",
    keyActivities: "Market analysis, competitor analysis, business goals",
    topics: "Executive summary, SWOT, operational plans, early projections",
    outputDocuments: "Business Plan Draft",
  },
  {
    key: "week-4-sales-marketing",
    week: 4,
    trainingSection: "Sales and Marketing",
    focusArea: "Crafting marketing strategies",
    learnerJourneyStage: "Customer Acquisition",
    keyActivities: "Customer segments, marketing channels, sales pipeline",
    topics: "Segmentation, customer journey mapping, sales strategies, branding",
    outputDocuments: "Marketing Plan; Customer Journey Map",
  },
  {
    key: "week-5-digital-marketing",
    week: 5,
    trainingSection: "Sales and Marketing (Continued)",
    focusArea: "Digital marketing & customer relationships",
    learnerJourneyStage: "Customer Engagement",
    keyActivities: "Online presence, social media marketing strategies",
    topics: "Digital marketing, SEO, content marketing, customer engagement",
    outputDocuments: "Digital Marketing Strategy",
  },
  {
    key: "week-6-financial-management",
    week: 6,
    trainingSection: "Record Keeping & Financial Management",
    focusArea: "Accounting and financial controls",
    learnerJourneyStage: "Business Scaling & Financial Stability",
    keyActivities: "Accounting, cash flow management, budgeting and forecasting",
    topics: "Financial statements, cash flow, tax management, budgets",
    outputDocuments: "Financial Statements; Budget & Cash Flow Forecast",
  },
  {
    key: "week-7-hr-management",
    week: 7,
    trainingSection: "Human Resource Management",
    focusArea: "Staff recruitment, performance & culture",
    learnerJourneyStage: "Internal Capacity Building",
    keyActivities: "Team building, performance KPIs, leadership styles",
    topics: "Recruitment, performance management, staff development, labor laws",
    outputDocuments: "HR Manual; Performance KPIs Document",
  },
  {
    key: "week-8-compliance",
    week: 8,
    trainingSection: "Legal and Financial Compliance",
    focusArea: "Legal structure and tax compliance",
    learnerJourneyStage: "Compliance & Risk Mitigation",
    keyActivities: "Local regulations, financial audits, tax obligations",
    topics: "Registration, tax, contracts, regulatory compliance, audits",
    outputDocuments: "Compliance Checklist; Contracts & Agreements Templates",
  },
  {
    key: "week-9-governance",
    week: 9,
    trainingSection: "Governance and Succession Planning",
    focusArea: "Leadership structures and continuity",
    learnerJourneyStage: "Sustainability & Long-Term Strategy",
    keyActivities: "Governance structures, future leaders, succession plans",
    topics: "Boards, management roles, policies, succession, continuity",
    outputDocuments: "Governance Plan; Succession Plan Document",
  },
  {
    key: "week-10-risk-management",
    week: 10,
    trainingSection: "Risk Management",
    focusArea: "Identifying risks and crisis management",
    learnerJourneyStage: "Risk Assessment & Mitigation",
    keyActivities: "Risk identification, mitigation, crisis planning",
    topics: "Financial, operational, market, reputational and ESG risks",
    outputDocuments: "Risk Management Plan",
  },
  {
    key: "week-11-investor-readiness",
    week: 11,
    trainingSection: "Investor Readiness",
    focusArea: "Preparing to pitch to investors",
    learnerJourneyStage: "Funding Preparation & Scaling",
    keyActivities: "Investor pitch, valuation, equity negotiation",
    topics: "Investment landscape, pitching, due diligence, valuation",
    outputDocuments: "Investor Pitch Deck; Business Valuation Sheet",
  },
  {
    key: "week-12-investor-relations",
    week: 12,
    trainingSection: "Investor Readiness (Continued)",
    focusArea: "Building relationships and due diligence",
    learnerJourneyStage: "Investor Relations",
    keyActivities: "Due diligence, investor relationships",
    topics: "Investor relations management and due diligence documentation",
    outputDocuments: "Investor Relations Plan; Due Diligence Checklist",
  },
  {
    key: "week-13-closeout-impact",
    week: 13,
    trainingSection: "Program Closeout & Feedback",
    focusArea: "Reviewing progress & feedback",
    learnerJourneyStage: "Graduation",
    keyActivities: "Final review, feedback, future goals",
    topics: "Progress review, action planning, impact and future growth",
    outputDocuments: "Final Business Plan; Action Plan",
  },
];

const DEFAULT_FOCUS_INTERVENTIONS: Record<CdpFocusCode, string[]> = {
  A: ["week-3-business-planning", "week-4-sales-marketing"],
  B: ["week-2-business-modelling"],
  C: ["week-3-business-planning", "week-4-sales-marketing", "week-5-digital-marketing"],
  D: ["week-6-financial-management"],
  E: ["week-3-business-planning"],
  F: ["week-5-digital-marketing", "week-6-financial-management", "week-8-compliance"],
  G: ["week-3-business-planning", "week-4-sales-marketing"],
  H: ["week-7-hr-management", "week-9-governance", "week-13-closeout-impact"],
  I: ["week-11-investor-readiness", "week-12-investor-relations"],
  J: ["week-10-risk-management"],
  K: ["week-10-risk-management"],
  L: ["week-13-closeout-impact"],
};

export function getInterventionByKey(key: string | null | undefined) {
  if (!key) return null;
  return CDP_INTERVENTION_CATALOG.find((entry) => entry.key === key) ?? null;
}

export function getRecommendedInterventionsForFocus(focusCode: CdpFocusCode) {
  const keys = DEFAULT_FOCUS_INTERVENTIONS[focusCode] ?? [];
  return keys
    .map((key) => getInterventionByKey(key))
    .filter((entry): entry is CdpInterventionCatalogEntry => entry != null);
}

export function getDefaultInterventionForFocus(focusCode: CdpFocusCode) {
  return getRecommendedInterventionsForFocus(focusCode)[0] ?? null;
}

export function formatIntervention(entry: CdpInterventionCatalogEntry) {
  return entry.week
    ? `Week ${entry.week}: ${entry.trainingSection} - ${entry.outputDocuments}`
    : `${entry.trainingSection} - ${entry.outputDocuments}`;
}
