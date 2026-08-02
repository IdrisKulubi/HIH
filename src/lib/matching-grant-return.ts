import {
  a2fMatchingGrantApplications,
  a2fPipeline,
  userProfiles,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import db from "@/db/drizzle";
import { checkApplicantCanStartMatchingGrant } from "@/lib/a2f-applicant-eligibility";

export type MatchingGrantApplicationStatus =
  | "draft"
  | "submitted"
  | "returned_for_correction";

export interface ApplicantMatchingGrantReturnGate {
  needsReapplication: boolean;
  a2fId?: number;
  returnReason?: string | null;
  applicationPath?: string;
}

export async function getApplicantMatchingGrantReturnGate(
  userId: string
): Promise<ApplicantMatchingGrantReturnGate> {
  const eligibility = await checkApplicantCanStartMatchingGrant(userId);
  if (!eligibility.eligible || !eligibility.a2fId) {
    return { needsReapplication: false };
  }

  const mg = await db.query.a2fMatchingGrantApplications.findFirst({
    where: eq(a2fMatchingGrantApplications.a2fId, eligibility.a2fId),
    columns: { status: true, returnReason: true },
  });

  if (mg?.status !== "returned_for_correction") {
    return { needsReapplication: false };
  }

  return {
    needsReapplication: true,
    a2fId: eligibility.a2fId,
    returnReason: mg.returnReason,
    applicationPath: `/access-to-finance/application/${eligibility.a2fId}`,
  };
}

export async function listMatchingGrantReturnAssignees() {
  const profiles = await db
    .select({
      id: userProfiles.userId,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      email: userProfiles.email,
      role: userProfiles.role,
    })
    .from(userProfiles)
    .where(inArray(userProfiles.role, ["bds_edo", "redo"]))
    .orderBy(userProfiles.firstName, userProfiles.lastName);

  return profiles.map((profile) => ({
    id: profile.id,
    name:
      [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
      profile.email ||
      "Programme staff",
    email: profile.email,
    role: profile.role,
  }));
}

export async function getMatchingGrantReturnSummary(a2fId: number) {
  const mg = await db.query.a2fMatchingGrantApplications.findFirst({
    where: eq(a2fMatchingGrantApplications.a2fId, a2fId),
    with: {
      returnedToEdo: { with: { userProfile: true } },
      returnedBy: { with: { userProfile: true } },
    },
  });

  if (!mg) return null;

  const displayName = (profile?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) =>
    profile
      ? [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.email || "Programme staff"
      : null;

  return {
    status: mg.status as MatchingGrantApplicationStatus,
    returnReason: mg.returnReason,
    returnedAt: mg.returnedAt,
    returnCount: mg.returnCount,
    returnedToEdoName: displayName(mg.returnedToEdo?.userProfile),
    returnedByName: displayName(mg.returnedBy?.userProfile),
  };
}
