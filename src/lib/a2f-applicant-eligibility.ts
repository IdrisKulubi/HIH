import db from "@/db/drizzle";
import {
    applications,
    a2fPipeline,
    dueDiligenceRecords,
    grantAgreements,
} from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import type { A2fEnterpriseTrack } from "@/lib/a2f-constants";
import { qualifiedDdApplicationsWhere } from "@/lib/due-diligence-qualification";
import { getEffectiveScreeningForApplication } from "@/lib/server/a2f-effective-screening";

export interface ApplicantEligibilityResult {
    eligible: boolean;
    reason?: string;
    applicationId?: number;
    a2fId?: number;
    /** Retained for existing KYC UI compatibility. KYC does not gate A2F. */
    kycPending?: boolean;
    screeningStatus?: "pending" | "conditional" | "stop" | "pass";
}

/**
 * Programme rules for self-starting the Matching Grant application.
 * Adjust here if product changes eligibility criteria.
 */
export async function checkApplicantCanStartMatchingGrant(
    userId: string
): Promise<ApplicantEligibilityResult> {
    const application = await db.query.applications.findFirst({
        where: eq(applications.userId, userId),
        orderBy: [desc(applications.updatedAt)],
        with: { business: true },
    });

    if (!application) {
        return { eligible: false, reason: "No programme application is linked to your account." };
    }

    const track = application.track as A2fEnterpriseTrack | null;
    if (track !== "foundation" && track !== "acceleration") {
        return {
            eligible: false,
            reason: "A Foundation or Accelerator track must be set on your programme application.",
            applicationId: application.id,
        };
    }

    const qualifiedDd = await db.query.dueDiligenceRecords.findFirst({
        where: and(
            eq(dueDiligenceRecords.applicationId, application.id),
            qualifiedDdApplicationsWhere
        ),
        columns: { id: true },
    });
    if (!qualifiedDd) {
        return {
            eligible: false,
            reason: "Access to Finance is not available until due diligence is approved.",
            applicationId: application.id,
        };
    }

    const latestScreening = await getEffectiveScreeningForApplication(application.id);
    if (latestScreening?.outcome !== "pass") {
        const screeningStatus =
            latestScreening?.outcome === "conditional"
                ? "conditional"
                : latestScreening?.outcome === "stop"
                    ? "stop"
                    : "pending";
        return {
            eligible: false,
            reason:
                screeningStatus === "pending"
                    ? "Your enterprise is awaiting Access to Finance screening."
                    : "Your enterprise is not currently eligible to open the Access to Finance application.",
            applicationId: application.id,
            screeningStatus,
        };
    }

    const existingPipeline = await db.query.a2fPipeline.findFirst({
        where: eq(a2fPipeline.applicationId, application.id),
    });

    return {
        eligible: true,
        applicationId: application.id,
        a2fId: existingPipeline?.id,
        kycPending: application.kycStatus !== "verified" && !application.kycVerifiedAt,
        screeningStatus: "pass",
    };
}

export async function ensureApplicantMatchingGrantPipeline(
    userId: string
): Promise<{ ok: true; a2fId: number } | { ok: false; error: string }> {
    const eligibility = await checkApplicantCanStartMatchingGrant(userId);
    if (!eligibility.eligible || !eligibility.applicationId) {
        return { ok: false, error: eligibility.reason ?? "Not eligible" };
    }

    if (eligibility.a2fId) {
        return { ok: true, a2fId: eligibility.a2fId };
    }

    const application = await db.query.applications.findFirst({
        where: eq(applications.id, eligibility.applicationId),
        with: { business: true },
    });

    const requestedAmount = Number(application?.business?.revenueLastYear ?? 0) || 0;

    const [entry] = await db
        .insert(a2fPipeline)
        .values({
            applicationId: eligibility.applicationId,
            instrumentType: "matching_grant",
            requestedAmount: String(requestedAmount > 0 ? requestedAmount : 1),
            screeningRequired: false,
            status: "a2f_pipeline",
            a2fOfficerId: null,
            notes: "Self-started by applicant",
        })
        .returning({ id: a2fPipeline.id });

    return { ok: true, a2fId: entry.id };
}

export async function resolveApplicantA2fHomePath(
    userId: string
): Promise<string> {
    const eligibility = await checkApplicantCanStartMatchingGrant(userId);
    if (!eligibility.eligible) {
        return "/profile";
    }

    const pipelineResult = await ensureApplicantMatchingGrantPipeline(userId);
    if (!pipelineResult.ok) {
        return "/profile";
    }

    const agreement = await db.query.grantAgreements.findFirst({
        where: eq(grantAgreements.a2fId, pipelineResult.a2fId),
    });

    if (agreement?.offerSentAt && !agreement.isFullyExecuted) {
        return "/access-to-finance/agreement";
    }

    return `/access-to-finance/application/${pipelineResult.a2fId}`;
}
