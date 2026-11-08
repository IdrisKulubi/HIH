export const MENTORSHIP_EXPORT_SECTIONS = [
  {
    key: "sessions",
    label: "Sessions",
    description: "Every session with business, mentor, dates, status, duration, and notes.",
  },
  {
    key: "matches",
    label: "Matches",
    description: "Each mentorship match with progress and start date.",
  },
  {
    key: "mentors",
    label: "Mentors",
    description: "Mentor roster with enterprise counts and session totals.",
  },
  {
    key: "businesses",
    label: "Businesses",
    description: "Per-enterprise summary with mentor and session progress.",
  },
  {
    key: "pending_approvals",
    label: "Pending approvals",
    description: "Sessions currently awaiting REDO review.",
  },
  {
    key: "approvals_log",
    label: "Approvals log",
    description: "Approved and returned sessions with reviewer and turnaround.",
  },
] as const;

export type MentorshipExportType = (typeof MENTORSHIP_EXPORT_SECTIONS)[number]["key"];

export const MENTORSHIP_EXPORT_TYPES = MENTORSHIP_EXPORT_SECTIONS.map((s) => s.key);

export function mentorshipExportSheetName(type: MentorshipExportType): string {
  const names: Record<MentorshipExportType, string> = {
    sessions: "Sessions",
    matches: "Matches",
    mentors: "Mentors",
    businesses: "Businesses",
    pending_approvals: "Pending",
    approvals_log: "Approvals",
  };
  return names[type];
}
