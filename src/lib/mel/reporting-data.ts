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
import { cumulativePlannedCohort } from "./cohort-denominator";
import { buildFeedbackWordClouds, type WordCloudTerm } from "./feedback-word-cloud";
import {
  isOp11CountIndicator,
  isOp11VisualizationProgrammeWide,
  isY1PreDeliveryPeriod,
  MEL_OP11_YEAR1_ACTUALS,
  resolveOp11Actual,
} from "./programme-calendar";
import { buildFundingTypeBreakdown, type FundingTypeBreakdown } from "./reporting-finance";
import { indicatorGroup, type MelIndicatorGroup } from "./reporting-visualizations";
export type { MelIndicatorGroup } from "./reporting-visualizations";
export type { WordCloudTerm } from "./feedback-word-cloud";

export type MelDashboardFilters = {
  periodId?: number | null;
  track?: string | null;
  county?: string | null;
  sector?: string | null;
  ownerGender?: string | null;
};

export function dashboardResultSegmentKey(filters: MelDashboardFilters): string {
  const parts = [
    filters.track ? `track:${filters.track}` : null,
    filters.county ? `county:${filters.county}` : null,
    filters.sector ? `sector:${filters.sector}` : null,
    filters.ownerGender ? `owner_gender:${filters.ownerGender}` : null,
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
export type MelIndicatorTrendPoint = MelIndicatorSeriesValues & {
  periodId: number;
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
  county: string | null;
  sector: string | null;
  selectedAt: Date;
};

type PeriodAchievement = ApprovedEnterpriseAchievementInput & { periodId: number };

export type MelReportingDataset = {
  filters: Required<Pick<MelDashboardFilters, "periodId">> & Omit<MelDashboardFilters, "periodId">;
  selectedPeriod: typeof melReportingPeriods.$inferSelect;
  periods: Array<typeof melReportingPeriods.$inferSelect>;
  filterOptions: { tracks: string[]; counties: string[]; sectors: string[]; ownerGenders: string[] };
  ittRows: MelIttRow[];
  indicatorVisualizations: MelIndicatorVisualization[];
  profitabilityTrend: MelProfitabilityTrendPoint[];
  approvedRecords: ApprovedMonitoringRecord[];
  programmeResults: ProgrammeResultInput[];
  summary: {
    reportingEnterprises: number;
    eligibleEnterprises: number;
    reportingCompleteness: number | null;
    monthlyMedianRevenue: number | null;
    monthlyMedianCosts: number | null;
    monthlyMedianProfit: number | null;
    jobs: number;
    directJobs: number;
    indirectJobs: number;
    financeAccessed: number;
    greenResults: number;
    amberResults: number;
    redResults: number;
  };
  financeBreakdown: FundingTypeBreakdown[];
  financialPerformance: Array<{
    track: "foundation" | "acceleration";
    enterpriseCount: number;
    monthlyMedianRevenue: number | null;
    monthlyMedianCosts: number | null;
    monthlyMedianProfit: number | null;
    baseline: { revenue: number; costs: number; profit: number };
    variance: { revenue: number | null; costs: number | null; profit: number | null };
    variancePercentage: { revenue: number | null; costs: number | null; profit: number | null };
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
  };
  feedbackAccountability: {
    responseCount: number;
    enterpriseChallenges: WordCloudTerm[];
    supportNeeded: WordCloudTerm[];
    negativeEffects: WordCloudTerm[];
  };
};

const emptyJobs = (): JobTotals => ({ total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 });
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

function buildHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function matchesDashboardFilters(record: ApprovedMonitoringRecord, filters: MelDashboardFilters): boolean {
  if (filters.track && record.dimensions.track !== filters.track) return false;
  if (filters.county && record.dimensions.county !== filters.county) return false;
  if (filters.sector && record.dimensions.sector !== filters.sector) return false;
  if (filters.ownerGender && record.dimensions.ownerGender !== filters.ownerGender) return false;
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
  const resolvedFilters = {
    periodId: selectedPeriod.id,
    track: filters.track ?? null,
    county: filters.county ?? null,
    sector: filters.sector ?? null,
    ownerGender: filters.ownerGender ?? null,
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
    if (filters.track && submission.business.application?.track !== filters.track) return false;
    if (filters.county && submission.business.county !== filters.county) return false;
    if (filters.sector && submission.business.sector !== filters.sector) return false;
    if (filters.ownerGender && submission.business.applicant?.gender !== filters.ownerGender) return false;
    return true;
  });
  const includedSubmissionIds = new Set(scopedAllSubmissions.map((submission) => submission.id));
  const submissionIdFilter = includedSubmissionIds.size ? [...includedSubmissionIds] : [-1];
  const [scopedDqaIssues, evidence, evidenceReviews] = await Promise.all([
    db.select().from(melDqaIssues).where(inArray(melDqaIssues.submissionId, submissionIdFilter)),
    db.select().from(melMonitoringEvidence).where(inArray(melMonitoringEvidence.submissionId, submissionIdFilter)),
    db.select().from(melEvidenceReviews),
  ]);

  const records: ApprovedMonitoringRecord[] = submissions.map((submission) => {
    const response = submission.response;
    const direct = submission.jobs.find((job) => job.jobType === "direct");
    const indirect = submission.jobs.find((job) => job.jobType === "indirect");
    const toJobs = (job: typeof direct): JobTotals => job ? {
      total: job.quarterlyTotal ?? 0,
      male: job.male ?? 0,
      female: job.female ?? 0,
      youth: job.youth ?? 0,
      plwd: job.plwd ?? 0,
      refugee: job.refugee ?? 0,
    } : emptyJobs();
    const application = submission.business.application;
    const applicant = submission.business.applicant;
    return {
      submissionId: submission.id,
      businessId: submission.businessId,
      periodId: submission.reportingPeriodId,
      dimensions: {
        track: application?.track ?? null,
        ownerGender: applicant?.gender ?? null,
        ownerYouth: applicant?.dob ? ageAt(applicant.dob, selectedPeriod.endDate) <= 35 : null,
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
      financeValue: submission.financeEntries.length > 0
        ? sum(submission.financeEntries, (entry) => numeric(entry.amount) ?? 0)
        : numeric(response?.financeValue),
      financeEntries: submission.financeEntries.map((entry) => ({
        financeType: entry.financeType,
        otherDescription: entry.otherDescription,
        amount: numeric(entry.amount) ?? 0,
      })),
      financialPlanCompleted: response?.financialPlanCompleted ?? null,
      activeInsurance: response?.activeInsurance ?? null,
      investorReadinessCompleted: response?.investorReadinessCompleted ?? null,
      lifeCycleAssessmentCompleted: response?.lifeCycleAssessmentCompleted ?? null,
      ecoCertificationActive: response?.ecoCertificationActive ?? null,
      esgReportCompleted: response?.esgReportCompleted ?? null,
      socialSafeguardingGuidelines: response?.socialSafeguardingGuidelines ?? null,
      circularGrowthReported: response?.circularGrowthReported ?? null,
      strategicPartnerships: response?.strategicPartnerships ?? null,
      directJobs: toJobs(direct),
      indirectJobs: toJobs(indirect),
      waste: submission.business.sector === "waste_management"
        ? submission.waste.map((item) => ({ stream: item.wasteStream, kilograms: numeric(item.kilograms) ?? 0 }))
        : [],
    };
  });

  const filterOptions = {
    tracks: unique(records.map((record) => record.dimensions.track)),
    counties: unique(records.map((record) => record.dimensions.county)),
    sectors: unique(records.map((record) => record.dimensions.sector)),
    ownerGenders: unique(records.map((record) => record.dimensions.ownerGender)),
  };
  const filteredRecords = records.filter((record) => matchesDashboardFilters(record, filters));
  const financeBreakdown = buildFundingTypeBreakdown(filteredRecords);
  const financeAccessed = sum(financeBreakdown, (item) => item.amount);
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

  const ittRows: MelIttRow[] = definitions.map((definition) => {
    const definitionTargetKey = definition.sourceType === "programme_mel_entry" ? "overall" : targetSegmentKey;
    const baseline = selectBaseline(definition.baselines, definitionTargetKey);
    const target = selectTarget(definition.targets, selectedPeriod.id, selectedPeriod.programmeYear, definitionTargetKey);
    const targetBreakdown = buildTargetBreakdown(
      definition.code,
      definition.targets,
      selectedPeriod.id,
      selectedPeriod.programmeYear
    );
    const segmentKey = definition.sourceType === "programme_mel_entry" ? "overall" : filters.track ? `track:${filters.track}` : "overall";
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

  const trends = includedPeriods.map((period) => {
    const periodRecords = filteredRecords.filter((record) => record.periodId === period.id);
    return {
      periodId: period.id,
      periodLabel: period.label,
      revenue: monthlyMedian(periodRecords, (record) => record.revenue),
      profit: monthlyMedian(periodRecords, (record) => record.profitLoss),
      jobs: sum(periodRecords, (record) => record.directJobs.total + record.indirectJobs.total),
      enterprises: new Set(periodRecords.map((record) => record.businessId)).size,
    };
  });
  const latestPeriodRecords = filteredRecords.filter((record) => record.periodId === selectedPeriod.id);
  const baselines = settings?.monthlyFinancialBaselines ?? {
    foundation: { revenue: 200000, costs: 124221, profit: 50000 },
    acceleration: { revenue: 692600, costs: 490500, profit: 150000 },
  };
  const financialTracks = (filters.track
    ? [filters.track]
    : ["foundation", "acceleration"]
  ).filter((track): track is "foundation" | "acceleration" => track === "foundation" || track === "acceleration");
  const financialPerformance = financialTracks.map((track) => {
    const trackRecords = latestRecords(filteredRecords.filter((record) => record.dimensions.track === track));
    const monthlyMedianRevenue = monthlyMedian(trackRecords, (record) => record.revenue);
    const monthlyMedianCosts = monthlyMedian(trackRecords, (record) => record.costs);
    const monthlyMedianProfit = monthlyMedian(trackRecords, (record) => record.profitLoss);
    const baseline = baselines[track];
    const variance = {
      revenue: difference(monthlyMedianRevenue, baseline.revenue),
      costs: difference(monthlyMedianCosts, baseline.costs),
      profit: difference(monthlyMedianProfit, baseline.profit),
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
        revenue: variance.revenue === null ? null : safePercentage(variance.revenue, baseline.revenue),
        costs: variance.costs === null ? null : safePercentage(variance.costs, baseline.costs),
        profit: variance.profit === null ? null : safePercentage(variance.profit, baseline.profit),
      },
    };
  });

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
      baseline: selectBaseline(definition.baselines, targetKey),
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
      trend: points.map((point) => ({
        periodId: point.period.id,
        periodLabel: isOp11CountIndicator(definition.code) && isY1PreDeliveryPeriod(point.period)
          ? `${point.period.label} · Official Y1 achievement`
          : point.period.label,
        overall: point.overall.actual,
        foundation: point.foundation?.actual ?? null,
        acceleration: point.acceleration?.actual ?? null,
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
  ) ?? []).map((point) => ({
    periodId: point.period.id,
    periodLabel: point.period.label,
    foundation: point.foundation?.numerator ?? (filters.track === "foundation" ? point.overall.numerator : null),
    foundationBaseline: numeric(settings?.monthlyFinancialBaselines?.foundation.profit) ?? 50000,
    acceleration: point.acceleration?.numerator ?? (filters.track === "acceleration" ? point.overall.numerator : null),
    accelerationBaseline: numeric(settings?.monthlyFinancialBaselines?.acceleration.profit) ?? 150000,
  }));
  const eligibleEnterpriseCount = new Set(scopedAllSubmissions.map((submission) => submission.businessId)).size;
  const expectedReports = eligibleEnterpriseCount * includedPeriods.length;
  const activeEvidence = evidence.filter((item) => item.status === "active" && includedSubmissionIds.has(item.submissionId));
  const verifiedEvidenceIds = new Set(evidenceReviews.filter((review) => review.status === "verified").map((review) => review.evidenceId));
  const latestSubmissionsByBusiness = new Map<number, (typeof allSubmissions)[number]>();
  for (const submission of scopedAllSubmissions) latestSubmissionsByBusiness.set(submission.businessId, submission);

  const submissionById = new Map(submissions.map((submission) => [submission.id, submission]));
  const latestPeriodResponses = latestPeriodRecords
    .map((record) => submissionById.get(record.submissionId)?.response)
    .filter((response): response is NonNullable<typeof response> => Boolean(response));
  const feedbackWordClouds = buildFeedbackWordClouds({
    mainChallenges: latestPeriodResponses.map((response) => response.mainChallenges ?? ""),
    additionalSupportNeeded: latestPeriodResponses.map((response) => response.additionalSupportNeeded ?? ""),
    negativeProgrammeImpacts: latestPeriodResponses.map((response) => response.negativeProgrammeImpacts ?? ""),
  });

  return {
    filters: resolvedFilters,
    selectedPeriod,
    periods,
    filterOptions,
    ittRows,
    indicatorVisualizations,
    profitabilityTrend,
    approvedRecords: filteredRecords,
    programmeResults: approvedProgrammeResults,
    summary: {
      reportingEnterprises: new Set(latestPeriodRecords.map((record) => record.businessId)).size,
      eligibleEnterprises: eligibleEnterpriseCount,
      reportingCompleteness: eligibleEnterpriseCount ? (new Set(latestPeriodRecords.map((record) => record.businessId)).size / eligibleEnterpriseCount) * 100 : null,
      monthlyMedianRevenue: monthlyMedian(latestPeriodRecords, (record) => record.revenue),
      monthlyMedianCosts: monthlyMedian(latestPeriodRecords, (record) => record.costs),
      monthlyMedianProfit: monthlyMedian(latestPeriodRecords, (record) => record.profitLoss),
      jobs: sum(filteredRecords, (record) => record.directJobs.total + record.indirectJobs.total),
      directJobs: sum(filteredRecords, (record) => record.directJobs.total),
      indirectJobs: sum(filteredRecords, (record) => record.indirectJobs.total),
      financeAccessed,
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
    },
    feedbackAccountability: {
      responseCount: latestPeriodRecords.length,
      enterpriseChallenges: feedbackWordClouds.enterpriseChallenges,
      supportNeeded: feedbackWordClouds.supportNeeded,
      negativeEffects: feedbackWordClouds.negativeEffects,
    },
  };
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function matchesSupportedFilters(enterprise: SupportedEnterprise, filters: MelDashboardFilters): boolean {
  if (filters.track && enterprise.track !== filters.track) return false;
  if (filters.county && enterprise.county !== filters.county) return false;
  if (filters.sector && enterprise.sector !== filters.sector) return false;
  if (filters.ownerGender && enterprise.ownerGender !== filters.ownerGender) return false;
  return true;
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

function difference(actual: number | null, baseline: number): number | null {
  return actual === null ? null : actual - baseline;
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
