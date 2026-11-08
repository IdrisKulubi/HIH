export type ProgrammeYearTarget = {
  programmeYear: number;
  reportingPeriodId: number | null;
  segmentKey: string;
  value: string | number | null;
};

/**
 * Returns the cumulative planned enterprise cohort through the requested
 * programme year. Period-specific and non-overall targets are deliberately
 * excluded because they do not define the programme population.
 */
export function cumulativePlannedCohort(
  targets: ProgrammeYearTarget[],
  programmeYear: number
): number | null {
  const annual = targets
    .filter((target) =>
      target.reportingPeriodId === null
      && target.segmentKey === "overall"
      && target.programmeYear >= 1
      && target.programmeYear <= programmeYear
    )
    .map((target) => Number(target.value))
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (annual.length === 0) return null;
  const cumulative = annual.reduce((total, value) => total + value, 0);
  const overall = targets.find((target) =>
    target.reportingPeriodId === null
    && target.segmentKey === "overall"
    && target.programmeYear === 0
  );
  const overallValue = Number(overall?.value);
  return Number.isFinite(overallValue) && overallValue > 0
    ? Math.min(cumulative, overallValue)
    : cumulative;
}
