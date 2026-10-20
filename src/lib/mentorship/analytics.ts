import { loadMentorshipExportData } from "@/lib/mentorship/export";
import {
  formatMentorshipEvidenceUrls,
  mentorshipEvidenceFilesFromLegacyUrl,
} from "@/lib/mentorship/evidence";

type ExportData = Awaited<ReturnType<typeof loadMentorshipExportData>>;

const SESSION_STATUSES = [
  "scheduled",
  "pending_approval",
  "completed",
  "missed",
  "rescheduled",
] as const;

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function turnaroundHours(submittedAt: Date | null, approvedAt: Date | null): number | null {
  if (!submittedAt || !approvedAt) return null;
  const ms = approvedAt.getTime() - submittedAt.getTime();
  if (ms < 0) return null;
  return ms / (1000 * 60 * 60);
}

export type MentorshipAnalyticsSessionRow = {
  id: number;
  sessionNumber: number;
  sessionType: string;
  status: string;
  scheduledDate: string | null;
  completedDate: string | null;
  durationMinutes: number | null;
  diagnosticNotes: string | null;
  evidenceUrl: string | null;
  rejectionReason: string | null;
};

export type MentorshipAnalyticsMatchRow = {
  matchId: number;
  businessId: number;
  businessName: string;
  applicantName: string;
  matchStatus: string;
  startDate: string | null;
  sessionsCompleted: number;
  pendingCount: number;
  totalHours: number;
  sessions: MentorshipAnalyticsSessionRow[];
};

export type MentorshipAnalyticsMentorRow = {
  mentorId: number;
  mentorName: string;
  mentorEmail: string;
  expertiseArea: string;
  isActive: boolean;
  enterprisesAssigned: number;
  sessionsCompleted: number;
  totalHours: number;
  pendingSubmissions: number;
  matches: MentorshipAnalyticsMatchRow[];
};

export type MentorshipAnalyticsBusinessRow = MentorshipAnalyticsMatchRow & {
  mentorName: string;
  mentorEmail: string;
};

export type MentorshipAnalytics = {
  kpis: {
    activeMentors: number;
    activeMatches: number;
    enterprisesInProgramme: number;
    pendingApprovals: number;
    completedSessions: number;
    totalMentoringHours: number;
    avgSessionDurationMinutes: number | null;
    avgReviewTurnaroundHours: number | null;
  };
  sessionStatusCounts: Record<string, number>;
  sessionTypeCounts: {
    all: Record<string, number>;
    completed: Record<string, number>;
  };
  sessionFunnel: Array<{
    sessionNumber: number;
    scheduled: number;
    pending: number;
    completed: number;
    completionRate: number;
  }>;
  pendingQueue: {
    oldestSubmission: string | null;
    pendingOver7Days: number;
  };
  returns: {
    currentlyReturned: number;
    everReturned: number;
  };
  mentorRows: MentorshipAnalyticsMentorRow[];
  businessRows: MentorshipAnalyticsBusinessRow[];
  approverRows: Array<{
    approverId: string;
    approverName: string;
    approvals: number;
    returns: number;
  }>;
};

