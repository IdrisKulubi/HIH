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
  const map = new Map([[10, "edo-a"]]);
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
  assert.equal(sessionVisibleToRedoReviewer({ edoApprovedById: "edo-1" }), true);
  assert.equal(sessionVisibleToRedoReviewer({ edoApprovedById: null }), false);
}

testStages();
testEdoVisibility();
console.log("Mentorship session approval tests passed.");
