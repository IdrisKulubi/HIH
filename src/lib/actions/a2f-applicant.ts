"use server";

import { auth } from "@/auth";
import {
    checkApplicantCanStartMatchingGrant,
    ensureApplicantMatchingGrantPipeline,
    resolveApplicantA2fHomePath,
} from "@/lib/a2f-applicant-eligibility";
import { assertApplicantOwnsPipeline } from "@/lib/a2f-access";
import {
    getMatchingGrantApplication,
    getMatchingGrantDocumentSources,
    saveMatchingGrantApplication,
    type MatchingGrantApplicationInput,
} from "./a2f-matching-grant-applications";
import db from "@/db/drizzle";
import { a2fPipeline, applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ActionResponse, errorResponse, successResponse } from "./types";

export async function getApplicantA2fHomePath(): Promise<string> {
    const session = await auth();
    if (!session?.user?.id) return "/login";
    return resolveApplicantA2fHomePath(session.user.id);
}

/** True when the applicant has a submitted Matching Grant application on their pipeline. */
export async function getApplicantMatchingGrantSubmittedStatus(): Promise<boolean> {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "applicant") return false;

    const eligibility = await checkApplicantCanStartMatchingGrant(session.user.id);
    if (!eligibility.a2fId) return false;

    const res = await getMatchingGrantApplication(eligibility.a2fId);
    return Boolean(res.success && res.data?.status === "submitted");
}

export interface ApplicantA2fContext {
    eligible: boolean;
    reason?: string;
    a2fId?: number;
    applicationId?: number;
}

export async function getApplicantA2fContext(): Promise<ActionResponse<ApplicantA2fContext>> {
    try {
        const session = await auth();
        if (!session?.user?.id) return errorResponse("Unauthorized");
        if (session.user.role !== "applicant" && session.user.role !== "admin") {
            return errorResponse("Forbidden");
        }

        const eligibility = await checkApplicantCanStartMatchingGrant(session.user.id);
        if (!eligibility.eligible) {
            return successResponse({
                eligible: false,
                reason: eligibility.reason,
                applicationId: eligibility.applicationId,
            });
        }

        const pipeline = await ensureApplicantMatchingGrantPipeline(session.user.id);
        if (!pipeline.ok) {
            return successResponse({ eligible: false, reason: pipeline.error });
        }

        return successResponse({
            eligible: true,
            a2fId: pipeline.a2fId,
            applicationId: eligibility.applicationId,
        });
    } catch (error) {
        console.error("Error resolving applicant A2F context:", error);
        return errorResponse("Failed to load Access to Finance context");
    }
}

export async function getApplicantPipelineEntry(a2fId: number) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, message: "Unauthorized" };

    const ownership = await assertApplicantOwnsPipeline(session.user.id, a2fId);
    if (!ownership.ok) return { success: false, message: ownership.error };

    const entry = await db.query.a2fPipeline.findFirst({
        where: eq(a2fPipeline.id, a2fId),
        with: {
            application: {
                with: {
                    business: { with: { applicant: true } },
                },
            },
            matchingGrantApplications: true,
            grantAgreements: true,
        },
    });

    if (!entry) return { success: false, message: "Not found" };
    return { success: true, data: entry };
}

export async function getApplicantMatchingGrantApplication(a2fId: number) {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    if (session.user.role !== "applicant" && session.user.role !== "admin") {
        return errorResponse("Forbidden");
    }
    const ownership = await assertApplicantOwnsPipeline(session.user.id, a2fId);
    if (!ownership.ok) return errorResponse(ownership.error);
    return getMatchingGrantApplication(a2fId);
}

export async function getApplicantMatchingGrantDocumentSources(a2fId: number) {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    if (session.user.role !== "applicant" && session.user.role !== "admin") {
        return errorResponse("Forbidden");
    }
    const ownership = await assertApplicantOwnsPipeline(session.user.id, a2fId);
    if (!ownership.ok) return errorResponse(ownership.error);
    return getMatchingGrantDocumentSources(a2fId);
}

export async function saveApplicantMatchingGrantApplication(
    a2fId: number,
    input: MatchingGrantApplicationInput
) {
    const session = await auth();
    if (!session?.user?.id) return errorResponse("Unauthorized");
    if (session.user.role !== "applicant" && session.user.role !== "admin") {
        return errorResponse("Forbidden");
    }
    const ownership = await assertApplicantOwnsPipeline(session.user.id, a2fId);
    if (!ownership.ok) return errorResponse(ownership.error);

    // Finalize legacy email-based ownership only after the authenticated user
    // has been matched to one unambiguous, invited pipeline application.
    await db
        .update(applications)
        .set({ userId: session.user.id, updatedAt: new Date() })
        .where(eq(applications.id, ownership.applicationId));

    return saveMatchingGrantApplication(a2fId, input);
}
