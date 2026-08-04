import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ageCategoryAt } from "./monitoring-question-catalog";
import {
  monitoringSubmissionIssues,
  normalizeMonitoringDraft,
  type MelMonitoringDraft,
} from "./monitoring-validation";

const baseDraft = (): MelMonitoringDraft => ({
  visitDate: "2026-08-31",
  businessPlanImproved: false,
  revenue: 600000,
  costs: 300000,
  directJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
  indirectJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
  marketResearchCompleted: false,
  marketIntelligenceAccessed: false,
  newMarketSegments: 0,
  technologyAdopted: false,
  technologyDetails: null,
  newProductsDeveloped: false,
  newProductsDetails: null,
  linkedToFinanceProvider: false,
  financeEntries: [],
  financialPlanCompleted: false,
  activeInsurance: false,
  investorReadinessCompleted: false,
  lifeCycleAssessmentCompleted: false,
  ecoCertificationActive: false,
  esgReportCompleted: false,
  socialSafeguardingGuidelines: false,
  waste: { organic: 0, plastic: 0, paper: 0, glass: 0, e_waste: 0, other: 0 },
  strategicPartnerships: false,
  strategicPartnershipCount: null,
  strategicPartnershipDetails: null,
  forumParticipation: false,
  publicPrivatePartnership: false,
  publicPrivatePartnershipDetails: null,
  mainChallenges: "Finance",
  negativeProgrammeImpacts: "None",
  additionalSupportNeeded: "Market linkage",
  collectorComment: "Verified during visit",
  reusedEvidenceIds: {},
});

function testAgeCategories() {
  assert.match(ageCategoryAt("1991-08-31", "2026-08-31"), /^18–35/);
  assert.match(ageCategoryAt("1990-08-31", "2026-08-31"), /^36–50/);
  assert.match(ageCategoryAt("1976-08-31", "2026-08-31"), /^36–50/);
  assert.match(ageCategoryAt("1975-08-31", "2026-08-31"), /^51 and above/);
}

function testNormalizationAndBranches() {
  const normalized = normalizeMonitoringDraft({
    ...baseDraft(),
    technologyDetails: "Stale technology",
    newProductsDetails: "Stale product",
    financeEntries: [{ financeType: "loan", amount: 100, otherDescription: null }],
    strategicPartnershipCount: 2,
    strategicPartnershipDetails: "Stale partner",
    publicPrivatePartnershipDetails: "Stale PPP",
    waste: { organic: 9, plastic: 8, paper: 7, glass: 6, e_waste: 5, other: 4 },
  }, false);
  assert.equal(normalized.technologyDetails, null);
  assert.equal(normalized.newProductsDetails, null);
  assert.deepEqual(normalized.financeEntries, []);
  assert.equal(normalized.strategicPartnershipCount, null);
  assert.equal(normalized.publicPrivatePartnershipDetails, null);
  assert.ok(Object.values(normalized.waste).every((value) => value === null));

  const finance = normalizeMonitoringDraft({
    ...baseDraft(),
    linkedToFinanceProvider: true,
    financeEntries: [
      { financeType: "loan", amount: 250000, otherDescription: null },
      { financeType: "other", amount: 50000, otherDescription: "Supplier credit" },
    ],
  }, false);
  assert.deepEqual(monitoringSubmissionIssues(
    finance,
    new Set(["linked_to_finance_provider"]),
    new Set(),
    false,
    false
  ), []);

  const staleEvidenceIssues = monitoringSubmissionIssues(
    baseDraft(),
    new Set(["technology_adopted"]),
    new Set(),
    false,
    false
  );
  assert.ok(staleEvidenceIssues.some((issue) => issue.includes("Remove the stale evidence")));
}

function testMigrationContract() {
  const sql = readFileSync("drizzle/0039_mel_monitoring_review_fixes.sql", "utf8");
  assert.match(sql, /WHERE "programme_year" = 1 AND "sequence" = 1/);
  assert.match(sql, /ON CONFLICT \("programme_year", "sequence"\) DO UPDATE/);
  for (const date of ["2026-06-01", "2026-08-31", "2026-09-01", "2026-11-30", "2026-12-01", "2027-02-28", "2027-03-01", "2027-05-31"]) {
    assert.ok(sql.includes(date), `Migration must contain ${date}`);
  }
  assert.match(sql, /INSERT INTO "mel_monitoring_finance_entries"/);
}

testAgeCategories();
testNormalizationAndBranches();
testMigrationContract();
console.log("MEL monitoring review remediation tests passed.");
