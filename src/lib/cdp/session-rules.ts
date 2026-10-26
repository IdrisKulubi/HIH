import type { CdpBusinessSupportSession, CdpSessionActionItem } from "@/db/schema";

export type CdpSessionType = "physical" | "virtual";

export function validateSessionEvidence(input: {
  sessionNumber: number;
  sessionType: CdpSessionType;
  evidenceUrls: string[];
  evidenceFileCount?: number;
  meetingLink?: string | null;
}) {
  const evidenceCount = input.evidenceUrls.length + (input.evidenceFileCount ?? 0);

  if (input.sessionType === "physical" && evidenceCount === 0) {
    return `Session ${input.sessionNumber} is physical and requires an evidence upload or URL.`;
  }

  if (
    input.sessionType === "virtual" &&
    evidenceCount === 0 &&
    !input.meetingLink?.trim()
  ) {
    return `Session ${input.sessionNumber} is virtual and requires a meeting link, evidence upload, or evidence URL.`;
  }

  return null;
}

/** Planning only requires the prior session row to exist (any approval status). */
export function validatePreviousSessionPlanGate(
  sessionNumber: number,
  previous: CdpBusinessSupportSession | null | undefined
) {
  if (sessionNumber <= 1) return null;
  if (!previous) {
    return `Plan Session ${sessionNumber - 1} before planning Session ${sessionNumber}.`;
  }
  return null;
}

/** Reporting requires the prior session to be approved with follow-ups closed. */
export function validatePreviousSessionGate(
  sessionNumber: number,
  previous:
    | (CdpBusinessSupportSession & { actionItems?: CdpSessionActionItem[] })
    | null
    | undefined
) {
  if (sessionNumber <= 1) return null;
  if (!previous) {
    return `Log Session ${sessionNumber - 1} before logging Session ${sessionNumber}.`;
  }
  if (previous.approvalStatus !== "approved") {
    return `Session ${sessionNumber - 1} must be approved before logging Session ${sessionNumber}.`;
  }

  const openItems = (previous.actionItems ?? []).filter(
    (item) => item.status === "open" || item.status === "blocked"
  );
  if (openItems.length > 0) {
    return `Session ${sessionNumber - 1} still has open action items. Mark them done or waived before logging Session ${sessionNumber}.`;
  }

  if (
    (!previous.actionItems || previous.actionItems.length === 0) &&
    previous.keyActionsAgreed &&
    previous.keyActionsAgreed.trim().length > 0
  ) {
    return `Session ${sessionNumber - 1} has key actions agreed but no structured action items. Add action items and close or waive them before logging Session ${sessionNumber}.`;
  }

  return null;
}

type SessionWithActionItems = {
  sessionNumber: number;
  keyActionsAgreed?: string | null;
  actionItems?: CdpSessionActionItem[];
};

/** Same-session check: non-empty key agreed milestones require structured action items. */
export function validateSessionKeyActionsNeedActionItems(
  session: SessionWithActionItems,
  keyActionsAgreedOverride?: string | null
) {
  const keyText = (keyActionsAgreedOverride ?? session.keyActionsAgreed)?.trim();
  if (!keyText) return null;

  const items = session.actionItems ?? [];
  if (items.length === 0) {
    return `Session ${session.sessionNumber} has key agreed milestones but no structured action items. Add action items in Session action items, then mark them done or waived before submitting.`;
  }

  return null;
}

/** Before approval: milestones need structured items and none may stay open or blocked. */
export function validateSessionActionItemsForApproval(session: SessionWithActionItems) {
  const structuredGate = validateSessionKeyActionsNeedActionItems(session);
  if (structuredGate) {
    return structuredGate.replace("before submitting.", "before approval.");
  }

  const keyText = session.keyActionsAgreed?.trim();
  if (!keyText) return null;

  const openItems = (session.actionItems ?? []).filter(
    (item) => item.status === "open" || item.status === "blocked"
  );
  if (openItems.length > 0) {
    return `Session ${session.sessionNumber} still has open action items. Mark them done or waived in Session action items before approval.`;
  }

  return null;
}
