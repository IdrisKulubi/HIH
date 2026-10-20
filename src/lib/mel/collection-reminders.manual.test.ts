import assert from "node:assert/strict";
import { MEL_PROGRAMME_REPORTING_PERIODS } from "./programme-calendar";
import {
  addIsoDays,
  collectionReminderKindForDate,
  formatCollectionDate,
  isInsideCollectionWindow,
  monitoringReportNeedsCollection,
} from "./collection-reminders";

function period(code: string) {
  const match = MEL_PROGRAMME_REPORTING_PERIODS.find((item) => item.code === code);
  assert.ok(match, code);
  return match;
}

function testCalendarAlignment() {
  const y1Mq2 = { ...period("Y1-MQ2"), status: "open" as const };
  assert.equal(y1Mq2.endDate, "2026-11-30");
  assert.equal(y1Mq2.collectionOpenDate, "2026-12-01");
  assert.equal(y1Mq2.collectionCloseDate, "2026-12-10");
  assert.equal(collectionReminderKindForDate(period("Y1-MQ2"), "2026-12-01"), null);
  assert.equal(collectionReminderKindForDate(y1Mq2, "2026-11-30"), null);
  assert.equal(collectionReminderKindForDate(y1Mq2, "2026-12-01"), "opening");
  assert.equal(collectionReminderKindForDate(y1Mq2, "2026-12-07"), "opening");
  assert.equal(collectionReminderKindForDate(y1Mq2, "2026-12-08"), "deadline");
  assert.equal(collectionReminderKindForDate(y1Mq2, "2026-12-10"), "deadline");
  assert.equal(collectionReminderKindForDate(y1Mq2, "2026-12-11"), null);

  const y1Mq1 = period("Y1-MQ1");
  assert.equal(y1Mq1.collectionOpenDate, "2026-09-01");
  assert.equal(y1Mq1.collectionCloseDate, "2026-09-18");
  assert.equal(collectionReminderKindForDate(y1Mq1, "2026-09-01"), "opening");
  assert.equal(collectionReminderKindForDate(y1Mq1, "2026-09-15"), "opening");
  assert.equal(collectionReminderKindForDate(y1Mq1, "2026-09-16"), "deadline");
  assert.equal(collectionReminderKindForDate(y1Mq1, "2026-09-29"), null);

  const planned = { ...period("Y2-MQ1"), status: "planned" as const };
  assert.equal(isInsideCollectionWindow(planned, "2027-03-01"), true);
  assert.equal(collectionReminderKindForDate(planned, "2027-03-01"), null);
}

function testShortWindowAndOutstandingReports() {
  const oneDay = {
    status: "open" as const,
    allowCatchUp: true,
    collectionOpenDate: "2027-06-01",
    collectionCloseDate: "2027-06-01",
  };
  assert.equal(collectionReminderKindForDate(oneDay, "2027-06-01"), "deadline");
  assert.equal(addIsoDays("2026-12-10", -2), "2026-12-08");
  assert.equal(formatCollectionDate("2026-12-01"), "1 December 2026");
  assert.equal(monitoringReportNeedsCollection(null), true);
  assert.equal(monitoringReportNeedsCollection("draft"), true);
  assert.equal(monitoringReportNeedsCollection("returned_by_mel"), true);
  assert.equal(monitoringReportNeedsCollection("submitted"), false);
  assert.equal(monitoringReportNeedsCollection("approved"), false);
}

testCalendarAlignment();
testShortWindowAndOutstandingReports();
console.log("MEL collection reminder tests passed.");
