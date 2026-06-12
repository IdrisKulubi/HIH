import { dueDiligenceRecords } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

export const DD_QUALIFYING_SCORE = 60;

/** Authoritative predicate for the Qualified Applications cohort. */
export const qualifiedDdApplicationsWhere = and(
  eq(dueDiligenceRecords.ddStatus, "approved"),
  sql`${dueDiligenceRecords.phase1Score} >= ${DD_QUALIFYING_SCORE}`
);
