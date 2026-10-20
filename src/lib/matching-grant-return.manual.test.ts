import assert from "node:assert/strict";
import {
  type MatchingGrantApplicationStatus,
} from "@/lib/matching-grant-return";

function canApplicantEdit(status: MatchingGrantApplicationStatus): boolean {
  return status === "draft" || status === "returned_for_correction";
}

function canScore(status: MatchingGrantApplicationStatus): boolean {
  return status === "submitted";
}

function shouldShowReapplicationGate(status: MatchingGrantApplicationStatus): boolean {
  return status === "returned_for_correction";
}

assert.equal(canApplicantEdit("draft"), true);
assert.equal(canApplicantEdit("returned_for_correction"), true);
assert.equal(canApplicantEdit("submitted"), false);

assert.equal(canScore("submitted"), true);
assert.equal(canScore("returned_for_correction"), false);
assert.equal(canScore("draft"), false);

assert.equal(shouldShowReapplicationGate("returned_for_correction"), true);
assert.equal(shouldShowReapplicationGate("submitted"), false);

console.log("matching-grant-return.manual.test.ts: all assertions passed");
