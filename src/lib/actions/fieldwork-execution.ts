"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  businesses, fieldworkAuditEvents, fieldworkGateOverrides, fieldworkNotificationDeliveries, fieldworkPlans, fieldworkReportEvents,
  fieldworkReports, fieldworkVisitStaff, fieldworkVisits, userProfiles,
} from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { checkFieldworkRateLimit } from "@/lib/fieldwork/rate-limit";
import { logFieldwork } from "@/lib/fieldwork/log";
import { getOutstandingTasks } from "@/lib/fieldwork/outstanding";
import { hasRole } from "@/lib/fieldwork/plan-rules";
import {
  canEditReport, canReviewReport, REPORT_FIELDS, reportDraftSchema, validateReportForSubmit, type ReportFieldKey,
} from "@/lib/fieldwork/report-rules";
import { startOfNairobiDay, formatNairobi } from "@/lib/fieldwork/time";
import {
  combineEvaluations, evaluateReading, getVerificationPolicy, parseCoordinates, type Evaluation, type LocationState,
} from "@/lib/fieldwork/verification-policy";
import { and, desc, eq, gt, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import React from "react";
import { z } from "zod";

const FIELD_ROLES = ["bds_edo", "admin"] as const;
const REVIEW_ROLES = ["redo", "admin"] as const;
const FEEDBACK_KIND = "approved_fieldwork_feedback";
const GATE_OVERRIDE_HOURS = 48;

const fail = (error: string, extra: Record<string, unknown> = {}) => ({ success: false as const, error, ...extra });
const refresh = () => { revalidatePath("/fieldwork"); revalidatePath("/fieldwork/execution"); };
const can = (role: string | null | undefined, roles: readonly string[]) => hasRole(role, roles);

async function currentUser() {
  const session = await auth();
  return session?.user?.id ? { id: session.user.id, role: session.user.role ?? null, email: session.user.email ?? null } : null;
}

const readingSchema = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracyMeters: z.number().min(0).max(1_000_000) });
const locationInput = z.object({
  /** The user must have been shown the privacy notice and agreed before the device is asked for a position. */
  consent: z.literal(true),
  state: z.enum(["granted", "denied", "unavailable", "timeout"]),
  reading: readingSchema.nullable().optional(),
});
export type LocationInput = z.infer<typeof locationInput>;

/** Loads everything an execution action needs to authorise and evaluate a visit. */
async function loadVisit(visitId: number) {
  return db.query.fieldworkVisits.findFirst({
    where: eq(fieldworkVisits.id, visitId),
    with: {
      plan: { columns: { id: true, title: true, status: true, createdById: true, assignedRedoId: true } },
      staff: { columns: { userId: true } },
      business: { columns: { id: true, name: true }, with: { kycProfile: { columns: { gpsCoordinates: true, status: true } } } },
      report: true,
    },
  });
}
type LoadedVisit = NonNullable<Awaited<ReturnType<typeof loadVisit>>>;

const canActOnVisit = (userId: string, visit: LoadedVisit) => visit.plan.createdById === userId || visit.staff.some((s) => s.userId === userId);
/** Only KYC-verified coordinates are trusted for location checks. */
const enterpriseCoordinates = (visit: LoadedVisit) => visit.business.kycProfile?.status === "verified" ? parseCoordinates(visit.business.kycProfile.gpsCoordinates) : null;
const sameNairobiDay = (a: Date, b: Date) => startOfNairobiDay(a).getTime() === startOfNairobiDay(b).getTime();

function evaluateInput(visit: LoadedVisit, input: LocationInput): Evaluation {
  return evaluateReading({ enterprise: enterpriseCoordinates(visit), reading: input.reading ?? null, state: input.state as LocationState }, getVerificationPolicy());
}

function canReviewVisit(user: { id: string; role: string | null }, visit: LoadedVisit) {
  if (user.id === visit.plan.createdById) return false;
  return user.role === "admin" || (user.role === "redo" && visit.plan.assignedRedoId === user.id);
}

// ---------------------------------------------------------------------------------------------
// Check-in / check-out / missed
// ---------------------------------------------------------------------------------------------

