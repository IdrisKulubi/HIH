export const MEL_CALCULATION_VERSION = 2;

export function isTrustedMonitoringStatus(status: string): boolean {
  return status === "approved";
}

export type TrafficLight = "red" | "amber" | "green" | "not_available";

export type EnterpriseDimensions = {
  track: string | null;
  ownerGender: string | null;
  ownerYouth: boolean | null;
  ownerPlwd: boolean | null;
  county: string | null;
  sector: string | null;
};

export type ApprovedMonitoringRecord = {
  submissionId: number;
  businessId: number;
  periodId: number;
  dimensions: EnterpriseDimensions;
  revenue: number | null;
  costs: number | null;
  profitLoss: number | null;
  financialChangeExplanation?: string | null;
  financialBaselineSnapshot?: Record<string, unknown> | null;
  financialComparisonSnapshot?: Record<string, unknown> | null;
  newMarketSegments: number | null;
  businessPlanImproved: boolean | null;
  marketResearchCompleted: boolean | null;
  marketIntelligenceAccessed: boolean | null;
  technologyAdopted: boolean | null;
  newProductsDeveloped: boolean | null;
  linkedToFinanceProvider: boolean | null;
  financeValue: number | null;
  financeEntries: Array<{ financeType: string; otherDescription: string | null; amount: number }>;
  financialPlanCompleted: boolean | null;
  activeInsurance: boolean | null;
  investorReadinessCompleted: boolean | null;
  lifeCycleAssessmentCompleted: boolean | null;
  ecoCertificationActive: boolean | null;
  esgReportCompleted: boolean | null;
  socialSafeguardingGuidelines: boolean | null;
  circularGrowthReported: boolean | null;
  strategicPartnerships: boolean | null;
  directJobs: JobTotals;
  indirectJobs: JobTotals;
  waste: Array<{ stream: string; kilograms: number }>;
};

export type JobTotals = {
  total: number;
  male: number;
  female: number;
  youth: number;
  plwd: number;
  refugee: number;
};

export type ProgrammeResultInput = {
  id: number;
  indicatorCode: string;
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  segmentKey: string;
};

export type IndicatorDefinitionInput = {
  code: string;
  aggregation: "sum" | "median" | "count" | "distinct_count" | "ratio" | "latest_value";
  lowerIsBetter: boolean;
  version: number;
  unit?: string;
  sourceType?: string;
  isOneTime?: boolean;
};

export type ApprovedEnterpriseAchievementInput = {
  id: number;
  businessId: number;
  indicatorCode: string;
};

export type EnterpriseRatioDenominator = {
  value: number | null;
  basis: "planned_programme_cohort" | "actual_segment_cohort";
  eligibleBusinessIds: number[];
};

export type IndicatorCalculationInput = {
  definition: IndicatorDefinitionInput;
  records: ApprovedMonitoringRecord[];
  programmeResults: ProgrammeResultInput[];
  segmentKey?: string;
  baseline?: number | null;
  target?: number | null;
  systemActual?: { actual: number | null; sourceIds: number[]; numerator?: number | null; denominator?: number | null; rule?: string } | null;
  approvedAchievements?: ApprovedEnterpriseAchievementInput[];
  enterpriseDenominator?: EnterpriseRatioDenominator | null;
  thresholds: { red: number; green: number };
};

export type IndicatorCalculation = {
  actual: number | null;
  numerator: number | null;
  denominator: number | null;
  target: number | null;
  achievementPercentage: number | null;
  trafficLight: TrafficLight;
  calculationRule: string;
  sourceSubmissionIds: number[];
  sourceProgrammeResultIds: number[];
  sourceSystemIds: number[];
  sourceAchievementIds: number[];
  sourceCount: number;
  exclusions: string[];
  denominatorBasis: EnterpriseRatioDenominator["basis"] | null;
};

