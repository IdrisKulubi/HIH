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

/** Programme outcomes a visit plan can contribute to. Ids are stored; labels are for display and exports. */
export const FIELDWORK_OUTCOMES = [
  { id: "commercialization_scale_up", label: "Increased commercialization and scale-up of supported MSEs across sectors" },
  { id: "market_and_finance_access", label: "Increased access to market information and financial services for MSEs" },
  { id: "circular_economy_safeguards", label: "Increased adoption of circular economy models and social safeguards by MSEs" },
  { id: "sector_actor_capacity", label: "Strengthened systems and capacity of sector actors to support sustainable enterprise development" },
] as const;
export type FieldworkOutcomeId = (typeof FIELDWORK_OUTCOMES)[number]["id"];
export const OUTCOME_IDS = FIELDWORK_OUTCOMES.map((o) => o.id) as [FieldworkOutcomeId, ...FieldworkOutcomeId[]];
export const outcomeLabel = (id: string) => FIELDWORK_OUTCOMES.find((o) => o.id === id)?.label ?? id;

export const visitInputSchema = z.object({
  businessId: z.number().int().positive(),
  agenda: z.string().trim().min(3, "Every selected enterprise needs an agenda (at least 3 characters).").max(8000),
  scheduledStartAt: z.string().datetime(),
  estimatedDurationMinutes: z.number().int().min(15, "Visits must be at least 15 minutes.").max(1440),
  staffIds: z.array(z.string().min(1)).min(1, "Assign at least one field officer to every visit.").max(10),
  outcomes: z.array(z.enum(OUTCOME_IDS)).min(1, "Select at least one programme outcome for every visit.").max(OUTCOME_IDS.length),
});

export const planInputSchema = z.object({
  title: z.string().trim().min(3, "Give the plan a title.").max(255),
  visits: z.array(visitInputSchema).min(1, "Select at least one enterprise.").max(100),
  /** Optional supporting documents, e.g. the intervention plan for the enterprises. */
  attachments: z.array(z.lazy(() => attachmentInputSchema)).max(5, "You can attach up to 5 documents.").optional(),
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

export const MAX_PLAN_ATTACHMENTS = 5;

/** A document already uploaded through the fieldwork uploader; only trusted storage hosts are accepted. */
export const attachmentInputSchema = z.object({
  url: z.string().url().max(2000).refine((value) => {
    try {
      const host = new URL(value).hostname.toLowerCase();
      return host === "utfs.io" || host === "ufs.sh" || host.endsWith(".utfs.io") || host.endsWith(".ufs.sh") || host.endsWith(".uploadthing.com");
    } catch { return false; }
  }, "Attachments must be uploaded through the platform."),
  fileKey: z.string().max(255).nullish(),
  fileName: z.string().trim().min(1).max(255),
  fileType: z.string().max(120).nullish(),
  fileSize: z.number().int().nonnegative().max(100_000_000).nullish(),
});
export type AttachmentInput = z.infer<typeof attachmentInputSchema>;

/** 1-based position of an outcome (matches the "Outcome N" wording in the UI). */
export const outcomeNumber = (id: string) => {
  const index = FIELDWORK_OUTCOMES.findIndex((o) => o.id === id);
  return index === -1 ? "?" : String(index + 1);
};
