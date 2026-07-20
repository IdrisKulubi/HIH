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
        .limit(2);

    if (canonicalApplications.length === 1) {
        return canonicalApplications[0].id;
    }
    if (canonicalApplications.length > 1) return null;

    const emailMatchedApplications = await db
        .select({ id: applications.id })
        .from(applications)
        .innerJoin(businesses, eq(businesses.id, applications.businessId))
        .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
        .where(sql`lower(trim(${applicants.email})) = ${normalizedEmail}`)
        .orderBy(desc(applications.updatedAt))
        .limit(2);

    // Never guess ownership when a contact email appears on multiple cases.
    if (emailMatchedApplications.length !== 1) return null;

    const applicationId = emailMatchedApplications[0].id;
    const screening = await getEffectiveScreeningForApplication(applicationId);
    if (screening?.outcome !== "pass") return null;

    const invitation = await db.query.a2fPreScreeningAttempts.findFirst({
        where: eq(a2fPreScreeningAttempts.id, screening.attemptId),
        columns: { invitationStatus: true },
    });

    return invitation?.invitationStatus === "sent" ? applicationId : null;
}
