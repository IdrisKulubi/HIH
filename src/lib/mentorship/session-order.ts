export type MentorshipSessionOrderStatus =
  | "scheduled"
  | "pending_approval"
  | "completed"
  | "missed"
  | "rescheduled"
  | string;

export interface PreviousMentorshipSession {
  sessionNumber: number;
  status: MentorshipSessionOrderStatus;
  sessionType?: "physical" | "virtual" | string;
}

function isSubmittedForReview(status: MentorshipSessionOrderStatus) {
  return status === "completed" || status === "pending_approval";
}

export function previousSessionBlocksSubmit(
  sessionNumber: number,
  previous: PreviousMentorshipSession | null | undefined
) {
  if (sessionNumber <= 1) return false;
  return !previous || !isSubmittedForReview(previous.status);
}

export function previousSessionGateMessage(
  sessionNumber: number,
  previous: PreviousMentorshipSession | null | undefined
): string | null {
  if (!previousSessionBlocksSubmit(sessionNumber, previous)) return null;

  const prevNumber = sessionNumber - 1;
  if (!previous) {
    return `Session ${prevNumber} must be submitted before Session ${sessionNumber}.`;
  }

  const typeLabel = previous.sessionType ? ` (${previous.sessionType})` : "";
  if (previous.status === "scheduled") {
    return `Submit Session ${prevNumber}${typeLabel} first, then you can submit Session ${sessionNumber}.`;
  }

  return `Session ${prevNumber} must be submitted before Session ${sessionNumber}.`;
}
