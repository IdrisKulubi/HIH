import assert from "node:assert/strict";
import { canManageMel, canViewMel } from "./roles";
import { melIndicatorInputSchema, melProgrammeSettingsInputSchema } from "./configuration";
import { MEL_ITT_SEED, validateMelIttSeed } from "./itt-seed";
import {
  MEL_OP11_MOBILISATION_TARGETS,
  MEL_PROGRAMME_REPORTING_PERIODS,
  MEL_PROGRAMME_YEARS,
} from "./programme-calendar";
import {
  buildReportingPeriodCode,
  canTransitionMelPeriod,
  dateRangesOverlap,
  melReportingPeriodInputSchema,
} from "./reporting-periods";

function testReportingPeriods() {
  assert.equal(
    buildReportingPeriodCode({ startDate: "2025-10-15", endDate: "2026-01-14" }),
    "2025-26-OCT-JAN"
  );
  assert.equal(
    buildReportingPeriodCode({ startDate: "2026-12-01", endDate: "2027-02-28" }),
    "2026-27-DEC-FEB"
  );
  assert.equal(MEL_PROGRAMME_YEARS[0].startDate, "2025-10-15");
  assert.equal(MEL_PROGRAMME_YEARS[2].endDate, "2028-10-14");
  assert.equal(MEL_PROGRAMME_REPORTING_PERIODS.length, 12);
  assert.equal(MEL_PROGRAMME_REPORTING_PERIODS.filter((period) => period.status === "open").length, 1);
  assert.equal(MEL_OP11_MOBILISATION_TARGETS.overall, 400);
  assert.equal(MEL_OP11_MOBILISATION_TARGETS.year1 + MEL_OP11_MOBILISATION_TARGETS.year2, 400);
  assert.equal(
    dateRangesOverlap(
      { startDate: "2026-06-01", endDate: "2026-08-31" },
      { startDate: "2026-08-31", endDate: "2026-11-30" }
    ),
    true,
    "Shared boundary dates must count as an overlap"
  );
  assert.equal(
    dateRangesOverlap(
      { startDate: "2026-06-01", endDate: "2026-08-31" },
      { startDate: "2026-09-01", endDate: "2026-11-30" }
    ),
    false
  );

  assert.equal(canTransitionMelPeriod("planned", "open"), true);
  assert.equal(canTransitionMelPeriod("open", "closed"), true);
  assert.equal(canTransitionMelPeriod("closed", "open"), true);
  assert.equal(canTransitionMelPeriod("archived", "open"), false);
  assert.equal(canTransitionMelPeriod("open", "archived"), false);

  const invalidDates = melReportingPeriodInputSchema.safeParse({
    label: "Quarter 1",
    programmeYear: 1,
    sequence: 1,
    startDate: "2026-08-31",
    endDate: "2026-06-01",
    collectionOpenDate: "2026-09-01",
    collectionCloseDate: "2026-08-31",
    allowCatchUp: true,
  });
  assert.equal(invalidDates.success, false);
}

function testConfiguration() {
  assert.equal(
    melProgrammeSettingsInputSchema.safeParse({
      programmeName: "BIRE Programme",
      timezone: "Africa/Nairobi",
      redThreshold: 80,
      greenThreshold: 50,
      financiallyResilientDefinition: null,
      includeRefugeeDisaggregation: true,
    }).success,
    false
  );

  assert.equal(
    melIndicatorInputSchema.safeParse({
      indicatorId: 1,
      name: "Percentage of supported enterprises",
      definition: null,
      frequency: "quarterly",
      unit: "percentage",
      sourceType: "derived",
      aggregation: "ratio",
      numeratorDefinition: null,
      denominatorDefinition: null,
      evidenceRequired: false,
      isOneTime: false,
      isActive: true,
      unresolvedNotes: null,
    }).success,
    false,
    "Ratio definitions must name both parts of the calculation"
  );
}

function testSeed() {
  assert.deepEqual(validateMelIttSeed(), []);
  assert.ok(MEL_ITT_SEED.length >= 30, "All ITT result areas should be represented");
  assert.equal(new Set(MEL_ITT_SEED.map((indicator) => indicator.code)).size, MEL_ITT_SEED.length);
  assert.ok(MEL_ITT_SEED.some((indicator) => indicator.resultLevel === "impact"));
  assert.ok(MEL_ITT_SEED.some((indicator) => indicator.resultLevel === "long_term_outcome"));
  assert.ok(MEL_ITT_SEED.some((indicator) => indicator.resultCode.startsWith("OP4")));
  assert.ok(MEL_ITT_SEED.every((indicator) => indicator.disaggregationDimensions.length > 0));
}

function testAuthorizationRules() {
  assert.equal(canManageMel("admin"), true);
  assert.equal(canManageMel("mel"), true);
  assert.equal(canManageMel("redo"), false);
  assert.equal(canViewMel("redo"), true);
  assert.equal(canViewMel("bds_edo"), true);
  assert.equal(canViewMel("applicant"), false);
}

testReportingPeriods();
testConfiguration();
testSeed();
testAuthorizationRules();

console.log(`MEL Phase 1 tests passed (${MEL_ITT_SEED.length} ITT indicators validated).`);
