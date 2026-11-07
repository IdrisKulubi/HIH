import db from "@/db/drizzle";
import {
  businesses, fieldworkAuditEvents, fieldworkGateOverrides, fieldworkNotificationDeliveries, fieldworkPlans, fieldworkReports, fieldworkVisits, userProfiles,
} from "@/db/schema";
import { and, count, desc, eq, gt, gte, ilike, isNull, lt, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { countWords } from "./report-rules";
import { isoToNairobiLocal } from "./time";

/**
 * Admin read models. The on-screen tables and the CSV/XLSX exports both come from `queryDataset`,
 * so exported totals and statuses always reconcile with what the portal shows.
 */
export const DATASETS = ["plans", "visits", "reports", "deliveries", "audit"] as const;
export type Dataset = (typeof DATASETS)[number];
export const isDataset = (value: string | null | undefined): value is Dataset => !!value && (DATASETS as readonly string[]).includes(value);

export type AdminFilters = { q?: string; status?: string; verification?: string; kind?: string; event?: string; from?: string; to?: string; edo?: string; redo?: string };
export type Row = Record<string, string | number | boolean | null>;
export type DatasetResult = { rows: Row[]; total: number };
export type QueryOptions = { page?: number; pageSize?: number; limit?: number; includeLocation?: boolean; fullText?: boolean };

export const PAGE_SIZE = 25;
export const EXPORT_ROW_CAP = 10_000;

const FILTER_KEYS: (keyof AdminFilters)[] = ["q", "status", "verification", "kind", "event", "from", "to", "edo", "redo"];
const isDate = (value: string | undefined) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Keeps only known, well-formed filters (anything else is dropped, never interpolated). */
export function parseFilters(params: Record<string, string | string[] | undefined>): AdminFilters {
  const filters: AdminFilters = {};
  for (const key of FILTER_KEYS) {
    const raw = Array.isArray(params[key]) ? params[key]![0] : params[key];
    const value = raw?.trim().slice(0, 100);
    if (!value) continue;
    if ((key === "from" || key === "to") && !isDate(value)) continue;
    filters[key] = value;
  }
  return filters;
}

const dayStart = (date: string) => new Date(`${date}T00:00:00+03:00`);
const dayAfter = (date: string) => new Date(dayStart(date).getTime() + 86_400_000);
const like = (value: string) => `%${value.replace(/[%_\\]/g, "\\$&")}%`;
const stamp = (value: Date | null | undefined) => (value ? isoToNairobiLocal(value).replace("T", " ") : null);
const fullName = (first: string | null, last: string | null) => [first, last].filter(Boolean).join(" ") || null;

function window(options: QueryOptions) {
  if (options.limit) return { limit: options.limit, offset: 0 };
  const pageSize = options.pageSize ?? PAGE_SIZE;
  return { limit: pageSize, offset: Math.max(0, ((options.page ?? 1) - 1) * pageSize) };
}

const edoProfile = alias(userProfiles, "edo_profile");
const redoProfile = alias(userProfiles, "redo_profile");
const reviewerProfile = alias(userProfiles, "reviewer_profile");
const actorProfile = alias(userProfiles, "actor_profile");

async function plansDataset(f: AdminFilters, o: QueryOptions): Promise<DatasetResult> {
  const where: (SQL | undefined)[] = [
    f.q ? ilike(fieldworkPlans.title, like(f.q)) : undefined,
    f.status ? sql`${fieldworkPlans.status}::text = ${f.status}` : undefined,
    f.from ? gte(fieldworkPlans.scheduledStartAt, dayStart(f.from)) : undefined,
    f.to ? lt(fieldworkPlans.scheduledStartAt, dayAfter(f.to)) : undefined,
    f.edo ? eq(fieldworkPlans.createdById, f.edo) : undefined,
    f.redo ? eq(fieldworkPlans.assignedRedoId, f.redo) : undefined,
  ];
  const w = and(...where);
  const { limit, offset } = window(o);
  const [{ total }] = await db.select({ total: count() }).from(fieldworkPlans).where(w);
  const data = await db.select({
    p: fieldworkPlans, edoFirst: edoProfile.firstName, edoLast: edoProfile.lastName, redoFirst: redoProfile.firstName, redoLast: redoProfile.lastName,
    visitCount: sql<number>`(select count(*)::int from fieldwork_visits v where v.plan_id = ${fieldworkPlans.id})`,
  }).from(fieldworkPlans)
    .leftJoin(edoProfile, eq(edoProfile.userId, fieldworkPlans.createdById))
    .leftJoin(redoProfile, eq(redoProfile.userId, fieldworkPlans.assignedRedoId))
    .where(w).orderBy(desc(fieldworkPlans.scheduledStartAt), desc(fieldworkPlans.id)).limit(limit).offset(offset);
  return {
    total,
    rows: data.map(({ p, ...r }) => ({
      Plan_ID: p.id, Title: p.title, Status: p.status, EDO: fullName(r.edoFirst, r.edoLast), REDO: fullName(r.redoFirst, r.redoLast),
      Scheduled_Start: stamp(p.scheduledStartAt), Scheduled_End: stamp(p.scheduledEndAt), Visits: r.visitCount,
      Submitted_At: stamp(p.submittedAt), Reviewed_At: stamp(p.reviewedAt), Return_Reason: p.returnReason, Cancellation_Reason: p.cancellationReason,
    })),
  };
}

async function visitsDataset(f: AdminFilters, o: QueryOptions): Promise<DatasetResult> {
  const where: (SQL | undefined)[] = [
    f.q ? ilike(businesses.name, like(f.q)) : undefined,
    f.status ? sql`${fieldworkVisits.status}::text = ${f.status}` : undefined,
    f.verification ? sql`${fieldworkVisits.verificationStatus}::text = ${f.verification}` : undefined,
    f.from ? gte(fieldworkVisits.scheduledStartAt, dayStart(f.from)) : undefined,
    f.to ? lt(fieldworkVisits.scheduledStartAt, dayAfter(f.to)) : undefined,
    f.edo ? eq(fieldworkPlans.createdById, f.edo) : undefined,
    f.redo ? eq(fieldworkPlans.assignedRedoId, f.redo) : undefined,
  ];
  const w = and(...where);
  const { limit, offset } = window(o);
  const [{ total }] = await db.select({ total: count() }).from(fieldworkVisits)
    .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id)).innerJoin(businesses, eq(fieldworkVisits.businessId, businesses.id)).where(w);
  const data = await db.select({ v: fieldworkVisits, planTitle: fieldworkPlans.title, business: businesses.name, county: businesses.county, edoFirst: edoProfile.firstName, edoLast: edoProfile.lastName, reportStatus: fieldworkReports.status })
    .from(fieldworkVisits)
    .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
    .innerJoin(businesses, eq(fieldworkVisits.businessId, businesses.id))
    .leftJoin(edoProfile, eq(edoProfile.userId, fieldworkPlans.createdById))
    .leftJoin(fieldworkReports, eq(fieldworkReports.visitId, fieldworkVisits.id))
    .where(w).orderBy(desc(fieldworkVisits.scheduledStartAt), desc(fieldworkVisits.id)).limit(limit).offset(offset);
  return {
    total,
    rows: data.map(({ v, ...r }) => ({
      Visit_ID: v.id, Plan_ID: v.planId, Plan: r.planTitle, Enterprise: r.business, County: r.county, EDO: fullName(r.edoFirst, r.edoLast),
      Scheduled_Start: stamp(v.scheduledStartAt), Duration_Min: v.estimatedDurationMinutes, Status: v.status, Verification: v.verificationStatus, Verification_Notes: v.verificationNotes,
      Check_In_At: stamp(v.checkedInAt), Check_Out_At: stamp(v.checkedOutAt),
      Check_In_Distance_m: v.checkInDistanceMeters, Check_Out_Distance_m: v.checkOutDistanceMeters,
      Check_In_Accuracy_m: v.checkInAccuracyMeters, Check_Out_Accuracy_m: v.checkOutAccuracyMeters,
      Check_In_Location: v.checkInLocationState, Check_Out_Location: v.checkOutLocationState,
      Exception_Reason: v.exceptionReason, Missed_Reason: v.missedReason, Report_Status: r.reportStatus,
      // Precise coordinates are excluded unless explicitly requested by an authorised admin export.
      ...(o.includeLocation ? { Check_In_Latitude: v.checkInLatitude, Check_In_Longitude: v.checkInLongitude, Check_Out_Latitude: v.checkOutLatitude, Check_Out_Longitude: v.checkOutLongitude } : {}),
    })),
  };
}