type BooleanField = keyof Pick<
  ApprovedMonitoringRecord,
  | "businessPlanImproved"
  | "marketResearchCompleted"
  | "marketIntelligenceAccessed"
  | "technologyAdopted"
  | "newProductsDeveloped"
  | "linkedToFinanceProvider"
  | "financialPlanCompleted"
  | "activeInsurance"
  | "investorReadinessCompleted"
  | "lifeCycleAssessmentCompleted"
  | "ecoCertificationActive"
  | "esgReportCompleted"
  | "socialSafeguardingGuidelines"
  | "circularGrowthReported"
  | "strategicPartnerships"
>;

const RATIO_FIELDS: Partial<Record<string, BooleanField>> = {
  "LT3-CIRCULAR-GROWTH": "circularGrowthReported",
  "OP1.2-IMPROVED-BUSINESS-PLANS": "businessPlanImproved",
  "OP1.2-TECHNOLOGY-ADOPTION": "technologyAdopted",
  "OP1.2-NEW-PRODUCTS": "newProductsDeveloped",
  "OP2.1-FINANCIAL-PLANS": "financialPlanCompleted",
  "OP2.1-FINANCIAL-LINKAGES": "linkedToFinanceProvider",
  "OP2.1-ACTIVE-INSURANCE": "activeInsurance",
  "OP2.1-INVESTOR-READINESS": "investorReadinessCompleted",
  "OP2.2-MARKET-RESEARCH": "marketResearchCompleted",
  "OP2.2-MARKET-INTELLIGENCE": "marketIntelligenceAccessed",
  "OP2.2-STRATEGIC-PARTNERSHIPS": "strategicPartnerships",
  "OP3.1-ESG-REPORTS": "esgReportCompleted",
  "OP3.1-ECO-CERTIFICATION": "ecoCertificationActive",
  "OP3.2-SOCIAL-SAFEGUARDS": "socialSafeguardingGuidelines",
};

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

export function safePercentage(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return round((numerator / denominator) * 100);
}

export function median(values: number[]): number | null {
  const valid = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (valid.length === 0) return null;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 === 0 ? round((valid[middle - 1] + valid[middle]) / 2) : valid[middle];
}

export function achievementStatus(
  actual: number | null,
  target: number | null,
  thresholds: { red: number; green: number },
  lowerIsBetter = false
): { achievementPercentage: number | null; trafficLight: TrafficLight } {
  if (actual === null || target === null || target === 0) {
    return { achievementPercentage: null, trafficLight: "not_available" };
  }
  const achievementPercentage = lowerIsBetter
    ? actual === 0
      ? target > 0 ? 100 : null
      : safePercentage(target, actual)
    : safePercentage(actual, target);
  if (achievementPercentage === null) return { achievementPercentage, trafficLight: "not_available" };
  const trafficLight = achievementPercentage >= thresholds.green
    ? "green"
    : achievementPercentage >= thresholds.red
      ? "amber"
      : "red";
  return { achievementPercentage, trafficLight };
}

export function matchesSegment(record: ApprovedMonitoringRecord, segmentKey: string): boolean {
  if (segmentKey === "overall") return true;
  const separator = segmentKey.indexOf(":");
  if (separator < 1) return false;
  const dimension = segmentKey.slice(0, separator);
  const value = segmentKey.slice(separator + 1);
  if (["waste_stream", "job_type", "job_holder_gender", "job_holder_youth", "job_holder_plwd", "job_holder_refugee"].includes(dimension)) {
    return true;
  }
  const dimensions: Record<string, string | boolean | null> = {
    track: record.dimensions.track,
    owner_gender: record.dimensions.ownerGender,
    owner_youth: record.dimensions.ownerYouth,
    owner_plwd: record.dimensions.ownerPlwd,
    county: record.dimensions.county,
    sector: record.dimensions.sector,
  };
  return String(dimensions[dimension] ?? "").toLowerCase() === value.toLowerCase();
}

function distinctLatest(records: ApprovedMonitoringRecord[]): ApprovedMonitoringRecord[] {
  const byBusiness = new Map<number, ApprovedMonitoringRecord>();
  for (const record of records) {
    const current = byBusiness.get(record.businessId);
    if (!current || record.periodId > current.periodId) byBusiness.set(record.businessId, record);
  }
  return [...byBusiness.values()];
}

