/**
 * Official BIRE MEL programme calendar.
 *
 * Programme years (Oct → Oct) drive ITT targets and annual achievement.
 * Monitoring periods follow BDS operations: Y1 pre-delivery, then Jun–Aug as
 * the first monitoring quarter.
 *
 * Collection happens after the reporting quarter closes: 1st to 10th of the
 * following month.
 */
export type MelSeedReportingPeriod = {
  code: string;
  label: string;
  programmeYear: 1 | 2 | 3;
  sequence: number;
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

/** Official shared-ITT Year 1 actuals (to date). */
export const MEL_OP11_YEAR1_ACTUALS = {
  "OP1.1-ENTERPRISES-MOBILISED": 240,
  "OP1.1-CNA-COMPLETED": 235,
  "OP1.1-CDP-IMPLEMENTED": 235,
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

/** Monitoring forms are due by the 10th of the month after the reporting quarter. */
export const MEL_COLLECTION_DEADLINE_DAY = 10;

export function collectionWindowAfterReportingEnd(endDate: string): {
  collectionOpenDate: string;
  collectionCloseDate: string;
} {
  const end = new Date(`${endDate}T00:00:00Z`);
  const collectionMonth = end.getUTCMonth() + 1;
  const open = new Date(Date.UTC(end.getUTCFullYear(), collectionMonth, 1));
  const close = new Date(Date.UTC(end.getUTCFullYear(), collectionMonth, MEL_COLLECTION_DEADLINE_DAY));
  return {
    collectionOpenDate: open.toISOString().slice(0, 10),
    collectionCloseDate: close.toISOString().slice(0, 10),
  };
}

function period(input: {
  code: string;
  label: string;
  programmeYear: 1 | 2 | 3;
  sequence: number;
  startDate: string;
  endDate: string;
  status?: MelSeedReportingPeriod["status"];
}): MelSeedReportingPeriod {
  const collection = collectionWindowAfterReportingEnd(input.endDate);
  return {
    code: input.code,
    label: input.label,
    programmeYear: input.programmeYear,
    sequence: input.sequence,
    startDate: input.startDate,
    endDate: input.endDate,
    collectionOpenDate: collection.collectionOpenDate,
    collectionCloseDate: collection.collectionCloseDate,
    status: input.status ?? "planned",
    allowCatchUp: true,
  };
}

/**
 * Option A calendar:
 * - Programme years stay Oct→Oct for ITT targets.
 * - Y1 monitoring starts June 2026 (BDS start).
 * - Jan–May 2026 sits in closed pre-delivery (application → CDP planning).
 * - Collection is 1st–10th of the month after each reporting quarter.
 */
export const MEL_PROGRAMME_REPORTING_PERIODS: MelSeedReportingPeriod[] = [
  // Year 1 — project year Oct 2025–Oct 2026
  period({
    code: "Y1-PRE",
    label: "Y1 Pre-delivery (Oct 2025–May 2026) · Application, screening, onboarding, baseline, CNA & CDP planning",
    programmeYear: 1,
    sequence: 1,
    startDate: "2025-10-15",
    endDate: "2026-05-31",
    status: "closed",
  }),
  period({
    code: "Y1-MQ1",
    label: "Y1 Monitoring Q1 (Jun–Aug 2026) · First BDS collection",
    programmeYear: 1,
    sequence: 2,
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    status: "open",
  }),
  period({
    code: "Y1-MQ2",
    label: "Y1 Monitoring Q2 (Sept–Nov 2026)",
    programmeYear: 1,
    sequence: 3,
    startDate: "2026-09-01",
    endDate: "2026-11-30",
    status: "planned",
  }),

  // Year 2 — project year Oct 2026–Oct 2027 (monitoring continues)
  period({
    code: "Y2-MQ1",
    label: "Y2 Monitoring Q1 (Dec 2026–Feb 2027)",
    programmeYear: 2,
    sequence: 1,
    startDate: "2026-12-01",
    endDate: "2027-02-28",
  }),
  period({
    code: "Y2-MQ2",
    label: "Y2 Monitoring Q2 (Mar–May 2027)",
    programmeYear: 2,
    sequence: 2,
    startDate: "2027-03-01",
    endDate: "2027-05-31",
  }),
  period({
    code: "Y2-MQ3",
    label: "Y2 Monitoring Q3 (Jun–Aug 2027)",
    programmeYear: 2,
    sequence: 3,
    startDate: "2027-06-01",
    endDate: "2027-08-31",
  }),
  period({
    code: "Y2-MQ4",
    label: "Y2 Monitoring Q4 (Sept–Nov 2027)",
    programmeYear: 2,
    sequence: 4,
    startDate: "2027-09-01",
    endDate: "2027-11-30",
  }),

  // Year 3 — quarterly monitoring continues without a fifth quarter
  period({
    code: "Y3-MQ1",
    label: "Y3 Monitoring Q1 (Dec 2027–Feb 2028)",
    programmeYear: 3,
    sequence: 1,
    startDate: "2027-12-01",
    endDate: "2028-02-29",
  }),
  period({
    code: "Y3-MQ2",
    label: "Y3 Monitoring Q2 (Mar–May 2028)",
    programmeYear: 3,
    sequence: 2,
    startDate: "2028-03-01",
    endDate: "2028-05-31",
  }),
  period({
    code: "Y3-MQ3",
    label: "Y3 Monitoring Q3 (Jun–Aug 2028)",
    programmeYear: 3,
    sequence: 3,
    startDate: "2028-06-01",
    endDate: "2028-08-31",
  }),
  period({
    code: "Y3-MQ4",
    label: "Y3 Monitoring Q4 (Sept–Nov 2028)",
    programmeYear: 3,
    sequence: 4,
    startDate: "2028-09-01",
    endDate: "2028-11-30",
  }),
];

/** First BDS monitoring window in Year 1 (Jun–Aug 2026). */
export const MEL_Y1_FIRST_MONITORING_SEQUENCE = 2;

export const OP11_COUNT_INDICATOR_CODES = [
  "OP1.1-ENTERPRISES-MOBILISED",
  "OP1.1-CNA-COMPLETED",
  "OP1.1-CDP-IMPLEMENTED",
] as const;

export const MEL_Y1_PREDELIVERY_PERIOD_CODE = "Y1-PRE";

export function isOp11CountIndicator(code: string): boolean {
  return (OP11_COUNT_INDICATOR_CODES as readonly string[]).includes(code);
}

export function isY1PreDeliveryPeriod(period: { code: string }): boolean {
  return period.code === MEL_Y1_PREDELIVERY_PERIOD_CODE;
}

export function isOp11VisualizationProgrammeWide(code: string, sourceType: string): boolean {
  return sourceType === "programme_mel_entry" || isOp11CountIndicator(code);
}

/** Official shared-ITT Year 1 actuals override raw system counts for OP1.1 output indicators. */
export function resolveOp11Actual(
  code: string,
  systemCount: number,
  programmeYear: number
): number {
  if (!isOp11CountIndicator(code) || programmeYear < 1) return systemCount;
  const official = MEL_OP11_YEAR1_ACTUALS[code as keyof typeof MEL_OP11_YEAR1_ACTUALS];
  if (official === undefined) return systemCount;
  return official;
}
