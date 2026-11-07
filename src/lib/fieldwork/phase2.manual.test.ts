import assert from "node:assert/strict";
import { canEditReport, canReviewReport, countWords, validateReportForSubmit } from "./report-rules";
import { combineEvaluations, distanceMeters, evaluateReading, getVerificationPolicy, parseCoordinates } from "./verification-policy";
import { startOfNairobiDay } from "./time";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed++; console.log(`ok - ${name}`); }

const policy = getVerificationPolicy({});
const enterprise = { latitude: -1.2921, longitude: 36.8219 };
const near = { latitude: -1.2923, longitude: 36.8221, accuracyMeters: 20 };
const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

test("policy defaults and env overrides", () => {
  assert.deepEqual(policy, { radiusMeters: 300, maxAccuracyMeters: 100 });
  assert.deepEqual(getVerificationPolicy({ FIELDWORK_VERIFY_RADIUS_METERS: "150", FIELDWORK_MAX_ACCURACY_METERS: "abc" }), { radiusMeters: 150, maxAccuracyMeters: 100 });
});

test("coordinate parsing rejects untrusted values", () => {
  assert.deepEqual(parseCoordinates("-1.286389, 36.817223"), { latitude: -1.286389, longitude: 36.817223 });
  assert.equal(parseCoordinates("Nairobi"), null);
  assert.equal(parseCoordinates("0, 0"), null);
  assert.equal(parseCoordinates("95, 10"), null);
  assert.equal(parseCoordinates(null), null);
});

test("distance is roughly correct", () => {
  const d = distanceMeters({ latitude: -1.2921, longitude: 36.8219 }, { latitude: -1.2921, longitude: 36.8319 });
  assert.ok(d > 1050 && d < 1150, `got ${d}`);
});

test("close, accurate reading is verified", () => {
  const r = evaluateReading({ enterprise, reading: near, state: "granted" }, policy);
  assert.equal(r.result, "verified");
});

test("permission denied, unavailable and timeout need review", () => {
  for (const state of ["denied", "unavailable", "timeout"] as const) {
    const r = evaluateReading({ enterprise, reading: null, state }, policy);
    assert.equal(r.result, "needs_review");
    assert.ok(r.reason);
  }
});

test("poor accuracy, far away and missing enterprise coordinates need review", () => {
  assert.equal(evaluateReading({ enterprise, reading: { ...near, accuracyMeters: 500 }, state: "granted" }, policy).result, "needs_review");
  assert.equal(evaluateReading({ enterprise, reading: { latitude: -1.35, longitude: 36.9, accuracyMeters: 10 }, state: "granted" }, policy).result, "needs_review");
  const none = evaluateReading({ enterprise: null, reading: near, state: "granted" }, policy);
  assert.equal(none.result, "needs_review");
  assert.match(none.reason!, /No trusted enterprise coordinates/);
});

test("a visit is verified only if both check-in and check-out are", () => {
  const ok = evaluateReading({ enterprise, reading: near, state: "granted" }, policy);
  const bad = evaluateReading({ enterprise, reading: null, state: "denied" }, policy);
  assert.equal(combineEvaluations(ok, ok).result, "verified");
  assert.equal(combineEvaluations(ok, bad).result, "needs_review");
  assert.equal(combineEvaluations(null, ok).result, "needs_review");
  assert.match(combineEvaluations(ok, bad).notes!, /Check-out/);
});

test("report minimum word counts are enforced per field", () => {
  const good = { activitiesConducted: words(150), findingsAndGaps: words(200), enterpriseChallenges: "Cash flow gaps.......", solutionsOffered: "Introduced a ledger.", recommendations: words(150), actionPoints: "Weekly cash review", timeline: "Within 30 days" };
  assert.deepEqual(validateReportForSubmit(good), {});
  assert.ok(validateReportForSubmit({ ...good, activitiesConducted: words(149) }).activitiesConducted);
  assert.ok(validateReportForSubmit({ ...good, findingsAndGaps: words(199) }).findingsAndGaps);
  assert.ok(validateReportForSubmit({ ...good, recommendations: words(10) }).recommendations);
  assert.ok(validateReportForSubmit({ ...good, timeline: "" }).timeline);
  assert.equal(countWords("  a  b\nc "), 3);
});

test("report edit and review rights", () => {
  const owner = { id: "edo-1", role: "bds_edo" };
  const routing = (status: string) => ({ planCreatedById: "edo-1", assignedRedoId: "redo-1", status });
  assert.ok(canEditReport(owner, routing("draft")));
  assert.ok(canEditReport(owner, routing("returned")));
  assert.equal(canEditReport(owner, routing("submitted")), false);
  assert.equal(canEditReport(owner, routing("approved")), false);
  assert.equal(canEditReport({ id: "edo-2", role: "bds_edo" }, routing("draft")), false);
  assert.ok(canReviewReport({ id: "redo-1", role: "redo" }, routing("submitted")));
  assert.equal(canReviewReport({ id: "redo-2", role: "redo" }, routing("submitted")), false);
  assert.equal(canReviewReport({ id: "edo-1", role: "admin" }, routing("submitted")), false);
  assert.equal(canReviewReport({ id: "redo-1", role: "redo" }, routing("approved")), false);
});

test("Nairobi business day boundary", () => {
  assert.equal(startOfNairobiDay(new Date("2026-11-05T20:59:00Z")).toISOString(), "2026-11-04T21:00:00.000Z");
  assert.equal(startOfNairobiDay(new Date("2026-11-05T21:01:00Z")).toISOString(), "2026-11-05T21:00:00.000Z");
});

console.log(`\n${passed} tests passed`);
