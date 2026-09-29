import { and, eq, inArray, lt, sql } from "drizzle-orm";
import db from "@/db/drizzle";
import {
  businesses,
  melEnterpriseAssignments,
  melMonitoringSubmissions,
  melNotificationOutbox,
  melReportingPeriods,
  userProfiles,
  users,
} from "@/db/schema";
import { sendMelCollectionReminderEmail } from "@/lib/email";
import {
  collectionReminderEventKey,
  collectionReminderKindForDate,
  formatCollectionDate,
  isoDateInTimeZone,
  monitoringReportNeedsCollection,
  type CollectionReminderKind,
} from "@/lib/mel/collection-reminders";
import { recordMelOperationalEvent } from "@/lib/mel/operations";

const INSTRUMENT_CODE = "quarterly_enterprise_monitoring";
const MAX_ATTEMPTS = 3;
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bire-platform.org";

export type CollectionReminderRunResult = {
  today: string;
  periods: Array<{
    code: string;
    kind: CollectionReminderKind | null;
    recipients: number;
    sent: number;
    skipped: number;
    failed: number;
  }>;
};

type CollectorBucket = {
  userId: string;
  email: string;
  name: string;
  enterprises: Map<number, string>;
};

export async function dispatchMelCollectionReminders(
  today: string = isoDateInTimeZone(new Date())
): Promise<CollectionReminderRunResult> {
  const periods = await db
    .select({
      id: melReportingPeriods.id,
      code: melReportingPeriods.code,
      label: melReportingPeriods.label,
      status: melReportingPeriods.status,
      allowCatchUp: melReportingPeriods.allowCatchUp,
      collectionOpenDate: melReportingPeriods.collectionOpenDate,
      collectionCloseDate: melReportingPeriods.collectionCloseDate,
    })
    .from(melReportingPeriods);

  const due = periods.flatMap((period) => {
    const kind = collectionReminderKindForDate(period, today);
    return kind ? [{ period, kind }] : [];
  });

  const results: CollectionReminderRunResult["periods"] = [];

  for (const { period, kind } of due) {
    const recipients = await loadCollectorsWithOutstandingReports(period.id);
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const outcome = await sendReminder({
        period,
        kind,
        recipient,
      });
      if (outcome === "sent") sent += 1;
      else if (outcome === "failed") failed += 1;
      else skipped += 1;
    }

    results.push({
      code: period.code,
      kind,
      recipients: recipients.length,
      sent,
      skipped,
      failed,
    });
  }

  await recordMelOperationalEvent({
    severity: results.some((item) => item.failed > 0) ? "warning" : "info",
    eventType: "collection_reminder_run",
    message:
      due.length === 0
        ? "No MEL collection window is open, so no EDO reminders were sent."
        : `MEL collection reminders processed for ${due.map((item) => item.period.code).join(", ")}.`,
    metadata: { today, periods: results },
  });

  return { today, periods: results };
}

