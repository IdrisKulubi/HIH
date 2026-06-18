import { applications } from "@/db/schema";
import { qualifiedDdApplicationsWhere } from "@/lib/due-diligence-qualification";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";

export const A2F_SCREENING_TRACKS = ["foundation", "acceleration"] as const;

const a2fScreeningApplicationWhere = and(
  ne(applications.status, "rejected"),
  eq(applications.isObservationOnly, false),
  inArray(applications.track, A2F_SCREENING_TRACKS),
  isNotNull(applications.submittedAt)
);

/**
 * DD-qualified Foundation/Acceleration applications eligible for A2F pre-screening.
 * Requires `innerJoin` on `dueDiligenceRecords` (`applicationId`).
 */
export const a2fScreeningCandidateWhere = and(
  a2fScreeningApplicationWhere,
  qualifiedDdApplicationsWhere
);
