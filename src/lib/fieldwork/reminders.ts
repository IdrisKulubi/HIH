import React from "react";
import db from "@/db/drizzle";
import { fieldworkNotificationDeliveries, fieldworkPlans, fieldworkVisits, userProfiles } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { logFieldwork } from "./log";
import { getOutstandingTasks } from "./outstanding";
import { startOfNairobiDay } from "./time";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bire-platform.org";
export const REMINDER_KIND = "eod_reminder";

export type ReminderRunResult = { considered: number; sent: number; failed: number; skippedAlreadySent: number; skippedNothingDue: number };

/**
 * End-of-day reminder (scheduled for 17:00 Nairobi). One email per officer per Nairobi day containing the exact
 * counts from getOutstandingTasks, the same source the dashboard and booking gate use. Failures are logged on the
 * delivery row and picked up by the next run; a day's reminder is never sent twice.
 */
export async function dispatchFieldworkReminders(now = new Date()): Promise<ReminderRunResult> {
  const result: ReminderRunResult = { considered: 0, sent: 0, failed: 0, skippedAlreadySent: 0, skippedNothingDue: 0 };
  const dayStart = startOfNairobiDay(now);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  const owners = await db.selectDistinct({ userId: fieldworkPlans.createdById }).from(fieldworkPlans).where(eq(fieldworkPlans.status, "approved"));
  for (const { userId } of owners) {
    result.considered++;
    const tasks = await getOutstandingTasks(userId, now);
    const openToday = await db.query.fieldworkVisits.findMany({
      where: and(inArray(fieldworkVisits.status, ["scheduled", "checked_in"]), gte(fieldworkVisits.scheduledStartAt, dayStart), lt(fieldworkVisits.scheduledStartAt, dayEnd)),
      with: { plan: { columns: { createdById: true, status: true } } },
      columns: { id: true, planId: true },
    });
    const todays = openToday.filter((v) => v.plan.createdById === userId && v.plan.status === "approved");
    if (!tasks.total && !todays.length) { result.skippedNothingDue++; continue; }

    const profile = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId), columns: { email: true, firstName: true } });
    const latestPlan = await db.query.fieldworkPlans.findFirst({ where: and(eq(fieldworkPlans.createdById, userId), eq(fieldworkPlans.status, "approved")), orderBy: desc(fieldworkPlans.id), columns: { id: true } });
    if (!profile?.email || !latestPlan) { result.skippedNothingDue++; continue; }

    const already = await db.query.fieldworkNotificationDeliveries.findFirst({
      where: and(eq(fieldworkNotificationDeliveries.recipientEmail, profile.email), eq(fieldworkNotificationDeliveries.kind, REMINDER_KIND), eq(fieldworkNotificationDeliveries.status, "sent"), gte(fieldworkNotificationDeliveries.createdAt, dayStart)),
      columns: { id: true },
    });
    if (already) { result.skippedAlreadySent++; continue; }

    const [delivery] = await db.insert(fieldworkNotificationDeliveries).values({ planId: latestPlan.id, recipientEmail: profile.email, recipientRole: "edo", kind: REMINDER_KIND, attempts: 1 }).returning({ id: fieldworkNotificationDeliveries.id });
    const link = `${APP_BASE_URL}/fieldwork/execution`;
    try {
      await sendEmail({
        to: profile.email,
        subject: tasks.total ? `You have ${tasks.total} pending fieldwork ${tasks.total === 1 ? "item" : "items"}` : "Fieldwork visits still open today",
        react: React.createElement("div", null,
          React.createElement("p", null, `Hello ${profile.firstName},`),
          tasks.total ? React.createElement("p", null, `You have ${tasks.reports.length} report(s) and ${tasks.missed.length} missed-visit reason(s) outstanding. New bookings are blocked until they are done.`) : null,
          ...tasks.reports.map((r) => React.createElement("p", { key: `r${r.visitId}` }, `Report due: ${r.businessName} (${r.status})`)),
          ...tasks.missed.map((m) => React.createElement("p", { key: `m${m.visitId}` }, `Reason needed: ${m.businessName}`)),
          todays.length ? React.createElement("p", null, `${todays.length} visit(s) scheduled today are not yet completed. Check out, or record a reason if they did not happen.`) : null,
          React.createElement("p", null, React.createElement("a", { href: link }, "Open visit execution"))),
      });
      await db.update(fieldworkNotificationDeliveries).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() }).where(eq(fieldworkNotificationDeliveries.id, delivery.id));
      result.sent++;
    } catch (error) {
      await db.update(fieldworkNotificationDeliveries).set({ status: "failed", failureReason: error instanceof Error ? error.message : "Email delivery failed", updatedAt: new Date() }).where(eq(fieldworkNotificationDeliveries.id, delivery.id));
      logFieldwork("error", "reminder_failed", { userId, error: error instanceof Error ? error.message : String(error) });
      result.failed++;
    }
  }
  return result;
}