async function reportsDataset(f: AdminFilters, o: QueryOptions): Promise<DatasetResult> {
  const where: (SQL | undefined)[] = [
    f.q ? ilike(businesses.name, like(f.q)) : undefined,
    f.status ? sql`${fieldworkReports.status}::text = ${f.status}` : undefined,
    f.from ? gte(fieldworkVisits.scheduledStartAt, dayStart(f.from)) : undefined,
    f.to ? lt(fieldworkVisits.scheduledStartAt, dayAfter(f.to)) : undefined,
    f.edo ? eq(fieldworkPlans.createdById, f.edo) : undefined,
    f.redo ? eq(fieldworkPlans.assignedRedoId, f.redo) : undefined,
  ];
  const w = and(...where);
  const { limit, offset } = window(o);
  const [{ total }] = await db.select({ total: count() }).from(fieldworkReports)
    .innerJoin(fieldworkVisits, eq(fieldworkReports.visitId, fieldworkVisits.id)).innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
    .innerJoin(businesses, eq(fieldworkVisits.businessId, businesses.id)).where(w);
  const data = await db.select({ r: fieldworkReports, visitId: fieldworkVisits.id, when: fieldworkVisits.scheduledStartAt, planTitle: fieldworkPlans.title, business: businesses.name, edoFirst: edoProfile.firstName, edoLast: edoProfile.lastName, revFirst: reviewerProfile.firstName, revLast: reviewerProfile.lastName })
    .from(fieldworkReports)
    .innerJoin(fieldworkVisits, eq(fieldworkReports.visitId, fieldworkVisits.id))
    .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
    .innerJoin(businesses, eq(fieldworkVisits.businessId, businesses.id))
    .leftJoin(edoProfile, eq(edoProfile.userId, fieldworkPlans.createdById))
    .leftJoin(reviewerProfile, eq(reviewerProfile.userId, fieldworkReports.reviewedById))
    .where(w).orderBy(desc(fieldworkVisits.scheduledStartAt), desc(fieldworkReports.id)).limit(limit).offset(offset);
  return {
    total,
    rows: data.map(({ r, ...x }) => ({
      Report_ID: r.id, Visit_ID: x.visitId, Enterprise: x.business, Plan: x.planTitle, EDO: fullName(x.edoFirst, x.edoLast), Visit_Date: stamp(x.when), Status: r.status,
      Submitted_At: stamp(r.submittedAt), Reviewed_At: stamp(r.reviewedAt), Reviewer: fullName(x.revFirst, x.revLast), Return_Reason: r.returnReason,
      Activities_Words: countWords(r.activitiesConducted), Findings_Words: countWords(r.findingsAndGaps), Recommendations_Words: countWords(r.recommendations),
      ...(o.fullText ? { Activities: r.activitiesConducted, Findings_And_Gaps: r.findingsAndGaps, Challenges: r.enterpriseChallenges, Solutions: r.solutionsOffered, Recommendations: r.recommendations, Action_Points: r.actionPoints, Timeline: r.timeline } : {}),
    })),
  };
}

