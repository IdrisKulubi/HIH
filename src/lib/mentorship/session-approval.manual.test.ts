import assert from "node:assert/strict";
import {
  mentorshipPendingLabel,
  mentorshipSessionAwaitingEdo,
  mentorshipSessionAwaitingRedo,
  sessionVisibleToEdoReviewer,
  sessionVisibleToRedoReviewer,
} from "./session-approval";

function testStages() {
  assert.equal(
    mentorshipSessionAwaitingEdo({ status: "pending_approval", edoApprovedById: null }),
    true
  );
  assert.equal(
    mentorshipSessionAwaitingRedo({ status: "pending_approval", edoApprovedById: "edo-1" }),
    true
  );
  assert.equal(
    mentorshipPendingLabel({ status: "pending_approval", edoApprovedById: null }),
    "Awaiting EDO approval"
  );
  assert.equal(
    mentorshipPendingLabel({ status: "pending_approval", edoApprovedById: "edo-1" }),
    "Awaiting REDO approval"
  );
}

function testEdoVisibility() {
  const map = new Map([[10, new Set(["edo-a"])]]);
  assert.equal(
    sessionVisibleToEdoReviewer({ businessId: 10, edoApprovedById: null }, map, "edo-a"),
    true
  );
  assert.equal(
    sessionVisibleToEdoReviewer({ businessId: 10, edoApprovedById: null }, map, "edo-b"),
    false
  );
  assert.equal(
    sessionVisibleToEdoReviewer({ businessId: 99, edoApprovedById: null }, map, "edo-b"),
    true
  );
  const multi = new Map([[20, new Set(["edo-a", "edo-c"])]]);
  assert.equal(
    sessionVisibleToEdoReviewer({ businessId: 20, edoApprovedById: null }, multi, "edo-a"),
    true
  );
  assert.equal(
    sessionVisibleToEdoReviewer({ businessId: 20, edoApprovedById: null }, multi, "edo-c"),
    true
  );
  assert.equal(
    sessionVisibleToEdoReviewer({ businessId: 20, edoApprovedById: null }, multi, "edo-b"),
    false
  );
  assert.equal(sessionVisibleToRedoReviewer({ edoApprovedById: "edo-1" }), true);
  assert.equal(sessionVisibleToRedoReviewer({ edoApprovedById: null }), false);
}

testStages();
testEdoVisibility();
console.log("Mentorship session approval tests passed.");
