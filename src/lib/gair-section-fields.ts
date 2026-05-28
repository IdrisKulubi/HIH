import type { AppraisalContent } from "@/lib/actions/a2f-investment-appraisals";

export const GAIR_SECTION_FIELDS: Array<{
    key: keyof AppraisalContent;
    label: string;
    description: string;
    rows?: number;
}> = [
    { key: "businessOverview", label: "Business Overview", description: "Enterprise, owner, location, sector, project details, employment, and programme support.", rows: 8 },
    { key: "caseForFinancing", label: "Case For Matching Grant Financing", description: "Funding need, CAPEX confirmation, co-investment, and consequence if funding is not awarded.", rows: 7 },
    { key: "amountRequestedAndBudget", label: "Amount Requested And Budget", description: "Total project budget, BIRE request, and enterprise contribution.", rows: 4 },
    { key: "useOfFunds", label: "Use Of Funds", description: "CAPEX budget items, suppliers, and investment purpose.", rows: 8 },
    { key: "otherFundingLeverage", label: "Other Funding Or Leverage", description: "Other financing sources and leverage notes.", rows: 4 },
    { key: "financialOverviewAndProjections", label: "Financial Overview And Projections", description: "Revenue, trends, growth projections, and assumptions.", rows: 6 },
    { key: "projectTeam", label: "Project Team", description: "Founder education, experience, and project implementation team.", rows: 5 },
    { key: "socioEconomicImpact", label: "Socio-Economic Impact", description: "Jobs, inclusion, community/value chain effects, and environmental outcomes.", rows: 7 },
    { key: "innovationAspects", label: "Innovation Aspects", description: "Technology adoption, production improvement, efficiency, and market reach.", rows: 5 },
    { key: "strengths", label: "Strengths", description: "Main strengths identified through application, DD, and scoring.", rows: 5 },
    { key: "weaknesses", label: "Weaknesses", description: "Main weaknesses or gaps requiring IC attention.", rows: 5 },
    { key: "mitigationConsiderations", label: "Mitigation Considerations", description: "Controls, conditions, and mitigations for identified weaknesses.", rows: 5 },
    { key: "scoringSummary", label: "Scoring Summary", description: "Matching Grant score, revenue hard gate, threshold, and category breakdown.", rows: 7 },
    { key: "conclusionAndRecommendation", label: "Conclusion And IC Recommendation", description: "Final appraisal conclusion and IC-ready recommendation.", rows: 6 },
    { key: "conditions", label: "Conditions", description: "Any conditions to be met before approval, contracting, or disbursement.", rows: 4 },
    { key: "dataSources", label: "Data Sources", description: "System records used to populate this GAIR.", rows: 5 },
];
