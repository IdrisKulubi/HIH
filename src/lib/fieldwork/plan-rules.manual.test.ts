import assert from "node:assert/strict";
import {
  canCancelPlan, canEditPlan, canReviewPlan, canTransition, canViewPlan, derivePlanWindow, planInputSchema, PLAN_TRANSITIONS, type PlanStatus,
} from "./plan-rules";
import { addMinutesLocal, isoToNairobiLocal, nairobiLocalToIso } from "./time";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed++; console.log(`ok - ${name}`); }

const now = new Date("2026-11-05T06:00:00Z");
const visit = (businessId: number, start: string, minutes = 60, extra = {}) => ({ businessId, agenda: "Review bookkeeping", scheduledStartAt: start, estimatedDurationMinutes: minutes, staffIds: ["edo-1"], ...extra });
const plan = (status: PlanStatus, extra = {}) => ({ createdById: "edo-1", assignedRedoId: "redo-1", status, ...extra });

test("schema rejects a visit with no agenda or no officer", () => {
  assert.equal(planInputSchema.safeParse({ title: "Week 45", visits: [visit(1, "2026-11-06T06:00:00Z", 60, { agenda: " " })] }).success, false);
  assert.equal(planInputSchema.safeParse({ title: "Week 45", visits: [visit(1, "2026-11-06T06:00:00Z", 60, { staffIds: [] })] }).success, false);
  assert.equal(planInputSchema.safeParse({ title: "Week 45", visits: [] }).success, false);
});

test("plan window spans earliest start to latest end", () => {
  const input = planInputSchema.parse({ title: "Week 45", visits: [visit(1, "2026-11-06T09:00:00Z", 60), visit(2, "2026-11-06T06:00:00Z", 30)] });
  const w = derivePlanWindow(input, now);
  assert.ok(w.ok);
  assert.equal(w.scheduledStartAt.toISOString(), "2026-11-06T06:00:00.000Z");
  assert.equal(w.scheduledEndAt.toISOString(), "2026-11-06T10:00:00.000Z");
  assert.equal(w.estimatedDurationMinutes, 240);
});

test("duplicate enterprises and past visits are rejected", () => {
  const dup = planInputSchema.parse({ title: "Week 45", visits: [visit(1, "2026-11-06T06:00:00Z"), visit(1, "2026-11-06T08:00:00Z")] });
  assert.equal(derivePlanWindow(dup, now).ok, false);
  const past = planInputSchema.parse({ title: "Week 45", visits: [visit(1, "2026-11-04T06:00:00Z")] });
  assert.equal(derivePlanWindow(past, now).ok, false);
});

test("status transitions are constrained", () => {
  assert.ok(canTransition("draft", "submitted"));
  assert.ok(canTransition("submitted", "approved"));
  assert.ok(canTransition("returned", "submitted"));
  assert.ok(canTransition("approved", "cancelled"));
  assert.equal(canTransition("draft", "approved"), false);
  assert.equal(canTransition("approved", "submitted"), false);
  assert.equal(canTransition("cancelled", "draft"), false);
  assert.deepEqual(PLAN_TRANSITIONS.cancelled, []);
});

test("only the assigned REDO or an admin can review, never the author", () => {
  const submitted = plan("submitted");
  assert.ok(canReviewPlan({ id: "redo-1", role: "redo" }, submitted));
  assert.equal(canReviewPlan({ id: "redo-2", role: "redo" }, submitted), false);
  assert.ok(canReviewPlan({ id: "admin-1", role: "admin" }, plan("submitted", { assignedRedoId: null })));
  assert.equal(canReviewPlan({ id: "edo-1", role: "admin" }, submitted), false);
  assert.equal(canReviewPlan({ id: "o-1", role: "oversight" }, submitted), false);
  assert.equal(canReviewPlan({ id: "redo-1", role: "redo" }, plan("approved")), false);
});

test("visibility is scoped by role and ownership", () => {
  assert.ok(canViewPlan({ id: "edo-1", role: "bds_edo" }, plan("draft")));
  assert.equal(canViewPlan({ id: "edo-2", role: "bds_edo" }, plan("draft")), false);
  assert.equal(canViewPlan({ id: "redo-1", role: "redo" }, plan("draft")), false);
  assert.ok(canViewPlan({ id: "redo-1", role: "redo" }, plan("submitted")));
  assert.equal(canViewPlan({ id: "redo-2", role: "redo" }, plan("submitted")), false);
  assert.ok(canViewPlan({ id: "o-1", role: "oversight" }, plan("approved")));
});

test("approved plans are immutable but cancellable", () => {
  const owner = { id: "edo-1", role: "bds_edo" };
  assert.ok(canEditPlan(owner, plan("draft")));
  assert.ok(canEditPlan(owner, plan("returned")));
  assert.equal(canEditPlan(owner, plan("approved")), false);
  assert.equal(canEditPlan(owner, plan("submitted")), false);
  assert.ok(canCancelPlan(owner, plan("approved")));
  assert.equal(canCancelPlan(owner, plan("cancelled")), false);
  assert.equal(canCancelPlan({ id: "edo-2", role: "bds_edo" }, plan("approved")), false);
});

test("Nairobi time conversion is UTC+3 and round-trips", () => {
  assert.equal(nairobiLocalToIso("2026-11-06T09:00"), "2026-11-06T06:00:00.000Z");
  assert.equal(isoToNairobiLocal("2026-11-06T06:00:00.000Z"), "2026-11-06T09:00");
  assert.equal(addMinutesLocal("2026-11-06T23:30", 60), "2026-11-07T00:30");
  assert.equal(nairobiLocalToIso("not a date"), null);
});

console.log(`\n${passed} tests passed`);
