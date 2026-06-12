"use server";

import { auth } from "@/auth";
import { getPreScreeningQueue } from "@/lib/actions/a2f-pre-screening";
import { getCdpWorkflowRows } from "@/lib/actions/cdp";
import { getDDQueue } from "@/lib/actions/due-diligence";
import { errorResponse, successResponse, type ActionResponse } from "./types";

const OVERSIGHT_HUB_ROLES = ["admin", "oversight", "redo"] as const;

export interface OversightDashboardSummary {
  pendingApprovals: number;
  urgentApprovals: number;
  preScreeningNotScreened: number;
  preScreeningMyDrafts: number;
  cdpReadyToFinalize: number;
}

function isUrgent(deadline: Date | null | undefined) {
  if (!deadline) return false;
  const hoursLeft = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursLeft < 4;
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

    const summary: OversightDashboardSummary = {
      pendingApprovals: 0,
      urgentApprovals: 0,
      preScreeningNotScreened: 0,
      preScreeningMyDrafts: 0,
      cdpReadyToFinalize: 0,
    };

    const ddResult = await getDDQueue();
    if (ddResult.success && ddResult.data) {
      const assigned = ddResult.data.filter(
        (item) =>
          item.ddStatus === "awaiting_approval" && item.validatorReviewerId === userId
      );
      summary.pendingApprovals = assigned.length;
      summary.urgentApprovals = assigned.filter((item) =>
        isUrgent(item.approvalDeadline)
      ).length;
    }

    if (["admin", "bds_edo", "redo"].includes(role)) {
      const screeningResult = await getPreScreeningQueue();
      if (screeningResult.success && screeningResult.data) {
        summary.preScreeningNotScreened = screeningResult.data.filter(
          (row) => !row.latestStatus
        ).length;
        summary.preScreeningMyDrafts = screeningResult.data.filter((row) => row.isMine).length;
      }
    }

    const cdpResult = await getCdpWorkflowRows();
    if (cdpResult.success && cdpResult.data) {
      summary.cdpReadyToFinalize = cdpResult.data.filter(
        (row) => row.cnaStatus === "ready_to_finalize"
      ).length;
    }

    return successResponse(summary);
  } catch (error) {
    console.error("Failed to load oversight dashboard summary:", error);
    return errorResponse("Failed to load dashboard summary");
  }
}