function result(
  input: IndicatorCalculationInput,
  values: Pick<IndicatorCalculation, "actual" | "numerator" | "denominator" | "calculationRule">,
  records: ApprovedMonitoringRecord[],
  programmeResultIds: number[] = [],
  exclusions: string[] = [],
  systemIds: number[] = [],
  achievementIds: number[] = [],
  denominatorBasis: EnterpriseRatioDenominator["basis"] | null = null
): IndicatorCalculation {
  const status = achievementStatus(values.actual, input.target ?? null, input.thresholds, input.definition.lowerIsBetter);
  return {
    ...values,
    target: input.target ?? null,
    ...status,
    sourceSubmissionIds: records.map((record) => record.submissionId),
    sourceProgrammeResultIds: programmeResultIds,
    sourceSystemIds: systemIds,
    sourceAchievementIds: achievementIds,
    sourceCount: records.length + programmeResultIds.length + systemIds.length + achievementIds.length,
    exclusions,
    denominatorBasis,
  };
}

function usesEnterpriseCohortDenominator(input: IndicatorCalculationInput): boolean {
  return input.definition.aggregation === "ratio"
    && input.definition.unit === "percentage"
    && input.definition.sourceType === "quarterly_enterprise_form";
}

function enterpriseRatio(
  input: IndicatorCalculationInput,
  numerator: number,
  sourceRecords: ApprovedMonitoringRecord[],
  achievementIds: number[],
  rule: string
): IndicatorCalculation {
  const configured = input.enterpriseDenominator;
  if (!configured || configured.value === null || configured.value <= 0) {
    return result(
      input,
      { actual: null, numerator, denominator: configured?.value ?? null, calculationRule: `${rule}; cohort denominator unavailable` },
      sourceRecords,
      [],
      ["Percentage actual is unavailable because the full enterprise cohort denominator is missing or zero."],
      [],
      achievementIds,
      configured?.basis ?? null
    );
  }
  const exclusions = numerator > configured.value
    ? [`Data-quality warning: numerator ${numerator} exceeds the ${configured.basis.replaceAll("_", " ")} denominator ${configured.value}.`]
    : [];
  return result(
    input,
    { actual: safePercentage(numerator, configured.value), numerator, denominator: configured.value, calculationRule: `${rule} / ${configured.basis.replaceAll("_", " ")}` },
    sourceRecords,
    [],
    exclusions,
    [],
    achievementIds,
    configured.basis
  );
}

