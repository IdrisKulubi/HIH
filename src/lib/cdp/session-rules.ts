import type { CdpBusinessSupportSession } from "@/db/schema";

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

/** Reporting requires the prior session to be approved. */
export function validatePreviousSessionGate(
  sessionNumber: number,
  previous: CdpBusinessSupportSession | null | undefined
) {
  if (sessionNumber <= 1) return null;
  if (!previous) {
    return `Log Session ${sessionNumber - 1} before logging Session ${sessionNumber}.`;
  }
  if (previous.approvalStatus !== "approved") {
    return `Session ${sessionNumber - 1} must be approved before logging Session ${sessionNumber}.`;
  }

  return null;
}
