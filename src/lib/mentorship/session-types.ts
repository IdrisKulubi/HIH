export type MentorshipSessionKind = "physical" | "virtual";

export function defaultMentorshipSessionType(
  sessionNumber: number
): MentorshipSessionKind {
  if (sessionNumber === 6) return "physical";
  return "virtual";
}

/** All six mentorship sessions can be logged as virtual or physical. */
export function canChooseMentorshipSessionType(sessionNumber: number) {
  return sessionNumber >= 1 && sessionNumber <= 6;
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
  if (canChooseMentorshipSessionType(input.sessionNumber)) {
    return (
      parseMentorshipSessionType(input.requestedType) ??
      parseMentorshipSessionType(input.currentType) ??
      defaultMentorshipSessionType(input.sessionNumber)
    );
  }

  return parseMentorshipSessionType(input.currentType) ?? defaultMentorshipSessionType(input.sessionNumber);
}
