import { z } from "zod";

export const EDO_ROLES = ["bds_edo", "admin"] as const;
/** Roles that may approve or return a plan (subject to routing). */
export const REVIEWER_ROLES = ["redo", "admin"] as const;
/** Roles that may see plans they do not own, read-only. */
export const OBSERVER_ROLES = ["oversight"] as const;
export const STAFF_ASSIGNABLE_ROLES = ["bds_edo", "redo", "admin"] as const;

export type PlanStatus = "draft" | "submitted" | "returned" | "approved" | "cancelled";

/** The only permitted plan status transitions. Every action must pass through `canTransition`. */
export const PLAN_TRANSITIONS: Record<PlanStatus, readonly PlanStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "returned", "cancelled", "draft"],
  returned: ["submitted", "cancelled"],
  approved: ["cancelled", "draft", "returned"],
  cancelled: [],
};

export function canTransition(from: PlanStatus, to: PlanStatus) {
  return PLAN_TRANSITIONS[from].includes(to);
}

export const EDITABLE_STATUSES: readonly PlanStatus[] = ["draft", "returned"];

export function hasRole(role: string | null | undefined, roles: readonly string[]) {
  return !!role && roles.includes(role);
}

export const visitInputSchema = z.object({
  businessId: z.number().int().positive(),
  agenda: z.string().trim().min(3, "Every selected enterprise needs an agenda (at least 3 characters).").max(8000),
  scheduledStartAt: z.string().datetime(),
  estimatedDurationMinutes: z.number().int().min(15, "Visits must be at least 15 minutes.").max(1440),
  staffIds: z.array(z.string().min(1)).min(1, "Assign at least one field officer to every visit.").max(10),
});

export const planInputSchema = z.object({
  title: z.string().trim().min(3, "Give the plan a title.").max(255),
  visits: z.array(visitInputSchema).min(1, "Select at least one enterprise.").max(100),
});

export type PlanInput = z.infer<typeof planInputSchema>;

/**
 * Validates cross-field rules and derives the plan window from its visits.
 * The plan window always spans exactly from the earliest visit start to the latest visit end.
 */
export function derivePlanWindow(input: PlanInput, now = new Date()) {
  const ids = input.visits.map((v) => v.businessId);
  if (new Set(ids).size !== ids.length) return { ok: false as const, error: "Select each enterprise only once." };
  let start = Infinity;
  let end = -Infinity;
  for (const visit of input.visits) {
    const s = new Date(visit.scheduledStartAt).getTime();
    if (Number.isNaN(s)) return { ok: false as const, error: "A visit has an invalid start time." };
    if (s < now.getTime() - 5 * 60_000) return { ok: false as const, error: "Visits cannot be scheduled in the past." };
    start = Math.min(start, s);
    end = Math.max(end, s + visit.estimatedDurationMinutes * 60_000);
  }
  return {
    ok: true as const,
    scheduledStartAt: new Date(start),
    scheduledEndAt: new Date(end),
    estimatedDurationMinutes: Math.max(1, Math.round((end - start) / 60_000)),
  };
}

type PlanRouting = { createdById: string; assignedRedoId: string | null; status: PlanStatus };

/** REDOs review plans routed to them; admins review anything (the fallback queue is unassigned plans). */
export function canReviewPlan(user: { id: string; role?: string | null }, plan: PlanRouting) {
  if (plan.status !== "submitted") return false;
  if (user.id === plan.createdById) return false; // no self-approval
  if (user.role === "admin") return true;
  return user.role === "redo" && plan.assignedRedoId === user.id;
}

export function canViewPlan(user: { id: string; role?: string | null }, plan: PlanRouting) {
  if (user.role === "admin" || user.role === "oversight") return true;
  if (plan.createdById === user.id) return true;
  return user.role === "redo" && plan.assignedRedoId === user.id && plan.status !== "draft";
}

export function canEditPlan(user: { id: string; role?: string | null }, plan: PlanRouting) {
  return EDITABLE_STATUSES.includes(plan.status) && (plan.createdById === user.id || user.role === "admin");
}

export function canCancelPlan(user: { id: string; role?: string | null }, plan: PlanRouting) {
  return canTransition(plan.status, "cancelled") && (plan.createdById === user.id || user.role === "admin");
}

/** The owner (or an admin acting for them) can pull a submitted plan back to draft to edit it. */
export function canWithdrawPlan(user: { id: string; role?: string | null }, plan: PlanRouting) {
  return plan.status === "submitted" && (plan.createdById === user.id || user.role === "admin");
}

/**
 * Changing an approved plan. The owner reopens it as a draft (to edit and resubmit); the assigned REDO or an
 * admin who is not the owner sends it back as "returned" with a reason. Either way it needs approval again.
 */
export function reopenMode(user: { id: string; role?: string | null }, plan: PlanRouting): "draft" | "returned" | null {
  if (plan.status !== "approved") return null;
  if (plan.createdById === user.id) return "draft";
  if (user.role === "admin") return "returned";
  if (user.role === "redo" && plan.assignedRedoId === user.id) return "returned";
  return null;
}
