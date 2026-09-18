import { snapshotMonthlyField, summarizeOwnBaselineProfitability } from "./financial-baselines";
import { median, safePercentage, type ApprovedMonitoringRecord, type JobTotals } from "./indicator-engine";

export type MonitoringExportPeriod = {
  id: number;
  label: string;
  programmeYear?: number | null;
  sequence?: number | null;
};

export type TrackMonthlyBaseline = {
  revenue: number;
  costs: number;
  profit: number;
};

export type TrackMonthlyBaselines = {
  foundation: TrackMonthlyBaseline;
  acceleration: TrackMonthlyBaseline;
};

export const DEFAULT_TRACK_MONTHLY_BASELINES: TrackMonthlyBaselines = {
  foundation: { revenue: 200000, costs: 124221, profit: 50000 },
  acceleration: { revenue: 692600, costs: 490500, profit: 150000 },
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function monthly(value: number | null): number | null {
  return value === null ? null : roundMoney(value / 3);
}

function quarterlyFromMonthly(value: number | null): number | null {
  return value === null ? null : roundMoney(value * 3);
}

function change(actual: number | null, baseline: number | null): number | null {
  return actual === null || baseline === null ? null : roundMoney(actual - baseline);
}

function changePercent(actual: number | null, baseline: number | null): number | null {
  return actual === null || baseline === null ? null : safePercentage(actual - baseline, baseline);
}

function trackOf(record: ApprovedMonitoringRecord): "foundation" | "acceleration" | null {
  return record.dimensions.track === "foundation" || record.dimensions.track === "acceleration"
    ? record.dimensions.track
    : null;
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

function ownBaselineValues(snapshot: Record<string, unknown> | null | undefined) {
  return {
    revenue: snapshotMonthlyField(snapshot, "revenue"),
    costs: snapshotMonthlyField(snapshot, "costs"),
    profit: snapshotMonthlyField(snapshot, "profit"),
  };
}

function monthlyMedian(records: ApprovedMonitoringRecord[], selector: (record: ApprovedMonitoringRecord) => number | null): number | null {
  const values = records.flatMap((record) => {
    const selected = selector(record);
    return selected === null ? [] : [selected / 3];
  });
  const value = median(values);
  return value === null ? null : roundMoney(value);
}

function monthlyTotal(records: ApprovedMonitoringRecord[], selector: (record: ApprovedMonitoringRecord) => number | null): number | null {
  const values = records.flatMap((record) => {
    const selected = selector(record);
    return selected === null ? [] : [selected / 3];
  });
  if (values.length === 0) return null;
  return roundMoney(values.reduce((sum, value) => sum + value, 0));
}

function ownBaselineMedian(records: ApprovedMonitoringRecord[], field: "revenue" | "costs" | "profit"): number | null {
  const value = median(records.flatMap((record) => {
    const selected = snapshotMonthlyField(record.financialBaselineSnapshot, field);
    return selected === null ? [] : [selected];
  }));
  return value === null ? null : roundMoney(value);
}

function ownBaselineTotal(records: ApprovedMonitoringRecord[], field: "revenue" | "costs" | "profit"): number | null {
  const values = records.flatMap((record) => {
    const selected = snapshotMonthlyField(record.financialBaselineSnapshot, field);
    return selected === null ? [] : [selected];
  });
  if (values.length === 0) return null;
  return roundMoney(values.reduce((sum, value) => sum + value, 0));
}

export function buildApprovedMonitoringExportRows(
  records: ApprovedMonitoringRecord[],
  periods: MonitoringExportPeriod[],
  trackBaselines: TrackMonthlyBaselines = DEFAULT_TRACK_MONTHLY_BASELINES
): Array<Record<string, string | number | boolean | null>> {
  const periodById = new Map(periods.map((period) => [period.id, period]));
  return records.map((record) => {
    const period = periodById.get(record.periodId);
    const ownBaseline = ownBaselineValues(record.financialBaselineSnapshot);
    const monthlyRevenue = monthly(record.revenue);
    const monthlyCosts = monthly(record.costs);
    const monthlyProfit = monthly(record.profitLoss);
    const track = trackOf(record);
    const ittBaseline = track ? trackBaselines[track] : null;
    const flags = (record.financialComparisonSnapshot as { flags?: Array<{ code: string; source: string }> } | null | undefined)?.flags;
    const vsOwnProfit = change(monthlyProfit, ownBaseline.profit);
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
      Monthly_Revenue_KES: monthlyRevenue,
      Monthly_Costs_KES: monthlyCosts,
      Monthly_Profit_KES: monthlyProfit,
      Own_Baseline_Effective_Date: (record.financialBaselineSnapshot as { effectiveDate?: string } | null | undefined)?.effectiveDate ?? null,
      Own_Baseline_Monthly_Revenue_KES: ownBaseline.revenue,
      Own_Baseline_Monthly_Costs_KES: ownBaseline.costs,
      Own_Baseline_Monthly_Profit_KES: ownBaseline.profit,
      Own_Baseline_Quarterly_Revenue_KES: quarterlyFromMonthly(ownBaseline.revenue),
      Own_Baseline_Quarterly_Costs_KES: quarterlyFromMonthly(ownBaseline.costs),
      Own_Baseline_Quarterly_Profit_KES: quarterlyFromMonthly(ownBaseline.profit),
      Revenue_Change_Vs_Own_Baseline_KES: change(monthlyRevenue, ownBaseline.revenue),
      Costs_Change_Vs_Own_Baseline_KES: change(monthlyCosts, ownBaseline.costs),
      Profit_Change_Vs_Own_Baseline_KES: vsOwnProfit,
      Revenue_Change_Vs_Own_Baseline_Percent: changePercent(monthlyRevenue, ownBaseline.revenue),
      Costs_Change_Vs_Own_Baseline_Percent: changePercent(monthlyCosts, ownBaseline.costs),
      Profit_Change_Vs_Own_Baseline_Percent: changePercent(monthlyProfit, ownBaseline.profit),
      Vs_Own_Baseline: monthlyProfit === null
        ? "no_profit"
        : ownBaseline.profit === null
          ? "no_baseline"
          : (vsOwnProfit ?? 0) >= 0 ? "at_or_above" : "below",
      Track_ITT_Baseline_Monthly_Revenue_KES: ittBaseline?.revenue ?? null,
      Track_ITT_Baseline_Monthly_Costs_KES: ittBaseline?.costs ?? null,
      Track_ITT_Baseline_Monthly_Profit_KES: ittBaseline?.profit ?? null,
      Revenue_Change_Vs_ITT_Baseline_KES: change(monthlyRevenue, ittBaseline?.revenue ?? null),
      Costs_Change_Vs_ITT_Baseline_KES: change(monthlyCosts, ittBaseline?.costs ?? null),
      Profit_Change_Vs_ITT_Baseline_KES: change(monthlyProfit, ittBaseline?.profit ?? null),
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

export function buildPeriodVsBaselineExportRows(
  records: ApprovedMonitoringRecord[],
  periods: MonitoringExportPeriod[],
  trackBaselines: TrackMonthlyBaselines = DEFAULT_TRACK_MONTHLY_BASELINES
): Array<Record<string, string | number | boolean | null>> {
  const tracks: Array<"foundation" | "acceleration" | "all"> = ["foundation", "acceleration", "all"];
  const rows: Array<Record<string, string | number | boolean | null>> = [];
  for (const period of periods) {
    const periodRecords = records.filter((record) => record.periodId === period.id);
    for (const track of tracks) {
      const trackRecords = track === "all"
        ? periodRecords
        : periodRecords.filter((record) => record.dimensions.track === track);
      if (trackRecords.length === 0) continue;
      const ittBaseline = track === "all" ? null : trackBaselines[track];
      const periodRevenue = monthlyMedian(trackRecords, (record) => record.revenue);
      const periodCosts = monthlyMedian(trackRecords, (record) => record.costs);
      const periodProfit = monthlyMedian(trackRecords, (record) => record.profitLoss);
      const totalRevenue = monthlyTotal(trackRecords, (record) => record.revenue);
      const totalCosts = monthlyTotal(trackRecords, (record) => record.costs);
      const totalProfit = monthlyTotal(trackRecords, (record) => record.profitLoss);
      const ownMedianRevenue = ownBaselineMedian(trackRecords, "revenue");
      const ownMedianCosts = ownBaselineMedian(trackRecords, "costs");
      const ownMedianProfit = ownBaselineMedian(trackRecords, "profit");
      const ownTotalRevenue = ownBaselineTotal(trackRecords, "revenue");
      const ownTotalCosts = ownBaselineTotal(trackRecords, "costs");
      const ownTotalProfit = ownBaselineTotal(trackRecords, "profit");
      const ownBaseline = summarizeOwnBaselineProfitability(trackRecords);
      rows.push({
        Period_ID: period.id,
        Period: period.label,
        Programme_Year: period.programmeYear ?? null,
        Period_Sequence: period.sequence ?? null,
        Track: track === "all" ? "all" : track,
        Enterprises: new Set(trackRecords.map((record) => record.businessId)).size,
        Period_Monthly_Median_Revenue_KES: periodRevenue,
        Period_Monthly_Median_Costs_KES: periodCosts,
        Period_Monthly_Median_Profit_KES: periodProfit,
        Period_Monthly_Total_Revenue_KES: totalRevenue,
        Period_Monthly_Total_Costs_KES: totalCosts,
        Period_Monthly_Total_Profit_KES: totalProfit,
        ITT_Baseline_Monthly_Revenue_KES: ittBaseline?.revenue ?? null,
        ITT_Baseline_Monthly_Costs_KES: ittBaseline?.costs ?? null,
        ITT_Baseline_Monthly_Profit_KES: ittBaseline?.profit ?? null,
        Median_Vs_ITT_Revenue_KES: change(periodRevenue, ittBaseline?.revenue ?? null),
        Median_Vs_ITT_Costs_KES: change(periodCosts, ittBaseline?.costs ?? null),
        Median_Vs_ITT_Profit_KES: change(periodProfit, ittBaseline?.profit ?? null),
        Median_Vs_ITT_Profit_Percent: changePercent(periodProfit, ittBaseline?.profit ?? null),
        Cohort_Own_Baseline_Median_Revenue_KES: ownMedianRevenue,
        Cohort_Own_Baseline_Median_Costs_KES: ownMedianCosts,
        Cohort_Own_Baseline_Median_Profit_KES: ownMedianProfit,
        Period_Median_Vs_Own_Baseline_Median_Revenue_KES: change(periodRevenue, ownMedianRevenue),
        Period_Median_Vs_Own_Baseline_Median_Costs_KES: change(periodCosts, ownMedianCosts),
        Period_Median_Vs_Own_Baseline_Median_Profit_KES: change(periodProfit, ownMedianProfit),
        Period_Median_Vs_Own_Baseline_Median_Profit_Percent: changePercent(periodProfit, ownMedianProfit),
        Cohort_Own_Baseline_Total_Revenue_KES: ownTotalRevenue,
        Cohort_Own_Baseline_Total_Costs_KES: ownTotalCosts,
        Cohort_Own_Baseline_Total_Profit_KES: ownTotalProfit,
        Period_Total_Vs_Own_Baseline_Total_Revenue_KES: change(totalRevenue, ownTotalRevenue),
        Period_Total_Vs_Own_Baseline_Total_Costs_KES: change(totalCosts, ownTotalCosts),
        Period_Total_Vs_Own_Baseline_Total_Profit_KES: change(totalProfit, ownTotalProfit),
        Period_Total_Vs_Own_Baseline_Total_Profit_Percent: changePercent(totalProfit, ownTotalProfit),
        Enterprises_At_Or_Above_Own_Baseline: ownBaseline.atOrAboveCount,
        Enterprises_Below_Own_Baseline: ownBaseline.declinedCount,
        Enterprises_Comparable_To_Own_Baseline: ownBaseline.comparableCount,
        Share_At_Or_Above_Own_Baseline_Percent: ownBaseline.atOrAboveShare,
        Median_Enterprise_Profit_Change_Vs_Own_Baseline_KES: ownBaseline.medianProfitChange,
      });
    }
  }
  return rows;
}