export async function checkInFieldworkVisit(visitId: number, input: LocationInput) {
  const user = await currentUser();
  if (!user || !can(user.role, FIELD_ROLES)) return fail("Only field staff can check in.");
  { const limited = await checkFieldworkRateLimit(user.id, "checkInFieldworkVisit", 20, 60); if (!limited.ok) return fail(limited.message); }
  const parsed = locationInput.safeParse(input);
  if (!parsed.success) return fail("Confirm the location privacy notice before checking in.");
  const visit = await loadVisit(visitId);
  if (!visit || !canActOnVisit(user.id, visit)) return fail("Visit not found.");
  if (visit.status === "checked_in") return { success: true as const, alreadyDone: true as const, data: { result: visit.verificationStatus, reason: null } };
  if (visit.status !== "scheduled" || visit.plan.status !== "approved") return fail("This visit is not available for check-in.");
  if (!sameNairobiDay(visit.scheduledStartAt, new Date())) return fail("You can only check in on the day the visit is scheduled.");

  const evaluation = evaluateInput(visit, parsed.data);
  const reading = parsed.data.reading;
  const updated = await db.transaction(async (tx) => {
    const rows = await tx.update(fieldworkVisits).set({
      status: "checked_in", checkedInAt: new Date(), locationConsentAt: new Date(),
      checkInLocationState: parsed.data.state,
      checkInLatitude: reading ? String(reading.latitude) : null, checkInLongitude: reading ? String(reading.longitude) : null,
      checkInAccuracyMeters: reading ? Math.round(reading.accuracyMeters) : null, checkInDistanceMeters: evaluation.distanceMeters,
      updatedAt: new Date(),
    }).where(and(eq(fieldworkVisits.id, visitId), eq(fieldworkVisits.status, "scheduled"))).returning({ id: fieldworkVisits.id });
    if (!rows.length) return false;
    await tx.insert(fieldworkAuditEvents).values({ planId: visit.plan.id, visitId, actorId: user.id, eventType: "visit_checked_in", details: { state: parsed.data.state, result: evaluation.result, reason: evaluation.reason, distanceMeters: evaluation.distanceMeters, accuracyMeters: reading?.accuracyMeters ?? null } });
    return true;
  });
  if (!updated) return fail("This visit was already checked in.");
  refresh();
  return { success: true as const, data: { result: evaluation.result, reason: evaluation.reason } };
}

export async function checkOutFieldworkVisit(visitId: number, input: LocationInput) {
  const user = await currentUser();
  if (!user || !can(user.role, FIELD_ROLES)) return fail("Only field staff can check out.");
  { const limited = await checkFieldworkRateLimit(user.id, "checkOutFieldworkVisit", 20, 60); if (!limited.ok) return fail(limited.message); }
  const parsed = locationInput.safeParse(input);
  if (!parsed.success) return fail("Confirm the location privacy notice before checking out.");
  const visit = await loadVisit(visitId);
  if (!visit || !canActOnVisit(user.id, visit)) return fail("Visit not found.");
  if (visit.status === "completed") return { success: true as const, alreadyDone: true as const, data: { result: visit.verificationStatus, reason: visit.verificationNotes } };
  if (visit.status !== "checked_in") return fail("Check in before checking out.");

  const checkOut = evaluateInput(visit, parsed.data);
  const checkIn: Evaluation = evaluateReading({
    enterprise: enterpriseCoordinates(visit),
    reading: visit.checkInLatitude && visit.checkInLongitude ? { latitude: Number(visit.checkInLatitude), longitude: Number(visit.checkInLongitude), accuracyMeters: visit.checkInAccuracyMeters ?? Number.MAX_SAFE_INTEGER } : null,
    state: (visit.checkInLocationState as LocationState) ?? "unavailable",
  }, getVerificationPolicy());
  const verdict = combineEvaluations(checkIn, checkOut);
  const reading = parsed.data.reading;

  const done = await db.transaction(async (tx) => {
    const rows = await tx.update(fieldworkVisits).set({
      status: "completed", checkedOutAt: new Date(),
      checkOutLocationState: parsed.data.state,
      checkOutLatitude: reading ? String(reading.latitude) : null, checkOutLongitude: reading ? String(reading.longitude) : null,
      checkOutAccuracyMeters: reading ? Math.round(reading.accuracyMeters) : null, checkOutDistanceMeters: checkOut.distanceMeters,
      verificationStatus: verdict.result, verificationNotes: verdict.notes, updatedAt: new Date(),
    }).where(and(eq(fieldworkVisits.id, visitId), eq(fieldworkVisits.status, "checked_in"))).returning({ id: fieldworkVisits.id });
    if (!rows.length) return false;
    // A report task exists only for a completed AND verified visit.
    if (verdict.result === "verified") await tx.insert(fieldworkReports).values({ visitId, edoResponsibleId: visit.plan.createdById }).onConflictDoNothing();
    await tx.insert(fieldworkAuditEvents).values({ planId: visit.plan.id, visitId, actorId: user.id, eventType: "visit_checked_out", details: { state: parsed.data.state, result: verdict.result, notes: verdict.notes, distanceMeters: checkOut.distanceMeters } });
    return true;
  });
  if (!done) return fail("This visit was already checked out.");
  refresh();
  return { success: true as const, data: { result: verdict.result, reason: verdict.notes } };
}