async function deliveriesDataset(f: AdminFilters, o: QueryOptions): Promise<DatasetResult> {
  const where: (SQL | undefined)[] = [
    f.q ? ilike(fieldworkNotificationDeliveries.recipientEmail, like(f.q)) : undefined,
    f.status ? sql`${fieldworkNotificationDeliveries.status}::text = ${f.status}` : undefined,
    f.kind ? eq(fieldworkNotificationDeliveries.kind, f.kind) : undefined,
    f.from ? gte(fieldworkNotificationDeliveries.createdAt, dayStart(f.from)) : undefined,
    f.to ? lt(fieldworkNotificationDeliveries.createdAt, dayAfter(f.to)) : undefined,
  ];
  const w = and(...where);
  const { limit, offset } = window(o);
  const [{ total }] = await db.select({ total: count() }).from(fieldworkNotificationDeliveries).where(w);
  const data = await db.select({ d: fieldworkNotificationDeliveries, planTitle: fieldworkPlans.title })
    .from(fieldworkNotificationDeliveries).innerJoin(fieldworkPlans, eq(fieldworkNotificationDeliveries.planId, fieldworkPlans.id))
    .where(w).orderBy(desc(fieldworkNotificationDeliveries.createdAt), desc(fieldworkNotificationDeliveries.id)).limit(limit).offset(offset);
  return {
    total,
    rows: data.map(({ d, planTitle }) => ({
      Delivery_ID: d.id, Plan_ID: d.planId, Plan: planTitle, Visit_ID: d.visitId, Kind: d.kind, Recipient_Role: d.recipientRole, Recipient: d.recipientEmail,
      Status: d.status, Attempts: d.attempts, Failure_Reason: d.failureReason, Sent_At: stamp(d.sentAt), Created_At: stamp(d.createdAt),
    })),
  };
}

