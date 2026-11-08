/**
 * EDO monitoring reminders follow the collection window stored on each MEL
 * reporting period (normally the 1st–10th of the month after the quarter ends).
 * Dates come from configuration, so an admin change to a window changes when
 * reminders go out.
 */

export const COLLECTION_REMINDER_TIME_ZONE = "Africa/Nairobi";

/** Last three days of the window get the closing reminder. Shorter windows still do. */
export const COLLECTION_DEADLINE_LEAD_DAYS = 2;

export type CollectionReminderKind = "opening" | "deadline";

export type CollectionReminderPeriod = {
  status: "planned" | "open" | "closed" | "archived";
  allowCatchUp: boolean;
  collectionOpenDate: string;
  collectionCloseDate: string;
};

const COLLECTOR_STILL_OWES_REPORT = new Set([
  "draft",
  "returned",
  "returned_by_redo",
  "returned_by_mel",
  "reopened",
  "voided",
]);

export function isoDateInTimeZone(
  date: Date,
  timeZone: string = COLLECTION_REMINDER_TIME_ZONE
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addIsoDays(isoDate: string, days: number): string {
  const value = new Date(`${isoDate}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function formatCollectionDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** Periods EDOs can still enter, matching the monitoring workspace rules. */
export function isPeriodOpenForCollection(
  period: Pick<CollectionReminderPeriod, "status" | "allowCatchUp">
): boolean {
  if (period.status === "open") return true;
  return period.status === "closed" && period.allowCatchUp;
}

export function isInsideCollectionWindow(
  period: Pick<CollectionReminderPeriod, "collectionOpenDate" | "collectionCloseDate">,
  today: string
): boolean {
  return today >= period.collectionOpenDate && today <= period.collectionCloseDate;
}

/**
 * One reminder kind per day. Opening covers the start of the configured window.
 * The closing reminder replaces it for the last three days so a late first run
 * still explains the window and the deadline in a single email.
 */
export function collectionReminderKindForDate(
  period: CollectionReminderPeriod,
  today: string
): CollectionReminderKind | null {
  if (!isPeriodOpenForCollection(period)) return null;
  if (!isInsideCollectionWindow(period, today)) return null;

  const deadlineStartsOn = addIsoDays(
    period.collectionCloseDate,
    -COLLECTION_DEADLINE_LEAD_DAYS
  );
  if (today >= deadlineStartsOn) return "deadline";
  return "opening";
}

export function monitoringReportNeedsCollection(status: string | null | undefined): boolean {
  if (!status) return true;
  return COLLECTOR_STILL_OWES_REPORT.has(status);
}

export function collectionReminderEventKey(
  periodId: number,
  recipientId: string,
  kind: CollectionReminderKind
): string {
  return `mel-collection-reminder:${periodId}:${recipientId}:${kind}`;
}
