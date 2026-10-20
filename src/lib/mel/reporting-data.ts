import { createHash } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import db from "@/db/drizzle";
import {
  applicants,
  applications,
  businesses,
  capacityDevelopmentPlans,
  cnaAssessments,
  melDqaIssues,
  melEvidenceReviews,
  melIndicatorBaselines,
  melIndicatorDefinitions,
  melIndicatorResults,
  melIndicatorTargets,
  melEnterpriseAchievements,
  melEnterpriseFinancialBaselines,
  melMonitoringEvidence,
  melMonitoringSubmissions,
  melProgrammeResults,
  melProgrammeSettings,
  melReportingPeriods,
  kajabiProgressWebhooks,
  kajabiUserMapping,
} from "@/db/schema";
import {
  calculateIndicator,
  median,
  safePercentage,
  type ApprovedMonitoringRecord,
  type ApprovedEnterpriseAchievementInput,
  type EnterpriseRatioDenominator,
  type IndicatorCalculation,
  type JobTotals,
  type ProgrammeResultInput,
} from "./indicator-engine";
import { snapshotMonthlyField, summarizeOwnBaselineProfitability, withReportedFinancialActivity, type OwnBaselineProfitSummary } from "./financial-baselines";
import { resolveMonthlyFinancialBaselines } from "./monitoring-export";
import { findMonitoringJob, mergeJobTotals, MEL_JOB_TYPE } from "./job-types";
import { cumulativePlannedCohort } from "./cohort-denominator";
import { buildFeedbackWordClouds, type WordCloudTerm } from "./feedback-word-cloud";
import { WASTE_STREAMS } from "./monitoring-validation";
import {
  isOp11CountIndicator,
  isOp11VisualizationProgrammeWide,
  isY1PreDeliveryPeriod,
  MEL_OP11_YEAR1_ACTUALS,
  resolveOp11Actual,
} from "./programme-calendar";
import {
  buildFundingTypeBreakdown,
  EXTERNAL_FUNDING_TARGET_KES,
  externalFinanceAchievement,
  sumExternalFinance,
  type FundingTypeBreakdown,
} from "./reporting-finance";
import { buildPanelAnalysis, type MelPanelAnalysis } from "./panel-analysis";
import { emptyPanelAnalysis } from "./panel-analysis-core";
import {
  buildEmptyWorkbookPanelAnalysis,
  buildPanelAnalysisFromWorkbook,
  loadPanelWorkbookBuffer,
  parsePanelAnalysisWorkbook,
  type PanelWorkbookDemographics,
} from "./panel-analysis-workbook";
import { indicatorGroup, type MelIndicatorGroup } from "./reporting-visualizations";
export type { MelIndicatorGroup } from "./reporting-visualizations";
export type { WordCloudTerm } from "./feedback-word-cloud";

export type MelPanelSource = "system" | "workbook";

export type MelDashboardFilters = {
  periodId?: number | null;
  track?: string | null;
  county?: string | null;
  sector?: string | null;
  ownerGender?: string | null;
  panelBusinessId?: number | null;
  panelSource?: MelPanelSource | null;
};

/** URL/filter value for youth-owned enterprises (distinct from applicant gender). */
export const OWNER_YOUTH_FILTER_VALUE = "youth";

function isOwnerYouthFilter(value: string | null | undefined): boolean {
  return value === OWNER_YOUTH_FILTER_VALUE;
}

function matchesOwnerDemographicFilter(input: {
  ownerGender: string | null | undefined;
  ownerYouth: boolean | null | undefined;
  filter: string | null | undefined;
}): boolean {
  if (!input.filter) return true;
  if (isOwnerYouthFilter(input.filter)) return input.ownerYouth === true;
  return input.ownerGender === input.filter;
}

export function dashboardResultSegmentKey(filters: MelDashboardFilters): string {
  const parts = [
    filters.track ? `track:${filters.track}` : null,
    filters.county ? `county:${filters.county}` : null,
    filters.sector ? `sector:${filters.sector}` : null,
    filters.ownerGender
      ? isOwnerYouthFilter(filters.ownerGender)
        ? "owner_youth:true"
        : `owner_gender:${filters.ownerGender}`
      : null,
  ].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return "overall";
  const joined = parts.join("|");
  return joined.length <= 100 ? joined : `filters:${buildHash(joined).slice(0, 24)}`;
}

export type MelIttRow = {
  indicatorId: number;
  code: string;
  resultCode: string;
  resultLevel: string;
  resultStatement: string;
  name: string;
  unit: string;
  sourceType: string;
  baseline: number | null;
  target: number | null;
  /** Optional Direct/Indirect (or similar) target split for display. */
  targetBreakdown: Array<{ label: string; value: number }>;
  indicatorVersion: number;
  calculatedAt: Date | null;
  calculation: IndicatorCalculation;
  calculationHash: string;
};

export type MelIndicatorSeriesValues = {
  overall: number | null;
  foundation: number | null;
  acceleration: number | null;
};
export type MelIndicatorTargetValues = {
  overallTarget: number | null;
  foundationTarget: number | null;
  accelerationTarget: number | null;
};
export type MelIndicatorTrendPoint = MelIndicatorSeriesValues & MelIndicatorTargetValues & {
  periodId: number;
  periodCode: string;
  periodLabel: string;
  ratios: {
    overall: { numerator: number | null; denominator: number | null };
    foundation: { numerator: number | null; denominator: number | null } | null;
    acceleration: { numerator: number | null; denominator: number | null } | null;
  };
};
export type MelIndicatorVisualization = {
  indicatorId: number;
  code: string;
  name: string;
  resultCode: string;
  group: MelIndicatorGroup;
  unit: string;
  sourceType: string;
  programmeWide: boolean;
  preDeliveryNote: string | null;
  current: MelIndicatorSeriesValues;
  sourceCounts: MelIndicatorSeriesValues;
  trafficLight: IndicatorCalculation["trafficLight"];
  unavailableExplanation: string | null;
  trend: MelIndicatorTrendPoint[];
};

export type MelProfitabilityTrendPoint = {
  periodId: number;
  periodLabel: string;
  foundation: number | null;
  foundationBaseline: number;
  acceleration: number | null;
  accelerationBaseline: number;
};

export type MelFinancialDemographic = "all" | "male" | "female" | "youth";

export type MelFinancialMeasureTrendPeriod = {
  periodId: number;
  periodLabel: string;
  revenue: number | null;
  costs: number | null;
  profit: number | null;
};

export type MelFinancialMeasureTrendTrack = {
  track: "foundation" | "acceleration" | "all";
  baseline: { revenue: number; costs: number; profit: number };
  demographics: Record<MelFinancialDemographic, MelFinancialMeasureTrendPeriod[]>;
};

export type MelFinancialMeasureTrend = {
  tracks: MelFinancialMeasureTrendTrack[];
};

type MelSystemActual = {
  actual: number | null;
  sourceIds: number[];
  numerator?: number | null;
  denominator?: number | null;
  rule?: string;
  reportedSourceCount?: number;
};

type SupportedEnterprise = {
  businessId: number;
  track: string | null;
  ownerGender: string | null;
  ownerYouth: boolean | null;
  county: string | null;
  sector: string | null;
  selectedAt: Date;
};

type PeriodAchievement = ApprovedEnterpriseAchievementInput & { periodId: number };

export type MelCohortQualityEnterprise = {
  businessId: number;
  businessName: string;
  track: string | null;
  county: string | null;
  submissionId: number | null;
};

export type MelReportingDataset = {
  filters: Required<Pick<MelDashboardFilters, "periodId">> & Omit<MelDashboardFilters, "periodId">;
  selectedPeriod: typeof melReportingPeriods.$inferSelect;
  periods: Array<typeof melReportingPeriods.$inferSelect>;
  filterOptions: { tracks: string[]; counties: string[]; sectors: string[]; ownerGenders: string[] };
  ittRows: MelIttRow[];
  indicatorVisualizations: MelIndicatorVisualization[];
  profitabilityTrend: MelProfitabilityTrendPoint[];
  financialMeasureTrend: MelFinancialMeasureTrend;
  approvedRecords: ApprovedMonitoringRecord[];
  programmeResults: ProgrammeResultInput[];
  summary: {
    reportingEnterprises: number;
    eligibleEnterprises: number;
    reportingCompleteness: number | null;
    monthlyMedianRevenue: number | null;
    monthlyMedianRevenueBaseline: number | null;
    monthlyMedianRevenueChange: number | null;
    monthlyMedianRevenueChangePercent: number | null;
    monthlyMedianRevenueBaselineLabel: string | null;
    monthlyMedianCosts: number | null;
    monthlyMedianProfit: number | null;
    jobs: number;
    directJobs: number;
    directQualityJobs: number;
    directNonQualityJobs: number;
    indirectJobs: number;
    jobDisaggregation: {
      male: number;
      female: number;
      youth: number;
      plwd: number;
      refugee: number;
    };
    financeAccessed: number;
    externalFinanceAccessed: number;
    externalFinanceTarget: number;
    externalFinanceAchievement: number | null;
    greenResults: number;
    amberResults: number;
    redResults: number;
  };
  financeBreakdown: FundingTypeBreakdown[];
  financialPerformance: Array<{
    track: "foundation" | "acceleration" | "all";
    enterpriseCount: number;
    monthlyMedianRevenue: number | null;
    monthlyMedianCosts: number | null;
    monthlyMedianProfit: number | null;
    baseline: { revenue: number; costs: number; profit: number } | null;
    variance: { revenue: number | null; costs: number | null; profit: number | null };
    variancePercentage: { revenue: number | null; costs: number | null; profit: number | null };
    ownBaseline: OwnBaselineProfitSummary;
  }>;
  trends: Array<{
    periodId: number;
    periodLabel: string;
    revenue: number | null;
    profit: number | null;
    jobs: number;
    enterprises: number;
  }>;
  quality: {
    expectedReports: number;
    approvedReports: number;
    lateOrCatchUp: number;
    returnedReports: number;
    unresolvedDqaIssues: number;
    activeEvidence: number;
    verifiedEvidence: number;
    enterprisesWithoutVerifiedGps: number;
    missingApprovedReports: MelCohortQualityEnterprise[];
    attritionFromPriorPeriod: MelCohortQualityEnterprise[];
    priorMonitoringPeriodLabel: string | null;
  };
  feedbackAccountability: {
    responseCount: number;
    positiveEffects: WordCloudTerm[];
    enterpriseChallenges: WordCloudTerm[];
    supportNeeded: WordCloudTerm[];
    negativeEffects: WordCloudTerm[];
  };
  wasteReporting: MelWasteReportingSummary;
  panelAnalysis: MelPanelAnalysis;
};

