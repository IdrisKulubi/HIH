import db from "@/db/drizzle";
import { melMonitoringSubmissions } from "@/db/schema";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

async function countWhere(where: SQL | undefined) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(melMonitoringSubmissions)
    .where(where);
  return row?.count ?? 0;
}

/** BDS EDO reports waiting for REDO review (matches notification filter). */
export async function countMelReviewPendingForRedo() {
  return countWhere(
    and(
      inArray(melMonitoringSubmissions.status, ["submitted", "resubmitted", "redo_review"]),
      eq(melMonitoringSubmissions.collectorRole, "bds_edo")
    )
  );
}

/** Reports returned to the collector for correction (matches notification filter). */
export async function countMelReturnedToCollector(userId: string) {
  return countWhere(
    and(
      eq(melMonitoringSubmissions.collectorId, userId),
      inArray(melMonitoringSubmissions.status, ["returned_by_redo", "returned_by_mel", "reopened"])
    )
  );
}
