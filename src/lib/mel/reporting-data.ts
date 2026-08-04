import { createHash } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import db from "@/db/drizzle";
import {
  applications,
  capacityDevelopmentPlans,
  cnaAssessments,
  melDqaIssues,
  melEvidenceReviews,
  melIndicatorBaselines,
  melIndicatorDefinitions,
  melIndicatorResults,
  melIndicatorTargets,
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
  type IndicatorCalculation,
  type JobTotals,
  type ProgrammeResultInput,
} from "./indicator-engine";

export type MelDashboardFilters = {
  periodId?: number | null;
  track?: string | null;
  county?: string | null;
  sector?: string | null;
};

export function dashboardResultSegmentKey(filters: MelDashboardFilters): string {
  const parts = [
    filters.track ? `track:${filters.track}` : null,
    filters.county ? `county:${filters.county}` : null,
    filters.sector ? `sector:${filters.sector}` : null,
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
  indicatorVersion: number;
  calculatedAt: Date | null;
  calculation: IndicatorCalculation;
  calculationHash: string;
};

export type MelReportingDataset = {
  filters: Required<Pick<MelDashboardFilters, "periodId">> & Omit<MelDashboardFilters, "periodId">;
  selectedPeriod: typeof melReportingPeriods.$inferSelect;
  periods: Array<typeof melReportingPeriods.$inferSelect>;
  filterOptions: { tracks: string[]; counties: string[]; sectors: string[] };
  ittRows: MelIttRow[];
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
  };

  const includedPeriods = periods.filter(
    (period) => period.programmeYear < selectedPeriod.programmeYear
      || (period.programmeYear === selectedPeriod.programmeYear && period.sequence <= selectedPeriod.sequence)
  );
  const includedPeriodIds = includedPeriods.map((period) => period.id);

  const [settings, definitions, submissions, programmeRows, materialized, allSubmissions, systemApplications, systemCna, systemCdp, trainingMappings, trainingEvents] = await Promise.all([
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
    db.select({ id: applications.id, businessId: applications.businessId }).from(applications),
    db.select({ id: cnaAssessments.id, businessId: cnaAssessments.businessId }).from(cnaAssessments).where(eq(cnaAssessments.status, "locked")),
    db.select({ id: capacityDevelopmentPlans.id, businessId: capacityDevelopmentPlans.businessId }).from(capacityDevelopmentPlans).where(eq(capacityDevelopmentPlans.status, "active")),
    safeKajabiMappings(),
    safeKajabiEvents(),
  ]);

  const scopedAllSubmissions = allSubmissions.filter((submission) => {
    if (filters.track && submission.business.application?.track !== filters.track) return false;
    if (filters.county && submission.business.county !== filters.county) return false;
    if (filters.sector && submission.business.sector !== filters.sector) return false;
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
  };
  const filteredRecords = records.filter((record) => matchesDashboardFilters(record, filters));
  const eligibleBusinessIds = new Set(filteredRecords.map((record) => record.businessId));
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
  const materializedSegmentKey = dashboardResultSegmentKey(filters);
  const targetSegmentKey = materializedSegmentKey.includes("|") || materializedSegmentKey.startsWith("filters:")
    ? "overall"
    : materializedSegmentKey;

  const systemActuals: Record<string, { actual: number | null; sourceIds: number[]; numerator?: number | null; denominator?: number | null; rule?: string }> = {
    "OP1.1-ENTERPRISES-MOBILISED": distinctSystem(systemApplications, eligibleBusinessIds),
    "OP1.1-CNA-COMPLETED": distinctSystem(systemCna, eligibleBusinessIds),
    "OP1.1-CDP-IMPLEMENTED": distinctSystem(systemCdp, eligibleBusinessIds),
    "OP1.2-TRAINING-COMPLETION": trainingCompletionSystem(
      trainingMappings,
      trainingEvents,
      submissions.map((submission) => ({ businessId: submission.businessId, userId: submission.business.applicant.userId })),
      eligibleBusinessIds
    ),
  };

  const ittRows: MelIttRow[] = definitions.map((definition) => {
    const baseline = selectBaseline(definition.baselines, targetSegmentKey);
    const target = selectTarget(definition.targets, selectedPeriod.id, selectedPeriod.programmeYear, targetSegmentKey);
    const calculation = calculateIndicator({
      definition: {
        code: definition.code,
        aggregation: definition.aggregation,
        lowerIsBetter: definition.lowerIsBetter,
        version: definition.version,
      },
      records: filteredRecords,
      programmeResults: approvedProgrammeResults,
      baseline,
      target,
      systemActual: systemActuals[definition.code] ?? null,
      segmentKey: filters.track ? `track:${filters.track}` : "overall",
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
    const trackRecords = latestPeriodRecords.filter((record) => record.dimensions.track === track);
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
  const eligibleEnterpriseCount = new Set(scopedAllSubmissions.map((submission) => submission.businessId)).size;
  const expectedReports = eligibleEnterpriseCount * includedPeriods.length;
  const activeEvidence = evidence.filter((item) => item.status === "active" && includedSubmissionIds.has(item.submissionId));
  const verifiedEvidenceIds = new Set(evidenceReviews.filter((review) => review.status === "verified").map((review) => review.evidenceId));
  const latestSubmissionsByBusiness = new Map<number, (typeof allSubmissions)[number]>();
  for (const submission of scopedAllSubmissions) latestSubmissionsByBusiness.set(submission.businessId, submission);

  return {
    filters: resolvedFilters,
    selectedPeriod,
    periods,
    filterOptions,
    ittRows,
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
      financeAccessed: sum(filteredRecords, (record) => record.financeValue ?? 0),
      greenResults: ittRows.filter((row) => row.calculation.trafficLight === "green").length,
      amberResults: ittRows.filter((row) => row.calculation.trafficLight === "amber").length,
      redResults: ittRows.filter((row) => row.calculation.trafficLight === "red").length,
    },
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
  };
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
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

function distinctSystem(rows: Array<{ id: number; businessId: number }>, eligible: Set<number>) {
  const ids = new Map<number, number>();
  for (const row of rows) if (eligible.has(row.businessId)) ids.set(row.businessId, row.id);
  return { actual: ids.size, sourceIds: [...ids.values()] };
}

function trainingCompletionSystem(
  mappings: Array<{ userId: string; externalId: string }>,
  events: Array<{ id: number; externalId: string; eventTitle: string }>,
  businessUsers: Array<{ businessId: number; userId: string }>,
  eligible: Set<number>
) {
  const externalByUser = new Map(mappings.map((mapping) => [mapping.userId, mapping.externalId]));
  const completedEventByExternal = new Map(
    events.filter((event) => /complet(?:e|ed|ion)/i.test(event.eventTitle)).map((event) => [event.externalId, event.id])
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