export type MelWasteReportingSummary = {
  indicatorId: number | null;
  reportingEnterprises: number;
  totalBaselineKilograms: number;
  totalActualMonthlyKilograms: number;
  totalChangePercent: number | null;
  trafficLight: IndicatorCalculation["trafficLight"] | null;
  byStream: Array<{
    stream: string;
    label: string;
    baselineMonthlyMedianKilograms: number | null;
    actualMonthlyKilograms: number | null;
    changePercent: number | null;
  }>;
};

const emptyJobs = (): JobTotals => ({ total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 });

function cumulativeJobTotals(records: ApprovedMonitoringRecord[]): JobTotals {
  return records.reduce(
    (totals, record) => mergeJobTotals(totals, record.directJobs, record.indirectJobs),
    emptyJobs()
  );
}
const numeric = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function ageAt(dob: Date, date: string): number {
  const at = new Date(`${date}T00:00:00Z`);
  let age = at.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday = at.getUTCMonth() < dob.getUTCMonth()
    || (at.getUTCMonth() === dob.getUTCMonth() && at.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

async function loadPanelWorkbookDemographics(
  businessIds: number[],
  periodEndDate: string
): Promise<Map<number, PanelWorkbookDemographics>> {
  if (!businessIds.length) return new Map();
  const rows = await db
    .select({
      businessId: businesses.id,
      businessName: businesses.name,
      county: businesses.county,
      sector: businesses.sector,
      track: applications.track,
      ownerGender: applicants.gender,
      ownerDob: applicants.dob,
    })
    .from(businesses)
    .leftJoin(applications, eq(applications.businessId, businesses.id))
    .leftJoin(applicants, eq(applicants.id, businesses.applicantId))
    .where(inArray(businesses.id, businessIds));

  const map = new Map<number, PanelWorkbookDemographics>();
  for (const row of rows) {
    map.set(row.businessId, {
      businessId: row.businessId,
      businessName: row.businessName ?? `Enterprise ${row.businessId}`,
      track: row.track,
      ownerGender: row.ownerGender,
      ownerYouth: row.ownerDob ? ageAt(row.ownerDob, periodEndDate) <= 35 : null,
      sector: row.sector,
      county: row.county,
    });
  }
  return map;
}

const MONITORING_REPORTING_STATUSES = new Set([
  "submitted",
  "resubmitted",
  "redo_review",
  "returned_by_redo",
  "mel_review",
  "returned_by_mel",
  "approved",
  "returned",
  "reopened",
]);

function isMonitoringReportingStatus(status: string): boolean {
  return MONITORING_REPORTING_STATUSES.has(status);
}

type ScopedMonitoringSubmission = {
  id: number;
  businessId: number;
  reportingPeriodId: number;
  status: string;
  business: { name: string };
};

function buildCohortQuality(
  supportedEnterprises: SupportedEnterprise[],
  periodEnd: Date,
  filters: MelDashboardFilters,
  selectedPeriod: typeof melReportingPeriods.$inferSelect,
  includedPeriods: Array<typeof melReportingPeriods.$inferSelect>,
  scopedAllSubmissions: ScopedMonitoringSubmission[]
) {
  const eligible = supportedEnterprises.filter(
    (enterprise) => enterprise.selectedAt <= periodEnd && matchesSupportedFilters(enterprise, filters)
  );
  const businessName = (businessId: number) =>
    scopedAllSubmissions.find((submission) => submission.businessId === businessId)?.business.name
    ?? `Enterprise ${businessId}`;
  const submissionFor = (businessId: number, periodId: number) =>
    scopedAllSubmissions.find(
      (submission) => submission.businessId === businessId && submission.reportingPeriodId === periodId
    );
  const approvedThisPeriod = new Set(
    scopedAllSubmissions
      .filter((submission) => submission.reportingPeriodId === selectedPeriod.id && submission.status === "approved")
      .map((submission) => submission.businessId)
  );
  const toRow = (enterprise: SupportedEnterprise): MelCohortQualityEnterprise => {
    const submission = submissionFor(enterprise.businessId, selectedPeriod.id);
    return {
      businessId: enterprise.businessId,
      businessName: businessName(enterprise.businessId),
      track: enterprise.track,
      county: enterprise.county,
      submissionId: submission?.id ?? null,
    };
  };
  const missingApprovedReports = eligible
    .filter((enterprise) => !approvedThisPeriod.has(enterprise.businessId))
    .map(toRow)
    .sort((left, right) => left.businessId - right.businessId);

  const monitoringPeriods = includedPeriods.filter((period) => !isY1PreDeliveryPeriod(period));
  const currentIndex = monitoringPeriods.findIndex((period) => period.id === selectedPeriod.id);
  const priorPeriod = currentIndex > 0 ? monitoringPeriods[currentIndex - 1] : null;
  let attritionFromPriorPeriod: MelCohortQualityEnterprise[] = [];
  let priorMonitoringPeriodLabel: string | null = null;
  if (priorPeriod) {
    priorMonitoringPeriodLabel = priorPeriod.label;
    const approvedPrior = new Set(
      scopedAllSubmissions
        .filter((submission) => submission.reportingPeriodId === priorPeriod.id && submission.status === "approved")
        .map((submission) => submission.businessId)
    );
    attritionFromPriorPeriod = eligible
      .filter(
        (enterprise) =>
          approvedPrior.has(enterprise.businessId) && !approvedThisPeriod.has(enterprise.businessId)
      )
      .map(toRow)
      .sort((left, right) => left.businessId - right.businessId);
  }

  return { missingApprovedReports, attritionFromPriorPeriod, priorMonitoringPeriodLabel };
}

function activeSupportedEnterpriseCount(
  supportedEnterprises: SupportedEnterprise[],
  periodEnd: Date,
  filters: MelDashboardFilters,
  programmeYear: number
): number {
  const cohortCount = new Set(
    supportedEnterprises
      .filter(
        (enterprise) =>
          enterprise.selectedAt <= periodEnd && matchesSupportedFilters(enterprise, filters)
      )
      .map((enterprise) => enterprise.businessId)
  ).size;
  const programmeWide =
    !filters.track && !filters.county && !filters.sector && !filters.ownerGender;
  if (programmeWide && programmeYear === 1) {
    return Math.max(cohortCount, MEL_OP11_YEAR1_ACTUALS["OP1.1-CNA-COMPLETED"]);
  }
  return cohortCount;
}

function buildHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function matchesDashboardFilters(record: ApprovedMonitoringRecord, filters: MelDashboardFilters): boolean {
  if (filters.track && record.dimensions.track !== filters.track) return false;
  if (filters.county && record.dimensions.county !== filters.county) return false;
  if (filters.sector && record.dimensions.sector !== filters.sector) return false;
  if (
    !matchesOwnerDemographicFilter({
      ownerGender: record.dimensions.ownerGender,
      ownerYouth: record.dimensions.ownerYouth,
      filter: filters.ownerGender,
    })
  ) {
    return false;
  }
  return true;
}

export async function buildMelReportingDataset(filters: MelDashboardFilters = {}): Promise<MelReportingDataset> {
  const periods = await db.query.melReportingPeriods.findMany({
    where: inArray(melReportingPeriods.status, ["open", "closed"]),
    orderBy: [asc(melReportingPeriods.programmeYear), asc(melReportingPeriods.sequence)],
  });
  const selectedPeriod = filters.periodId
    ? periods.find((period) => period.id === filters.periodId)
    : periods.at(-1);
  if (!selectedPeriod) throw new Error("No open or closed MEL reporting period is available.");
  const resolvedFilters: MelReportingDataset["filters"] = {
    periodId: selectedPeriod.id,
    track: filters.track ?? null,
    county: filters.county ?? null,
    sector: filters.sector ?? null,
    ownerGender: filters.ownerGender ?? null,
    panelBusinessId: filters.panelBusinessId ?? null,
    panelSource: "workbook",
  };

  const includedPeriods = periods.filter(
    (period) => period.programmeYear < selectedPeriod.programmeYear
      || (period.programmeYear === selectedPeriod.programmeYear && period.sequence <= selectedPeriod.sequence)
  );
  const includedPeriodIds = includedPeriods.map((period) => period.id);
  const periodOrder = new Map(includedPeriods.map((period, index) => [period.id, index]));

  const [settings, definitions, submissions, programmeRows, materialized, allSubmissions, systemApplications, systemCna, systemCdp, trainingMappings, trainingEvents, supportedRows, achievementRows] = await Promise.all([
    db.query.melProgrammeSettings.findFirst({ where: eq(melProgrammeSettings.id, 1) }),
    db.query.melIndicatorDefinitions.findMany({
      where: eq(melIndicatorDefinitions.isActive, true),
      with: { baselines: true, targets: true },
      orderBy: [asc(melIndicatorDefinitions.sortOrder), asc(melIndicatorDefinitions.code)],
    }),
    db.query.melMonitoringSubmissions.findMany({
      where: and(
        eq(melMonitoringSubmissions.status, "approved"),
        inArray(melMonitoringSubmissions.reportingPeriodId, includedPeriodIds)
      ),
      with: {
        response: true,
        financeEntries: true,
        jobs: true,
        waste: true,
        business: { with: { applicant: true, application: true, kycProfile: true } },
      },
    }),
    db.query.melProgrammeResults.findMany({
      where: and(
        eq(melProgrammeResults.status, "approved"),
        inArray(melProgrammeResults.reportingPeriodId, includedPeriodIds)
      ),
      with: { indicator: true },
    }),
    db.query.melIndicatorResults.findMany({
      where: eq(melIndicatorResults.reportingPeriodId, selectedPeriod.id),
    }),
    db.query.melMonitoringSubmissions.findMany({
      where: inArray(melMonitoringSubmissions.reportingPeriodId, includedPeriodIds),
      with: { business: { with: { applicant: true, application: true, kycProfile: true } } },
    }),
    db.select({ id: applications.id, businessId: applications.businessId, occurredAt: applications.submittedAt, createdAt: applications.createdAt }).from(applications),
    db.select({ id: cnaAssessments.id, businessId: cnaAssessments.businessId, occurredAt: cnaAssessments.lockedAt, createdAt: cnaAssessments.createdAt }).from(cnaAssessments).where(eq(cnaAssessments.status, "locked")),
    db.select({ id: capacityDevelopmentPlans.id, businessId: capacityDevelopmentPlans.businessId, occurredAt: capacityDevelopmentPlans.cdpApprovedAt, createdAt: capacityDevelopmentPlans.createdAt }).from(capacityDevelopmentPlans).where(eq(capacityDevelopmentPlans.status, "active")),
    safeKajabiMappings(),
    safeKajabiEvents(),
    db.select({
      businessId: businesses.id,
      track: applications.track,
      ownerGender: applicants.gender,
      ownerDob: applicants.dob,
      county: businesses.county,
      sector: businesses.sector,
      selectedAt: applications.selectedAt,
      updatedAt: applications.updatedAt,
      createdAt: applications.createdAt,
    })
      .from(applications)
      .innerJoin(businesses, eq(businesses.id, applications.businessId))
      .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
      .where(inArray(applications.status, ["approved", "finalist"])),
    db.query.melEnterpriseAchievements.findMany({
      where: eq(melEnterpriseAchievements.status, "approved"),
      with: { indicator: true, firstSubmission: true },
    }),
  ]);

  const supportedEnterprises: SupportedEnterprise[] = supportedRows.map((row) => ({
    businessId: row.businessId,
    track: row.track,
    ownerGender: row.ownerGender,
    ownerYouth: row.ownerDob ? ageAt(row.ownerDob, selectedPeriod.endDate) <= 35 : null,
    county: row.county,
    sector: row.sector,
    selectedAt: row.selectedAt ?? row.updatedAt ?? row.createdAt,
  }));
  const approvedAchievements: PeriodAchievement[] = achievementRows.map((achievement) => ({
    id: achievement.id,
    businessId: achievement.businessId,
    indicatorCode: achievement.indicator.code,
    periodId: achievement.approvedPeriodId ?? achievement.firstSubmission.reportingPeriodId,
  }));

  const scopedAllSubmissions = allSubmissions.filter((submission) => {
    if (resolvedFilters.track && submission.business.application?.track !== resolvedFilters.track) return false;
    if (resolvedFilters.county && submission.business.county !== resolvedFilters.county) return false;
    if (resolvedFilters.sector && submission.business.sector !== resolvedFilters.sector) return false;
    const applicant = submission.business.applicant;
    const ownerYouth = applicant?.dob ? ageAt(applicant.dob, selectedPeriod.endDate) <= 35 : null;
    if (
      !matchesOwnerDemographicFilter({
        ownerGender: applicant?.gender,
        ownerYouth,
        filter: resolvedFilters.ownerGender,
      })
    ) {
      return false;
    }
    return true;
  });
  const includedSubmissionIds = new Set(scopedAllSubmissions.map((submission) => submission.id));
  const submissionIdFilter = includedSubmissionIds.size ? [...includedSubmissionIds] : [-1];
  const [scopedDqaIssues, evidence, evidenceReviews] = await Promise.all([
    db.select().from(melDqaIssues).where(inArray(melDqaIssues.submissionId, submissionIdFilter)),
    db.select().from(melMonitoringEvidence).where(inArray(melMonitoringEvidence.submissionId, submissionIdFilter)),
    db.select().from(melEvidenceReviews),
  ]);

  const records: ApprovedMonitoringRecord[] = submissions.map((submission) =>
    mapApprovedSubmissionToRecord(submission, selectedPeriod)
  );

  const genderOptions = unique(records.map((record) => record.dimensions.ownerGender));
  const hasYouthOwners = records.some((record) => record.dimensions.ownerYouth === true);
  const filterOptions = {
    tracks: unique(records.map((record) => record.dimensions.track)),
    counties: unique(records.map((record) => record.dimensions.county)),
    sectors: unique(records.map((record) => record.dimensions.sector)),
    ownerGenders: hasYouthOwners
      ? [...genderOptions, OWNER_YOUTH_FILTER_VALUE].sort()
      : genderOptions,
  };
  const filteredRecords = records.filter((record) => matchesDashboardFilters(record, resolvedFilters));
  const financeBreakdown = buildFundingTypeBreakdown(filteredRecords);
  const financeAccessed = sum(financeBreakdown, (item) => item.amount);
  const externalFinanceAccessed = sumExternalFinance(financeBreakdown);
  const periodEnd = new Date(`${selectedPeriod.endDate}T23:59:59.999+03:00`);
  // OP1.1 system counts must use the supported enterprise cohort, not only MEL reporters.
  const systemEligibleIds = new Set(
    supportedEnterprises
      .filter((enterprise) =>
        enterprise.selectedAt <= periodEnd
        && matchesSupportedFilters(enterprise, resolvedFilters)
      )
      .map((enterprise) => enterprise.businessId)
  );
  const approvedProgrammeResults: ProgrammeResultInput[] = programmeRows.map((entry) => ({
    id: entry.id,
    indicatorCode: entry.indicator.code,
    value: numeric(entry.value),
    numerator: numeric(entry.numerator),
    denominator: numeric(entry.denominator),
    segmentKey: entry.segmentKey,
  }));
  const thresholds = {
    red: numeric(settings?.redThreshold) ?? 50,
    green: numeric(settings?.greenThreshold) ?? 80,
  };
  const mobilizationTargets = definitions.find((definition) => definition.code === "OP1.1-ENTERPRISES-MOBILISED")?.targets ?? [];
  const denominatorFor = (
    definition: (typeof definitions)[number],
    period: typeof selectedPeriod,
    segmentKey: string,
    scopeFilters: MelDashboardFilters
  ): EnterpriseRatioDenominator | null => {
    if (
      definition.aggregation !== "ratio"
      || definition.unit !== "percentage"
      || (definition.sourceType !== "quarterly_enterprise_form" && definition.sourceType !== "integration")
    ) return null;
    const periodEnd = new Date(`${period.endDate}T23:59:59.999+03:00`);
    const segmentTrack = segmentKey.startsWith("track:") ? segmentKey.slice("track:".length) : null;
    const eligible = supportedEnterprises.filter((enterprise) =>
      enterprise.selectedAt <= periodEnd
      && matchesSupportedFilters(enterprise, scopeFilters)
      && (!segmentTrack || enterprise.track === segmentTrack)
    );
    const isOverall = segmentKey === "overall"
      && !scopeFilters.track
      && !scopeFilters.county
      && !scopeFilters.sector
      && !scopeFilters.ownerGender;
    const eligibleBusinessIds = [...new Set(eligible.map((enterprise) => enterprise.businessId))];
    return {
      value: isOverall ? cumulativePlannedCohort(mobilizationTargets, period.programmeYear) : eligibleBusinessIds.length,
      basis: isOverall ? "planned_programme_cohort" : "actual_segment_cohort",
      eligibleBusinessIds,
    };
  };
  const achievementsFor = (
    definitionCode: string,
    period: typeof selectedPeriod,
    denominator: EnterpriseRatioDenominator | null
  ): ApprovedEnterpriseAchievementInput[] => {
    if (!denominator) return [];
    const currentOrder = periodOrder.get(period.id) ?? -1;
    const eligible = new Set(denominator.eligibleBusinessIds);
    return approvedAchievements.filter((achievement) =>
      achievement.indicatorCode === definitionCode
      && eligible.has(achievement.businessId)
      && (periodOrder.get(achievement.periodId) ?? Number.POSITIVE_INFINITY) <= currentOrder
    );
  };
  const materializedSegmentKey = dashboardResultSegmentKey(filters);
  const targetSegmentKey = materializedSegmentKey.includes("|") || materializedSegmentKey.startsWith("filters:")
    ? "overall"
    : materializedSegmentKey;

  const businessUsers = submissions.map((submission) => ({
    businessId: submission.businessId,
    userId: submission.business.applicant.userId,
  }));
  const systemActualsAt = (period: typeof selectedPeriod, eligible: Set<number>): Record<string, MelSystemActual> => {
    const through = new Date(`${period.endDate}T23:59:59.999+03:00`);
    const wrap = (code: string, counted: MelSystemActual): MelSystemActual => {
      if (!isOp11CountIndicator(code) || counted.actual === null) return counted;
      const actual = resolveOp11Actual(code, counted.actual, period.programmeYear);
      const systemActual = counted.actual ?? 0;
      let rule = counted.rule ?? "Distinct valid system records";
      if (actual > systemActual) {
        rule = "Official shared-ITT Year 1 actual (system count not yet caught up)";
      } else if (actual < systemActual) {
        rule = "Official shared-ITT Year 1 actual (system overcount excluded from ITT)";
      }
      return {
        ...counted,
        actual,
        rule,
        reportedSourceCount: actual < systemActual ? actual : undefined,
      };
    };
    return {
      "OP1.1-ENTERPRISES-MOBILISED": wrap("OP1.1-ENTERPRISES-MOBILISED", distinctSystem(systemApplications, eligible, through)),
      "OP1.1-CNA-COMPLETED": wrap("OP1.1-CNA-COMPLETED", distinctSystem(systemCna, eligible, through)),
      "OP1.1-CDP-IMPLEMENTED": wrap("OP1.1-CDP-IMPLEMENTED", distinctSystem(systemCdp, eligible, through)),
      "OP1.2-TRAINING-COMPLETION": trainingCompletionSystem(
        trainingMappings,
        trainingEvents,
        businessUsers,
        eligible,
        through
      ),
    };
  };
  const systemActuals = systemActualsAt(selectedPeriod, systemEligibleIds);
  const baselines = resolveMonthlyFinancialBaselines(settings?.monthlyFinancialBaselines);

  const ittRows: MelIttRow[] = definitions.map((definition) => {
    const definitionTargetKey = definition.sourceType === "programme_mel_entry" ? "overall" : targetSegmentKey;
    const segmentKey = definition.sourceType === "programme_mel_entry" ? "overall" : filters.track ? `track:${filters.track}` : "overall";
    const baseline = resolveIndicatorBaseline(definition.code, definition.baselines, segmentKey.startsWith("track:") ? segmentKey : definitionTargetKey, baselines);
    const target = selectTarget(definition.targets, selectedPeriod.id, selectedPeriod.programmeYear, definitionTargetKey);
    const targetBreakdown = buildTargetBreakdown(
      definition.code,
      definition.targets,
      selectedPeriod.id,
      selectedPeriod.programmeYear
    );
    const enterpriseDenominator = denominatorFor(definition, selectedPeriod, segmentKey, resolvedFilters);
    const calculation = calculateIndicator({
      definition: {
        code: definition.code,
        aggregation: definition.aggregation,
        lowerIsBetter: definition.lowerIsBetter,
        version: definition.version,
        unit: definition.unit,
        sourceType: definition.sourceType,
        isOneTime: definition.isOneTime,
      },
      records: filteredRecords,
      programmeResults: approvedProgrammeResults,
      baseline,
      target,
      systemActual: systemActuals[definition.code] ?? null,
      approvedAchievements: achievementsFor(definition.code, selectedPeriod, enterpriseDenominator),
      enterpriseDenominator,
      segmentKey,
      thresholds,
    });
    const hash = buildHash({ definition: definition.version, period: selectedPeriod.id, filters: resolvedFilters, calculation });
    const saved = materialized.find((item) => item.indicatorId === definition.id && item.segmentKey === materializedSegmentKey);
    return {
      indicatorId: definition.id,
      code: definition.code,
      resultCode: definition.resultCode,
      resultLevel: definition.resultLevel,
      resultStatement: definition.resultStatement,
      name: definition.name,
      unit: definition.unit,
      sourceType: definition.sourceType,
      baseline,
      target,
      targetBreakdown,
      indicatorVersion: definition.version,
      calculatedAt: saved?.calculationHash === hash ? saved.calculatedAt : null,
      calculation,
      calculationHash: hash,
    };
  });

  const wasteDefinition = definitions.find((definition) => definition.code === "OP3.3-WASTE-RECYCLED");
  const wasteReporting = buildWasteReportingSummary(
    filteredRecords,
    wasteDefinition,
    selectedPeriod,
    thresholds,
    periodOrder
  );

  const trends = includedPeriods.map((period) => {
    const periodRecords = withReportedFinancialActivity(filteredRecords.filter((record) => record.periodId === period.id));
    return {
      periodId: period.id,
      periodLabel: period.label,
      revenue: monthlyMedian(periodRecords, (record) => record.revenue),
      profit: monthlyMedian(periodRecords, (record) => record.profitLoss),
      jobs: sum(filteredRecords.filter((record) => record.periodId === period.id), (record) => record.directJobs.total + record.indirectJobs.total),
      enterprises: new Set(periodRecords.map((record) => record.businessId)).size,
    };
  });
  const latestPeriodRecords = filteredRecords.filter((record) => record.periodId === selectedPeriod.id);
  const latestApprovedForPeriod = latestRecords(latestPeriodRecords);
  const financialTracks = (filters.track
    ? [filters.track]
    : ["foundation", "acceleration"]
  ).filter((track): track is "foundation" | "acceleration" => track === "foundation" || track === "acceleration");
  const financialPerformance = financialTracks.map((track) =>
    buildFinancialPerformanceRow(track, latestRecords(filteredRecords.filter((record) => record.dimensions.track === track)), baselines[track])
  );
  if (financialTracks.length > 1) {
    financialPerformance.push(buildFinancialPerformanceRow("all", latestRecords(filteredRecords), baselines.overall));
  }

  const monitoringPeriods = includedPeriods.filter((period) => !isY1PreDeliveryPeriod(period));
  const measureTrendRecords = records.filter((record) =>
    matchesDashboardFilters(record, { ...resolvedFilters, ownerGender: null })
  );
  const measureTrendTracks: Array<"foundation" | "acceleration" | "all"> = financialTracks.length > 1
    ? ["foundation", "acceleration", "all"]
    : financialTracks;
  const financialMeasureTrend: MelFinancialMeasureTrend = {
    tracks: measureTrendTracks.map((track) => {
      const trackRecords = track === "all"
        ? measureTrendRecords
        : measureTrendRecords.filter((record) => record.dimensions.track === track);
      return {
        track,
        baseline: baselines[track === "all" ? "overall" : track],
        demographics: {
          all: periodMedians(trackRecords, monitoringPeriods),
          male: periodMedians(trackRecords.filter((record) => record.dimensions.ownerGender === "male"), monitoringPeriods),
          female: periodMedians(trackRecords.filter((record) => record.dimensions.ownerGender === "female"), monitoringPeriods),
          youth: periodMedians(trackRecords.filter((record) => record.dimensions.ownerYouth === true), monitoringPeriods),
        },
      };
    }),
  };

  const baseVisualizationFilters = { ...resolvedFilters, track: null };
  const demographicFilterNote = filters.ownerGender || filters.county || filters.sector
    ? "Programme-wide result: enterprise demographic and location filters do not apply."
    : null;
  const calculationAt = (
    definition: (typeof definitions)[number],
    period: typeof selectedPeriod,
    periodRecords: ApprovedMonitoringRecord[],
    segmentKey: string,
    programmeResultsAtPeriod: ProgrammeResultInput[]
  ) => {
    const periodCutoff = new Date(`${period.endDate}T23:59:59.999+03:00`);
    const systemEligible = new Set(
      supportedEnterprises
        .filter((enterprise) =>
          enterprise.selectedAt <= periodCutoff
          && matchesSupportedFilters(enterprise, baseVisualizationFilters)
          && (!segmentKey.startsWith("track:") || enterprise.track === segmentKey.slice("track:".length))
        )
        .map((enterprise) => enterprise.businessId)
    );
    const targetKey = segmentKey.startsWith("track:") ? segmentKey : "overall";
    const enterpriseDenominator = denominatorFor(definition, period, segmentKey, baseVisualizationFilters);
    return calculateIndicator({
      definition: {
        code: definition.code,
        aggregation: definition.aggregation,
        lowerIsBetter: definition.lowerIsBetter,
        version: definition.version,
        unit: definition.unit,
        sourceType: definition.sourceType,
        isOneTime: definition.isOneTime,
      },
      records: periodRecords,
      programmeResults: programmeResultsAtPeriod,
      baseline: resolveIndicatorBaseline(definition.code, definition.baselines, targetKey, baselines),
      target: selectTarget(definition.targets, period.id, period.programmeYear, targetKey),
      systemActual: systemActualsAt(period, systemEligible)[definition.code] ?? null,
      approvedAchievements: achievementsFor(definition.code, period, enterpriseDenominator),
      enterpriseDenominator,
      segmentKey,
      thresholds,
    });
  };
  const visualizationCalculations = new Map<number, Array<{
    period: typeof selectedPeriod;
    overall: IndicatorCalculation;
    foundation: IndicatorCalculation | null;
    acceleration: IndicatorCalculation | null;
  }>>();

  for (const definition of definitions) {
    const programmeWide = isOp11VisualizationProgrammeWide(definition.code, definition.sourceType);
    const points = includedPeriods.map((period) => {
      const currentOrder = periodOrder.get(period.id) ?? -1;
      const recordsAtPeriod = records.filter((record) => {
        const recordOrder = periodOrder.get(record.periodId) ?? Number.POSITIVE_INFINITY;
        return recordOrder <= currentOrder && matchesDashboardFilters(record, baseVisualizationFilters);
      });
      const filteredForSelectedTrack = filters.track
        ? recordsAtPeriod.filter((record) => record.dimensions.track === filters.track)
        : recordsAtPeriod;
      const programmeResultsAtPeriod = programmeRows
        .filter((entry) => (periodOrder.get(entry.reportingPeriodId) ?? Number.POSITIVE_INFINITY) <= currentOrder)
        .map((entry) => ({
          id: entry.id,
          indicatorCode: entry.indicator.code,
          value: numeric(entry.value),
          numerator: numeric(entry.numerator),
          denominator: numeric(entry.denominator),
          segmentKey: entry.segmentKey,
        }));
      const overall = calculationAt(
        definition,
        period,
        filteredForSelectedTrack,
        programmeWide ? "overall" : filters.track ? `track:${filters.track}` : "overall",
        programmeResultsAtPeriod
      );
      return {
        period,
        overall,
        foundation: !filters.track && !programmeWide
          ? calculationAt(definition, period, recordsAtPeriod.filter((record) => record.dimensions.track === "foundation"), "track:foundation", programmeResultsAtPeriod)
          : null,
        acceleration: !filters.track && !programmeWide
          ? calculationAt(definition, period, recordsAtPeriod.filter((record) => record.dimensions.track === "acceleration"), "track:acceleration", programmeResultsAtPeriod)
          : null,
      };
    });
    visualizationCalculations.set(definition.id, points);
  }

  const indicatorVisualizations: MelIndicatorVisualization[] = definitions.map((definition) => {
    const programmeWide = isOp11VisualizationProgrammeWide(definition.code, definition.sourceType);
    const points = visualizationCalculations.get(definition.id) ?? [];
    const latest = points.at(-1);
    const availableTrackCalculation = latest?.foundation?.actual != null
      ? latest.foundation
      : latest?.acceleration?.actual != null
        ? latest.acceleration
        : null;
    const relevantCalculation = filters.track
      ? latest?.overall
      : programmeWide
        ? latest?.overall
        : availableTrackCalculation
          ? availableTrackCalculation
          : latest?.overall;
    const officialY1Actual = isOp11CountIndicator(definition.code)
      ? MEL_OP11_YEAR1_ACTUALS[definition.code as keyof typeof MEL_OP11_YEAR1_ACTUALS]
      : undefined;
    return {
      indicatorId: definition.id,
      code: definition.code,
      name: definition.name,
      resultCode: definition.resultCode,
      group: indicatorGroup(definition.code),
      unit: definition.unit,
      sourceType: definition.sourceType,
      programmeWide,
      preDeliveryNote: officialY1Actual !== undefined
        ? `Achieved during Y1 pre-delivery (Oct 2025–May 2026): official shared-ITT Year 1 actual is ${officialY1Actual.toLocaleString("en-KE")}. BDS monitoring quarters report the same programme-wide cumulative total until updated.`
        : null,
      current: {
        overall: latest?.overall.actual ?? null,
        foundation: latest?.foundation?.actual ?? null,
        acceleration: latest?.acceleration?.actual ?? null,
      },
      sourceCounts: {
        overall: latest?.overall.sourceCount ?? 0,
        foundation: latest?.foundation?.sourceCount ?? null,
        acceleration: latest?.acceleration?.sourceCount ?? null,
      },
      trafficLight: relevantCalculation?.trafficLight ?? "not_available",
      unavailableExplanation: relevantCalculation?.actual === null
        ? relevantCalculation.exclusions[0] ?? "No approved result is available through this reporting period."
        : programmeWide ? demographicFilterNote : null,
      trend: points
        .filter((point) => !isY1PreDeliveryPeriod(point.period))
        .map((point) => ({
          periodId: point.period.id,
          periodCode: point.period.code,
          periodLabel: point.period.label,
          overall: point.overall.actual,
          foundation: point.foundation?.actual ?? null,
          acceleration: point.acceleration?.actual ?? null,
          overallTarget: point.overall.target,
          foundationTarget: point.foundation?.target ?? null,
          accelerationTarget: point.acceleration?.target ?? null,
          ratios: {
            overall: { numerator: point.overall.numerator, denominator: point.overall.denominator },
            foundation: point.foundation ? { numerator: point.foundation.numerator, denominator: point.foundation.denominator } : null,
            acceleration: point.acceleration ? { numerator: point.acceleration.numerator, denominator: point.acceleration.denominator } : null,
          },
        })),
    };
  });

  const profitabilityTrend: MelProfitabilityTrendPoint[] = (visualizationCalculations.get(
    definitions.find((definition) => definition.code === "LT1-PROFITABILITY-INCREASE")?.id ?? -1
  ) ?? [])
    .filter((point) => !isY1PreDeliveryPeriod(point.period))
    .map((point) => ({
      periodId: point.period.id,
      periodLabel: point.period.label,
      foundation: point.foundation?.numerator ?? (filters.track === "foundation" ? point.overall.numerator : null),
      foundationBaseline: baselines.foundation.revenue,
      acceleration: point.acceleration?.numerator ?? (filters.track === "acceleration" ? point.overall.numerator : null),
      accelerationBaseline: baselines.acceleration.revenue,
    }));
  const eligibleEnterpriseCount = activeSupportedEnterpriseCount(
    supportedEnterprises,
    periodEnd,
    resolvedFilters,
    selectedPeriod.programmeYear
  );
  const reportingEnterpriseCount = new Set(
    scopedAllSubmissions
      .filter(
        (submission) =>
          submission.reportingPeriodId === selectedPeriod.id &&
          isMonitoringReportingStatus(submission.status)
      )
      .map((submission) => submission.businessId)
  ).size;
  const expectedReports = eligibleEnterpriseCount * includedPeriods.length;
  const activeEvidence = evidence.filter((item) => item.status === "active" && includedSubmissionIds.has(item.submissionId));
  const verifiedEvidenceIds = new Set(evidenceReviews.filter((review) => review.status === "verified").map((review) => review.evidenceId));
  const latestSubmissionsByBusiness = new Map<number, (typeof allSubmissions)[number]>();
  for (const submission of scopedAllSubmissions) latestSubmissionsByBusiness.set(submission.businessId, submission);

  const submissionById = new Map(submissions.map((submission) => [submission.id, submission]));
  const latestPeriodResponses = latestPeriodRecords
    .map((record) => submissionById.get(record.submissionId)?.response)
    .filter((response): response is NonNullable<typeof response> => Boolean(response));
  const cohortQuality = buildCohortQuality(
    supportedEnterprises,
    periodEnd,
    resolvedFilters,
    selectedPeriod,
    includedPeriods,
    scopedAllSubmissions
  );
  const feedbackWordClouds = buildFeedbackWordClouds({
    positiveProgrammeImpacts: latestPeriodResponses.map((response) => response.positiveProgrammeImpacts ?? ""),
    mainChallenges: latestPeriodResponses.map((response) => response.mainChallenges ?? ""),
    additionalSupportNeeded: latestPeriodResponses.map((response) => response.additionalSupportNeeded ?? ""),
    negativeProgrammeImpacts: latestPeriodResponses.map((response) => response.negativeProgrammeImpacts ?? ""),
  });
  const cumulativeJobs = cumulativeJobTotals(filteredRecords);
  const latestApprovedWithFinancials = withReportedFinancialActivity(latestApprovedForPeriod);
  const monthlyMedianRevenue = monthlyMedian(latestApprovedWithFinancials, (record) => record.revenue);
  const selectedFinancialTrack = filters.track === "foundation" || filters.track === "acceleration" ? filters.track : null;
  const monthlyMedianRevenueBaseline = selectedFinancialTrack
    ? baselines[selectedFinancialTrack].revenue
    : baselines.overall.revenue;
  const monthlyMedianRevenueChange = monthlyMedianRevenue === null || monthlyMedianRevenueBaseline === null
    ? null
    : monthlyMedianRevenue - monthlyMedianRevenueBaseline;
  const monthlyMedianRevenueChangePercent = monthlyMedianRevenueChange === null || monthlyMedianRevenueBaseline === null
    ? null
    : safePercentage(monthlyMedianRevenueChange, monthlyMedianRevenueBaseline);
  const monthlyMedianRevenueBaselineLabel = selectedFinancialTrack
    ? `${selectedFinancialTrack} ITT baseline`
    : "overall ITT baseline";

  const panelMonitoringPeriods = includedPeriods.filter((period) => !isY1PreDeliveryPeriod(period));
  const panelPeriod = panelMonitoringPeriods.find((period) => period.id === selectedPeriod.id)
    ?? panelMonitoringPeriods.at(-1)
    ?? null;
  const panelPeriodLabel = panelPeriod?.label ?? selectedPeriod.label;
  const panelPeriodCode = panelPeriod?.code ?? selectedPeriod.code;
  let panelAnalysis: MelPanelAnalysis = emptyPanelAnalysis({
    monitoringPeriodLabel: panelPeriodLabel,
    monitoringPeriodCode: panelPeriodCode,
    selectedBusinessId: resolvedFilters.panelBusinessId,
    summaryLabel: panelPeriod ? "No matched panel data" : "No monitoring period is open through the selected quarter",
  });

  if (resolvedFilters.panelSource === "workbook") {
    const workbookBuffer = loadPanelWorkbookBuffer();
    if (!workbookBuffer) {
      panelAnalysis = buildEmptyWorkbookPanelAnalysis(
        panelPeriodLabel,
        panelPeriodCode,
        resolvedFilters.panelBusinessId ?? null,
        "Panel workbook not found at data/mel/panel-analysis.xlsx."
      );
    } else {
      const parsed = parsePanelAnalysisWorkbook(workbookBuffer);
      const workbookBusinessIds = [
        ...new Set([
          ...parsed.baselineRows.map((row) => row.businessId),
          ...parsed.monitoringRows.map((row) => row.businessId),
        ]),
      ];
      const demographicsById = await loadPanelWorkbookDemographics(workbookBusinessIds, selectedPeriod.endDate);
      panelAnalysis = buildPanelAnalysisFromWorkbook({
        buffer: workbookBuffer,
        demographicsById,
        panelBusinessId: resolvedFilters.panelBusinessId ?? null,
        monitoringPeriodLabel: panelPeriodLabel,
        monitoringPeriodCode: panelPeriodCode,
        filters: resolvedFilters,
        approvedOverlayRecords: panelPeriod ? filteredRecords : undefined,
        panelPeriodId: panelPeriod?.id,
      });
    }
  } else if (panelPeriod) {
    const panelRecords = filteredRecords;
    const panelScopedBusinessIds = supportedEnterprises
      .filter((enterprise) => matchesSupportedFilters(enterprise, resolvedFilters))
      .map((enterprise) => enterprise.businessId);
    const activeBaselineRows = panelScopedBusinessIds.length
      ? await db.query.melEnterpriseFinancialBaselines.findMany({
          where: and(
            eq(melEnterpriseFinancialBaselines.status, "active"),
            inArray(melEnterpriseFinancialBaselines.businessId, panelScopedBusinessIds)
          ),
        })
      : [];
    const activeBaselinesByBusinessId = new Map(
      activeBaselineRows
        .filter((row): row is typeof row & { businessId: number } => row.businessId !== null)
        .map((row) => [
          row.businessId,
          {
            businessId: row.businessId,
            monthlyRevenue: row.monthlyRevenue,
            monthlyCosts: row.monthlyCosts,
            monthlyProfit: row.monthlyProfit,
          },
        ])
    );
    panelAnalysis = buildPanelAnalysis({
      records: panelRecords,
      monitoringPeriodId: panelPeriod.id,
      monitoringPeriodLabel: panelPeriod.label,
      monitoringPeriodCode: panelPeriod.code,
      monitoringPeriods: panelMonitoringPeriods.map((period) => ({
        id: period.id,
        code: period.code,
        label: period.label,
      })),
      activeBaselinesByBusinessId,
      panelBusinessId: resolvedFilters.panelBusinessId ?? null,
    });
  }

  return {
    filters: resolvedFilters,
    selectedPeriod,
    periods,
    filterOptions,
    ittRows,
    indicatorVisualizations,
    profitabilityTrend,
    financialMeasureTrend,
    approvedRecords: filteredRecords,
    programmeResults: approvedProgrammeResults,
    summary: {
      reportingEnterprises: reportingEnterpriseCount,
      eligibleEnterprises: eligibleEnterpriseCount,
      reportingCompleteness: eligibleEnterpriseCount
        ? (reportingEnterpriseCount / eligibleEnterpriseCount) * 100
        : null,
      monthlyMedianRevenue,
      monthlyMedianRevenueBaseline,
      monthlyMedianRevenueChange,
      monthlyMedianRevenueChangePercent,
      monthlyMedianRevenueBaselineLabel,
      monthlyMedianCosts: monthlyMedian(latestApprovedWithFinancials, (record) => record.costs),
      monthlyMedianProfit: monthlyMedian(latestApprovedWithFinancials, (record) => record.profitLoss),
      jobs: sum(filteredRecords, (record) => record.directJobs.total + record.indirectJobs.total),
      directJobs: sum(filteredRecords, (record) => record.directJobs.total),
      directQualityJobs: sum(filteredRecords, (record) => record.directQualityJobs.total),
      directNonQualityJobs: sum(filteredRecords, (record) => record.directNonQualityJobs.total),
      indirectJobs: sum(filteredRecords, (record) => record.indirectJobs.total),
      jobDisaggregation: {
        male: cumulativeJobs.male,
        female: cumulativeJobs.female,
        youth: cumulativeJobs.youth,
        plwd: cumulativeJobs.plwd,
        refugee: cumulativeJobs.refugee,
      },
      financeAccessed,
      externalFinanceAccessed,
      externalFinanceTarget: EXTERNAL_FUNDING_TARGET_KES,
      externalFinanceAchievement: externalFinanceAchievement(externalFinanceAccessed),
      greenResults: ittRows.filter((row) => row.calculation.trafficLight === "green").length,
      amberResults: ittRows.filter((row) => row.calculation.trafficLight === "amber").length,
      redResults: ittRows.filter((row) => row.calculation.trafficLight === "red").length,
    },
    financeBreakdown,
    financialPerformance,
    trends,
    quality: {
      expectedReports,
      approvedReports: filteredRecords.length,
      lateOrCatchUp: scopedAllSubmissions.filter((submission) => submission.sourceMode === "catch_up").length,
      returnedReports: scopedAllSubmissions.filter((submission) => ["returned", "returned_by_redo", "returned_by_mel"].includes(submission.status)).length,
      unresolvedDqaIssues: scopedDqaIssues.filter((issue) => issue.status === "open").length,
      activeEvidence: activeEvidence.length,
      verifiedEvidence: activeEvidence.filter((item) => verifiedEvidenceIds.has(item.id)).length,
      enterprisesWithoutVerifiedGps: [...latestSubmissionsByBusiness.values()].filter(
        (submission) => submission.business.kycProfile?.status !== "verified" || !submission.business.kycProfile.gpsCoordinates
      ).length,
      ...cohortQuality,
    },
    feedbackAccountability: {
      responseCount: latestPeriodRecords.length,
      positiveEffects: feedbackWordClouds.positiveEffects,
      enterpriseChallenges: feedbackWordClouds.enterpriseChallenges,
      supportNeeded: feedbackWordClouds.supportNeeded,
      negativeEffects: feedbackWordClouds.negativeEffects,
    },
    wasteReporting,
    panelAnalysis,
  };
}

type ApprovedSubmissionForRecord = {
  id: number;
  businessId: number;
  reportingPeriodId: number;
  visitDate: string | Date | null;
  approvedAt: (typeof melMonitoringSubmissions.$inferSelect)["approvedAt"] | string | null;
  response: {
    revenue: string | number | null;
    costs: string | number | null;
    profitLoss: string | number | null;
    financialChangeExplanation: string | null;
    financialBaselineSnapshot: Record<string, unknown> | null;
    financialComparisonSnapshot: Record<string, unknown> | null;
    newMarketSegments: number | null;
    businessPlanImproved: boolean | null;
    marketResearchCompleted: boolean | null;
    marketIntelligenceAccessed: boolean | null;
    technologyAdopted: boolean | null;
    newProductsDeveloped: boolean | null;
    linkedToFinanceProvider: boolean | null;
    financeValue: string | number | null;
    financialPlanCompleted: boolean | null;
    activeInsurance: boolean | null;
    investorReadinessCompleted: boolean | null;
    lifeCycleAssessmentCompleted: boolean | null;
    ecoCertificationActive: boolean | null;
    esgReportCompleted: boolean | null;
    socialSafeguardingGuidelines: boolean | null;
    circularGrowthReported: boolean | null;
    circularGrowthValue: string | number | null;
    strategicPartnerships: boolean | null;
    strategicPartnershipCount: number | null;
    strategicPartnershipDetails: string | null;
    forumParticipation: boolean | null;
    forumDetails: string | null;
    publicPrivatePartnership: boolean | null;
    publicPrivatePartnershipDetails: string | null;
    technologyDetails: string | null;
    newProductsDetails: string | null;
    mainChallenges: string | null;
    positiveProgrammeImpacts: string | null;
    negativeProgrammeImpacts: string | null;
    additionalSupportNeeded: string | null;
    collectorComment: string | null;
  } | null;
  financeEntries: Array<{ financeType: string; otherDescription: string | null; amount: string | number | null }>;
  jobs: Array<{ jobType: string; quarterlyTotal: number | null; male: number | null; female: number | null; youth: number | null; plwd: number | null; refugee: number | null }>;
  waste: Array<{ wasteStream: string; kilograms: string | number | null }>;
  business: {
    name: string;
    county: string | null;
    sector: string | null;
    applicant: { gender: string | null; dob: Date | string | null } | null;
    application: { track: string | null } | null;
  };
};

function visitDateToIsoDate(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function timestampToIso(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function mapApprovedSubmissionToRecord(
  submission: ApprovedSubmissionForRecord,
  selectedPeriod: typeof melReportingPeriods.$inferSelect
): ApprovedMonitoringRecord {
  const response = submission.response;
  const directQuality = findMonitoringJob(submission.jobs, MEL_JOB_TYPE.directQuality);
  const directNonQuality = findMonitoringJob(submission.jobs, MEL_JOB_TYPE.directNonQuality);
  const indirect = findMonitoringJob(submission.jobs, MEL_JOB_TYPE.indirect);
  const toJobs = (job: typeof directQuality): JobTotals => job ? {
    total: job.quarterlyTotal ?? 0,
    male: job.male ?? 0,
    female: job.female ?? 0,
    youth: job.youth ?? 0,
    plwd: job.plwd ?? 0,
    refugee: job.refugee ?? 0,
  } : emptyJobs();
  const application = submission.business.application;
  const applicant = submission.business.applicant;
  const ownerDob = applicant?.dob == null
    ? null
    : typeof applicant.dob === "string"
      ? new Date(applicant.dob)
      : applicant.dob;
  return {
    submissionId: submission.id,
    businessId: submission.businessId,
    periodId: submission.reportingPeriodId,
    businessName: submission.business.name,
    visitDate: visitDateToIsoDate(submission.visitDate),
    approvedAt: timestampToIso(submission.approvedAt),
    dimensions: {
      track: application?.track ?? null,
      ownerGender: applicant?.gender ?? null,
      ownerYouth: ownerDob ? ageAt(ownerDob, selectedPeriod.endDate) <= 35 : null,
      ownerPlwd: null,
      county: submission.business.county ?? null,
      sector: submission.business.sector ?? null,
    },
    revenue: numeric(response?.revenue),
    costs: numeric(response?.costs),
    profitLoss: numeric(response?.profitLoss),
    financialChangeExplanation: response?.financialChangeExplanation ?? null,
    financialBaselineSnapshot: response?.financialBaselineSnapshot ?? null,
    financialComparisonSnapshot: response?.financialComparisonSnapshot ?? null,
    newMarketSegments: response?.newMarketSegments ?? null,
    businessPlanImproved: response?.businessPlanImproved ?? null,
    marketResearchCompleted: response?.marketResearchCompleted ?? null,
    marketIntelligenceAccessed: response?.marketIntelligenceAccessed ?? null,
    technologyAdopted: response?.technologyAdopted ?? null,
    newProductsDeveloped: response?.newProductsDeveloped ?? null,
    linkedToFinanceProvider: response?.linkedToFinanceProvider ?? null,
    financeValue: response?.linkedToFinanceProvider === true
      ? submission.financeEntries.length > 0
        ? sum(submission.financeEntries, (entry) => numeric(entry.amount) ?? 0)
        : numeric(response?.financeValue)
      : null,
    financeEntries: response?.linkedToFinanceProvider === true
      ? submission.financeEntries.map((entry) => ({
          financeType: entry.financeType,
          otherDescription: entry.otherDescription,
          amount: numeric(entry.amount) ?? 0,
        }))
      : [],
    financialPlanCompleted: response?.financialPlanCompleted ?? null,
    activeInsurance: response?.activeInsurance ?? null,
    investorReadinessCompleted: response?.investorReadinessCompleted ?? null,
    lifeCycleAssessmentCompleted: response?.lifeCycleAssessmentCompleted ?? null,
    ecoCertificationActive: response?.ecoCertificationActive ?? null,
    esgReportCompleted: response?.esgReportCompleted ?? null,
    socialSafeguardingGuidelines: response?.socialSafeguardingGuidelines ?? null,
    circularGrowthReported: response?.circularGrowthReported ?? null,
    circularGrowthValue: numeric(response?.circularGrowthValue),
    strategicPartnerships: response?.strategicPartnerships ?? null,
    strategicPartnershipCount: response?.strategicPartnershipCount ?? null,
    strategicPartnershipDetails: response?.strategicPartnershipDetails ?? null,
    forumParticipation: response?.forumParticipation ?? null,
    forumDetails: response?.forumDetails ?? null,
    publicPrivatePartnership: response?.publicPrivatePartnership ?? null,
    publicPrivatePartnershipDetails: response?.publicPrivatePartnershipDetails ?? null,
    technologyDetails: response?.technologyDetails ?? null,
    newProductsDetails: response?.newProductsDetails ?? null,
    mainChallenges: response?.mainChallenges ?? null,
    positiveProgrammeImpacts: response?.positiveProgrammeImpacts ?? null,
    negativeProgrammeImpacts: response?.negativeProgrammeImpacts ?? null,
    additionalSupportNeeded: response?.additionalSupportNeeded ?? null,
    collectorComment: response?.collectorComment ?? null,
    directQualityJobs: toJobs(directQuality),
    directNonQualityJobs: toJobs(directNonQuality),
    directJobs: mergeJobTotals(toJobs(directQuality), toJobs(directNonQuality)),
    indirectJobs: toJobs(indirect),
    waste: submission.business.sector === "waste_management"
      ? submission.waste.map((item) => ({ stream: item.wasteStream, kilograms: numeric(item.kilograms) ?? 0 }))
      : [],
  };
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function matchesSupportedFilters(enterprise: SupportedEnterprise, filters: MelDashboardFilters): boolean {
  if (filters.track && enterprise.track !== filters.track) return false;
  if (filters.county && enterprise.county !== filters.county) return false;
  if (filters.sector && enterprise.sector !== filters.sector) return false;
  return matchesOwnerDemographicFilter({
    ownerGender: enterprise.ownerGender,
    ownerYouth: enterprise.ownerYouth,
    filter: filters.ownerGender,
  });
}

function wasteStreamKilograms(record: ApprovedMonitoringRecord, stream: string): number | null {
  if (record.dimensions.sector !== "waste_management") return null;
  const item = record.waste.find((entry) => entry.stream === stream);
  return item ? item.kilograms : 0;
}

function earliestRecords(
  records: ApprovedMonitoringRecord[],
  periodOrder: Map<number, number>
): ApprovedMonitoringRecord[] {
  const byBusiness = new Map<number, ApprovedMonitoringRecord>();
  for (const record of records) {
    const current = byBusiness.get(record.businessId);
    if (!current) {
      byBusiness.set(record.businessId, record);
      continue;
    }
    const currentOrder = periodOrder.get(current.periodId) ?? Number.POSITIVE_INFINITY;
    const nextOrder = periodOrder.get(record.periodId) ?? Number.POSITIVE_INFINITY;
    if (nextOrder < currentOrder) byBusiness.set(record.businessId, record);
  }
  return [...byBusiness.values()];
}

function buildWasteReportingSummary(
  records: ApprovedMonitoringRecord[],
  definition:
    | (typeof melIndicatorDefinitions.$inferSelect & {
        baselines: Array<typeof melIndicatorBaselines.$inferSelect>;
        targets: Array<typeof melIndicatorTargets.$inferSelect>;
      })
    | undefined,
  selectedPeriod: typeof melReportingPeriods.$inferSelect,
  thresholds: { green: number; red: number },
  periodOrder: Map<number, number>
): MelWasteReportingSummary {
  const wasteRecords = records.filter((record) => record.dimensions.sector === "waste_management");
  const latestPeriodRecords = latestRecords(
    wasteRecords.filter((record) => record.periodId === selectedPeriod.id)
  );
  const baselinePeriodRecords = earliestRecords(wasteRecords, periodOrder);
  const reportingEnterprises = latestPeriodRecords.filter((record) =>
    record.waste.some((item) => item.kilograms > 0)
  ).length;

  const byStream = WASTE_STREAMS.map((stream) => {
    const baselineMonthlyMedianKilograms = monthlyMedian(baselinePeriodRecords, (record) =>
      wasteStreamKilograms(record, stream)
    );
    const actualMonthlyKilograms = monthlyCollectedTotal(latestPeriodRecords, (record) =>
      wasteStreamKilograms(record, stream)
    );
    const changePercent =
      baselineMonthlyMedianKilograms === null ||
      actualMonthlyKilograms === null ||
      baselineMonthlyMedianKilograms === 0
        ? null
        : safePercentage(
            actualMonthlyKilograms - baselineMonthlyMedianKilograms,
            baselineMonthlyMedianKilograms
          );
    return {
      stream,
      label: stream.replaceAll("_", " "),
      baselineMonthlyMedianKilograms,
      actualMonthlyKilograms,
      changePercent,
    };
  });

  const totalBaselineKilograms = byStream.reduce(
    (sum, row) => sum + (row.baselineMonthlyMedianKilograms ?? 0),
    0
  );
  const totalActualMonthlyKilograms = byStream.reduce(
    (sum, row) => sum + (row.actualMonthlyKilograms ?? 0),
    0
  );
  const totalChangePercent =
    totalBaselineKilograms > 0
      ? safePercentage(
          totalActualMonthlyKilograms - totalBaselineKilograms,
          totalBaselineKilograms
        )
      : null;
  const trafficLight =
    totalChangePercent === null
      ? null
      : totalChangePercent >= thresholds.green
        ? "green"
        : totalChangePercent >= thresholds.red
          ? "amber"
          : "red";

  return {
    indicatorId: definition?.id ?? null,
    reportingEnterprises,
    totalBaselineKilograms,
    totalActualMonthlyKilograms,
    totalChangePercent,
    trafficLight,
    byStream,
  };
}

function isMissingRelation(error: unknown, tableName: string) {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  const message = parts.join("\n");
  return (
    message.includes(tableName) &&
    (message.includes("does not exist") ||
      message.includes("42P01") ||
      // Drizzle often surfaces only the failed SQL when the relation is missing.
      message.includes("Failed query"))
  );
}

async function safeKajabiMappings() {
  try {
    return await db
      .select({
        userId: kajabiUserMapping.userId,
        externalId: kajabiUserMapping.kajabiExternalId,
      })
      .from(kajabiUserMapping)
      .where(eq(kajabiUserMapping.hasActiveAccess, true));
  } catch (error) {
    if (isMissingRelation(error, "kajabi_user_mapping")) return [];
    throw error;
  }
}

async function safeKajabiEvents() {
  try {
    return await db
      .select({
        id: kajabiProgressWebhooks.id,
        externalId: kajabiProgressWebhooks.kajabiExternalId,
        eventTitle: kajabiProgressWebhooks.eventTitle,
        occurredAt: kajabiProgressWebhooks.processedAt,
      })
      .from(kajabiProgressWebhooks);
  } catch (error) {
    if (isMissingRelation(error, "kajabi_progress_webhooks")) return [];
    throw error;
  }
}

function sum<T>(values: T[], selector: (value: T) => number): number {
  return values.reduce((total, value) => total + selector(value), 0);
}

function latestRecords(records: ApprovedMonitoringRecord[]): ApprovedMonitoringRecord[] {
  const byBusiness = new Map<number, ApprovedMonitoringRecord>();
  for (const record of records) {
    const current = byBusiness.get(record.businessId);
    if (!current || record.periodId > current.periodId) byBusiness.set(record.businessId, record);
  }
  return [...byBusiness.values()];
}

function monthlyMedian<T>(values: T[], selector: (value: T) => number | null): number | null {
  const quarterlyValues = values.flatMap((value) => {
    const selected = selector(value);
    return selected === null ? [] : [selected];
  });
  const quarterlyMedian = median(quarterlyValues);
  return quarterlyMedian === null ? null : quarterlyMedian / 3;
}

/** Sum of quarterly collected values for the period, converted to monthly (÷ 3). */
function monthlyCollectedTotal<T>(values: T[], selector: (value: T) => number | null): number | null {
  const monthlyValues = values.flatMap((value) => {
    const selected = selector(value);
    return selected === null ? [] : [selected / 3];
  });
  if (monthlyValues.length === 0) return null;
  return monthlyValues.reduce((sum, kg) => sum + kg, 0);
}

function periodMedians(
  records: ApprovedMonitoringRecord[],
  periods: Array<{ id: number; label: string }>
): MelFinancialMeasureTrendPeriod[] {
  return periods.map((period) => {
    const periodRecords = withReportedFinancialActivity(records.filter((record) => record.periodId === period.id));
    return {
      periodId: period.id,
      periodLabel: period.label,
      revenue: monthlyMedian(periodRecords, (record) => record.revenue),
      costs: monthlyMedian(periodRecords, (record) => record.costs),
      profit: monthlyMedian(periodRecords, (record) => record.profitLoss),
    };
  });
}

function difference(actual: number | null, baseline: number): number | null {
  return actual === null ? null : actual - baseline;
}

function buildFinancialPerformanceRow(
  track: "foundation" | "acceleration" | "all",
  trackRecords: ApprovedMonitoringRecord[],
  baseline: { revenue: number; costs: number; profit: number } | null
) {
  const financialRecords = withReportedFinancialActivity(trackRecords);
  const monthlyMedianRevenue = monthlyMedian(financialRecords, (record) => record.revenue);
  const monthlyMedianCosts = monthlyMedian(financialRecords, (record) => record.costs);
  const monthlyMedianProfit = monthlyMedian(financialRecords, (record) => record.profitLoss);
  const variance = {
    revenue: baseline ? difference(monthlyMedianRevenue, baseline.revenue) : null,
    costs: baseline ? difference(monthlyMedianCosts, baseline.costs) : null,
    profit: baseline ? difference(monthlyMedianProfit, baseline.profit) : null,
  };
  return {
    track,
    enterpriseCount: new Set(trackRecords.map((record) => record.businessId)).size,
    monthlyMedianRevenue,
    monthlyMedianCosts,
    monthlyMedianProfit,
    baseline,
    variance,
    variancePercentage: {
      revenue: variance.revenue === null || !baseline ? null : safePercentage(variance.revenue, baseline.revenue),
      costs: variance.costs === null || !baseline ? null : safePercentage(variance.costs, baseline.costs),
      profit: variance.profit === null || !baseline ? null : safePercentage(variance.profit, baseline.profit),
    },
    ownBaseline: summarizeOwnBaselineProfitability(trackRecords),
  };
}

function distinctSystem(
  rows: Array<{ id: number; businessId: number; occurredAt?: Date | null; createdAt?: Date | null }>,
  eligible: Set<number>,
  through?: Date
) {
  const ids = new Map<number, number>();
  for (const row of rows) {
    const occurredAt = row.occurredAt ?? row.createdAt ?? null;
    if (eligible.has(row.businessId) && (!through || !occurredAt || occurredAt <= through)) ids.set(row.businessId, row.id);
  }
  return { actual: ids.size, sourceIds: [...ids.values()] };
}

function trainingCompletionSystem(
  mappings: Array<{ userId: string; externalId: string }>,
  events: Array<{ id: number; externalId: string; eventTitle: string; occurredAt?: Date | null }>,
  businessUsers: Array<{ businessId: number; userId: string }>,
  eligible: Set<number>,
  through?: Date
) {
  const externalByUser = new Map(mappings.map((mapping) => [mapping.userId, mapping.externalId]));
  const completedEventByExternal = new Map(
    events
      .filter((event) => /complet(?:e|ed|ion)/i.test(event.eventTitle) && (!through || !event.occurredAt || event.occurredAt <= through))
      .map((event) => [event.externalId, event.id])
  );
  const sourceByBusiness = new Map<number, number>();
  for (const business of businessUsers) {
    if (!eligible.has(business.businessId)) continue;
    const externalId = externalByUser.get(business.userId);
    const eventId = externalId ? completedEventByExternal.get(externalId) : null;
    if (eventId) sourceByBusiness.set(business.businessId, eventId);
  }
  return {
    actual: safePercentage(sourceByBusiness.size, eligible.size),
    numerator: sourceByBusiness.size,
    denominator: eligible.size,
    sourceIds: [...sourceByBusiness.values()],
    rule: "Distinct enterprises with a completion event / eligible supported enterprises",
  };
}

function selectBaseline(baselines: Array<typeof melIndicatorBaselines.$inferSelect>, segmentKey: string): number | null {
  return numeric(baselines.find((item) => item.segmentKey === segmentKey)?.value
    ?? baselines.find((item) => item.segmentKey === "overall")?.value);
}

function resolveIndicatorBaseline(
  code: string,
  indicatorBaselines: Array<typeof melIndicatorBaselines.$inferSelect>,
  segmentKey: string,
  monthlyBaselines: ReturnType<typeof resolveMonthlyFinancialBaselines>
): number | null {
  if (code === "LT1-PROFITABILITY-INCREASE") {
    if (segmentKey === "track:foundation") return monthlyBaselines.foundation.revenue;
    if (segmentKey === "track:acceleration") return monthlyBaselines.acceleration.revenue;
    return null;
  }
  return selectBaseline(indicatorBaselines, segmentKey);
}

function selectTarget(
  targets: Array<typeof melIndicatorTargets.$inferSelect>,
  periodId: number,
  programmeYear: number,
  segmentKey: string
): number | null {
  const find = (key: string) => targets.find((item) => item.reportingPeriodId === periodId && item.segmentKey === key)
    ?? targets.find((item) => item.programmeYear === programmeYear && item.reportingPeriodId === null && item.segmentKey === key)
    ?? targets.find((item) => item.programmeYear === 0 && item.reportingPeriodId === null && item.segmentKey === key);
  return numeric(find(segmentKey)?.value ?? find("overall")?.value);
}

function selectTargetExact(
  targets: Array<typeof melIndicatorTargets.$inferSelect>,
  periodId: number,
  programmeYear: number,
  segmentKey: string
): number | null {
  const match = targets.find((item) => item.reportingPeriodId === periodId && item.segmentKey === segmentKey)
    ?? targets.find((item) => item.programmeYear === programmeYear && item.reportingPeriodId === null && item.segmentKey === segmentKey)
    ?? targets.find((item) => item.programmeYear === 0 && item.reportingPeriodId === null && item.segmentKey === segmentKey);
  return numeric(match?.value);
}

function buildTargetBreakdown(
  code: string,
  targets: Array<typeof melIndicatorTargets.$inferSelect>,
  periodId: number,
  programmeYear: number
): Array<{ label: string; value: number }> {
  if (code === "IM-JOBS-CREATED") {
    const total = selectTargetExact(targets, periodId, programmeYear, "overall");
    const direct = selectTargetExact(targets, periodId, programmeYear, "job_type:direct");
    const indirect = selectTargetExact(targets, periodId, programmeYear, "job_type:indirect");
    const rows: Array<{ label: string; value: number }> = [];
    if (total !== null) rows.push({ label: "Total", value: total });
    if (direct !== null) rows.push({ label: "Direct", value: direct });
    if (indirect !== null) rows.push({ label: "Indirect", value: indirect });
    return rows.length > 1 ? rows : [];
  }

  if (isOp11CountIndicator(code)) {
    const overall = targets.find((item) => item.programmeYear === 0 && item.reportingPeriodId === null && item.segmentKey === "overall");
    const year1 = targets.find((item) => item.programmeYear === 1 && item.reportingPeriodId === null && item.segmentKey === "overall");
    const year2 = targets.find((item) => item.programmeYear === 2 && item.reportingPeriodId === null && item.segmentKey === "overall");
    const year3 = targets.find((item) => item.programmeYear === 3 && item.reportingPeriodId === null && item.segmentKey === "overall");
    const rows: Array<{ label: string; value: number }> = [];
    const overallValue = numeric(overall?.value);
    const y1 = numeric(year1?.value);
    const y2 = numeric(year2?.value);
    const y3 = numeric(year3?.value);
    if (overallValue !== null) rows.push({ label: "Total", value: overallValue });
    if (y1 !== null) rows.push({ label: "Y1", value: y1 });
    if (y2 !== null) rows.push({ label: "Y2", value: y2 });
    if (y3 !== null && y3 > 0) rows.push({ label: "Y3", value: y3 });
    return rows.length > 1 ? rows : [];
  }

  return [];
}
