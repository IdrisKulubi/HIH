import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import db from "@/db/drizzle";
import { melOperationalEvents, melRateLimitBuckets, melRolloutControl } from "@/db/schema";
import { redactSensitivePayload } from "./import-engine";

function relationMissing(error: unknown, tableName: string) {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      if ("code" in current && typeof (current as { code?: unknown }).code === "string") {
        parts.push((current as { code: string }).code);
      }
      current = current.cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  const message = parts.join("\n");
  return (
    message.includes(tableName) &&
    (message.includes("does not exist") || message.includes("42P01") || message.includes("Failed query"))
  );
}

export async function recordMelOperationalEvent(input: {
  severity: "info" | "warning" | "error" | "critical";
  eventType: string;
  message: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}) {
  const correlationId = input.correlationId ?? randomUUID();
  try {
    await db.insert(melOperationalEvents).values({
      severity: input.severity,
      eventType: input.eventType,
      message: input.message.slice(0, 2000),
      correlationId,
      metadata: redactSensitivePayload(input.metadata ?? {}),
    });
  } catch (error) {
    // Ops tables come from Phase 5; do not block product flows before that migration.
    if (relationMissing(error, "mel_operational_events")) {
      console.warn("MEL operational event skipped; mel_operational_events is not installed.", {
        eventType: input.eventType,
        correlationId,
      });
      return correlationId;
    }
    throw error;
  }
  return correlationId;
}

export async function enforceMelRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date();
  const resetBefore = new Date(now.getTime() - windowSeconds * 1000);
  try {
    const [bucket] = await db
      .insert(melRateLimitBuckets)
      .values({
        key,
        windowStartedAt: now,
        requestCount: 1,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: melRateLimitBuckets.key,
        set: {
          requestCount: sql`CASE WHEN ${melRateLimitBuckets.windowStartedAt} < ${resetBefore} THEN 1 ELSE ${melRateLimitBuckets.requestCount} + 1 END`,
          windowStartedAt: sql`CASE WHEN ${melRateLimitBuckets.windowStartedAt} < ${resetBefore} THEN ${now} ELSE ${melRateLimitBuckets.windowStartedAt} END`,
          updatedAt: now,
        },
      })
      .returning({ count: melRateLimitBuckets.requestCount, windowStartedAt: melRateLimitBuckets.windowStartedAt });
    if (bucket.count > limit) {
      await recordMelOperationalEvent({
        severity: "warning",
        eventType: "rate_limit_exceeded",
        message: "A MEL endpoint rate limit was exceeded.",
        metadata: { key },
      });
      throw new Error("Too many requests. Try again later.");
    }
    return {
      remaining: Math.max(0, limit - bucket.count),
      resetsAt: new Date(bucket.windowStartedAt.getTime() + windowSeconds * 1000),
    };
  } catch (error) {
    if (relationMissing(error, "mel_rate_limit_buckets")) {
      return {
        remaining: limit,
        resetsAt: new Date(now.getTime() + windowSeconds * 1000),
      };
    }
    throw error;
  }
}

export async function requireMelRolloutFeature(feature: "collection" | "imports" | "reporting") {
  try {
    const rollout = await db.query.melRolloutControl.findFirst({ where: eq(melRolloutControl.id, 1) });
    // No rollout row yet (or Phase 5 not migrated) — allow the feature.
    if (!rollout) return;
    const enabled =
      feature === "collection"
        ? rollout.collectionEnabled
        : feature === "imports"
          ? rollout.importsEnabled
          : rollout.reportingEnabled;
    if (!enabled) {
      throw new Error(
        `MEL ${feature} is disabled by the current rollout controls. Enable it under Admin → MEL → Operations.`
      );
    }
  } catch (error) {
    // Product flows must keep working before Phase 5 migrations are applied.
    if (relationMissing(error, "mel_rollout_control")) return;
    throw error;
  }
}