export function computeMentorshipAnalytics(data: ExportData): MentorshipAnalytics {
  const { matches, mentors, sessions, approverById } = data;
  const activeMatches = matches.filter((m) => m.status === "active");
  const activeMentors = mentors.filter((m) => m.isActive).length;
  const enterprisesInProgramme = new Set(activeMatches.map((m) => m.businessId)).size;
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const pendingSessions = sessions.filter((s) => s.status === "pending_approval");
  const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
  const avgDuration =
    completedSessions.length > 0 ? totalMinutes / completedSessions.length : null;
  const turnaroundSamples = completedSessions
    .map((s) => turnaroundHours(s.updatedAt, s.approvedAt))
    .filter((v): v is number => v != null);
  const avgTurnaround =
    turnaroundSamples.length > 0
      ? turnaroundSamples.reduce((sum, v) => sum + v, 0) / turnaroundSamples.length
      : null;

  const statusCounts = countBy(sessions, (s) => s.status);
  for (const status of SESSION_STATUSES) {
    if (!(status in statusCounts)) statusCounts[status] = 0;
  }

  const sessionFunnel = [1, 2, 3, 4, 5, 6].map((sessionNumber) => {
    const bucket = sessions.filter((s) => s.sessionNumber === sessionNumber);
    const scheduled = bucket.filter((s) => s.status === "scheduled").length;
    const pending = bucket.filter((s) => s.status === "pending_approval").length;
    const completed = bucket.filter((s) => s.status === "completed").length;
    const total = bucket.length;
    return {
      sessionNumber,
      scheduled,
      pending,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const pendingSorted = [...pendingSessions].sort(
    (a, b) => a.updatedAt.getTime() - b.updatedAt.getTime()
  );
  const pendingOver7Days = pendingSessions.filter(
    (s) => now - s.updatedAt.getTime() > sevenDaysMs
  ).length;

  const toHours = (minutes: number) => Math.round((minutes / 60) * 100) / 100;

  const mapSession = (
    session: ExportData["sessions"][number] | ExportData["matches"][number]["sessions"][number]
  ): MentorshipAnalyticsSessionRow => ({
    id: session.id,
    sessionNumber: session.sessionNumber,
    sessionType: session.sessionType,
    status: session.status,
    scheduledDate: session.scheduledDate?.toISOString() ?? null,
    completedDate: session.completedDate?.toISOString() ?? null,
    durationMinutes: session.durationMinutes,
    diagnosticNotes: session.diagnosticNotes,
    evidenceUrl: formatMentorshipEvidenceUrls(
      mentorshipEvidenceFilesFromLegacyUrl(
        session.photographicEvidenceUrl,
        session.evidenceFiles
      )
    ),
    rejectionReason: session.rejectionReason,
  });

  const mapMatch = (match: ExportData["matches"][number]): MentorshipAnalyticsMatchRow => {
    const completed = match.sessions.filter((s) => s.status === "completed");
    const pending = match.sessions.filter((s) => s.status === "pending_approval");
    const minutes = completed.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
    const applicant = match.business.applicant;
    return {
      matchId: match.id,
      businessId: match.businessId,
      businessName: match.business.name,
      applicantName: `${applicant.firstName} ${applicant.lastName}`.trim(),
      matchStatus: match.status,
      startDate: match.startDate?.toISOString() ?? null,
      sessionsCompleted: completed.length,
      pendingCount: pending.length,
      totalHours: toHours(minutes),
      sessions: [...match.sessions]
        .sort((a, b) => a.sessionNumber - b.sessionNumber)
        .map(mapSession),
    };
  };

  const mentorRows = mentors.map((mentor) => {
    const mentorMatches = matches.filter((m) => m.mentorId === mentor.id).map(mapMatch);
    const sessionsCompleted = mentorMatches.reduce((sum, m) => sum + m.sessionsCompleted, 0);
    const pendingSubmissions = mentorMatches.reduce((sum, m) => sum + m.pendingCount, 0);
    const totalHours = mentorMatches.reduce((sum, m) => sum + m.totalHours, 0);
    const activeEnterpriseIds = new Set(
      mentorMatches.filter((m) => m.matchStatus === "active").map((m) => m.businessId)
    );
    return {
      mentorId: mentor.id,
      mentorName: mentor.user.name ?? mentor.user.email,
      mentorEmail: mentor.user.email,
      expertiseArea: mentor.expertiseArea,
      isActive: mentor.isActive,
      enterprisesAssigned: activeEnterpriseIds.size,
      sessionsCompleted,
      totalHours: Math.round(totalHours * 100) / 100,
      pendingSubmissions,
      matches: mentorMatches.sort((a, b) => b.sessionsCompleted - a.sessionsCompleted),
    };
  });

  const businessRows = matches.map((match) => {
    const mapped = mapMatch(match);
    return {
      ...mapped,
      mentorName: match.mentor.user.name ?? match.mentor.user.email,
      mentorEmail: match.mentor.user.email,
    };
  });

  const approverStats = new Map<string, { approvals: number; returns: number }>();
  for (const session of sessions) {
    if (!session.approvedById || !session.approvedAt) continue;
    const current = approverStats.get(session.approvedById) ?? { approvals: 0, returns: 0 };
    if (session.status === "completed") current.approvals += 1;
    else if (session.rejectionReason) current.returns += 1;
    approverStats.set(session.approvedById, current);
  }
  const approverRows = [...approverStats.entries()].map(([approverId, stats]) => {
    const approver = approverById.get(approverId);
    return {
      approverId,
      approverName: approver?.name ?? approver?.email ?? approverId,
      approvals: stats.approvals,
      returns: stats.returns,
    };
  });

  return {
    kpis: {
      activeMentors,
      activeMatches: activeMatches.length,
      enterprisesInProgramme,
      pendingApprovals: pendingSessions.length,
      completedSessions: completedSessions.length,
      totalMentoringHours: Math.round((totalMinutes / 60) * 100) / 100,
      avgSessionDurationMinutes: avgDuration != null ? Math.round(avgDuration) : null,
      avgReviewTurnaroundHours:
        avgTurnaround != null ? Math.round(avgTurnaround * 100) / 100 : null,
    },
    sessionStatusCounts: statusCounts,
    sessionTypeCounts: {
      all: countBy(sessions, (s) => s.sessionType),
      completed: countBy(completedSessions, (s) => s.sessionType),
    },
    sessionFunnel,
    pendingQueue: {
      oldestSubmission: pendingSorted[0]?.updatedAt.toISOString() ?? null,
      pendingOver7Days,
    },
    returns: {
      currentlyReturned: sessions.filter(
        (s) => s.status === "scheduled" && Boolean(s.rejectionReason?.trim())
      ).length,
      everReturned: sessions.filter((s) => Boolean(s.rejectionReason?.trim())).length,
    },
    mentorRows: mentorRows.sort((a, b) => b.sessionsCompleted - a.sessionsCompleted),
    businessRows: businessRows.sort((a, b) => b.sessionsCompleted - a.sessionsCompleted),
    approverRows: approverRows.sort((a, b) => b.approvals + b.returns - (a.approvals + a.returns)),
  };
}
