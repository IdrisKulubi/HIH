/**
 * Run: npx tsx src/lib/cdp/session-rules.manual.test.ts
 */
import assert from "node:assert/strict";
import type { CdpBusinessSupportSession } from "@/db/schema";
import type { CdpSessionActionItem } from "@/db/schema";
import {
  validatePreviousSessionGate,
  validatePreviousSessionPlanGate,
  validateSessionActionItemsForApproval,
  validateSessionEvidence,
  validateSessionKeyActionsNeedActionItems,
} from "./session-rules";

function fakeActionItem(
  overrides: Partial<CdpSessionActionItem> = {}
): CdpSessionActionItem {
  return {
    id: 1,
    sessionId: 1,
    description: "Follow up",
    status: "open",
    statusNotes: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function fakeSession(
  overrides: Partial<CdpBusinessSupportSession> = {}
): CdpBusinessSupportSession {
  return {
    id: 1,
    planId: 1,
    focusCode: "A",
    sessionNumber: 1,
    sessionDate: new Date(),
    focusCodes: ["A"],
    agenda: null,
    subtopic: null,
    supportType: null,
    durationHours: null,
    keyActionsAgreed: null,
    challengesRaised: null,
    nextSteps: null,
    followUpDate: null,
    bootcampWeek: null,
    sessionType: "physical",
    meetingLink: null,
    evidenceNotes: null,
    evidenceUrls: [],
    evidenceFiles: [],
    conductedById: "user-1",
    approvalStatus: "pending",
    rejectionReason: null,
    approvedById: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function main() {
  assert.equal(
    validateSessionEvidence({
      sessionNumber: 2,
      sessionType: "physical",
      evidenceUrls: ["https://example.com/photo.jpg"],
    }),
    null
  );
  assert.equal(
    validateSessionEvidence({
      sessionNumber: 2,
      sessionType: "virtual",
      evidenceUrls: [],
      meetingLink: "https://meet.example.com/room",
    }),
    null
  );

  assert.equal(validatePreviousSessionPlanGate(1, null), null);
  assert.equal(
    validatePreviousSessionPlanGate(2, null),
    "Plan Session 1 before planning Session 2."
  );
  assert.equal(validatePreviousSessionPlanGate(2, fakeSession({ approvalStatus: "pending" })), null);
  assert.equal(validatePreviousSessionPlanGate(3, fakeSession({ sessionNumber: 2 })), null);

  assert.equal(validatePreviousSessionGate(2, fakeSession({ approvalStatus: "pending" })), "Session 1 must be approved before logging Session 2.");
  assert.equal(validatePreviousSessionGate(2, fakeSession({ approvalStatus: "approved" })), null);

  const prevWithMilestones = {
    ...fakeSession({ approvalStatus: "approved", keyActionsAgreed: "Train staff" }),
    actionItems: [] as CdpSessionActionItem[],
  };
  assert.match(
    validatePreviousSessionGate(2, prevWithMilestones) ?? "",
    /Session 1 has key actions agreed but no structured action items/
  );

  const prevWithOpenItem = {
    ...fakeSession({ approvalStatus: "approved", keyActionsAgreed: "Train staff" }),
    actionItems: [fakeActionItem({ status: "open" })],
  };
  assert.match(
    validatePreviousSessionGate(2, prevWithOpenItem) ?? "",
    /Session 1 still has open action items/
  );

  const prevClosed = {
    ...fakeSession({ approvalStatus: "approved", keyActionsAgreed: "Train staff" }),
    actionItems: [fakeActionItem({ status: "done" })],
  };
  assert.equal(validatePreviousSessionGate(2, prevClosed), null);

  assert.equal(
    validateSessionKeyActionsNeedActionItems(
      { sessionNumber: 1, keyActionsAgreed: "Milestone A", actionItems: [] }
    ),
    "Session 1 has key agreed milestones but no structured action items. Add action items in Session action items, then mark them done or waived before submitting."
  );
  assert.equal(
    validateSessionKeyActionsNeedActionItems(
      { sessionNumber: 1, keyActionsAgreed: null, actionItems: [] },
      "From form"
    ),
    "Session 1 has key agreed milestones but no structured action items. Add action items in Session action items, then mark them done or waived before submitting."
  );
  assert.equal(
    validateSessionKeyActionsNeedActionItems({
      sessionNumber: 1,
      keyActionsAgreed: "Milestone A",
      actionItems: [fakeActionItem()],
    }),
    null
  );

  assert.match(
    validateSessionActionItemsForApproval({
      sessionNumber: 1,
      keyActionsAgreed: "Milestone A",
      actionItems: [],
    }) ?? "",
    /before approval/
  );
  assert.match(
    validateSessionActionItemsForApproval({
      sessionNumber: 1,
      keyActionsAgreed: "Milestone A",
      actionItems: [fakeActionItem({ status: "open" })],
    }) ?? "",
    /open action items/
  );
  assert.equal(
    validateSessionActionItemsForApproval({
      sessionNumber: 1,
      keyActionsAgreed: "Milestone A",
      actionItems: [fakeActionItem({ status: "waived" })],
    }),
    null
  );

  console.log("session-rules.manual.test.ts: all assertions passed");
}

main();
