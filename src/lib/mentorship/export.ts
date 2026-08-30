import * as XLSX from "xlsx";
import db from "@/db/drizzle";
import { users } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { formatMentorshipDurationMinutes } from "@/lib/mentorship/session-display";
import {
  MENTORSHIP_EXPORT_TYPES,
  type MentorshipExportType,
  mentorshipExportSheetName,
} from "@/lib/mentorship/export-config";
import {
  sessionInMentorshipExportRange,
  ymdInRange,
} from "@/lib/mentorship/export-date-range";

type MentorshipExportData = Awaited<ReturnType<typeof loadMentorshipExportData>>;
type LoadedSession = MentorshipExportData["sessions"][number];
type LoadedMentor = MentorshipExportData["mentors"][number];
type LoadedMatch = MentorshipExportData["matches"][number];

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

function dateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function hoursFromMinutes(minutes: number | null | undefined): number | null {
  if (minutes == null || minutes <= 0) return null;
  return Math.round((minutes / 60) * 100) / 100;
}

function turnaroundHours(submittedAt: Date | null, approvedAt: Date | null): number | null {
  if (!submittedAt || !approvedAt) return null;
  const ms = approvedAt.getTime() - submittedAt.getTime();
  if (ms < 0) return null;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

export async function loadMentorshipExportData() {
  const [matchRows, mentorRows, sessionRows] = await Promise.all([
    db.query.mentorshipMatches.findMany({
      with: {
        business: { with: { applicant: true } },
        mentor: { with: { user: true } },
        sessions: { orderBy: (s, { asc }) => [asc(s.sessionNumber)] },
      },
      orderBy: (m, { desc }) => [desc(m.createdAt)],
    }),
    db.query.mentors.findMany({
      with: { user: true },
      orderBy: (m, { asc }) => [asc(m.id)],
    }),
    db.query.mentorshipSessions.findMany({
      with: {
        match: {
          with: {
            business: { with: { applicant: true } },
            mentor: { with: { user: true } },
          },
        },
      },
      orderBy: (s, { asc }) => [asc(s.matchId), asc(s.sessionNumber)],
    }),
  ]);

  const approverIds = [
    ...new Set(
      sessionRows
        .map((s) => s.approvedById)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const approverRows =
    approverIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, approverIds),
          columns: { id: true, email: true, name: true },
        })
      : [];
  const approverById = new Map(approverRows.map((u) => [u.id, u]));

  return {
    matches: matchRows,
    mentors: mentorRows,
    sessions: sessionRows,
    approverById,
  };
}

export function applyMentorshipExportDateFilter(
  data: MentorshipExportData,
  from: string | null,
  to: string | null
): MentorshipExportData {
  if (!from && !to) return data;

  const sessions = data.sessions.filter((session) =>
    sessionInMentorshipExportRange(session, from, to)
  );
  const matches = data.matches
    .map((match) => ({
      ...match,
      sessions: match.sessions.filter((session) =>
        sessionInMentorshipExportRange(session, from, to)
      ),
    }))
    .filter(
      (match) => ymdInRange(match.startDate, from, to) || match.sessions.length > 0
    );

  return { ...data, sessions, matches };
}

function sessionContext(session: LoadedSession, approverById: Map<string, { email: string; name: string | null }>) {
  const business = session.match.business;
  const mentor = session.match.mentor;
  const approver = session.approvedById ? approverById.get(session.approvedById) : null;
  return {
    businessName: business.name,
    applicantName: `${business.applicant.firstName} ${business.applicant.lastName}`.trim(),
    mentorName: mentor.user.name ?? mentor.user.email,
    mentorEmail: mentor.user.email,
    approverName: approver?.name ?? approver?.email ?? null,
  };
}

