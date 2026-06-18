"use server";

import { auth } from "@/auth";
import db from "@/db/drizzle";
import {
  a2fPreScreeningAttempts,
  applications,
  dueDiligenceRecords,
} from "@/db/schema";
import { and, eq, notExists, sql } from "drizzle-orm";
import { a2fScreeningCandidateWhere } from "@/lib/a2f-screening-cohort";
import { countA2fCasesAwaitingInitialDd } from "@/lib/server/a2f-dd-queue";
import { errorResponse, successResponse, type ActionResponse } from "./types";

const BDS_EDO_HUB_ROLES = ["bds_edo", "admin"] as const;

export interface BdsEdoDashboardSummary {
  cnaCandidates: number;
  preScreeningNotScreened: number;
  preScreeningMyDrafts: number;
  a2fDdAwaiting: number;
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
    .where(and(a2fScreeningCandidateWhere, notExists(attemptForApplication)));

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

export async function getBdsEdoDashboardSummary(
  cnaCandidates = 0
): Promise<ActionResponse<BdsEdoDashboardSummary>> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId || !role || !BDS_EDO_HUB_ROLES.includes(role as (typeof BDS_EDO_HUB_ROLES)[number])) {
      return errorResponse("Unauthorized");
    }

    const [preScreeningNotScreened, preScreeningMyDrafts, a2fDdAwaiting] = await Promise.all([
      countPreScreeningNotScreened(),
      countPreScreeningMyDrafts(userId),
      countA2fCasesAwaitingInitialDd(),
    ]);

    return successResponse({
      cnaCandidates,
      preScreeningNotScreened,
      preScreeningMyDrafts,
      a2fDdAwaiting,
    });
  } catch (error) {
    console.error("Failed to load BA / EDO dashboard summary:", error);
    return errorResponse("Failed to load dashboard summary");
  }
}