export async function markFieldworkVisitMissed(visitId: number, reason: string) {
  const user = await currentUser();
  if (!user || !can(user.role, FIELD_ROLES)) return fail("Only field staff can record a missed visit.");
  { const limited = await checkFieldworkRateLimit(user.id, "markFieldworkVisitMissed", 30, 60); if (!limited.ok) return fail(limited.message); }
  if (reason.trim().length < 10) return fail("Explain why the visit did not happen (at least 10 characters).");
  const visit = await loadVisit(visitId);
  if (!visit || !canActOnVisit(user.id, visit)) return fail("Visit not found.");
  if (visit.status !== "scheduled" || visit.plan.status !== "approved") return fail("Only scheduled visits can be marked as missed.");
  if (startOfNairobiDay(new Date()) < startOfNairobiDay(visit.scheduledStartAt)) return fail("A visit cannot be marked missed before its scheduled day.");
  const done = await db.transaction(async (tx) => {
    const rows = await tx.update(fieldworkVisits).set({ status: "missed", missedReason: reason.trim(), missedRecordedAt: new Date(), updatedAt: new Date() }).where(and(eq(fieldworkVisits.id, visitId), eq(fieldworkVisits.status, "scheduled"))).returning({ id: fieldworkVisits.id });
    if (!rows.length) return false;
    await tx.insert(fieldworkAuditEvents).values({ planId: visit.plan.id, visitId, actorId: user.id, eventType: "visit_missed", details: { reason: reason.trim() } });
    return true;
  });
  if (!done) return fail("This visit was already updated.");
  refresh(); return { success: true as const };
}

/** Manual exception: a REDO/admin accepts a visit whose location could not be auto-verified, which unlocks its report. */
export async function approveFieldworkVisitException(visitId: number, reason: string) {
  const user = await currentUser();
  if (!user || !can(user.role, REVIEW_ROLES)) return fail("Only REDOs can approve verification exceptions.");
  { const limited = await checkFieldworkRateLimit(user.id, "approveFieldworkVisitException", 30, 60); if (!limited.ok) return fail(limited.message); }
  if (reason.trim().length < 10) return fail("Record why this visit is being accepted (at least 10 characters).");
  const visit = await loadVisit(visitId);
  if (!visit || !canReviewVisit(user, visit)) return fail("This visit is not assigned to you.");
  if (visit.status !== "completed" || visit.verificationStatus !== "needs_review") return fail("Only completed visits awaiting review can be accepted.");
  const done = await db.transaction(async (tx) => {
    const rows = await tx.update(fieldworkVisits).set({ verificationStatus: "exception_approved", exceptionById: user.id, exceptionReason: reason.trim(), exceptionAt: new Date(), updatedAt: new Date() }).where(and(eq(fieldworkVisits.id, visitId), eq(fieldworkVisits.verificationStatus, "needs_review"))).returning({ id: fieldworkVisits.id });
    if (!rows.length) return false;
    await tx.insert(fieldworkReports).values({ visitId, edoResponsibleId: visit.plan.createdById }).onConflictDoNothing();
    await tx.insert(fieldworkAuditEvents).values({ planId: visit.plan.id, visitId, actorId: user.id, eventType: "visit_exception_approved", details: { reason: reason.trim(), notes: visit.verificationNotes } });
    return true;
  });
  if (!done) return fail("This visit was already reviewed.");
  refresh(); return { success: true as const };
}