async function auditDataset(f: AdminFilters, o: QueryOptions): Promise<DatasetResult> {
  const where: (SQL | undefined)[] = [
    f.q ? ilike(fieldworkPlans.title, like(f.q)) : undefined,
    f.event ? eq(fieldworkAuditEvents.eventType, f.event) : undefined,
    f.edo ? eq(fieldworkAuditEvents.actorId, f.edo) : undefined,
    f.from ? gte(fieldworkAuditEvents.createdAt, dayStart(f.from)) : undefined,
    f.to ? lt(fieldworkAuditEvents.createdAt, dayAfter(f.to)) : undefined,
  ];
  const w = and(...where);
  const { limit, offset } = window(o);
  const [{ total }] = await db.select({ total: count() }).from(fieldworkAuditEvents).innerJoin(fieldworkPlans, eq(fieldworkAuditEvents.planId, fieldworkPlans.id)).where(w);
  const data = await db.select({ e: fieldworkAuditEvents, planTitle: fieldworkPlans.title, first: actorProfile.firstName, last: actorProfile.lastName })
    .from(fieldworkAuditEvents).innerJoin(fieldworkPlans, eq(fieldworkAuditEvents.planId, fieldworkPlans.id))
    .leftJoin(actorProfile, eq(actorProfile.userId, fieldworkAuditEvents.actorId))
    .where(w).orderBy(desc(fieldworkAuditEvents.createdAt), desc(fieldworkAuditEvents.id)).limit(limit).offset(offset);
  return {
    total,
    rows: data.map(({ e, ...x }) => ({
      Event_ID: e.id, At: stamp(e.createdAt), Plan_ID: e.planId, Plan: x.planTitle, Visit_ID: e.visitId, Event: e.eventType, Actor: fullName(x.first, x.last), Details: JSON.stringify(e.details),
    })),
  };
}

export function queryDataset(dataset: Dataset, filters: AdminFilters, options: QueryOptions = {}): Promise<DatasetResult> {
  switch (dataset) {
    case "plans": return plansDataset(filters, options);
    case "visits": return visitsDataset(filters, options);
    case "reports": return reportsDataset(filters, options);
    case "deliveries": return deliveriesDataset(filters, options);
    case "audit": return auditDataset(filters, options);
  }
}

/** Headline numbers and failure alerts for the admin overview. */
export async function getAdminSummary(now = new Date()) {
  const week = new Date(now.getTime() - 7 * 86_400_000);
  const grouped = async (table: "plans" | "visits" | "reports") => {
    const q = table === "plans" ? db.select({ s: sql<string>`${fieldworkPlans.status}::text`, n: count() }).from(fieldworkPlans).groupBy(fieldworkPlans.status)
      : table === "visits" ? db.select({ s: sql<string>`${fieldworkVisits.status}::text`, n: count() }).from(fieldworkVisits).groupBy(fieldworkVisits.status)
      : db.select({ s: sql<string>`${fieldworkReports.status}::text`, n: count() }).from(fieldworkReports).groupBy(fieldworkReports.status);
    return Object.fromEntries((await q).map((r) => [r.s, r.n])) as Record<string, number>;
  };
  const [plans, visits, reports] = await Promise.all([grouped("plans"), grouped("visits"), grouped("reports")]);
  const [{ needsReview }] = await db.select({ needsReview: count() }).from(fieldworkVisits).where(and(eq(fieldworkVisits.status, "completed"), eq(fieldworkVisits.verificationStatus, "needs_review")));
  const [{ activeOverrides }] = await db.select({ activeOverrides: count() }).from(fieldworkGateOverrides).where(and(isNull(fieldworkGateOverrides.revokedAt), gt(fieldworkGateOverrides.expiresAt, now)));
  const failed = await db.select({ recipient: fieldworkNotificationDeliveries.recipientEmail, kind: fieldworkNotificationDeliveries.kind, n: count() })
    .from(fieldworkNotificationDeliveries)
    .where(and(eq(fieldworkNotificationDeliveries.status, "failed"), gte(fieldworkNotificationDeliveries.createdAt, week)))
    .groupBy(fieldworkNotificationDeliveries.recipientEmail, fieldworkNotificationDeliveries.kind);
  const [{ held }] = await db.select({ held: count() }).from(fieldworkNotificationDeliveries).where(and(eq(fieldworkNotificationDeliveries.status, "skipped"), eq(fieldworkNotificationDeliveries.kind, "approved_fieldwork_feedback")));
  return {
    plans, visits, reports, needsReview, activeOverrides, heldFeedback: held,
    failedDeliveries: failed.reduce((sum, r) => sum + r.n, 0),
    repeatedFailures: failed.filter((r) => r.n >= 3),
  };
}

export async function getFilterOptions() {
  const edos = await db.selectDistinct({ userId: fieldworkPlans.createdById, first: edoProfile.firstName, last: edoProfile.lastName }).from(fieldworkPlans).leftJoin(edoProfile, eq(edoProfile.userId, fieldworkPlans.createdById));
  const redos = await db.query.userProfiles.findMany({ where: eq(userProfiles.role, "redo"), columns: { userId: true, firstName: true, lastName: true } });
  return {
    edos: edos.map((e) => ({ id: e.userId, name: fullName(e.first, e.last) ?? e.userId })),
    redos: redos.map((r) => ({ id: r.userId, name: fullName(r.firstName, r.lastName) ?? r.userId })),
  };
}
