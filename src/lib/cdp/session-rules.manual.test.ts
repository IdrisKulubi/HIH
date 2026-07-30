/**
 * Run: npx tsx src/lib/cdp/session-rules.manual.test.ts
 */
import assert from "node:assert/strict";
import type { CdpBusinessSupportSession } from "@/db/schema";
import {
  validatePreviousSessionGate,
  validatePreviousSessionPlanGate,
  validateSessionEvidence,
} from "./session-rules";

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

  console.log("session-rules.manual.test.ts: all assertions passed");
}

main();