// ---------------------------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------------------------

async function loadReportByVisit(visitId: number) {
  const visit = await loadVisit(visitId);
  if (!visit?.report) return null;
  return { visit, report: visit.report, routing: { planCreatedById: visit.plan.createdById, assignedRedoId: visit.plan.assignedRedoId, status: visit.report.status } };
}

/** Saves partial progress. Word counts are enforced only on submit, so a poor connection never loses work. */
export async function saveFieldworkReportDraft(input: z.infer<typeof reportDraftSchema>) {
  const user = await currentUser();
  if (!user || !can(user.role, FIELD_ROLES)) return fail("Only field staff can edit reports.");
  { const limited = await checkFieldworkRateLimit(user.id, "saveFieldworkReportDraft", 90, 60); if (!limited.ok) return fail(limited.message); }
  const parsed = reportDraftSchema.safeParse(input);
  if (!parsed.success) return fail("A report field is too long.");
  const found = await loadReportByVisit(parsed.data.visitId);
  if (!found || !canEditReport(user, found.routing)) return fail("This report cannot be edited.");
  const { visitId, ...fields } = parsed.data;
  const updated = await db.update(fieldworkReports).set({ ...fields, updatedAt: new Date() }).where(and(eq(fieldworkReports.id, found.report.id), inArray(fieldworkReports.status, ["draft", "returned"]))).returning({ id: fieldworkReports.id });
  if (!updated.length) return fail("This report can no longer be edited.");
  void visitId; refresh(); return { success: true as const };
}

export async function submitFieldworkReport(input: z.infer<typeof reportDraftSchema>) {
  const user = await currentUser();
  if (!user || !can(user.role, FIELD_ROLES)) return fail("Only field staff can submit reports.");
  { const limited = await checkFieldworkRateLimit(user.id, "submitFieldworkReport", 20, 60); if (!limited.ok) return fail(limited.message); }
  const parsed = reportDraftSchema.safeParse(input);
  if (!parsed.success) return fail("A report field is too long.");
  const found = await loadReportByVisit(parsed.data.visitId);
  if (!found || !canEditReport(user, found.routing)) return fail("This report is not available for submission.");
  if (found.visit.status !== "completed" || !["verified", "exception_approved"].includes(found.visit.verificationStatus)) return fail("Reports are only available for completed, verified visits.");
  const { visitId: _visitId, ...fields } = parsed.data;
  void _visitId;
  const merged = Object.fromEntries(REPORT_FIELDS.map((f) => [f.key, fields[f.key] ?? found.report[f.key] ?? ""])) as Record<ReportFieldKey, string>;
  const fieldErrors = validateReportForSubmit(merged);
  if (Object.keys(fieldErrors).length) return fail("Fix the highlighted report fields.", { fieldErrors });
  const done = await db.transaction(async (tx) => {
    const rows = await tx.update(fieldworkReports).set({ ...merged, status: "submitted", submittedAt: new Date(), returnReason: null, updatedAt: new Date() }).where(and(eq(fieldworkReports.id, found.report.id), inArray(fieldworkReports.status, ["draft", "returned"]))).returning({ id: fieldworkReports.id });
    if (!rows.length) return false;
    await tx.insert(fieldworkReportEvents).values({ reportId: found.report.id, actorId: user.id, eventType: "report_submitted", details: {} });
    return true;
  });
  if (!done) return fail("This report was already submitted.");
  refresh(); return { success: true as const };
}

