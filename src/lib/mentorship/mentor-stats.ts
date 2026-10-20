export interface MentorStatsSession {
  status: string;
  durationMinutes: number | null;
}

export interface MentorStatsMatch {
  id: number;
  businessName: string;
  applicantName: string;
  status: string;
  sessions: MentorStatsSession[];
}

export interface MentorEnterpriseProgress {
  id: number;
  businessName: string;
  applicantName: string;
  matchStatus: string;
  sessionsApproved: number;
  sessionsPending: number;
  sessionsTotal: number;
  percent: number;
}

export interface MentorStats {
  businessesAssigned: number;
  businessesWithApprovedSession: number;
  businessesFullyComplete: number;
  businessApprovedPercent: number;
  sessionsApproved: number;
  sessionsPending: number;
  sessionsScheduled: number;
  sessionsTotal: number;
  sessionApprovedPercent: number;
  totalHours: number;
  enterprises: MentorEnterpriseProgress[];
}

function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export function computeMentorStats(matches: MentorStatsMatch[]): MentorStats {
  const enterprises = matches.map((match) => {
    const sessionsApproved = match.sessions.filter((s) => s.status === "completed").length;
    const sessionsPending = match.sessions.filter((s) => s.status === "pending_approval").length;
    const sessionsTotal = match.sessions.length || 6;
    return {
      id: match.id,
      businessName: match.businessName,
      applicantName: match.applicantName,
      matchStatus: match.status,
      sessionsApproved,
      sessionsPending,
      sessionsTotal,
      percent: percent(sessionsApproved, sessionsTotal),
    };
  });

  const businessesAssigned = matches.length;
  const businessesWithApprovedSession = enterprises.filter((e) => e.sessionsApproved > 0).length;
  const businessesFullyComplete = enterprises.filter(
    (e) => e.sessionsApproved >= e.sessionsTotal && e.sessionsTotal > 0
  ).length;

  const allSessions = matches.flatMap((m) => m.sessions);
  const sessionsApproved = allSessions.filter((s) => s.status === "completed").length;
  const sessionsPending = allSessions.filter((s) => s.status === "pending_approval").length;
  const sessionsScheduled = allSessions.filter((s) => s.status === "scheduled").length;
  const minutes = allSessions
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);

  return {
    businessesAssigned,
    businessesWithApprovedSession,
    businessesFullyComplete,
    businessApprovedPercent: percent(businessesWithApprovedSession, businessesAssigned),
    sessionsApproved,
    sessionsPending,
    sessionsScheduled,
    sessionsTotal: allSessions.length,
    sessionApprovedPercent: percent(sessionsApproved, allSessions.length),
    totalHours: Math.round((minutes / 60) * 100) / 100,
    enterprises: enterprises.sort((a, b) => b.percent - a.percent),
  };
}
