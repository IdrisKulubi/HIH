"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  a2fPreScreeningAttempts,
  applications,
  dueDiligenceRecords,
} from "@/db/schema";
import { and, eq, inArray, lte, notExists, sql } from "drizzle-orm";
import { a2fScreeningCandidateWhere } from "@/lib/a2f-screening-cohort";
import { countA2fCasesAwaitingInitialDd } from "@/lib/server/a2f-dd-queue";
import { errorResponse, successResponse, type ActionResponse } from "./types";

const OVERSIGHT_HUB_ROLES = ["admin", "oversight", "redo"] as const;
const SCREENING_ROLES = ["admin", "bds_edo", "redo"] as const;

export interface OversightDashboardSummary {
  pendingApprovals: number;
  urgentApprovals: number;
  preScreeningNotScreened: number;
  preScreeningMyDrafts: number;
  a2fDdAwaiting: number;
  cdpReadyToFinalize: number;
}

async function countPendingApprovals(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dueDiligenceRecords)
    .where(
      and(
        eq(dueDiligenceRecords.ddStatus, "awaiting_approval"),
        eq(dueDiligenceRecords.validatorReviewerId, userId)
      )
    );
  return row?.count ?? 0;
}

async function countUrgentApprovals(userId: string) {
  const deadlineCutoff = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(dueDiligenceRecords)
    .where(
      and(
        eq(dueDiligenceRecords.ddStatus, "awaiting_approval"),
        eq(dueDiligenceRecords.validatorReviewerId, userId),
        sql`${dueDiligenceRecords.approvalDeadline} IS NOT NULL`,
        lte(dueDiligenceRecords.approvalDeadline, deadlineCutoff)
      )
    );
  return row?.count ?? 0;
}

async function countPreScreeningNotScreened() {
  const attemptForApplication = db
    .select({ id: a2fPreScreeningAttempts.id })
    .from(a2fPreScreeningAttempts)
    .where(eq(a2fPreScreeningAttempts.applicationId, applications.id));

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applications)
    .innerJoin(
      dueDiligenceRecords,
      eq(dueDiligenceRecords.applicationId, applications.id)
    )
    .where(
      and(a2fScreeningCandidateWhere, notExists(attemptForApplication))
    );

  return row?.count ?? 0;
}

async function countPreScreeningMyDrafts(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(a2fPreScreeningAttempts)
    .where(
      and(
        eq(a2fPreScreeningAttempts.status, "draft"),
        eq(a2fPreScreeningAttempts.assignedReviewerId, userId)
      )
    );
  return row?.count ?? 0;
}

export async function getOversightDashboardSummary(): Promise<
  ActionResponse<OversightDashboardSummary>
> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId || !role || !OVERSIGHT_HUB_ROLES.includes(role as (typeof OVERSIGHT_HUB_ROLES)[number])) {
      return errorResponse("Unauthorized");
    }

    const includeScreening = SCREENING_ROLES.includes(
      role as (typeof SCREENING_ROLES)[number]
    );

    const [pendingApprovals, urgentApprovals, preScreeningNotScreened, preScreeningMyDrafts, a2fDdAwaiting] =
      await Promise.all([
        countPendingApprovals(userId),
        countUrgentApprovals(userId),
        includeScreening ? countPreScreeningNotScreened() : Promise.resolve(0),
        includeScreening ? countPreScreeningMyDrafts(userId) : Promise.resolve(0),
        includeScreening ? countA2fCasesAwaitingInitialDd() : Promise.resolve(0),
      ]);

    return successResponse({
      pendingApprovals,
      urgentApprovals,
      preScreeningNotScreened,
      preScreeningMyDrafts,
      a2fDdAwaiting,
      // Full CDP workflow scan is too slow for the hub; open the queue for details.
      cdpReadyToFinalize: 0,
    });
  } catch (error) {
    console.error("Failed to load oversight dashboard summary:", error);
    return errorResponse("Failed to load dashboard summary");
  }
}
