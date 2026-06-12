import db from "@/db/drizzle";
import {
  a2fPreScreeningAttempts,
  a2fPreScreeningOverrides,
} from "@/db/schema";
import {
  resolveEffectivePreScreeningOutcome,
  type PreScreeningOutcome,
} from "@/lib/a2f-pre-screening-outcome";
import { and, desc, eq } from "drizzle-orm";

export async function getEffectiveScreeningForApplication(
  applicationId: number
): Promise<{
  attemptId: number;
  outcome: PreScreeningOutcome | null;
  originalOutcome: string | null;
} | null> {
  const attempt = await db.query.a2fPreScreeningAttempts.findFirst({
    where: and(
      eq(a2fPreScreeningAttempts.applicationId, applicationId),
      eq(a2fPreScreeningAttempts.status, "submitted")
    ),
    orderBy: [desc(a2fPreScreeningAttempts.assessedAt)],
  });
  if (!attempt) return null;
  const latestOverride = await db.query.a2fPreScreeningOverrides.findFirst({
    where: eq(a2fPreScreeningOverrides.attemptId, attempt.id),
    orderBy: [desc(a2fPreScreeningOverrides.createdAt)],
  });
  return {
    attemptId: attempt.id,
    originalOutcome: attempt.outcome,
    outcome: resolveEffectivePreScreeningOutcome(
      attempt.outcome,
      latestOverride?.newOutcome
    ),
  };
}