async function loadCollectorsWithOutstandingReports(periodId: number): Promise<CollectorBucket[]> {
  const assignments = await db
    .select({
      collectorId: melEnterpriseAssignments.collectorId,
      businessId: businesses.id,
      businessName: businesses.name,
      userEmail: users.email,
      userName: users.name,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      profileEmail: userProfiles.email,
    })
    .from(melEnterpriseAssignments)
    .innerJoin(businesses, eq(businesses.id, melEnterpriseAssignments.businessId))
    .innerJoin(users, eq(users.id, melEnterpriseAssignments.collectorId))
    .innerJoin(userProfiles, eq(userProfiles.userId, melEnterpriseAssignments.collectorId))
    .where(
      and(eq(melEnterpriseAssignments.isActive, true), eq(userProfiles.role, "bds_edo"))
    );

  if (assignments.length === 0) return [];

  const businessIds = [...new Set(assignments.map((row) => row.businessId))];
  const submissions = await db
    .select({
      businessId: melMonitoringSubmissions.businessId,
      status: melMonitoringSubmissions.status,
    })
    .from(melMonitoringSubmissions)
    .where(
      and(
        eq(melMonitoringSubmissions.reportingPeriodId, periodId),
        eq(melMonitoringSubmissions.instrumentCode, INSTRUMENT_CODE),
        inArray(melMonitoringSubmissions.businessId, businessIds)
      )
    );

  const statusByBusiness = new Map(submissions.map((row) => [row.businessId, row.status]));
  const collectors = new Map<string, CollectorBucket>();

  for (const row of assignments) {
    if (!monitoringReportNeedsCollection(statusByBusiness.get(row.businessId))) continue;
    const email = (row.profileEmail ?? row.userEmail ?? "").trim().toLowerCase();
    if (!email) continue;
    const existing = collectors.get(row.collectorId) ?? {
      userId: row.collectorId,
      email,
      name:
        [row.firstName, row.lastName].filter(Boolean).join(" ").trim() ||
        row.userName?.trim() ||
        "Programme staff",
      enterprises: new Map<number, string>(),
    };
    existing.enterprises.set(row.businessId, row.businessName);
    collectors.set(row.collectorId, existing);
  }

  return [...collectors.values()];
}

async function sendReminder(input: {
  period: {
    id: number;
    code: string;
    label: string;
    collectionOpenDate: string;
    collectionCloseDate: string;
  };
  kind: CollectionReminderKind;
  recipient: CollectorBucket;
}): Promise<"sent" | "skipped" | "failed"> {
  const eventKey = collectionReminderEventKey(input.period.id, input.recipient.userId, input.kind);
  const enterpriseNames = [...input.recipient.enterprises.values()].sort((a, b) =>
    a.localeCompare(b)
  );
  const openLabel = formatCollectionDate(input.period.collectionOpenDate);
  const closeLabel = formatCollectionDate(input.period.collectionCloseDate);
  const title =
    input.kind === "deadline"
      ? `Monitoring collection closes on ${closeLabel}`
      : `Monitoring collection is open until ${closeLabel}`;
  const body = `${input.period.label}: submit ${enterpriseNames.length} enterprise report(s) between ${openLabel} and ${closeLabel}.`;

  await db
    .insert(melNotificationOutbox)
    .values({
      eventKey,
      recipientId: input.recipient.userId,
      eventType: `collection_reminder_${input.kind}`,
      title,
      body,
      href: "/admin/mel/monitoring",
      status: "pending",
      attempts: 0,
    })
    .onConflictDoNothing();

  const claimed = await db
    .update(melNotificationOutbox)
    .set({
      attempts: sql`${melNotificationOutbox.attempts} + 1`,
      status: "pending",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(melNotificationOutbox.eventKey, eventKey),
        inArray(melNotificationOutbox.status, ["pending", "failed"]),
        lt(melNotificationOutbox.attempts, MAX_ATTEMPTS)
      )
    )
    .returning({ id: melNotificationOutbox.id });

  if (claimed.length === 0) return "skipped";

  const result = await sendMelCollectionReminderEmail({
    collectorEmail: input.recipient.email,
    collectorName: input.recipient.name,
    periodLabel: input.period.label,
    collectionOpenDate: openLabel,
    collectionCloseDate: closeLabel,
    kind: input.kind,
    enterpriseNames,
    remainingCount: enterpriseNames.length,
    monitoringUrl: `${APP_BASE_URL}/admin/mel/monitoring`,
  });

  if (result.success) {
    await db
      .update(melNotificationOutbox)
      .set({ status: "sent", sentAt: new Date(), lastError: null, updatedAt: new Date() })
      .where(eq(melNotificationOutbox.eventKey, eventKey));
    return "sent";
  }

  await db
    .update(melNotificationOutbox)
    .set({
      status: "failed",
      lastError: result.error ?? "Email delivery failed",
      updatedAt: new Date(),
    })
    .where(eq(melNotificationOutbox.eventKey, eventKey));
  return "failed";
}
