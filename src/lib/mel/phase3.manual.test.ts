import assert from "node:assert/strict";
import { runDqa, visibleDqaIssues, type DqaInput } from "./dqa-engine";
import {
  expectedReviewStage,
  isCollectorEditableStatus,
  resolveReviewTransition,
} from "./review-workflow";

function validDqaInput(): DqaInput {
  return {
    profileSnapshot: {
      businessName: "Test Enterprise",
      enterpriseId: 1,
      applicantName: "Test Owner",
      sector: "agriculture",
      track: "foundation",
      county: "nairobi",
    },
    visitDate: "2026-07-15",
    periodStartDate: "2026-06-01",
    periodEndDate: "2026-08-31",
    collectionCloseDate: "2026-09-18",
    sourceMode: "current",
    submittedAt: new Date("2026-09-01T08:00:00Z"),
    revenue: 900_000,
    costs: 600_000,
    storedProfitLoss: 300_000,
    directQualityJobs: { total: 2, male: 1, female: 1, youth: 1, plwd: 0, refugee: 0 },
    directNonQualityJobs: { total: 0, male: 0, female: 0, youth: 0, plwd: 0, refugee: 0 },
    indirectJobs: { total: 1, male: 1, female: 0, youth: 1, plwd: 0, refugee: 0 },
    financeLinked: false,
    financeType: null,
    financeValue: null,
    financeEntryTypes: [],
    waste: [],
    evidence: [{ id: 1, questionCode: "profitability", fileKey: "profit-doc" }],
    priorApproved: null,
    duplicateEvidenceKeys: new Set(),
  };
}

function testWorkflow() {
  assert.equal(expectedReviewStage("submitted", "bds_edo"), "redo");
  assert.equal(expectedReviewStage("submitted", "redo"), "mel");
  assert.equal(expectedReviewStage("mel_review", "bds_edo"), "mel");
  assert.equal(expectedReviewStage("approved", "bds_edo"), null);

  assert.deepEqual(
    resolveReviewTransition({
      status: "submitted",
      collectorRole: "bds_edo",
      actorRole: "redo",
      actorId: "redo-1",
      collectorId: "edo-1",
      decision: "approve",
    }),
    { stage: "redo", action: "advanced", nextStatus: "mel_review" }
  );
  assert.deepEqual(
    resolveReviewTransition({
      status: "mel_review",
      collectorRole: "bds_edo",
      actorRole: "mel",
      actorId: "mel-1",
      collectorId: "edo-1",
      decision: "approve",
    }),
    { stage: "mel", action: "approved", nextStatus: "approved" }
  );
  assert.deepEqual(
    resolveReviewTransition({
      status: "submitted",
      collectorRole: "redo",
      actorRole: "mel",
      actorId: "mel-1",
      collectorId: "redo-1",
      decision: "return",
    }),
    { stage: "mel", action: "returned", nextStatus: "returned_by_mel" }
  );
  assert.throws(
    () =>
      resolveReviewTransition({
        status: "submitted",
        collectorRole: "redo",
        actorRole: "mel",
        actorId: "same-user",
        collectorId: "same-user",
        decision: "approve",
      }),
    /cannot approve or return their own report/
  );
  assert.deepEqual(
    resolveReviewTransition({
      status: "approved",
      collectorRole: "bds_edo",
      actorRole: "mel",
      actorId: "mel-1",
      collectorId: "edo-1",
      decision: "reopen",
    }),
    { stage: "administrative", action: "reopened", nextStatus: "reopened" }
  );
  assert.equal(isCollectorEditableStatus("returned_by_redo"), true);
  assert.equal(isCollectorEditableStatus("reopened"), true);
  assert.equal(isCollectorEditableStatus("mel_review"), false);
  assert.equal(isCollectorEditableStatus("approved"), false);
}

function testDqa() {
  assert.deepEqual(runDqa(validDqaInput()), []);

  const missingDirectNonQuality = { ...validDqaInput(), directNonQualityJobs: null };
  assert.deepEqual(
    runDqa(missingDirectNonQuality).filter((issue) => issue.ruleCode === "completeness.direct non-quality_jobs"),
    [],
    "Missing direct non-quality jobs should default to zero and not fail completeness"
  );

  const wrongProfit = { ...validDqaInput(), storedProfitLoss: 250_000 };
  assert.ok(runDqa(wrongProfit).some((issue) => issue.ruleCode === "consistency.profit_calculation"));

  const invalidJobs = {
    ...validDqaInput(),
    directQualityJobs: { total: 2, male: 2, female: 1, youth: 3, plwd: 0, refugee: 0 },
  };
  assert.ok(runDqa(invalidJobs).filter((issue) => issue.category === "consistency").length >= 2);

  const catchUp = { ...validDqaInput(), sourceMode: "catch_up" as const };
  assert.ok(runDqa(catchUp).some((issue) => issue.ruleCode === "timeliness.catch_up"));

  const outsidePeriod = { ...validDqaInput(), visitDate: "2026-09-15" };
  assert.ok(runDqa(outsidePeriod).some((issue) => issue.ruleCode === "timeliness.visit_outside_period"));

  const revenueJump = {
    ...validDqaInput(),
    priorApproved: {
      revenue: 300_000,
      profitLoss: 100_000,
      directJobsTotal: 1,
      indirectJobsTotal: 0,
    },
  };
  assert.ok(runDqa(revenueJump).some((issue) => issue.ruleCode === "plausibility.revenue_change"));

  const reusedEvidence = {
    ...validDqaInput(),
    evidence: [{ id: 7, questionCode: "jobs", fileKey: "shared-key" }],
    duplicateEvidenceKeys: new Set(["shared-key"]),
  };
  assert.ok(runDqa(reusedEvidence).some((issue) => issue.ruleCode.includes("reused_evidence")));

  const negativeRevenue = { ...validDqaInput(), revenue: -1 };
  assert.ok(runDqa(negativeRevenue).some((issue) => issue.ruleCode === "validity.negative_revenue"));

  const invalidFinance = { ...validDqaInput(), financeEntryTypes: ["not_a_real_type"] };
  assert.ok(runDqa(invalidFinance).some((issue) => issue.category === "validity"));

  const negativeWaste = { ...validDqaInput(), waste: [{ stream: "plastic", kilograms: -5 }] };
  assert.ok(runDqa(negativeWaste).some((issue) => issue.ruleCode === "validity.negative_waste.0"));

  const missingProfitEvidence = { ...validDqaInput(), evidence: [] };
  assert.ok(runDqa(missingProfitEvidence).some((issue) => issue.ruleCode === "traceability.profitability_evidence"));

  const staleNonQuality = {
    id: 1,
    status: "open",
    ruleCode: "completeness.direct non-quality_jobs",
  };
  const stillOpen = { id: 2, status: "open", ruleCode: "completeness.financials" };
  const accepted = { id: 3, status: "accepted", ruleCode: "timeliness.catch_up" };
  const resolved = { id: 4, status: "resolved", ruleCode: "completeness.visit_date" };
  assert.deepEqual(
    visibleDqaIssues(
      [staleNonQuality, stillOpen, accepted, resolved],
      new Set(["completeness.financials", "timeliness.catch_up"])
    ),
    [stillOpen, accepted],
    "Stale open DQA findings should not stay visible after the rule no longer fails"
  );
}

testWorkflow();
testDqa();
console.log("MEL Phase 3 tests passed.");
