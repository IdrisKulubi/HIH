import db from "@/db/drizzle";
import {
    a2fMatchingGrantApplications,
    a2fPreScreeningAttempts,
    a2fPipeline,
    investmentAppraisals,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getEffectiveScreeningForApplication } from "@/lib/server/a2f-effective-screening";
import { resolveApplicantApplicationId } from "@/lib/server/applicant-application-link";

export const ADMIN_ROLES = ["admin"] as const;

export const A2F_STAFF_ROLES = [
    "admin",
    "a2f_officer",
    "redo",
    "bds_edo",
] as const;

export const A2F_COMMITTEE_ROLES = ["admin", "a2f_committee"] as const;

/** Staff pipeline read (excludes committee — use committee actions instead). */
export const A2F_STAFF_READ_ROLES = [
    "admin",
    "a2f_officer",
    "oversight",
    "redo",
    "bds_edo",
] as const;

export const A2F_READ_ROLES = [
    ...A2F_STAFF_READ_ROLES,
    "a2f_committee",
] as const;

export type A2fStaffRole = (typeof A2F_STAFF_ROLES)[number];
export type A2fCommitteeRole = (typeof A2F_COMMITTEE_ROLES)[number];
export type A2fReadRole = (typeof A2F_READ_ROLES)[number];

export type A2fAccessMode = "staff" | "committee" | "read" | "applicant";

export type CommitteeDecision =
    | "approved"
    | "approved_with_conditions"
    | "deferred"
    | "declined";

const MODE_ROLES: Record<A2fAccessMode, readonly string[]> = {
    staff: A2F_STAFF_ROLES,
    committee: A2F_COMMITTEE_ROLES,
    read: A2F_READ_ROLES,
    applicant: ["applicant", "admin"],
};

export function isAdminRole(role?: string | null): boolean {
    return role === "admin";
}

export function hasA2fRole(
    role: string | null | undefined,
    mode: A2fAccessMode
): boolean {
    if (!role) return false;
    if (isAdminRole(role)) return true;
    return MODE_ROLES[mode].includes(role);
}

export function assertA2fRole(
    role: string | null | undefined,
    mode: A2fAccessMode
): { ok: true } | { ok: false; error: string } {
    if (hasA2fRole(role, mode)) return { ok: true };
    return { ok: false, error: "Unauthorized" };
}

export function canRecordCommitteeDecision(role?: string | null): boolean {
    return hasA2fRole(role, "committee");
}

export function canWriteA2fStaff(role?: string | null): boolean {
    return hasA2fRole(role, "staff");
}

export function hasA2fStaffRead(role?: string | null): boolean {
    if (!role) return false;
    if (isAdminRole(role)) return true;
    return (A2F_STAFF_READ_ROLES as readonly string[]).includes(role);
}

export function assertA2fStaffRead(
    role: string | null | undefined
): { ok: true } | { ok: false; error: string } {
    if (hasA2fStaffRead(role)) return { ok: true };
    return { ok: false, error: "Unauthorized" };
}

export function isCommitteeApprovedForContracting(
    decision: string | null | undefined
): boolean {
    return (
        decision === "approved" || decision === "approved_with_conditions"
    );
}

export async function getGairCommitteeDecision(
    a2fId: number
): Promise<string | null> {
    const gair = await db.query.investmentAppraisals.findFirst({
        where: and(
            eq(investmentAppraisals.a2fId, a2fId),
            eq(investmentAppraisals.documentType, "gair")
        ),
        columns: { icDecision: true },
    });
    return gair?.icDecision ?? null;
}

export async function requireCommitteeApprovalForContracting(
    a2fId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
    const decision = await getGairCommitteeDecision(a2fId);
    if (isCommitteeApprovedForContracting(decision)) {
        return { ok: true };
    }
    return {
        ok: false,
        error:
            "Committee approval is required before generating or sending the agreement. Record an approved or approved-with-conditions decision on the GAIR first.",
    };
}

export async function assertApplicantOwnsPipeline(
    userId: string,
    a2fId: number
): Promise<{ ok: true; applicationId: number } | { ok: false; error: string }> {
    const pipeline = await db.query.a2fPipeline.findFirst({
        where: eq(a2fPipeline.id, a2fId),
        columns: { applicationId: true },
    });

    if (!pipeline) {
        return { ok: false, error: "Pipeline entry not found" };
    }

    const ownedApplicationId = await resolveApplicantApplicationId(userId);
    if (ownedApplicationId !== pipeline.applicationId) {
        return { ok: false, error: "Forbidden" };
    }

    const passedScreening = await getEffectiveScreeningForApplication(pipeline.applicationId);
    if (passedScreening?.outcome !== "pass") {
        return {
            ok: false,
            error: "Access to Finance is locked until the enterprise passes pre-screening",
        };
    }

    const screeningAttempt = await db.query.a2fPreScreeningAttempts.findFirst({
        where: eq(a2fPreScreeningAttempts.id, passedScreening.attemptId),
        columns: { invitationStatus: true },
    });
    if (screeningAttempt?.invitationStatus !== "sent") {
        return {
            ok: false,
            error: "Access to Finance is locked until admin sends the A2F application invite",
        };
    }

    return { ok: true, applicationId: pipeline.applicationId };
}

export async function assertMatchingGrantApplicationSubmitted(
    a2fId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
    const application = await db.query.a2fMatchingGrantApplications.findFirst({
        where: eq(a2fMatchingGrantApplications.a2fId, a2fId),
        columns: { status: true },
    });

    if (application?.status === "submitted") {
        return { ok: true };
    }

    return {
        ok: false,
        error: "This A2F area is locked until the enterprise submits the Matching Grant application form.",
    };
}

export type A2fDdWritableStage = "initial" | "pre_ic" | "post_ta";

/** Staff may complete initial DD before the Matching Grant application is submitted. */
export async function assertA2fDdWritable(
    a2fId: number,
    stage: A2fDdWritableStage
): Promise<{ ok: true } | { ok: false; error: string }> {
    const pipeline = await db.query.a2fPipeline.findFirst({
        where: eq(a2fPipeline.id, a2fId),
        columns: { screeningRequired: true },
    });

    if (!pipeline) {
        return { ok: false, error: "A2F pipeline entry not found" };
    }

    if (pipeline.screeningRequired) {
        return {
            ok: false,
            error: "Access to Finance is locked until pre-screening is complete",
        };
    }

    if (stage === "initial") {
        return { ok: true };
    }

    return assertMatchingGrantApplicationSubmitted(a2fId);
}
