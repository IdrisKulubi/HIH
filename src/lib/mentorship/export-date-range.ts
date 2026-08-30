import {
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
} from "date-fns";

export const MENTORSHIP_EXPORT_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "month", label: "This month" },
  { id: "quarter", label: "This quarter" },
  { id: "year", label: "This year" },
  { id: "custom", label: "Custom" },
] as const;

export type MentorshipExportPreset = (typeof MENTORSHIP_EXPORT_PRESETS)[number]["id"];

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isMentorshipExportYmd(value: string | null | undefined): value is string {
  return Boolean(value && YMD.test(value));
}

export function toMentorshipExportYmd(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function ymdInRange(
  value: Date | string | null | undefined,
  from: string | null,
  to: string | null
): boolean {
  const day = toMentorshipExportYmd(value);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function sessionInMentorshipExportRange(
  session: {
    scheduledDate: Date | string;
    completedDate: Date | string | null;
    approvedAt: Date | string | null;
    updatedAt: Date | string;
    status: string;
  },
  from: string | null,
  to: string | null
): boolean {
  if (!from && !to) return true;
  return (
    ymdInRange(session.scheduledDate, from, to) ||
    ymdInRange(session.completedDate, from, to) ||
    ymdInRange(session.approvedAt, from, to) ||
    (session.status === "pending_approval" && ymdInRange(session.updatedAt, from, to))
  );
}

export function parseMentorshipExportDateParams(searchParams: URLSearchParams):
  | { ok: true; from: string | null; to: string | null }
  | { ok: false; error: string } {
  const fromRaw = searchParams.get("from")?.trim() || null;
  const toRaw = searchParams.get("to")?.trim() || null;

  if (fromRaw && !isMentorshipExportYmd(fromRaw)) {
    return { ok: false, error: "From date must be YYYY-MM-DD." };
  }
  if (toRaw && !isMentorshipExportYmd(toRaw)) {
    return { ok: false, error: "To date must be YYYY-MM-DD." };
  }
  if (fromRaw && toRaw && fromRaw > toRaw) {
    return { ok: false, error: "From date must be on or before the to date." };
  }

  return { ok: true, from: fromRaw, to: toRaw };
}

export function formatYmdLocal(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function resolveMentorshipExportRange(
  preset: MentorshipExportPreset,
  from: string,
  to: string,
  now = new Date()
): { from: string; to: string } {
  const today = startOfDay(now);

  switch (preset) {
    case "all":
      return { from: "", to: "" };
    case "7d":
      return { from: formatYmdLocal(subDays(today, 6)), to: formatYmdLocal(today) };
    case "30d":
      return { from: formatYmdLocal(subDays(today, 29)), to: formatYmdLocal(today) };
    case "90d":
      return { from: formatYmdLocal(subDays(today, 89)), to: formatYmdLocal(today) };
    case "month":
      return { from: formatYmdLocal(startOfMonth(today)), to: formatYmdLocal(today) };
    case "quarter":
      return { from: formatYmdLocal(startOfQuarter(today)), to: formatYmdLocal(today) };
    case "year":
      return { from: formatYmdLocal(startOfYear(today)), to: formatYmdLocal(today) };
    case "custom":
      return { from, to };
  }
}

export function mentorshipExportRangeLabel(from: string | null, to: string | null): string {
  if (!from && !to) return "All time";

  const pretty = (value: string) => {
    try {
      return format(parseISO(value), "d MMM yyyy");
    } catch {
      return value;
    }
  };

  if (from && to) return `${pretty(from)} to ${pretty(to)}`;
  if (from) return `From ${pretty(from)}`;
  return `Through ${pretty(to!)}`;
}

export function mentorshipExportRangeError(from: string, to: string): string | null {
  if (from && !isMentorshipExportYmd(from)) return "Choose a valid start date.";
  if (to && !isMentorshipExportYmd(to)) return "Choose a valid end date.";
  if (from && to && from > to) return "Start date must be on or before the end date.";
  return null;
}
