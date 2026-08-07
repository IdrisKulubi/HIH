/**
 * Official BIRE MEL programme calendar.
 * Programme years run 15 Oct → 14 Oct (three-year project).
 */
export type MelSeedReportingPeriod = {
  code: string;
  label: string;
  programmeYear: 1 | 2 | 3;
  sequence: 1 | 2 | 3 | 4;
  startDate: string;
  endDate: string;
  collectionOpenDate: string;
  collectionCloseDate: string;
  status: "planned" | "open" | "closed" | "archived";
  allowCatchUp: boolean;
};

/** Whole-programme OP1.1 mobilization target and annual increments. */
export const MEL_OP11_MOBILISATION_TARGETS = {
  overall: 400,
  year1: 250,
  year2: 150,
  year3: 0,
} as const;

export const MEL_PROGRAMME_YEARS = [
  {
    year: 1 as const,
    label: "Year 1",
    startDate: "2025-10-15",
    endDate: "2026-10-14",
    displayRange: "15 Oct 2025 – 15 Oct 2026",
  },
  {
    year: 2 as const,
    label: "Year 2",
    startDate: "2026-10-15",
    endDate: "2027-10-14",
    displayRange: "15 Oct 2026 – 15 Oct 2027",
  },
  {
    year: 3 as const,
    label: "Year 3",
    startDate: "2027-10-15",
    endDate: "2028-10-14",
    displayRange: "15 Oct 2027 – 15 Oct 2028",
  },
] as const;

function quarter(
  programmeYear: 1 | 2 | 3,
  sequence: 1 | 2 | 3 | 4,
  startDate: string,
  endDate: string,
  status: MelSeedReportingPeriod["status"] = "planned"
): MelSeedReportingPeriod {
  const yearMeta = MEL_PROGRAMME_YEARS[programmeYear - 1];
  const close = new Date(`${endDate}T00:00:00Z`);
  close.setUTCDate(close.getUTCDate() + 14);
  const collectionCloseDate = close.toISOString().slice(0, 10);
  return {
    code: `Y${programmeYear}-Q${sequence}`,
    label: `${yearMeta.label} Q${sequence} (${startDate} to ${endDate})`,
    programmeYear,
    sequence,
    startDate,
    endDate,
    collectionOpenDate: startDate,
    collectionCloseDate,
    status,
    allowCatchUp: true,
  };
}

/**
 * Twelve quarterly collection windows across the three programme years.
 * Y1 Q4 is open by default for the current MEL roll-out window.
 */
export const MEL_PROGRAMME_REPORTING_PERIODS: MelSeedReportingPeriod[] = [
  // Year 1: 15 Oct 2025 – 14 Oct 2026
  quarter(1, 1, "2025-10-15", "2026-01-14", "closed"),
  quarter(1, 2, "2026-01-15", "2026-04-14", "closed"),
  quarter(1, 3, "2026-04-15", "2026-07-14", "closed"),
  quarter(1, 4, "2026-07-15", "2026-10-14", "open"),
  // Year 2: 15 Oct 2026 – 14 Oct 2027
  quarter(2, 1, "2026-10-15", "2027-01-14"),
  quarter(2, 2, "2027-01-15", "2027-04-14"),
  quarter(2, 3, "2027-04-15", "2027-07-14"),
  quarter(2, 4, "2027-07-15", "2027-10-14"),
  // Year 3: 15 Oct 2027 – 14 Oct 2028
  quarter(3, 1, "2027-10-15", "2028-01-14"),
  quarter(3, 2, "2028-01-15", "2028-04-14"),
  quarter(3, 3, "2028-04-15", "2028-07-14"),
  quarter(3, 4, "2028-07-15", "2028-10-14"),
];

export const OP11_COUNT_INDICATOR_CODES = [
  "OP1.1-ENTERPRISES-MOBILISED",
  "OP1.1-CNA-COMPLETED",
  "OP1.1-CDP-IMPLEMENTED",
] as const;

export function isOp11CountIndicator(code: string): boolean {
  return (OP11_COUNT_INDICATOR_CODES as readonly string[]).includes(code);
}
