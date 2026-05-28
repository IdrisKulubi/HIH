import db from "@/db/drizzle";
import { applications, a2fPipeline, businesses, grantAgreements } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { A2fEnterpriseTrack } from "@/lib/a2f-constants";

export interface ApplicantEligibilityResult {
    eligible: boolean;
    reason?: string;
    applicationId?: number;
    a2fId?: number;
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

    if (application.status !== "approved") {
        return {
            eligible: false,
            reason: "Your programme application must be approved before applying for a Matching Grant.",
            applicationId: application.id,
        };
    }

    if (application.isObservationOnly) {
        return {
            eligible: false,
            reason: "Observation-only applications are not eligible for the Matching Grant.",
            applicationId: application.id,
        };
    }

    const track = application.track as A2fEnterpriseTrack | null;
    if (track !== "foundation" && track !== "acceleration") {
        return {
            eligible: false,
            reason: "A Foundation or Accelerator track must be set on your programme application.",
            applicationId: application.id,
        };
    }

    if (application.kycStatus !== "verified" && !application.kycVerifiedAt) {
        return {
            eligible: false,
            reason: "Complete and verify KYC before starting your Matching Grant application.",
            applicationId: application.id,
        };
    }

    const existingPipeline = await db.query.a2fPipeline.findFirst({
        where: eq(a2fPipeline.applicationId, application.id),
    });

    return {
        eligible: true,
        applicationId: application.id,
        a2fId: existingPipeline?.id,
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
