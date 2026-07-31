import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import db from "@/db/drizzle";
import { melOperationalEvents, melRateLimitBuckets, melRolloutControl } from "@/db/schema";
import { redactSensitivePayload } from "./import-engine";

export async function recordMelOperationalEvent(input: {
  severity: "info" | "warning" | "error" | "critical";
  eventType: string;
  message: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}) {
  const correlationId = input.correlationId ?? randomUUID();
  await db.insert(melOperationalEvents).values({
    severity: input.severity,
    eventType: input.eventType,
    message: input.message.slice(0, 2000),
    correlationId,
    metadata: redactSensitivePayload(input.metadata ?? {}),
  });
  return correlationId;
}

export async function enforceMelRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date();
  const resetBefore = new Date(now.getTime() - windowSeconds * 1000);
  const [bucket] = await db.insert(melRateLimitBuckets).values({
    key,
    windowStartedAt: now,
    requestCount: 1,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: melRateLimitBuckets.key,
    set: {
      requestCount: sql`CASE WHEN ${melRateLimitBuckets.windowStartedAt} < ${resetBefore} THEN 1 ELSE ${melRateLimitBuckets.requestCount} + 1 END`,
      windowStartedAt: sql`CASE WHEN ${melRateLimitBuckets.windowStartedAt} < ${resetBefore} THEN ${now} ELSE ${melRateLimitBuckets.windowStartedAt} END`,
      updatedAt: now,
    },
  }).returning({ count: melRateLimitBuckets.requestCount, windowStartedAt: melRateLimitBuckets.windowStartedAt });
  if (bucket.count > limit) {
    await recordMelOperationalEvent({ severity: "warning", eventType: "rate_limit_exceeded", message: "A MEL endpoint rate limit was exceeded.", metadata: { key } });
    throw new Error("Too many requests. Try again later.");
  }
  return { remaining: Math.max(0, limit - bucket.count), resetsAt: new Date(bucket.windowStartedAt.getTime() + windowSeconds * 1000) };
}

export async function requireMelRolloutFeature(feature: "collection" | "imports" | "reporting") {
  const rollout = await db.query.melRolloutControl.findFirst({ where: eq(melRolloutControl.id, 1) });
  if (!rollout) return;
  const enabled = feature === "collection" ? rollout.collectionEnabled : feature === "imports" ? rollout.importsEnabled : rollout.reportingEnabled;
  if (!enabled) throw new Error(`MEL ${feature} is disabled by the current rollout controls.`);
}