export function buildMentorshipSessionsExportRows(
  data: Awaited<ReturnType<typeof loadMentorshipExportData>>
) {
  return data.sessions.map((session) => {
    const ctx = sessionContext(session, data.approverById);
    return {
      Session_ID: session.id,
      Match_ID: session.matchId,
      Business: ctx.businessName,
      Applicant: ctx.applicantName,
      Mentor: ctx.mentorName,
      Mentor_Email: ctx.mentorEmail,
      Session_Number: session.sessionNumber,
      Session_Type: session.sessionType,
      Status: session.status,
      Scheduled_Date: dateOnly(session.scheduledDate),
      Completed_Date: dateOnly(session.completedDate),
      Duration_Minutes: session.durationMinutes,
      Duration_Label: formatMentorshipDurationMinutes(session.durationMinutes),
      Duration_Hours: hoursFromMinutes(session.durationMinutes),
      Diagnostic_Notes: session.diagnosticNotes,
      Evidence_URL: session.photographicEvidenceUrl,
      Submitted_At: session.status === "pending_approval" || session.status === "completed" ? iso(session.updatedAt) : null,
      Approved_At: iso(session.approvedAt),
      Approver: ctx.approverName,
      Rejection_Reason: session.rejectionReason,
      Review_Turnaround_Hours:
        session.status === "completed"
          ? turnaroundHours(session.updatedAt, session.approvedAt)
          : null,
    };
  });
}

export function buildMentorshipMatchesExportRows(
  data: Awaited<ReturnType<typeof loadMentorshipExportData>>
) {
  return data.matches.map((match) => {
    const completed = match.sessions.filter((s) => s.status === "completed").length;
    const pending = match.sessions.filter((s) => s.status === "pending_approval").length;
    const totalMinutes = match.sessions
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
    return {
      Match_ID: match.id,
      Business: match.business.name,
      Applicant: `${match.business.applicant.firstName} ${match.business.applicant.lastName}`.trim(),
      Mentor: match.mentor.user.name ?? match.mentor.user.email,
      Mentor_Email: match.mentor.user.email,
      Match_Status: match.status,
      Start_Date: dateOnly(match.startDate),
      Sessions_Completed: completed,
      Sessions_Pending: pending,
      Sessions_Total: match.sessions.length,
      Total_Hours: hoursFromMinutes(totalMinutes),
    };
  });
}

export function buildMentorshipMentorsExportRows(
  data: Awaited<ReturnType<typeof loadMentorshipExportData>>
) {
  const byMentor = new Map<number, LoadedMatch[]>();
  for (const match of data.matches) {
    const list = byMentor.get(match.mentorId) ?? [];
    list.push(match);
    byMentor.set(match.mentorId, list);
  }

  return data.mentors.map((mentor: LoadedMentor) => {
    const matches = byMentor.get(mentor.id) ?? [];
    const activeMatches = matches.filter((m) => m.status === "active");
    const sessions = matches.flatMap((m) => m.sessions);
    const completed = sessions.filter((s) => s.status === "completed");
    const pending = sessions.filter((s) => s.status === "pending_approval");
    const totalMinutes = completed.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
    return {
      Mentor_ID: mentor.id,
      Name: mentor.user.name ?? mentor.user.email,
      Email: mentor.user.email,
      Sector: mentor.expertiseArea,
      Active: mentor.isActive ? "Yes" : "No",
      Active_Matches: activeMatches.length,
      Enterprises: activeMatches.map((m) => m.business.name).join("; "),
      Sessions_Completed: completed.length,
      Sessions_Pending: pending.length,
      Total_Hours: hoursFromMinutes(totalMinutes),
    };
  });
}

export function buildMentorshipBusinessesExportRows(
  data: Awaited<ReturnType<typeof loadMentorshipExportData>>
) {
  return data.matches.map((match) => {
    const completed = match.sessions.filter((s) => s.status === "completed").length;
    const pending = match.sessions.filter((s) => s.status === "pending_approval").length;
    const totalMinutes = match.sessions
      .filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
    return {
      Business_ID: match.businessId,
      Business: match.business.name,
      Applicant: `${match.business.applicant.firstName} ${match.business.applicant.lastName}`.trim(),
      Mentor: match.mentor.user.name ?? match.mentor.user.email,
      Match_Status: match.status,
      Sessions_Completed: `${completed}/6`,
      Sessions_Pending: pending,
      Total_Hours: hoursFromMinutes(totalMinutes),
    };
  });
}

