import { compareMonthlyProfitToOwnBaseline, snapshotMonthlyProfit } from "./financial-baselines";
import type { ApprovedMonitoringRecord, JobTotals } from "./indicator-engine";

export type MonitoringExportPeriod = {
  id: number;
  label: string;
  programmeYear?: number | null;
  sequence?: number | null;
};

function monthly(value: number | null): number | null {
  return value === null ? null : Math.round((value / 3 + Number.EPSILON) * 100) / 100;
}

function jobPrefix(prefix: string, jobs: JobTotals) {
  return {
    [`${prefix}_Total`]: jobs.total,
    [`${prefix}_Male`]: jobs.male,
    [`${prefix}_Female`]: jobs.female,
    [`${prefix}_Youth`]: jobs.youth,
    [`${prefix}_PLWD`]: jobs.plwd,
    [`${prefix}_Refugee`]: jobs.refugee,
  };
}

export function buildApprovedMonitoringExportRows(
  records: ApprovedMonitoringRecord[],
  periods: MonitoringExportPeriod[]
): Array<Record<string, string | number | boolean | null>> {
  const periodById = new Map(periods.map((period) => [period.id, period]));
  return records.map((record) => {
    const period = periodById.get(record.periodId);
    const comparison = compareMonthlyProfitToOwnBaseline(record);
    const baseline = record.financialBaselineSnapshot as { effectiveDate?: string; revenue?: number; costs?: number; profit?: number } | null | undefined;
    const flags = (record.financialComparisonSnapshot as { flags?: Array<{ code: string; source: string }> } | null | undefined)?.flags;
    return {
      Submission_ID: record.submissionId,
      Enterprise_ID: record.businessId,
      Enterprise: record.businessName ?? null,
      Period_ID: record.periodId,
      Period: period?.label ?? null,
      Programme_Year: period?.programmeYear ?? null,
      Period_Sequence: period?.sequence ?? null,
      Visit_Date: record.visitDate ?? null,
      Approved_At: record.approvedAt ?? null,
      Track: record.dimensions.track,
      County: record.dimensions.county,
      Sector: record.dimensions.sector,
      Owner_Gender: record.dimensions.ownerGender,
      Owner_Youth: record.dimensions.ownerYouth,
      Quarterly_Revenue_KES: record.revenue,
      Quarterly_Costs_KES: record.costs,
      Quarterly_Profit_Loss_KES: record.profitLoss,
      Monthly_Revenue_KES: monthly(record.revenue),
      Monthly_Costs_KES: monthly(record.costs),
      Monthly_Profit_KES: comparison.monthlyProfit,
      Baseline_Effective_Date: baseline?.effectiveDate ?? null,
      Baseline_Monthly_Revenue_KES: baseline?.revenue ?? null,
      Baseline_Monthly_Costs_KES: baseline?.costs ?? null,
      Baseline_Monthly_Profit_KES: comparison.ownBaselineMonthlyProfit ?? snapshotMonthlyProfit(record.financialBaselineSnapshot),
      Profit_Change_Vs_Own_Baseline_KES: comparison.profitChangeVsOwnBaseline,
      Vs_Own_Baseline: comparison.vsOwnBaseline,
      Financial_Alert_Flags: flags?.map((flag) => `${flag.code}:${flag.source}`).join("; ") ?? "",
      Financial_Change_Explanation: record.financialChangeExplanation ?? null,
      Business_Plan_Improved: record.businessPlanImproved,
      Market_Research_Completed: record.marketResearchCompleted,
      Market_Intelligence_Accessed: record.marketIntelligenceAccessed,
      New_Market_Segments: record.newMarketSegments,
      Technology_Adopted: record.technologyAdopted,
      Technology_Details: record.technologyDetails ?? null,
      New_Products_Developed: record.newProductsDeveloped,
      New_Products_Details: record.newProductsDetails ?? null,
      Linked_To_Finance_Provider: record.linkedToFinanceProvider,
      Finance_Accessed_KES: record.financeValue,
      Finance_Types: record.financeEntries.map((entry) => entry.financeType).join("; "),
      Finance_Amounts_KES: record.financeEntries.map((entry) => `${entry.financeType}:${entry.amount}`).join("; "),
      Financial_Plan_Completed: record.financialPlanCompleted,
      Active_Insurance: record.activeInsurance,
      Investor_Readiness_Completed: record.investorReadinessCompleted,
      Life_Cycle_Assessment_Completed: record.lifeCycleAssessmentCompleted,
      Eco_Certification_Active: record.ecoCertificationActive,
      ESG_Report_Completed: record.esgReportCompleted,
      Social_Safeguarding_Guidelines: record.socialSafeguardingGuidelines,
      Circular_Growth_Reported: record.circularGrowthReported,
      Circular_Growth_Value: record.circularGrowthValue ?? null,
      Strategic_Partnerships: record.strategicPartnerships,
      Strategic_Partnership_Count: record.strategicPartnershipCount ?? null,
      Strategic_Partnership_Details: record.strategicPartnershipDetails ?? null,
      Forum_Participation: record.forumParticipation ?? null,
      Forum_Details: record.forumDetails ?? null,
      Public_Private_Partnership: record.publicPrivatePartnership ?? null,
      Public_Private_Partnership_Details: record.publicPrivatePartnershipDetails ?? null,
      Main_Challenges: record.mainChallenges ?? null,
      Positive_Programme_Impacts: record.positiveProgrammeImpacts ?? null,
      Negative_Programme_Impacts: record.negativeProgrammeImpacts ?? null,
      Additional_Support_Needed: record.additionalSupportNeeded ?? null,
      Collector_Comment: record.collectorComment ?? null,
      Waste_Kg_By_Stream: record.waste.map((item) => `${item.stream}:${item.kilograms}`).join("; "),
      ...jobPrefix("Direct_Quality_Jobs", record.directQualityJobs),
      ...jobPrefix("Direct_Non_Quality_Jobs", record.directNonQualityJobs),
      ...jobPrefix("Direct_Jobs", record.directJobs),
      ...jobPrefix("Indirect_Jobs", record.indirectJobs),
    };
  });
}