export async function reviewFieldworkReport(reportId: number, decision: "approved" | "returned", reason?: string) {
  const user = await currentUser();
  if (!user || !can(user.role, REVIEW_ROLES)) return fail("Only REDOs can review reports.");
  { const limited = await checkFieldworkRateLimit(user.id, "reviewFieldworkReport", 60, 60); if (!limited.ok) return fail(limited.message); }
  if (decision === "returned" && (reason?.trim().length ?? 0) < 3) return fail("Provide a reason when returning a report.");
  const report = await db.query.fieldworkReports.findFirst({ where: eq(fieldworkReports.id, reportId), with: { visit: { columns: { id: true, planId: true }, with: { plan: { columns: { createdById: true, assignedRedoId: true } } } } } });
  if (!report) return fail("Report not found.");
  if (!canReviewReport(user, { planCreatedById: report.visit.plan.createdById, assignedRedoId: report.visit.plan.assignedRedoId, status: report.status })) {
    return fail(report.status !== "submitted" ? "Only submitted reports can be reviewed." : "This report is not assigned to you.");
  }
  const done = await db.transaction(async (tx) => {
    const rows = await tx.update(fieldworkReports).set({ status: decision, reviewedById: user.id, reviewedAt: new Date(), returnReason: decision === "returned" ? reason!.trim() : null, updatedAt: new Date() }).where(and(eq(fieldworkReports.id, reportId), eq(fieldworkReports.status, "submitted"))).returning({ id: fieldworkReports.id });
    if (!rows.length) return false;
    await tx.insert(fieldworkReportEvents).values({ reportId, actorId: user.id, eventType: `report_${decision}`, details: decision === "returned" ? { reason: reason!.trim() } : {} });
    return true;
  });
  if (!done) return fail("This report has already been reviewed.");
  if (decision === "approved") await sendClientFeedback(reportId, user.id);
  refresh(); return { success: true as const };
}

// ---------------------------------------------------------------------------------------------
// Client feedback email (logged, retryable, never blocks approval)
// ---------------------------------------------------------------------------------------------

async function sendClientFeedback(reportId: number, actorId: string | null) {
  try {
    const report = await db.query.fieldworkReports.findFirst({
      where: eq(fieldworkReports.id, reportId),
      with: { visit: { with: { business: { columns: { name: true }, with: { applicant: { with: { user: { columns: { email: true, emailVerified: true } } } } } } } } },
    });
    if (!report || report.status !== "approved") return;
    const visit = report.visit;
    const user = visit.business.applicant?.user;
    // Only a verified primary contact is used; otherwise the message is held (status "skipped") for a controlled retry.
    const email = user?.email && user.emailVerified ? user.email : null;
    const existing = await db.query.fieldworkNotificationDeliveries.findFirst({ where: and(eq(fieldworkNotificationDeliveries.visitId, visit.id), eq(fieldworkNotificationDeliveries.kind, FEEDBACK_KIND)), orderBy: desc(fieldworkNotificationDeliveries.id) });
    if (existing?.status === "sent") return;
    const attempts = (existing?.attempts ?? 0) + 1;
    let deliveryId = existing?.id;
    const base = { recipientEmail: email ?? "unverified-contact", recipientRole: "client", attempts, updatedAt: new Date() };
    if (deliveryId) await db.update(fieldworkNotificationDeliveries).set({ ...base, status: "pending", failureReason: null }).where(eq(fieldworkNotificationDeliveries.id, deliveryId));
    else [{ id: deliveryId }] = await db.insert(fieldworkNotificationDeliveries).values({ ...base, planId: visit.planId, visitId: visit.id, kind: FEEDBACK_KIND }).returning({ id: fieldworkNotificationDeliveries.id });
    if (!email) {
      await db.update(fieldworkNotificationDeliveries).set({ status: "skipped", failureReason: "No verified enterprise contact email on file.", updatedAt: new Date() }).where(eq(fieldworkNotificationDeliveries.id, deliveryId!));
    } else {
      try {
        await sendEmail({
          to: email, subject: `Field visit feedback — ${visit.business.name}`,
          react: React.createElement("div", null,
            React.createElement("h1", null, "Field visit feedback"),
            React.createElement("p", null, `Enterprise: ${visit.business.name}`), React.createElement("p", null, `Agenda: ${visit.agenda}`),
            React.createElement("h2", null, "Activities conducted"), React.createElement("p", null, report.activitiesConducted),
            React.createElement("h2", null, "Findings and gaps"), React.createElement("p", null, report.findingsAndGaps),
            React.createElement("h2", null, "Recommendations"), React.createElement("p", null, report.recommendations),
            React.createElement("p", null, `Action points: ${report.actionPoints}`), React.createElement("p", null, `Timeline: ${report.timeline}`)),
        });
        await db.update(fieldworkNotificationDeliveries).set({ status: "sent", sentAt: new Date(), failureReason: null, updatedAt: new Date() }).where(eq(fieldworkNotificationDeliveries.id, deliveryId!));
      } catch (error) {
        await db.update(fieldworkNotificationDeliveries).set({ status: "failed", failureReason: error instanceof Error ? error.message : "Email delivery failed", updatedAt: new Date() }).where(eq(fieldworkNotificationDeliveries.id, deliveryId!));
      }
    }
    const final = await db.query.fieldworkNotificationDeliveries.findFirst({ where: eq(fieldworkNotificationDeliveries.id, deliveryId!), columns: { status: true } });
    await db.insert(fieldworkReportEvents).values({ reportId, actorId, eventType: "feedback_delivery", details: { status: final?.status, attempt: attempts } });
  } catch (error) {
    logFieldwork("error", "client_feedback_failed", { reportId, error: error instanceof Error ? error.message : String(error) });
  }
}

