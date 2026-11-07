"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import { businesses, fieldworkAuditEvents, fieldworkNotificationDeliveries, fieldworkPlans, fieldworkVisitStaff, fieldworkVisits, userProfiles } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { checkFieldworkRateLimit } from "@/lib/fieldwork/rate-limit";
import { logFieldwork } from "@/lib/fieldwork/log";
import { getGateStatus } from "@/lib/fieldwork/outstanding";
import {
  canCancelPlan, canEditPlan, canReviewPlan, canViewPlan, derivePlanWindow, EDO_ROLES, hasRole, OBSERVER_ROLES, planInputSchema,
  REVIEWER_ROLES, STAFF_ASSIGNABLE_ROLES, type PlanInput, type PlanStatus,
} from "@/lib/fieldwork/plan-rules";
import { and, asc, eq, ilike, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import React from "react";

const TIME_ZONE = "Africa/Nairobi";
const BUSINESS_PAGE_SIZE = 25;

function can(role: string | null | undefined, roles: readonly string[]) { return hasRole(role, roles); }
function fail(error: string) { return { success: false as const, error }; }
function refresh() { revalidatePath("/fieldwork"); revalidatePath("/admin/fieldwork"); }
function formatWhen(date: Date) { return new Intl.DateTimeFormat("en-KE", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(date); }

async function currentUser() {
  const session = await auth();
  return session?.user?.id ? { id: session.user.id, role: session.user.role ?? null, email: session.user.email ?? null } : null;
}

/** Booking gate: outstanding reports or missed-visit reasons block new plans unless an admin override is active. */
async function gateMessage(userId: string) {
  const gate = await getGateStatus(userId);
  return gate.blocked ? `You have ${gate.total} pending field ${gate.total === 1 ? "item" : "items"} (reports or missed-visit reasons). Resolve them in Visit execution before booking another visit.` : null;
}

/** Validates a plan payload against the database: real enterprises, eligible staff, valid schedule. */
async function validatePlan(input: unknown) {
  const parsed = planInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Provide valid visit details." };
  const window = derivePlanWindow(parsed.data);
  if (!window.ok) return window;
  const businessIds = parsed.data.visits.map((v) => v.businessId);
  const found = await db.query.businesses.findMany({ where: inArray(businesses.id, businessIds), columns: { id: true } });
  if (found.length !== businessIds.length) return { ok: false as const, error: "One or more selected enterprises no longer exist." };
  const staffIds = [...new Set(parsed.data.visits.flatMap((v) => v.staffIds))];
  const staff = await db.query.userProfiles.findMany({ where: and(inArray(userProfiles.userId, staffIds), inArray(userProfiles.role, [...STAFF_ASSIGNABLE_ROLES])), columns: { userId: true } });
  if (staff.length !== staffIds.length) return { ok: false as const, error: "One or more assigned officers are not eligible field staff." };
  return { ok: true as const, data: parsed.data, window };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function insertVisits(tx: Tx, planId: number, visits: PlanInput["visits"]) {
  const rows = await tx.insert(fieldworkVisits).values(visits.map((v) => ({ planId, businessId: v.businessId, agenda: v.agenda, scheduledStartAt: new Date(v.scheduledStartAt), estimatedDurationMinutes: v.estimatedDurationMinutes }))).returning({ id: fieldworkVisits.id, businessId: fieldworkVisits.businessId });
  const byBusiness = new Map(rows.map((r) => [r.businessId, r.id]));
  await tx.insert(fieldworkVisitStaff).values(visits.flatMap((v) => [...new Set(v.staffIds)].map((userId) => ({ visitId: byBusiness.get(v.businessId)!, userId }))));
}

/** Itinerary email. Never throws: every recipient outcome is logged as sent, failed or skipped. */
async function sendApprovedItinerary(planId: number, reviewerEmail: string | null) {
  try {
    const plan = await db.query.fieldworkPlans.findFirst({ where: eq(fieldworkPlans.id, planId), with: { visits: { with: { business: { columns: { name: true } } }, orderBy: (v, { asc }) => [asc(v.scheduledStartAt)] }, createdBy: { columns: { email: true } } } });
    if (!plan) return;
    const esmEmails = (process.env.FIELDWORK_ESM_RECIPIENTS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
    const recipients = new Map<string, string>();
    for (const [email, role] of [[plan.createdBy?.email, "edo"], [reviewerEmail, "redo"], ...esmEmails.map((e) => [e, "esm"])] as [string | null | undefined, string][]) {
      if (email && !recipients.has(email.toLowerCase())) recipients.set(email.toLowerCase(), role);
    }
    const itinerary = plan.visits.map((v) => `• ${formatWhen(v.scheduledStartAt)} (${v.estimatedDurationMinutes} min) — ${v.business.name}: ${v.agenda}`).join("\n");
    if (!esmEmails.length) await db.insert(fieldworkNotificationDeliveries).values({ planId, recipientEmail: "esm-group", recipientRole: "esm", kind: "approved_itinerary", status: "skipped", failureReason: "No ESM recipients configured (FIELDWORK_ESM_RECIPIENTS)." });
    for (const [email, role] of recipients) {
      const [delivery] = await db.insert(fieldworkNotificationDeliveries).values({ planId, recipientEmail: email, recipientRole: role, kind: "approved_itinerary" }).returning({ id: fieldworkNotificationDeliveries.id });
      try {
        await sendEmail({ to: email, subject: `Approved fieldwork itinerary — ${plan.title}`, react: React.createElement("div", null, React.createElement("h1", null, "Fieldwork itinerary approved"), React.createElement("p", null, `Plan: ${plan.title}`), React.createElement("p", null, `Times shown in ${TIME_ZONE}.`), React.createElement("pre", { style: { whiteSpace: "pre-wrap" } }, itinerary)) });
        await db.update(fieldworkNotificationDeliveries).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(fieldworkNotificationDeliveries.id, delivery.id));
      } catch (error) {
        await db.update(fieldworkNotificationDeliveries).set({ status: "failed", failureReason: error instanceof Error ? error.message : "Email delivery failed", updatedAt: new Date() }).where(eq(fieldworkNotificationDeliveries.id, delivery.id));
      }
    }
  } catch (error) {
    logFieldwork("error", "itinerary_notification_failed", { planId, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function createFieldworkPlan(input: PlanInput) {
  const user = await currentUser();
  if (!user || !can(user.role, EDO_ROLES)) return fail("Only EDOs can create fieldwork plans.");
  { const limited = await checkFieldworkRateLimit(user.id, "createFieldworkPlan", 20, 60); if (!limited.ok) return fail(limited.message); }
  { const blocked = await gateMessage(user.id); if (blocked) return fail(blocked); }
  const checked = await validatePlan(input);
  if (!checked.ok) return fail(checked.error);
  const { data, window } = checked;
  const id = await db.transaction(async (tx) => {
    const [plan] = await tx.insert(fieldworkPlans).values({ title: data.title, scheduledStartAt: window.scheduledStartAt, scheduledEndAt: window.scheduledEndAt, estimatedDurationMinutes: window.estimatedDurationMinutes, createdById: user.id }).returning({ id: fieldworkPlans.id });
    await insertVisits(tx, plan.id, data.visits);
    await tx.insert(fieldworkAuditEvents).values({ planId: plan.id, actorId: user.id, eventType: "plan_created", details: { visitCount: data.visits.length } });
    return plan.id;
  });
  refresh(); return { success: true as const, data: { id } };
}

/** Replaces the visits of a draft or returned plan. Approved plans are immutable. */
export async function updateFieldworkPlan(planId: number, input: PlanInput) {
  const user = await currentUser();
  if (!user || !can(user.role, EDO_ROLES)) return fail("Only EDOs can edit fieldwork plans.");
  { const limited = await checkFieldworkRateLimit(user.id, "updateFieldworkPlan", 30, 60); if (!limited.ok) return fail(limited.message); }
  const plan = await db.query.fieldworkPlans.findFirst({ where: eq(fieldworkPlans.id, planId), columns: { createdById: true, assignedRedoId: true, status: true } });
  if (!plan || !canViewPlan(user, plan)) return fail("Plan not found.");
  if (!canEditPlan(user, plan)) return fail("Only draft or returned plans can be edited. Cancel an approved plan and create a new one to change it.");
  const checked = await validatePlan(input);
  if (!checked.ok) return fail(checked.error);
  const { data, window } = checked;
  const changed = await db.transaction(async (tx) => {
    const updated = await tx.update(fieldworkPlans).set({ title: data.title, scheduledStartAt: window.scheduledStartAt, scheduledEndAt: window.scheduledEndAt, estimatedDurationMinutes: window.estimatedDurationMinutes, updatedAt: new Date() }).where(and(eq(fieldworkPlans.id, planId), inArray(fieldworkPlans.status, ["draft", "returned"]))).returning({ id: fieldworkPlans.id });
    if (!updated.length) return false;
    await tx.delete(fieldworkVisits).where(eq(fieldworkVisits.planId, planId));
    await insertVisits(tx, planId, data.visits);
    await tx.insert(fieldworkAuditEvents).values({ planId, actorId: user.id, eventType: "plan_updated", details: { visitCount: data.visits.length } });
    return true;
  });
  if (!changed) return fail("This plan can no longer be edited.");
  refresh(); return { success: true as const };
}

/** Submit for review. `assignedRedoId` routes it to a REDO; omitting it sends it to the admin fallback queue. */
export async function submitFieldworkPlan(planId: number, assignedRedoId?: string | null) {
  const user = await currentUser();
  if (!user || !can(user.role, EDO_ROLES)) return fail("Only EDOs can submit fieldwork plans.");
  { const limited = await checkFieldworkRateLimit(user.id, "submitFieldworkPlan", 20, 60); if (!limited.ok) return fail(limited.message); }
  const plan = await db.query.fieldworkPlans.findFirst({ where: eq(fieldworkPlans.id, planId), columns: { createdById: true, assignedRedoId: true, status: true }, with: { visits: { columns: { id: true } } } });
  if (!plan || (plan.createdById !== user.id && user.role !== "admin")) return fail("Plan not found.");
  if (!canEditPlan(user, plan)) return fail("Only draft or returned plans can be submitted.");
  if (!plan.visits.length) return fail("A plan needs at least one enterprise visit.");
  { const blocked = await gateMessage(plan.createdById); if (blocked) return fail(blocked); }
  if (assignedRedoId) {
    const redo = await db.query.userProfiles.findFirst({ where: and(eq(userProfiles.userId, assignedRedoId), eq(userProfiles.role, "redo")), columns: { userId: true } });
    if (!redo) return fail("Choose a valid REDO to review this plan.");
  }
  const submitted = await db.transaction(async (tx) => {
    const updated = await tx.update(fieldworkPlans).set({ status: "submitted", submittedAt: new Date(), assignedRedoId: assignedRedoId || null, returnReason: null, updatedAt: new Date() }).where(and(eq(fieldworkPlans.id, planId), inArray(fieldworkPlans.status, ["draft", "returned"]))).returning({ id: fieldworkPlans.id });
    if (!updated.length) return false;
    await tx.insert(fieldworkAuditEvents).values({ planId, actorId: user.id, eventType: "plan_submitted", details: { routing: assignedRedoId ? "redo" : "admin_fallback", assignedRedoId: assignedRedoId || null } });
    return true;
  });
  if (!submitted) return fail("This plan was already submitted.");
  refresh(); return { success: true as const };
}

export async function cancelFieldworkPlan(planId: number, reason: string) {
  const user = await currentUser();
  if (!user || !can(user.role, EDO_ROLES)) return fail("Only EDOs can cancel fieldwork plans.");
  { const limited = await checkFieldworkRateLimit(user.id, "cancelFieldworkPlan", 20, 60); if (!limited.ok) return fail(limited.message); }
  if (reason.trim().length < 3) return fail("Provide a reason for cancelling the plan.");
  const plan = await db.query.fieldworkPlans.findFirst({ where: eq(fieldworkPlans.id, planId), columns: { createdById: true, assignedRedoId: true, status: true }, with: { visits: { columns: { status: true } } } });
  if (!plan || !canViewPlan(user, plan)) return fail("Plan not found.");
  if (!canCancelPlan(user, plan)) return fail("This plan cannot be cancelled.");
  if (plan.visits.some((v) => !["scheduled", "cancelled"].includes(v.status))) return fail("Visits already under way cannot be cancelled.");
  const cancelled = await db.transaction(async (tx) => {
    const updated = await tx.update(fieldworkPlans).set({ status: "cancelled", cancellationReason: reason.trim(), cancelledAt: new Date(), updatedAt: new Date() }).where(and(eq(fieldworkPlans.id, planId), eq(fieldworkPlans.status, plan.status))).returning({ id: fieldworkPlans.id });
    if (!updated.length) return false;
    await tx.update(fieldworkVisits).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(fieldworkVisits.planId, planId), eq(fieldworkVisits.status, "scheduled")));
    await tx.insert(fieldworkAuditEvents).values({ planId, actorId: user.id, eventType: "plan_cancelled", details: { reason: reason.trim(), previousStatus: plan.status } });
    return true;
  });
  if (!cancelled) return fail("This plan changed while you were cancelling it. Refresh and try again.");
  refresh(); return { success: true as const };
}

export async function reviewFieldworkPlan(planId: number, decision: "approved" | "returned", reason?: string) {
  const user = await currentUser();
  if (!user || !can(user.role, REVIEWER_ROLES)) return fail("Only REDOs can review fieldwork plans.");
  { const limited = await checkFieldworkRateLimit(user.id, "reviewFieldworkPlan", 60, 60); if (!limited.ok) return fail(limited.message); }
  if (decision === "returned" && !reason?.trim()) return fail("Provide a reason when returning a plan.");
  const plan = await db.query.fieldworkPlans.findFirst({ where: eq(fieldworkPlans.id, planId), columns: { createdById: true, assignedRedoId: true, status: true } });
  if (!plan) return fail("Plan not found.");
  if (!canReviewPlan(user, plan)) return fail(plan.status !== "submitted" ? "Only submitted plans can be reviewed." : "This plan is not assigned to you.");
  const reviewed = await db.transaction(async (tx) => {
    const updated = await tx.update(fieldworkPlans).set({ status: decision, reviewedById: user.id, reviewedAt: new Date(), returnReason: decision === "returned" ? reason!.trim() : null, updatedAt: new Date() }).where(and(eq(fieldworkPlans.id, planId), eq(fieldworkPlans.status, "submitted"))).returning({ id: fieldworkPlans.id });
    if (!updated.length) return false;
    await tx.insert(fieldworkAuditEvents).values({ planId, actorId: user.id, eventType: `plan_${decision}`, details: decision === "returned" ? { reason: reason!.trim() } : {} });
    return true;
  });
  if (!reviewed) return fail("This plan has already been reviewed.");
  if (decision === "approved") await sendApprovedItinerary(planId, user.email);
  refresh(); return { success: true as const };
}

export async function searchFieldworkBusinesses(filters: { query?: string; county?: string; offset?: number }) {
  const user = await currentUser();
  if (!user || !can(user.role, EDO_ROLES)) return fail("Unauthorized.");
  { const limited = await checkFieldworkRateLimit(user.id, "searchFieldworkBusinesses", 120, 60); if (!limited.ok) return fail(limited.message); }
  const term = (filters.query ?? "").trim().replace(/[%_\\]/g, "\\$&").slice(0, 100);
  const where = and(term ? ilike(businesses.name, `%${term}%`) : undefined, filters.county ? sql`${businesses.county}::text = ${filters.county}` : undefined);
  const rows = await db.query.businesses.findMany({ where, columns: { id: true, name: true, county: true, city: true }, orderBy: [asc(businesses.name)], limit: BUSINESS_PAGE_SIZE + 1, offset: Math.max(0, Math.floor(filters.offset ?? 0)) });
  return { success: true as const, data: { rows: rows.slice(0, BUSINESS_PAGE_SIZE), hasMore: rows.length > BUSINESS_PAGE_SIZE } };
}

export async function getFieldworkWorkspace() {
  const user = await currentUser();
  if (!user || !can(user.role, [...EDO_ROLES, ...REVIEWER_ROLES, ...OBSERVER_ROLES])) return fail("You do not have access to fieldwork planning.");
  const scope = user.role === "bds_edo" ? eq(fieldworkPlans.createdById, user.id)
    : user.role === "redo" ? and(eq(fieldworkPlans.assignedRedoId, user.id), ne(fieldworkPlans.status, "draft"))
    : undefined;
  const plans = await db.query.fieldworkPlans.findMany({
    where: scope,
    orderBy: (p, { desc }) => [desc(p.createdAt)],
    limit: 200,
    with: { visits: { orderBy: (v, { asc }) => [asc(v.scheduledStartAt)], with: { business: { columns: { id: true, name: true, county: true, city: true } }, staff: { columns: { userId: true } } } } },
  });
  const staff = await db.query.userProfiles.findMany({ where: inArray(userProfiles.role, [...STAFF_ASSIGNABLE_ROLES]), columns: { userId: true, firstName: true, lastName: true, role: true }, orderBy: (p, { asc }) => [asc(p.firstName)] });
  const names = new Map(staff.map((s) => [s.userId, `${s.firstName} ${s.lastName}`.trim()]));
  const counties = (await db.selectDistinct({ county: businesses.county }).from(businesses).orderBy(asc(businesses.county))).map((r) => r.county as string | null).filter((c): c is string => !!c);
  return {
    success: true as const,
    data: {
      currentUserId: user.id,
      plans: plans.map((p) => ({
        id: p.id, title: p.title, status: p.status as PlanStatus, returnReason: p.returnReason, cancellationReason: p.cancellationReason,
        createdById: p.createdById, assignedRedoId: p.assignedRedoId,
        scheduledStartAt: p.scheduledStartAt, scheduledEndAt: p.scheduledEndAt,
        visits: p.visits.map((v) => ({ id: v.id, agenda: v.agenda, scheduledStartAt: v.scheduledStartAt, estimatedDurationMinutes: v.estimatedDurationMinutes, business: v.business, staffIds: v.staff.map((s) => s.userId), staffNames: v.staff.map((s) => names.get(s.userId) ?? "Unknown officer") })),
      })),
      staff, counties,
      redos: staff.filter((s) => s.role === "redo"),
      canCreate: can(user.role, EDO_ROLES),
      reviewerRole: can(user.role, REVIEWER_ROLES) ? user.role : null,
      isAdmin: user.role === "admin",
    },
  };
}