export function buildMentorshipPendingExportRows(
  data: Awaited<ReturnType<typeof loadMentorshipExportData>>
) {
  return data.sessions
    .filter((s) => s.status === "pending_approval")
    .map((session) => {
      const ctx = sessionContext(session, data.approverById);
      return {
        Session_ID: session.id,
        Business: ctx.businessName,
        Applicant: ctx.applicantName,
        Mentor: ctx.mentorName,
        Session_Number: session.sessionNumber,
        Session_Type: session.sessionType,
        Scheduled_Date: dateOnly(session.scheduledDate),
        Completed_Date: dateOnly(session.completedDate),
        Duration_Label: formatMentorshipDurationMinutes(session.durationMinutes),
        Submitted_At: iso(session.updatedAt),
        Diagnostic_Notes: session.diagnosticNotes,
        Evidence_URL: session.photographicEvidenceUrl,
      };
    });
}

export function buildMentorshipApprovalsLogExportRows(
  data: Awaited<ReturnType<typeof loadMentorshipExportData>>
) {
  return data.sessions
    .filter((s) => s.approvedAt != null && (s.status === "completed" || s.rejectionReason))
    .map((session) => {
      const ctx = sessionContext(session, data.approverById);
      const action = session.status === "completed" ? "approved" : "returned";
      return {
        Session_ID: session.id,
        Business: ctx.businessName,
        Mentor: ctx.mentorName,
        Session_Number: session.sessionNumber,
        Action: action,
        Approver: ctx.approverName,
        Approved_At: iso(session.approvedAt),
        Submitted_At: iso(session.updatedAt),
        Turnaround_Hours: turnaroundHours(session.updatedAt, session.approvedAt),
        Rejection_Reason: session.rejectionReason,
      };
    });
}

export function buildMentorshipExportRows(
  type: MentorshipExportType,
  data: Awaited<ReturnType<typeof loadMentorshipExportData>>
): Array<Record<string, string | number | null>> {
  switch (type) {
    case "sessions":
      return buildMentorshipSessionsExportRows(data);
    case "matches":
      return buildMentorshipMatchesExportRows(data);
    case "mentors":
      return buildMentorshipMentorsExportRows(data);
    case "businesses":
      return buildMentorshipBusinessesExportRows(data);
    case "pending_approvals":
      return buildMentorshipPendingExportRows(data);
    case "approvals_log":
      return buildMentorshipApprovalsLogExportRows(data);
    default:
      return [];
  }
}

export function parseMentorshipExportTypes(searchParams: URLSearchParams): MentorshipExportType[] {
  const raw = searchParams.getAll("type");
  const selected = raw.filter((value): value is MentorshipExportType =>
    MENTORSHIP_EXPORT_TYPES.includes(value as MentorshipExportType)
  );
  return [...new Set(selected)];
}

export function buildMentorshipWorkbook(
  types: MentorshipExportType[],
  data: Awaited<ReturnType<typeof loadMentorshipExportData>>,
  metadata: Record<string, string>
) {
  const workbook = XLSX.utils.book_new();
  for (const type of types) {
    const rows = buildMentorshipExportRows(type, data);
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows),
      mentorshipExportSheetName(type)
    );
  }
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      Object.entries(metadata).map(([Field, Value]) => ({ Field, Value }))
    ),
    "Export metadata"
  );
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx", cellDates: true });
}

export function buildMentorshipCsv(
  types: MentorshipExportType[],
  data: Awaited<ReturnType<typeof loadMentorshipExportData>>,
  metadata: Record<string, string>
) {
  const sections = types.flatMap((type) => {
    const rows = buildMentorshipExportRows(type, data);
    return rows.map((row) => ({ Export_Section: mentorshipExportSheetName(type), ...row, ...metadata }));
  });
  return XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(sections));
}