export async function retryFieldworkFeedback(reportId: number) {
  const user = await currentUser();
  if (!user || !can(user.role, REVIEW_ROLES)) return fail("Only REDOs can retry feedback delivery.");
  { const limited = await checkFieldworkRateLimit(user.id, "retryFieldworkFeedback", 20, 60); if (!limited.ok) return fail(limited.message); }
  const report = await db.query.fieldworkReports.findFirst({ where: eq(fieldworkReports.id, reportId), with: { visit: { with: { plan: { columns: { createdById: true, assignedRedoId: true } } } } } });
  if (!report || report.status !== "approved") return fail("Only approved reports have client feedback.");
  const { plan } = report.visit;
  if (user.role !== "admin" && plan.assignedRedoId !== user.id) return fail("This report is not assigned to you.");
  await sendClientFeedback(reportId, user.id);
  refresh(); return { success: true as const };
}

// ---------------------------------------------------------------------------------------------
// Booking-gate override (admin only, audited, expiring)
// ---------------------------------------------------------------------------------------------

export async function grantFieldworkGateOverride(userId: string, reason: string) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return fail("Only administrators can override the booking gate.");
  if (reason.trim().length < 10) return fail("Record why the gate is being lifted (at least 10 characters).");
  const tasks = await getOutstandingTasks(userId);
  if (!tasks.total) return fail("This officer has no outstanding items, so no override is needed.");
  await db.insert(fieldworkGateOverrides).values({ userId, grantedById: user.id, reason: reason.trim(), expiresAt: new Date(Date.now() + GATE_OVERRIDE_HOURS * 3_600_000) });
  refresh(); return { success: true as const };
}

export async function revokeFieldworkGateOverride(userId: string) {
  const user = await currentUser();
  if (!user || user.role !== "admin") return fail("Only administrators can revoke an override.");
  await db.update(fieldworkGateOverrides).set({ revokedAt: new Date() }).where(and(eq(fieldworkGateOverrides.userId, userId), isNull(fieldworkGateOverrides.revokedAt)));
  refresh(); return { success: true as const };
}

// ---------------------------------------------------------------------------------------------
// Read models
// ---------------------------------------------------------------------------------------------

