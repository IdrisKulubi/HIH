import type { MentorshipSession } from "@/db/schema";

export type MentorshipApprovalReviewerRole = "bds_edo" | "redo";

export function isMentorshipEdoReviewer(role?: string | null): boolean {
  return role === "bds_edo";
}

export function isMentorshipRedoReviewer(role?: string | null): boolean {
  return role === "redo";
}

export function canReviewMentorshipSessions(role?: string | null): boolean {
  return isMentorshipEdoReviewer(role) || isMentorshipRedoReviewer(role);
}

export function mentorshipSessionAwaitingEdo(session: {
  status: string;
  edoApprovedById?: string | null;
}): boolean {
  return session.status === "pending_approval" && !session.edoApprovedById;
}

export function mentorshipSessionAwaitingRedo(session: {
  status: string;
  edoApprovedById?: string | null;
}): boolean {
  return session.status === "pending_approval" && Boolean(session.edoApprovedById);
}

export function mentorshipPendingLabel(session: {
  status: string;
  edoApprovedById?: string | null;
}): string {
  if (session.status !== "pending_approval") return "";
  return mentorshipSessionAwaitingRedo(session)
    ? "Awaiting REDO approval"
    : "Awaiting EDO approval";
}

export function sessionVisibleToEdoReviewer(
  session: Pick<MentorshipSession, "edoApprovedById"> & { businessId: number },
  collectorByBusiness: Map<number, string>,
  edoUserId: string
): boolean {
  if (session.edoApprovedById) return false;
  const collectorId = collectorByBusiness.get(session.businessId);
  if (!collectorId) return true;
  return collectorId === edoUserId;
}

export function sessionVisibleToRedoReviewer(
  session: Pick<MentorshipSession, "edoApprovedById">
): boolean {
  return Boolean(session.edoApprovedById);
}
