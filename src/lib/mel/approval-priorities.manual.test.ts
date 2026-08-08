import assert from "node:assert/strict";
import {
  buildApprovalPrioritySummaryText,
  extractApprovalPriorities,
} from "./approval-priorities";

function testExtractApprovalPriorities() {
  const allYes = extractApprovalPriorities({
    response: {
      businessPlanImproved: true,
      marketResearchCompleted: true,
      technologyAdopted: true,
      newProductsDeveloped: true,
      linkedToFinanceProvider: true,
      financialPlanCompleted: true,
      activeInsurance: true,
      investorReadinessCompleted: true,
      lifeCycleAssessmentCompleted: true,
      ecoCertificationActive: true,
      esgReportCompleted: true,
      socialSafeguardingGuidelines: true,
      strategicPartnerships: true,
      forumParticipation: true,
      publicPrivatePartnership: true,
    },
  });
  assert.equal(allYes.priorities.length, 0);

  const mixed = extractApprovalPriorities({
    response: {
      businessPlanImproved: false,
      marketResearchCompleted: null,
      technologyAdopted: true,
      linkedToFinanceProvider: false,
      financialPlanCompleted: true,
      activeInsurance: true,
      investorReadinessCompleted: true,
      lifeCycleAssessmentCompleted: true,
      ecoCertificationActive: true,
      esgReportCompleted: true,
      socialSafeguardingGuidelines: true,
      strategicPartnerships: true,
      forumParticipation: true,
      publicPrivatePartnership: true,
      newProductsDeveloped: true,
    },
    skipQuestionCodes: ["business_plan_improved"],
    reviewerNote: "Focus on finance linkages next quarter.",
    learningActions: [{ finding: "Weak records", agreedAction: "Schedule finance coaching" }],
  });

  assert.equal(mixed.priorities.length, 2);
  assert.equal(mixed.priorities.some((item) => item.code === "business_plan_improved"), false);
  assert.equal(mixed.priorities.find((item) => item.code === "market_research_completed")?.status, "not_answered");
  assert.equal(mixed.priorities.find((item) => item.code === "linked_to_finance_provider")?.status, "not_achieved");
  assert.equal(mixed.reviewerNote, "Focus on finance linkages next quarter.");
  assert.equal(mixed.learningActions.length, 1);

  const summaryText = buildApprovalPrioritySummaryText(mixed);
  assert.ok(summaryText.includes("Priority for next quarter"));
  assert.ok(summaryText.includes("Reviewer note"));
  assert.ok(summaryText.includes("Open learning actions"));
}

testExtractApprovalPriorities();
console.log("approval-priorities.manual.test.ts passed");