export async function getFieldworkExecutionWorkspace() {
  const user = await currentUser();
  if (!user || !can(user.role, [...FIELD_ROLES, "redo", "oversight"])) return fail("You do not have access to visit execution.");
  const now = new Date();
  const isField = can(user.role, FIELD_ROLES);

  const visits = isField ? await db
    .select({
      id: fieldworkVisits.id, status: fieldworkVisits.status, verificationStatus: fieldworkVisits.verificationStatus, verificationNotes: fieldworkVisits.verificationNotes,
      scheduledStartAt: fieldworkVisits.scheduledStartAt, estimatedDurationMinutes: fieldworkVisits.estimatedDurationMinutes, agenda: fieldworkVisits.agenda,
      missedReason: fieldworkVisits.missedReason, businessName: businesses.name, planTitle: fieldworkPlans.title, planCreatedById: fieldworkPlans.createdById,
      reportId: fieldworkReports.id, reportStatus: fieldworkReports.status, reportReturnReason: fieldworkReports.returnReason,
    })
    .from(fieldworkVisits)
    .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
    .innerJoin(businesses, eq(fieldworkVisits.businessId, businesses.id))
    .leftJoin(fieldworkReports, eq(fieldworkReports.visitId, fieldworkVisits.id))
    .leftJoin(fieldworkVisitStaff, and(eq(fieldworkVisitStaff.visitId, fieldworkVisits.id), eq(fieldworkVisitStaff.userId, user.id)))
    .where(and(eq(fieldworkPlans.status, "approved"), or(eq(fieldworkPlans.createdById, user.id), isNotNull(fieldworkVisitStaff.id))))
    .orderBy(desc(fieldworkVisits.scheduledStartAt))
    .limit(300) : [];

  const tasks = isField ? await getOutstandingTasks(user.id, now) : { reports: [], missed: [], total: 0 };

  const routed = user.role === "redo" ? eq(fieldworkPlans.assignedRedoId, user.id) : undefined;
  const reviewer = can(user.role, REVIEW_ROLES);
  const reviewQueue = reviewer ? await db
    .select({ reportId: fieldworkReports.id, visitId: fieldworkVisits.id, businessName: businesses.name, planTitle: fieldworkPlans.title, submittedAt: fieldworkReports.submittedAt, planCreatedById: fieldworkPlans.createdById })
    .from(fieldworkReports)
    .innerJoin(fieldworkVisits, eq(fieldworkReports.visitId, fieldworkVisits.id))
    .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
    .innerJoin(businesses, eq(fieldworkVisits.businessId, businesses.id))
    .where(and(eq(fieldworkReports.status, "submitted"), ne(fieldworkPlans.createdById, user.id), routed))
    .orderBy(fieldworkReports.submittedAt).limit(100) : [];

  const exceptionQueue = reviewer ? await db
    .select({ visitId: fieldworkVisits.id, businessName: businesses.name, planTitle: fieldworkPlans.title, notes: fieldworkVisits.verificationNotes, checkedOutAt: fieldworkVisits.checkedOutAt })
    .from(fieldworkVisits)
    .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
    .innerJoin(businesses, eq(fieldworkVisits.businessId, businesses.id))
    .where(and(eq(fieldworkVisits.status, "completed"), eq(fieldworkVisits.verificationStatus, "needs_review"), ne(fieldworkPlans.createdById, user.id), routed))
    .orderBy(fieldworkVisits.checkedOutAt).limit(100) : [];

  const feedbackIssues = reviewer ? await db
    .select({ reportId: fieldworkReports.id, businessName: businesses.name, status: fieldworkNotificationDeliveries.status, reason: fieldworkNotificationDeliveries.failureReason, attempts: fieldworkNotificationDeliveries.attempts })
    .from(fieldworkNotificationDeliveries)
    .innerJoin(fieldworkVisits, eq(fieldworkNotificationDeliveries.visitId, fieldworkVisits.id))
    .innerJoin(fieldworkReports, eq(fieldworkReports.visitId, fieldworkVisits.id))
    .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
    .innerJoin(businesses, eq(fieldworkVisits.businessId, businesses.id))
    .where(and(eq(fieldworkNotificationDeliveries.kind, FEEDBACK_KIND), inArray(fieldworkNotificationDeliveries.status, ["failed", "skipped", "pending"]), routed))
    .orderBy(desc(fieldworkNotificationDeliveries.updatedAt)).limit(50) : [];

  let blockedOfficers: { userId: string; name: string; total: number; overridden: boolean }[] = [];
  if (user.role === "admin") {
    // Anyone who owns a report task (any plan status, e.g. a since-cancelled plan) or an approved plan can be blocked.
    const withReports = await db.selectDistinct({ userId: fieldworkPlans.createdById }).from(fieldworkReports)
      .innerJoin(fieldworkVisits, eq(fieldworkReports.visitId, fieldworkVisits.id))
      .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
      .where(inArray(fieldworkReports.status, ["draft", "returned"])).limit(200);
    const withPlans = await db.selectDistinct({ userId: fieldworkPlans.createdById }).from(fieldworkPlans).where(eq(fieldworkPlans.status, "approved")).limit(200);
    const candidates = [...new Map([...withReports, ...withPlans].map((c) => [c.userId, c])).values()];
    const profiles = await db.query.userProfiles.findMany({ where: inArray(userProfiles.userId, candidates.map((c) => c.userId).concat("none")), columns: { userId: true, firstName: true, lastName: true } });
    const overrides = await db.select({ userId: fieldworkGateOverrides.userId }).from(fieldworkGateOverrides).where(and(isNull(fieldworkGateOverrides.revokedAt), gt(fieldworkGateOverrides.expiresAt, now)));
    const active = new Set(overrides.map((o) => o.userId));
    for (const profile of profiles) {
      const outstanding = await getOutstandingTasks(profile.userId, now);
      if (outstanding.total) blockedOfficers.push({ userId: profile.userId, name: `${profile.firstName} ${profile.lastName}`.trim(), total: outstanding.total, overridden: active.has(profile.userId) });
    }
    blockedOfficers = blockedOfficers.slice(0, 50);
  }

  const dayStart = startOfNairobiDay(now);
  return {
    success: true as const,
    data: {
      role: user.role!, currentUserId: user.id, isField, reviewer,
      pending: { reports: tasks.reports.length, missed: tasks.missed.length, total: tasks.total },
      visits: visits.map((v) => ({
        ...v,
        canAct: true,
        missedReasonDue: v.status === "scheduled" && v.scheduledStartAt < dayStart,
        isToday: v.scheduledStartAt >= dayStart && v.scheduledStartAt < new Date(dayStart.getTime() + 86_400_000),
        whenLabel: formatNairobi(v.scheduledStartAt),
      })),
      reviewQueue, exceptionQueue, feedbackIssues, blockedOfficers,
    },
  };
}

