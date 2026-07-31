import { calculateProfitLoss, jobBreakdownIssues, type JobBreakdown } from "./monitoring-calculations";

export type DqaFinding = {
  ruleCode: string;
  category: "completeness" | "consistency" | "plausibility" | "timeliness";
  severity: "error" | "warning";
  questionCode?: string;
  message: string;
  observedValue?: unknown;
  comparisonValue?: unknown;
};

export type DqaInput = {
  profileSnapshot: Record<string, unknown>;
  visitDate: string | null;
  periodStartDate: string;
  periodEndDate: string;
  collectionCloseDate: string;
  sourceMode: "current" | "catch_up";
  submittedAt: Date | null;
  revenue: number | null;
  costs: number | null;
  storedProfitLoss: number | null;
  directJobs: JobBreakdown | null;
  indirectJobs: JobBreakdown | null;
  financeLinked: boolean | null;
  financeType: string | null;
  financeValue: number | null;
  evidence: Array<{ id: number; questionCode: string; fileKey: string }>;
  priorApproved?: {
    revenue: number | null;
    profitLoss: number | null;
    directJobsTotal: number;
    indirectJobsTotal: number;
  } | null;
  duplicateEvidenceKeys?: ReadonlySet<string>;
};

export function runDqa(input: DqaInput): DqaFinding[] {
  const findings: DqaFinding[] = [];
  const requiredSnapshotFields = ["businessName", "enterpriseId", "applicantName", "sector", "track", "county"];
  const missingSnapshot = requiredSnapshotFields.filter(
    (field) => input.profileSnapshot[field] === null || input.profileSnapshot[field] === undefined || input.profileSnapshot[field] === ""
  );
  if (missingSnapshot.length > 0) {
    findings.push({
      ruleCode: "completeness.profile_snapshot",
      category: "completeness",
      severity: "error",
      message: `Profile snapshot is missing: ${missingSnapshot.join(", ")}`,
      observedValue: missingSnapshot,
    });
  }
  if (!input.visitDate) {
    findings.push({
      ruleCode: "completeness.visit_date",
      category: "completeness",
      severity: "error",
      questionCode: "visit_date",
      message: "Visit date is missing",
    });
  }
  if (input.revenue === null || input.costs === null || input.storedProfitLoss === null) {
    findings.push({
      ruleCode: "completeness.financials",
      category: "completeness",
      severity: "error",
      questionCode: "profitability",
      message: "Revenue, costs, and calculated profit or loss must be present",
    });
  } else {
    const expected = calculateProfitLoss(input.revenue, input.costs);
    if (Math.abs(expected - input.storedProfitLoss) > 0.01) {
      findings.push({
        ruleCode: "consistency.profit_calculation",
        category: "consistency",
        severity: "error",
        questionCode: "profitability",
        message: "Stored profit or loss does not equal revenue minus costs",
        observedValue: input.storedProfitLoss,
        comparisonValue: expected,
      });
    }
  }

  for (const [type, jobs] of [["direct", input.directJobs], ["indirect", input.indirectJobs]] as const) {
    if (!jobs) {
      findings.push({
        ruleCode: `completeness.${type}_jobs`,
        category: "completeness",
        severity: "error",
        questionCode: "jobs",
        message: `${type} job breakdown is missing`,
      });
      continue;
    }
    for (const [index, message] of jobBreakdownIssues(`${type} jobs`, jobs).entries()) {
      findings.push({
        ruleCode: `consistency.${type}_jobs.${index}`,
        category: "consistency",
        severity: "error",
        questionCode: "jobs",
        message,
        observedValue: jobs,
      });
    }
  }

  if (input.financeLinked === true && (!input.financeType || input.financeValue === null)) {
    findings.push({
      ruleCode: "consistency.finance_linkage",
      category: "consistency",
      severity: "error",
      questionCode: "linked_to_finance_provider",
      message: "A linked enterprise must include finance type and value",
    });
  }
  if (input.financeLinked === false && (input.financeType || (input.financeValue ?? 0) > 0)) {
    findings.push({
      ruleCode: "consistency.finance_without_linkage",
      category: "consistency",
      severity: "error",
      questionCode: "linked_to_finance_provider",
      message: "Finance details are present while financial linkage is No",
    });
  }

  if (input.visitDate && (input.visitDate < input.periodStartDate || input.visitDate > input.periodEndDate)) {
    findings.push({
      ruleCode: "timeliness.visit_outside_period",
      category: "timeliness",
      severity: "warning",
      questionCode: "visit_date",
      message: "Visit date falls outside the reporting period",
      observedValue: input.visitDate,
      comparisonValue: { start: input.periodStartDate, end: input.periodEndDate },
    });
  }
  if (input.sourceMode === "catch_up") {
    findings.push({
      ruleCode: "timeliness.catch_up",
      category: "timeliness",
      severity: "warning",
      message: "This is a catch-up report linked to its original reporting period",
    });
  } else if (input.submittedAt && input.submittedAt.toISOString().slice(0, 10) > input.collectionCloseDate) {
    findings.push({
      ruleCode: "timeliness.late_submission",
      category: "timeliness",
      severity: "warning",
      message: "The report was submitted after the collection deadline",
      observedValue: input.submittedAt.toISOString(),
      comparisonValue: input.collectionCloseDate,
    });
  }

  const prior = input.priorApproved;
  if (prior && input.revenue !== null && prior.revenue && prior.revenue > 0) {
    const change = Math.abs((input.revenue - prior.revenue) / prior.revenue);
    if (change >= 1) {
      findings.push({
        ruleCode: "plausibility.revenue_change",
        category: "plausibility",
        severity: "warning",
        questionCode: "profitability",
        message: "Revenue changed by 100% or more from the previous approved period",
        observedValue: input.revenue,
        comparisonValue: prior.revenue,
      });
    } else if (input.revenue === prior.revenue && input.storedProfitLoss === prior.profitLoss) {
      findings.push({
        ruleCode: "plausibility.identical_financials",
        category: "plausibility",
        severity: "warning",
        questionCode: "profitability",
        message: "Revenue and profit are identical to the previous approved period",
      });
    }
  }
  const totalJobs = (input.directJobs?.total ?? 0) + (input.indirectJobs?.total ?? 0);
  const priorJobs = (prior?.directJobsTotal ?? 0) + (prior?.indirectJobsTotal ?? 0);
  if (totalJobs >= 100 && totalJobs > Math.max(priorJobs * 2, 100)) {
    findings.push({
      ruleCode: "plausibility.jobs_change",
      category: "plausibility",
      severity: "warning",
      questionCode: "jobs",
      message: "Quarterly jobs are unusually high compared with the previous approved period",
      observedValue: totalJobs,
      comparisonValue: priorJobs,
    });
  }
  for (const item of input.evidence) {
    if (input.duplicateEvidenceKeys?.has(item.fileKey)) {
      findings.push({
        ruleCode: `plausibility.reused_evidence.${item.id}`,
        category: "plausibility",
        severity: "warning",
        questionCode: item.questionCode,
        message: "This evidence file is reused by another result or report",
        observedValue: item.fileKey,
      });
    }
  }

  return findings;
}
