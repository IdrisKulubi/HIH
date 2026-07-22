import db from "@/db/drizzle";
import {
    a2fPreScreeningAttempts,
    applicants,
    applications,
    businesses,
    users,
} from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getEffectiveScreeningForApplication } from "@/lib/server/a2f-effective-screening";

async function resolveUniqueInvitedApplicationId(
    candidates: Array<{ id: number }>
): Promise<number | null> {
    const invitedApplicationIds: number[] = [];

    for (const candidate of candidates) {
        const screening = await getEffectiveScreeningForApplication(candidate.id);
        if (screening?.outcome !== "pass") continue;

        const invitation = await db.query.a2fPreScreeningAttempts.findFirst({
            where: eq(a2fPreScreeningAttempts.id, screening.attemptId),
            columns: { invitationStatus: true },
        });
        if (invitation?.invitationStatus === "sent") {
            invitedApplicationIds.push(candidate.id);
        }
    }

    return invitedApplicationIds.length === 1 ? invitedApplicationIds[0] : null;
}

/**
 * Resolve the programme application owned by an authenticated applicant.
 *
 * New records use applications.userId directly. The email fallback supports
 * legacy or imported records whose applicant received the invitation at the
 * same email address but whose application points to an older auth user ID.
 * Email recovery is accepted only for one unambiguous, admin-invited A2F case.
 */
export async function resolveApplicantApplicationId(
    userId: string
): Promise<number | null> {
    const directApplication = await db.query.applications.findFirst({
        where: eq(applications.userId, userId),
        columns: { id: true },
        orderBy: [desc(applications.updatedAt)],
    });
    if (directApplication) return directApplication.id;

    // Some imported records link the authenticated account on applicants.userId
    // while applications.userId still points to an older account.
    const applicantOwnedApplications = await db
        .select({ id: applications.id })
        .from(applications)
        .innerJoin(businesses, eq(businesses.id, applications.businessId))
        .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
        .where(eq(applicants.userId, userId))
        .orderBy(desc(applications.updatedAt))
        .limit(20);
    if (applicantOwnedApplications.length === 1) {
        return applicantOwnedApplications[0].id;
    }
    if (applicantOwnedApplications.length > 1) {
        const invitedApplicationId = await resolveUniqueInvitedApplicationId(
            applicantOwnedApplications
        );
        if (invitedApplicationId) return invitedApplicationId;
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { email: true },
    });
    const normalizedEmail = user?.email?.trim().toLowerCase();
    if (!normalizedEmail) return null;

    // Recover duplicate auth-account IDs that represent the same login email.
    const canonicalApplications = await db
        .select({ id: applications.id })
        .from(applications)
        .innerJoin(users, eq(users.id, applications.userId))
        .where(sql`lower(trim(${users.email})) = ${normalizedEmail}`)
        .orderBy(desc(applications.updatedAt))
        .limit(20);

    if (canonicalApplications.length === 1) {
        return canonicalApplications[0].id;
    }
    if (canonicalApplications.length > 1) {
        return resolveUniqueInvitedApplicationId(canonicalApplications);
    }

    const emailMatchedApplications = await db
        .select({ id: applications.id })
        .from(applications)
        .innerJoin(businesses, eq(businesses.id, applications.businessId))
        .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
        .where(sql`lower(trim(${applicants.email})) = ${normalizedEmail}`)
        .orderBy(desc(applications.updatedAt))
        .limit(20);

    // A duplicate contact email is safe only when exactly one matching case
    // has passed screening and received an A2F invitation.
    return resolveUniqueInvitedApplicationId(emailMatchedApplications);
}
