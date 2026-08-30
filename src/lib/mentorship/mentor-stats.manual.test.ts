import assert from "node:assert/strict";
import { computeMentorStats } from "./mentor-stats";

const stats = computeMentorStats([
  {
    id: 1,
    businessName: "A",
    applicantName: "Ann",
    status: "active",
    sessions: [
      { status: "completed", durationMinutes: 60 },
      { status: "scheduled", durationMinutes: null },
    ],
  },
  {
    id: 2,
    businessName: "B",
    applicantName: "Ben",
    status: "active",
    sessions: [
      { status: "scheduled", durationMinutes: null },
      { status: "pending_approval", durationMinutes: 30 },
    ],
  },
]);

assert.equal(stats.businessesAssigned, 2);
assert.equal(stats.businessesWithApprovedSession, 1);
assert.equal(stats.businessApprovedPercent, 50);
assert.equal(stats.sessionsApproved, 1);
assert.equal(stats.sessionsPending, 1);
assert.equal(stats.totalHours, 1);

const empty = computeMentorStats([]);
assert.equal(empty.businessApprovedPercent, 0);
assert.equal(empty.enterprises.length, 0);

console.log("mentor-stats.manual.test.ts: all assertions passed");
