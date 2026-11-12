import db from "@/db/drizzle";
import { fieldworkNotificationDeliveries, fieldworkPlans, fieldworkReports, fieldworkVisitStaff, fieldworkVisits } from "@/db/schema";
import { and, count, eq, gte, inArray, isNotNull, lt, ne, or } from "drizzle-orm";
import { getOutstandingTasks } from "./outstanding";
import { startOfNairobiDay } from "./time";

export type FieldworkHubSummary = {
  role: "bds_edo" | "redo" | "admin" | "oversight";
  /** Items that need this person's action, in priority order, for the card chips. */
  highlights: { label: string; value: number; href: string }[];
  /** Total of all action items; the card is emphasised when above zero. */
  actionCount: number;
};

const countOf = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;

/** Live fieldwork counts for the role landing pages. Cheap count queries only. */
export async function getFieldworkHubSummary(user: { id: string; role: string }): Promise<FieldworkHubSummary | null> {
  const now = new Date();
  const dayStart = startOfNairobiDay(now);
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);

  if (user.role === "bds_edo") {
    const needsWork = await countOf(db.select({ n: count() }).from(fieldworkPlans).where(and(eq(fieldworkPlans.createdById, user.id), inArray(fieldworkPlans.status, ["draft", "returned"]))));
    const tasks = await getOutstandingTasks(user.id, now);
    const today = await countOf(db.select({ n: count() }).from(fieldworkVisits)
      .innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
      .leftJoin(fieldworkVisitStaff, and(eq(fieldworkVisitStaff.visitId, fieldworkVisits.id), eq(fieldworkVisitStaff.userId, user.id)))
      .where(and(eq(fieldworkPlans.status, "approved"), inArray(fieldworkVisits.status, ["scheduled", "checked_in"]), gte(fieldworkVisits.scheduledStartAt, dayStart), lt(fieldworkVisits.scheduledStartAt, dayEnd), or(eq(fieldworkPlans.createdById, user.id), isNotNull(fieldworkVisitStaff.id)))));
    return {
      role: "bds_edo",
      actionCount: needsWork + tasks.total + today,
      highlights: [
        { label: "Visits today", value: today, href: "/fieldwork/execution" },
        { label: "Reports due", value: tasks.reports.length, href: "/fieldwork/execution#reports-due" },
        { label: "Missed-visit reasons", value: tasks.missed.length, href: "/fieldwork/execution#missed-due" },
        { label: "Plans to finish or fix", value: needsWork, href: "/fieldwork" },
      ],
    };
  }

  if (user.role === "redo" || user.role === "admin") {
    const routedPlan = user.role === "redo" ? eq(fieldworkPlans.assignedRedoId, user.id) : undefined;
    const plans = await countOf(db.select({ n: count() }).from(fieldworkPlans).where(and(eq(fieldworkPlans.status, "submitted"), ne(fieldworkPlans.createdById, user.id), routedPlan)));
    const reports = await countOf(db.select({ n: count() }).from(fieldworkReports)
      .innerJoin(fieldworkVisits, eq(fieldworkReports.visitId, fieldworkVisits.id)).innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
      .where(and(eq(fieldworkReports.status, "submitted"), ne(fieldworkPlans.createdById, user.id), routedPlan)));
    const exceptions = await countOf(db.select({ n: count() }).from(fieldworkVisits).innerJoin(fieldworkPlans, eq(fieldworkVisits.planId, fieldworkPlans.id))
      .where(and(eq(fieldworkVisits.status, "completed"), eq(fieldworkVisits.verificationStatus, "needs_review"), ne(fieldworkPlans.createdById, user.id), routedPlan)));
    const highlights = [
      { label: "Plans awaiting approval", value: plans, href: "/fieldwork" },
      { label: "Reports to review", value: reports, href: "/fieldwork/execution" },
      { label: "Location exceptions", value: exceptions, href: "/fieldwork/execution" },
    ];
    let actionCount = plans + reports + exceptions;
    if (user.role === "admin") {
      const failed = await countOf(db.select({ n: count() }).from(fieldworkNotificationDeliveries).where(and(eq(fieldworkNotificationDeliveries.status, "failed"), gte(fieldworkNotificationDeliveries.createdAt, new Date(now.getTime() - 7 * 86_400_000)))));
      highlights.push({ label: "Failed emails (7 days)", value: failed, href: "/admin/fieldwork?tab=deliveries&status=failed" });
      actionCount += failed;
    }
    return { role: user.role, actionCount, highlights };
  }

  if (user.role === "oversight") {
    const submitted = await countOf(db.select({ n: count() }).from(fieldworkPlans).where(eq(fieldworkPlans.status, "submitted")));
    const review = await countOf(db.select({ n: count() }).from(fieldworkVisits).where(and(eq(fieldworkVisits.status, "completed"), eq(fieldworkVisits.verificationStatus, "needs_review"))));
    return { role: "oversight", actionCount: 0, highlights: [{ label: "Plans awaiting approval", value: submitted, href: "/admin/fieldwork?tab=plans&status=submitted" }, { label: "Visits needing location review", value: review, href: "/admin/fieldwork?tab=visits&verification=needs_review" }] };
  }
  return null;
}
