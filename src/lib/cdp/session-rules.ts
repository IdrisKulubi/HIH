import type { CdpBusinessSupportSession, CdpSessionActionItem } from "@/db/schema";

export type CdpSessionType = "physical" | "virtual";

export function expectedSessionType(sessionNumber: number): CdpSessionType {
  return sessionNumber === 1 || sessionNumber === 6 ? "physical" : "virtual";
}

export function validateSessionEvidence(input: {
  sessionNumber: number;
  sessionType: CdpSessionType;
  evidenceUrls: string[];
  meetingLink?: string | null;
}) {
  const expected = expectedSessionType(input.sessionNumber);
  if (input.sessionType !== expected) {
    return `Session ${input.sessionNumber} must be ${expected}.`;
  }

  if (expected === "physical" && input.evidenceUrls.length === 0) {
    return `Session ${input.sessionNumber} is physical and requires a photo/evidence URL.`;
  }

  if (expected === "virtual" && input.evidenceUrls.length === 0 && !input.meetingLink?.trim()) {
    return `Session ${input.sessionNumber} is virtual and requires a meeting link or evidence URL.`;
  }

  return null;
}

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