export async function getFieldworkReportView(visitId: number) {
  const user = await currentUser();
  if (!user || !can(user.role, [...FIELD_ROLES, "redo", "oversight"])) return fail("Unauthorized.");
  const found = await loadReportByVisit(visitId);
  if (!found) return fail("There is no report for this visit.");
  const { visit, report, routing } = found;
  const allowed = user.role === "admin" || user.role === "oversight" || routing.planCreatedById === user.id || (user.role === "redo" && routing.assignedRedoId === user.id);
  if (!allowed) return fail("Unauthorized.");
  const events = await db.query.fieldworkReportEvents.findMany({ where: eq(fieldworkReportEvents.reportId, report.id), orderBy: desc(fieldworkReportEvents.createdAt), limit: 20 });
  return {
    success: true as const,
    data: {
      visitId: visit.id, businessName: visit.business.name, agenda: visit.agenda, planTitle: visit.plan.title, whenLabel: formatNairobi(visit.scheduledStartAt),
      reportId: report.id, status: report.status, returnReason: report.returnReason,
      fields: Object.fromEntries(REPORT_FIELDS.map((f) => [f.key, report[f.key] ?? ""])) as Record<ReportFieldKey, string>,
      canEdit: canEditReport(user, routing), canReview: canReviewReport(user, routing),
      events: events.map((e) => ({ id: e.id, type: e.eventType, at: formatNairobi(e.createdAt), details: e.details as Record<string, unknown> })),
    },
  };
}
