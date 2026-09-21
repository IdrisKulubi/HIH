export type MentorshipSessionKind = "physical" | "virtual";

export function defaultMentorshipSessionType(
  sessionNumber: number
): MentorshipSessionKind {
  if (sessionNumber === 6) return "physical";
  return "virtual";
}

/** Sessions 2–6 can be logged as virtual or physical. Session 1 is always virtual. */
export function canChooseMentorshipSessionType(sessionNumber: number) {
  return sessionNumber >= 2;
}

export function parseMentorshipSessionType(value: unknown): MentorshipSessionKind | null {
  if (value === "physical" || value === "virtual") return value;
  return null;
}

export function resolveMentorshipSessionType(input: {
  sessionNumber: number;
  currentType: string;
  requestedType?: string | null;
}): MentorshipSessionKind {
  if (input.sessionNumber === 1) return "virtual";

  if (canChooseMentorshipSessionType(input.sessionNumber)) {
    return (
      parseMentorshipSessionType(input.requestedType) ??
      parseMentorshipSessionType(input.currentType) ??
      "virtual"
    );
  }

  return parseMentorshipSessionType(input.currentType) ?? defaultMentorshipSessionType(input.sessionNumber);
}
