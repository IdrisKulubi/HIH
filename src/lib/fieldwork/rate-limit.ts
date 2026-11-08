import db from "@/db/drizzle";
import { melRateLimitBuckets } from "@/db/schema";
import { sql } from "drizzle-orm";
import { logFieldwork } from "./log";

/**
 * Fixed-window rate limit backed by the shared bucket table (key-prefixed so it never collides with MEL).
 * Fails open on a database error so a limiter fault can never block field work; the error is logged.
 */
export async function checkFieldworkRateLimit(userId: string, bucket: string, limit: number, windowSeconds: number) {
  const now = new Date();
  const resetBefore = new Date(now.getTime() - windowSeconds * 1000);
  try {
    const [row] = await db
      .insert(melRateLimitBuckets)
      .values({ key: `fieldwork:${bucket}:${userId}`, windowStartedAt: now, requestCount: 1, updatedAt: now })
      .onConflictDoUpdate({
        target: melRateLimitBuckets.key,
        set: {
          requestCount: sql`CASE WHEN ${melRateLimitBuckets.windowStartedAt} < ${resetBefore} THEN 1 ELSE ${melRateLimitBuckets.requestCount} + 1 END`,
          windowStartedAt: sql`CASE WHEN ${melRateLimitBuckets.windowStartedAt} < ${resetBefore} THEN ${now} ELSE ${melRateLimitBuckets.windowStartedAt} END`,
          updatedAt: now,
        },
      })
      .returning({ count: melRateLimitBuckets.requestCount });
    if (row.count > limit) {
      logFieldwork("warn", "rate_limit_exceeded", { userId, bucket, limit, windowSeconds });
      return { ok: false as const, message: "You are doing that too quickly. Wait a moment and try again." };
    }
    return { ok: true as const };
  } catch (error) {
    logFieldwork("error", "rate_limit_check_failed", { bucket, error: error instanceof Error ? error.message : String(error) });
    return { ok: true as const };
  }
}
