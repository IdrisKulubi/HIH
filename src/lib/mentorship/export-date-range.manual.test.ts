import assert from "node:assert/strict";
import {
  mentorshipExportRangeError,
  mentorshipExportRangeLabel,
  parseMentorshipExportDateParams,
  resolveMentorshipExportRange,
  sessionInMentorshipExportRange,
  ymdInRange,
} from "./export-date-range";

const now = new Date("2026-08-30T10:00:00");

const last30 = resolveMentorshipExportRange("30d", "", "", now);
assert.equal(last30.from, "2026-08-01");
assert.equal(last30.to, "2026-08-30");

const month = resolveMentorshipExportRange("month", "", "", now);
assert.equal(month.from, "2026-08-01");
assert.equal(month.to, "2026-08-30");

const all = resolveMentorshipExportRange("all", "2026-01-01", "2026-02-01", now);
assert.equal(all.from, "");
assert.equal(all.to, "");

assert.equal(ymdInRange("2026-08-15T12:00:00.000Z", "2026-08-01", "2026-08-30"), true);
assert.equal(ymdInRange("2026-07-31T12:00:00.000Z", "2026-08-01", "2026-08-30"), false);

const session = {
  scheduledDate: "2026-01-10T00:00:00.000Z",
  completedDate: null,
  approvedAt: "2026-08-12T00:00:00.000Z",
  updatedAt: "2026-08-11T00:00:00.000Z",
  status: "completed",
};
assert.equal(sessionInMentorshipExportRange(session, "2026-08-01", "2026-08-30"), true);
assert.equal(sessionInMentorshipExportRange(session, "2026-02-01", "2026-02-28"), false);

const pending = {
  ...session,
  approvedAt: null,
  status: "pending_approval",
  updatedAt: "2026-08-20T00:00:00.000Z",
};
assert.equal(sessionInMentorshipExportRange(pending, "2026-08-01", "2026-08-30"), true);

const params = parseMentorshipExportDateParams(
  new URLSearchParams("from=2026-08-01&to=2026-08-30")
);
assert.equal(params.ok, true);
if (params.ok) {
  assert.equal(params.from, "2026-08-01");
  assert.equal(params.to, "2026-08-30");
}

const inverted = parseMentorshipExportDateParams(
  new URLSearchParams("from=2026-08-30&to=2026-08-01")
);
assert.equal(inverted.ok, false);

assert.equal(mentorshipExportRangeError("2026-08-30", "2026-08-01"), "Start date must be on or before the end date.");
assert.equal(mentorshipExportRangeLabel("2026-08-01", "2026-08-30"), "1 Aug 2026 to 30 Aug 2026");
assert.equal(mentorshipExportRangeLabel(null, null), "All time");

console.log("export-date-range.manual.test.ts: all assertions passed");