export function calculateIndicator(input: IndicatorCalculationInput): IndicatorCalculation {
  const segmentKey = input.segmentKey ?? "overall";
  const records = input.records.filter((record) => matchesSegment(record, segmentKey));
  const latest = distinctLatest(records);
  const eligibleBusinessIds = new Set(input.enterpriseDenominator?.eligibleBusinessIds ?? []);
  const enterpriseRecords = usesEnterpriseCohortDenominator(input)
    ? records.filter((record) => eligibleBusinessIds.has(record.businessId))
    : records;
  const latestEnterpriseRecords = distinctLatest(enterpriseRecords);
  const code = input.definition.code;

  if (input.systemActual) {
    return result(
      input,
      { actual: input.systemActual.actual, numerator: input.systemActual.numerator ?? null, denominator: input.systemActual.denominator ?? null, calculationRule: input.systemActual.rule ?? "Distinct valid system records" },
      [],
      [],
      [],
      input.systemActual.sourceIds
    );
  }

  if (code === "IM-JOBS-CREATED") {
    const jobDimension = segmentKey.includes(":") ? segmentKey.split(":", 2) : null;
    const valueFor = (job: JobTotals) => {
      if (!jobDimension || jobDimension[0] === "job_type") return job.total;
      if (jobDimension[0] === "job_holder_gender") return jobDimension[1] === "female" ? job.female : job.male;
      if (jobDimension[0] === "job_holder_youth") return jobDimension[1] === "true" ? job.youth : job.total - job.youth;
      if (jobDimension[0] === "job_holder_plwd") return jobDimension[1] === "true" ? job.plwd : job.total - job.plwd;
      if (jobDimension[0] === "job_holder_refugee") return jobDimension[1] === "true" ? job.refugee : job.total - job.refugee;
      return job.total;
    };
    const actual = records.reduce((sum, record) => {
      if (jobDimension?.[0] === "job_type") return sum + valueFor(jobDimension[1] === "direct" ? record.directJobs : record.indirectJobs);
      return sum + valueFor(record.directJobs) + valueFor(record.indirectJobs);
    }, 0);
    return result(input, { actual, numerator: null, denominator: null, calculationRule: jobDimension ? `Sum of approved jobs for ${segmentKey}` : "Sum of approved direct and indirect quarterly jobs" }, records);
  }

  if (code === "LT1-PROFITABILITY-INCREASE") {
    if (segmentKey === "overall") {
      return result(
        input,
        { actual: null, numerator: null, denominator: null, calculationRule: "Track-specific monthly median profitability comparison" },
        [],
        [],
        ["Overall comparison is unavailable. Select Foundation or Acceleration to view the validated track-specific baseline."]
      );
    }
    const cohortMedian = median(latest.flatMap((record) => record.profitLoss === null ? [] : [record.profitLoss / 3]));
    const growth = cohortMedian === null || !input.baseline
      ? null
      : safePercentage(cohortMedian - input.baseline, input.baseline);
    const exclusions = input.baseline === 0 || input.baseline === null || input.baseline === undefined
      ? ["Profitability growth unavailable because the matching baseline is zero or missing."]
      : [];
    return result(
      input,
      { actual: growth, numerator: cohortMedian, denominator: input.baseline ?? null, calculationRule: "Growth in median monthly-equivalent profit against baseline" },
      latest,
      [],
      exclusions
    );
  }

  if (code === "LT3-CIRCULAR-GROWTH") {
    return result(
      input,
      { actual: null, numerator: null, denominator: null, calculationRule: "Evaluation source pending" },
      [],
      [],
      ["Circular-growth monitoring is unavailable because the evaluation source is pending."]
    );
  }

  if (code === "LT2-NEW-MARKETS") {
    const numeratorRecords = latestEnterpriseRecords.filter((record) => (record.newMarketSegments ?? 0) > 0);
    if (usesEnterpriseCohortDenominator(input)) {
      return enterpriseRatio(input, numeratorRecords.length, latestEnterpriseRecords, [], "Distinct supported enterprises with one or more new market segments");
    }
    return result(input, { actual: safePercentage(numeratorRecords.length, latest.length), numerator: numeratorRecords.length, denominator: latest.length, calculationRule: "Distinct enterprises with one or more new market segments / reporting enterprises" }, latest);
  }

  if (code === "LT2-FINANCIAL-RESILIENCE") {
    return result(input, { actual: null, numerator: null, denominator: latest.length, calculationRule: "Requires the configured financial resilience definition" }, latest, [], ["Financial resilience definition is not configured."]);
  }

  if (code === "OP2.2-NEW-MARKET-SEGMENTS") {
    const numeratorRecords = latestEnterpriseRecords.filter((record) => (record.newMarketSegments ?? 0) > 3);
    if (usesEnterpriseCohortDenominator(input)) {
      return enterpriseRatio(input, numeratorRecords.length, latestEnterpriseRecords, [], "Distinct supported enterprises serving more than three new market segments");
    }
    return result(input, { actual: safePercentage(numeratorRecords.length, latest.length), numerator: numeratorRecords.length, denominator: latest.length, calculationRule: "Distinct enterprises serving more than three new market segments / reporting enterprises" }, latest);
  }

  if (code === "OP2.1-FINANCE-VALUE") {
    const actual = records.reduce((sum, record) => sum + (record.financeValue ?? 0), 0);
    return result(input, { actual: round(actual), numerator: null, denominator: null, calculationRule: "Sum of approved finance accessed" }, records);
  }

  if (code === "OP3.1-LIFE-CYCLE-ASSESSMENTS") {
    const contributing = latest.filter((record) => record.lifeCycleAssessmentCompleted === true);
    return result(input, { actual: contributing.length, numerator: null, denominator: null, calculationRule: "Distinct enterprises with an approved life-cycle assessment" }, contributing);
  }

  if (code === "OP3.3-WASTE-RECYCLED") {
    const wasteRecords = records.filter((record) => record.dimensions.sector === "waste_management");
    const requestedStream = segmentKey.startsWith("waste_stream:") ? segmentKey.slice(13) : null;
    const actual = wasteRecords.reduce(
      (total, record) => total + record.waste
        .filter((item) => !requestedStream || item.stream === requestedStream)
        .reduce((sum, item) => sum + item.kilograms, 0),
      0
    );
    return result(input, { actual: round(actual), numerator: null, denominator: null, calculationRule: requestedStream ? `Sum of approved ${requestedStream} waste kilograms from waste-management enterprises` : "Sum of approved waste kilograms from waste-management enterprises" }, wasteRecords);
  }

  const ratioField = RATIO_FIELDS[code];
  if (ratioField) {
    if (usesEnterpriseCohortDenominator(input)) {
      if (input.definition.isOneTime) {
        const achievements = (input.approvedAchievements ?? []).filter((achievement) =>
          achievement.indicatorCode === code && eligibleBusinessIds.has(achievement.businessId)
        );
        const achievementByBusiness = new Map(achievements.map((achievement) => [achievement.businessId, achievement]));
        const legacyTrueByBusiness = new Map<number, ApprovedMonitoringRecord>();
        for (const record of enterpriseRecords) {
          if (record[ratioField] !== true || achievementByBusiness.has(record.businessId)) continue;
          if (!legacyTrueByBusiness.has(record.businessId)) legacyTrueByBusiness.set(record.businessId, record);
        }
        const numerator = new Set([...achievementByBusiness.keys(), ...legacyTrueByBusiness.keys()]).size;
        return enterpriseRatio(
          input,
          numerator,
          [...legacyTrueByBusiness.values()],
          [...achievementByBusiness.values()].map((achievement) => achievement.id),
          `Distinct supported enterprises with an approved ${ratioField} achievement`
        );
      }
      const numerator = latestEnterpriseRecords.filter((record) => record[ratioField] === true).length;
      return enterpriseRatio(input, numerator, latestEnterpriseRecords, [], `Distinct supported enterprises whose latest approved ${ratioField} response is Yes`);
    }
    const numerator = latest.filter((record) => record[ratioField] === true).length;
    return result(input, { actual: safePercentage(numerator, latest.length), numerator, denominator: latest.length, calculationRule: `Distinct enterprises where ${ratioField} is true / reporting enterprises` }, latest);
  }

  const programmeEntries = input.programmeResults.filter(
    (entry) => entry.indicatorCode === code && entry.segmentKey === segmentKey
  );
  if (programmeEntries.length > 0) {
    const numerator = programmeEntries.reduce((sum, entry) => sum + (entry.numerator ?? 0), 0);
    const denominator = programmeEntries.reduce((sum, entry) => sum + (entry.denominator ?? 0), 0);
    const actual = input.definition.aggregation === "ratio"
      ? safePercentage(numerator, denominator)
      : round(programmeEntries.reduce((sum, entry) => sum + (entry.value ?? 0), 0));
    return result(
      input,
      { actual, numerator: input.definition.aggregation === "ratio" ? numerator : null, denominator: input.definition.aggregation === "ratio" ? denominator : null, calculationRule: input.definition.aggregation === "ratio" ? "Approved programme-entry numerator / denominator" : "Sum of approved programme entries" },
      [],
      programmeEntries.map((entry) => entry.id)
    );
  }

  return result(input, { actual: null, numerator: null, denominator: null, calculationRule: "No trusted source mapping or approved programme entry" }, [], [], ["No approved source records were available for this indicator."]);
}
