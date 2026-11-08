import db from "@/db/drizzle";
import { businesses, fieldworkGateOverrides, fieldworkPlans, fieldworkReports, fieldworkVisits } from "@/db/schema";
import { and, eq, gt, inArray, isNull, lt } from "drizzle-orm";
import { startOfNairobiDay } from "./time";

/**
 * Single source of truth for "what does this EDO still owe?". The pending-report dashboard,
 * end-of-day reminders and the booking gate all read from here so their numbers always reconcile.
 *  - report tasks: verified visits whose report is still draft or returned
 *  - missed-reason tasks: approved-plan visits still `scheduled` after their Nairobi day has ended
 */
export async function getOutstandingTasks(userId: string, now = new Date()) {
  const reports = await db
    .select({ visitId: fieldworkVisits.id, reportId: fieldworkReports.id, status: fieldworkReports.status, businessName: businesses.name, planTitle: fieldworkPlans.title })
    .from(fieldworkReports)
    .innerJoin(fieldworkVisits, eq(fieldworkReports.visitId, fieldworkVisits.id))
    .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
    .innerJoin(businesses, eq(fieldworkVisits.businessId, businesses.id))
    .where(and(eq(fieldworkPlans.createdById, userId), inArray(fieldworkReports.status, ["draft", "returned"])));
  const missed = await db
    .select({ visitId: fieldworkVisits.id, businessName: businesses.name, planTitle: fieldworkPlans.title, scheduledStartAt: fieldworkVisits.scheduledStartAt })
    .from(fieldworkVisits)
    .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
    .innerJoin(businesses, eq(fieldworkVisits.businessId, businesses.id))
    .where(and(eq(fieldworkPlans.createdById, userId), eq(fieldworkPlans.status, "approved"), eq(fieldworkVisits.status, "scheduled"), lt(fieldworkVisits.scheduledStartAt, startOfNairobiDay(now))));
  return { reports, missed, total: reports.length + missed.length };
}

export async function hasActiveGateOverride(userId: string, now = new Date()) {
  const row = await db.query.fieldworkGateOverrides.findFirst({
    where: and(eq(fieldworkGateOverrides.userId, userId), isNull(fieldworkGateOverrides.revokedAt), gt(fieldworkGateOverrides.expiresAt, now)),
    columns: { id: true },
  });
  return !!row;
}

/** Booking gate: blocked while work is outstanding, unless an admin override is active. */
export async function getGateStatus(userId: string) {
  const tasks = await getOutstandingTasks(userId);
  if (!tasks.total) return { blocked: false, total: 0, overridden: false };
  const overridden = await hasActiveGateOverride(userId);
  return { blocked: !overridden, total: tasks.total, overridden };
}
